import { IdentifierValidationError, readEInvoiceData } from "@/lib/eRechnung/identifiers";
import { orderedIds } from "@/lib/server/orderedIds";
import { GoaeValidationError, parseGoaeLineData } from "@/lib/goae/line";
import { MedicalDataError, parseMedicalData } from "@/lib/icd10";
import { InvoiceWriteError, prepareInvoiceWrite } from "@/lib/server/invoiceWrite";
import { numberExists, NUMBER_TAKEN_MESSAGE } from "@/lib/server/invoiceNumberAllocation";
import { NextRequest, NextResponse } from "next/server";
import { Permission, Query, Role } from "node-appwrite";
import {
    createSessionClient,
    createAdminClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";
import { isCollectionNotFound } from "@/lib/appwrite-errors";

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
            goae: parseGoaeLineData(item.goaeData),
            quantity: item.quantity,
            unit_of_measure: item.unitOfMeasure || "Stück",
            price: item.price,
            tax_rate_percent: item.taxRatePercent ?? 19,
            discount_percent: item.discountPercent ?? 0,
            subtotal: item.subtotal ?? 0,
            tax_amount: item.taxAmount ?? 0,
            total: item.total ?? 0,
        }));

        const invoice = {
            id: doc.$id,
            e_invoice: readEInvoiceData(doc.eInvoiceData),
            medical: parseMedicalData(doc.medicalData),
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

// PUT update invoice status
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

        // Full update (content + items): only drafts may be edited. Issued
        // invoices are corrected via /correction (credit note / correction).
        if (Array.isArray(body.items)) {
            if (existing.status !== "draft") {
                return NextResponse.json({ error: "Nur Entwürfe können bearbeitet werden – für versendete Rechnungen bitte eine Korrektur erstellen." }, { status: 409 });
            }
            const { invoiceData, items, medical } = await prepareInvoiceWrite(databases, user.$id, body);
            // Empty number keeps the draft's number; a changed number must be unique.
            const requestedNumber = typeof body.invoice_number === "string" ? body.invoice_number.trim() : "";
            const invoiceNumber = requestedNumber || existing.invoiceNumber;
            if (invoiceNumber !== existing.invoiceNumber && (await numberExists(databases, user.$id, invoiceNumber, id))) {
                return NextResponse.json({ error: NUMBER_TAKEN_MESSAGE }, { status: 409 });
            }
            invoiceData.invoiceNumber = invoiceNumber;
            invoiceData.issueDate = typeof body.issue_date === "string" && body.issue_date ? body.issue_date : existing.issueDate;
            const permissions = [
                Permission.read(Role.user(user.$id)),
                Permission.update(Role.user(user.$id)),
                Permission.delete(Role.user(user.$id)),
            ];
            const oldItems = await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, [Query.equal("invoiceId", id), Query.limit(500)]);
            // Create the new items first; roll back on failure so the draft is never left without positions.
            const created: string[] = [];
            try {
                const nextItemId = orderedIds(); // keeps the position order
                for (const item of items) {
                    const doc = await databases.createDocument(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, nextItemId(), { invoiceId: id, ...item }, permissions);
                    created.push(doc.$id);
                }
                await databases.updateDocument(DATABASE_ID, COLLECTIONS.INVOICES, id, {
                    ...invoiceData,
                    ...(medical ? { medicalData: JSON.stringify(medical) } : "medicalData" in existing ? { medicalData: null } : {}),
                    ...(!invoiceData.eInvoiceData && existing.eInvoiceData ? { eInvoiceData: null } : {}),
                });
            } catch (writeError) {
                for (const docId of created) await databases.deleteDocument(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, docId).catch(() => undefined);
                throw writeError;
            }
            for (const old of oldItems.documents) await databases.deleteDocument(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, old.$id);
            return NextResponse.json({ id, invoiceNumber, success: true });
        }

        // Status-only update
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.INVOICES, id, {
            status: body.status,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof InvoiceWriteError) return NextResponse.json({ error: error.message }, { status: error.status });
        if (error instanceof IdentifierValidationError || error instanceof GoaeValidationError || error instanceof MedicalDataError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
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
        return NextResponse.json(
            { error: "Failed to delete invoice" },
            { status: 500 },
        );
    }
}
