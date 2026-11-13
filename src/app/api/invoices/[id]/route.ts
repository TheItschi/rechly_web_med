import { IdentifierValidationError, readEInvoiceData } from "@/lib/eRechnung/identifiers";
import { NextRequest, NextResponse } from "next/server";
import { deleteTimeInvoice, isTimeInvoice } from "@/lib/workspace/work";
import { WorkspaceError } from "@/lib/workspace/repository";
import { Query } from "node-appwrite";
import {
    createSessionClient,
    createAdminClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";
import { isCollectionNotFound } from "@/lib/appwrite-errors";
import {
    buildInvoiceContent,
    buildItemDocuments,
    InvoiceWriteError,
    numberExists,
    NUMBER_TAKEN_MESSAGE,
    replaceDraftItems,
    resolveInvoiceSource,
} from "@/lib/server/invoiceWrite";

// GET single invoice with details
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        let account;
        try {
            const sessionClient = await createSessionClient();
            account = sessionClient.account;
        } catch {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 },
            );
        }

        const { databases } = await createAdminClient();

        // Get current user
        const user = await account.get();
        if (!user) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 },
            );
        }

        // Get invoice
        let doc;
        try {
            doc = await databases.getDocument(
                DATABASE_ID,
                COLLECTIONS.INVOICES,
                id,
            );
        } catch (error) {
            if (isCollectionNotFound(error)) {
                return NextResponse.json(
                    { error: "Invoice not found" },
                    { status: 404 },
                );
            }
            throw error;
        }

        if (doc.userId !== user.$id) {
            return NextResponse.json(
                { error: "Invoice not found" },
                { status: 404 },
            );
        }

        // Get client
        let client = undefined;
        if (doc.clientId) {
            try {
                const clientDoc = await databases.getDocument(
                    DATABASE_ID,
                    COLLECTIONS.CLIENTS,
                    doc.clientId,
                );
                if (clientDoc.userId !== user.$id) throw new Error("Client not owned by user");
                client = {
                    id: clientDoc.$id,
                    name: clientDoc.name,
                    contact_person: clientDoc.contactPerson ?? undefined,
                    address_line1: clientDoc.addressLine1,
                    address_line2: clientDoc.addressLine2 ?? undefined,
                    postal_code: clientDoc.postalCode,
                    city: clientDoc.city,
                    country: clientDoc.country || "Deutschland",
                    email: clientDoc.email ?? undefined,
                    phone: clientDoc.phone ?? undefined,
                    vat_id: clientDoc.vatId ?? undefined,
                    tax_number: clientDoc.taxNumber ?? undefined,
                    leitweg_id: clientDoc.leitwegId ?? undefined,
                    created_at: new Date(clientDoc.$createdAt).getTime(),
                    updated_at: new Date(clientDoc.$updatedAt).getTime(),
                };
            } catch {
                // Client may have been deleted
            }
        }

        // Get invoice items
        const itemsResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.INVOICE_ITEMS,
            [Query.equal("invoiceId", id), Query.limit(100)],
        );

        const items = itemsResponse.documents.map((item) => ({
            id: item.$id,
            invoice_id: item.invoiceId,
            product_id: item.productId ?? undefined,
            description: item.description,
            gtin: item.gtin || undefined,
            quantity: item.quantity,
            unit_of_measure: item.unitOfMeasure || "Stück",
            price: item.price,
            tax_rate_percent: item.taxRatePercent ?? 19,
            discount_percent: item.discountPercent ?? 0,
            service_date_start: item.serviceDateStart ?? undefined,
            service_date_end: item.serviceDateEnd ?? undefined,
            subtotal: item.subtotal ?? 0,
            tax_amount: item.taxAmount ?? 0,
            total: item.total ?? 0,
        }));

        const invoice = {
            id: doc.$id,
            e_invoice: readEInvoiceData(doc.eInvoiceData),
            client_id: doc.clientId,
            invoice_number: doc.invoiceNumber,
            issue_date: doc.issueDate,
            due_date: doc.dueDate ?? undefined,
            subtotal: doc.subtotal ?? 0,
            total_vat: doc.totalVat ?? 0,
            total_gross: doc.totalGross ?? 0,
            status: doc.status || "draft",
            notes: doc.notes ?? undefined,
            purchase_order_ref: doc.purchaseOrderRef ?? undefined,
            delivery_date: doc.deliveryDate ?? undefined,
        delivery_date_start: doc.deliveryDateStart ?? undefined,
        delivery_date_end: doc.deliveryDateEnd ?? undefined,
            payment_terms: doc.paymentTerms ?? undefined,
            correction_type: doc.correctionType ?? null,
            corrects_invoice_id: doc.correctsInvoiceId ?? null,
            created_at: new Date(doc.$createdAt).getTime(),
            updated_at: new Date(doc.$updatedAt).getTime(),
            client,
            items,
        };

        return NextResponse.json(invoice);
    } catch (error) {
        console.error("Error fetching invoice:", error);
        return NextResponse.json(
            { error: "Failed to fetch invoice" },
            { status: 500 },
        );
    }
}

// PUT update invoice status, or fully update a draft (fields + line items)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        let account;
        try {
            const sessionClient = await createSessionClient();
            account = sessionClient.account;
        } catch {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 },
            );
        }

        const { databases } = await createAdminClient();

        // Get current user
        const user = await account.get();
        if (!user) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 },
            );
        }

        // Verify ownership before updating
        let existing;
        try {
            existing = await databases.getDocument(
                DATABASE_ID,
                COLLECTIONS.INVOICES,
                id,
            );
        } catch (error) {
            if (isCollectionNotFound(error)) {
                return NextResponse.json(
                    { error: "Invoice not found" },
                    { status: 404 },
                );
            }
            throw error;
        }

        if (existing.userId !== user.$id) {
            return NextResponse.json(
                { error: "Invoice not found" },
                { status: 404 },
            );
        }

        const body = await request.json();

        // Full update: only drafts are editable. Issued invoices stay immutable
        // (GoBD) and are corrected via the credit note / correction flow.
        if (Array.isArray(body.items)) {
            if (existing.status !== "draft") {
                return NextResponse.json(
                    { error: "Nur Rechnungsentwürfe können bearbeitet werden. Für versendete Rechnungen bitte eine Korrektur oder Gutschrift erstellen." },
                    { status: 409 },
                );
            }
            if (await isTimeInvoice(databases, user.$id, id)) {
                return NextResponse.json(
                    { error: "Aus der Zeiterfassung erzeugte Entwürfe können nicht bearbeitet werden. Bitte den Entwurf löschen und die Zeiten neu abrechnen." },
                    { status: 409 },
                );
            }

            const { identifiers, items } = await resolveInvoiceSource(databases, user.$id, body);
            const requestedNumber = typeof body.invoice_number === "string" ? body.invoice_number.trim() : "";
            const invoiceNumber = requestedNumber || existing.invoiceNumber;
            if (invoiceNumber !== existing.invoiceNumber && (await numberExists(databases, user.$id, invoiceNumber, id))) {
                return NextResponse.json({ error: NUMBER_TAKEN_MESSAGE }, { status: 409 });
            }
            const { fields, deliveryDateStart, deliveryDateEnd } = buildInvoiceContent(body, items, identifiers);
            const update: Record<string, unknown> = {
                ...fields,
                invoiceNumber,
                issueDate: typeof body.issue_date === "string" && body.issue_date ? body.issue_date : existing.issueDate,
                // A removed identifier snapshot must not survive the update.
                ...(!fields.eInvoiceData && existing.eInvoiceData ? { eInvoiceData: null } : {}),
            };
            // Newer service-period attrs: only touched when the schema has them.
            const periodAttrs: Record<string, unknown> = {
                ...("deliveryDateStart" in existing || deliveryDateStart ? { deliveryDateStart: deliveryDateStart ?? null } : {}),
                ...("deliveryDateEnd" in existing || deliveryDateEnd ? { deliveryDateEnd: deliveryDateEnd ?? null } : {}),
            };

            await replaceDraftItems(databases, user.$id, id, buildItemDocuments(id, items), async () => {
                try {
                    await databases.updateDocument(DATABASE_ID, COLLECTIONS.INVOICES, id, { ...update, ...periodAttrs });
                } catch (updateError) {
                    const errMsg = (updateError as { message?: string })?.message || "";
                    if (!errMsg.includes("Unknown attribute") || !Object.keys(periodAttrs).length) throw updateError;
                    await databases.updateDocument(DATABASE_ID, COLLECTIONS.INVOICES, id, update);
                }
            });

            return NextResponse.json({ id, invoiceNumber, success: true });
        }

        // Update status
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.INVOICES, id, {
            status: body.status,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof InvoiceWriteError) return NextResponse.json({ error: error.message }, { status: error.status });
        if (error instanceof IdentifierValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
        console.error("Error updating invoice:", error);
        return NextResponse.json(
            { error: "Failed to update invoice" },
            { status: 500 },
        );
    }
}

// DELETE invoice and its items
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        let account;
        try {
            const sessionClient = await createSessionClient();
            account = sessionClient.account;
        } catch {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 },
            );
        }

        const { databases } = await createAdminClient();

        // Get current user
        const user = await account.get();
        if (!user) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 },
            );
        }

        // Verify ownership before deleting
        let existing;
        try {
            existing = await databases.getDocument(
                DATABASE_ID,
                COLLECTIONS.INVOICES,
                id,
            );
        } catch (error) {
            if (isCollectionNotFound(error)) {
                return NextResponse.json(
                    { error: "Invoice not found" },
                    { status: 404 },
                );
            }
            throw error;
        }

        if (existing.userId !== user.$id) {
            return NextResponse.json(
                { error: "Invoice not found" },
                { status: 404 },
            );
        }

        if (await deleteTimeInvoice(databases, user.$id, id)) return NextResponse.json({ success: true });

        // First delete all invoice items
        const itemsResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.INVOICE_ITEMS,
            [Query.equal("invoiceId", id), Query.limit(200)],
        );

        for (const item of itemsResponse.documents) {
            await databases.deleteDocument(
                DATABASE_ID,
                COLLECTIONS.INVOICE_ITEMS,
                item.$id,
            );
        }

        // Then delete the invoice
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.INVOICES, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting invoice:", error);
        if (error instanceof WorkspaceError) return NextResponse.json({ error: error.message }, { status: error.status });
        return NextResponse.json(
            { error: "Failed to delete invoice" },
            { status: 500 },
        );
    }
}
