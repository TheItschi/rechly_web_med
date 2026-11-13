import { IdentifierValidationError } from "@/lib/eRechnung/identifiers";
import { NextRequest, NextResponse } from "next/server";
import { GoaeValidationError } from "@/lib/goae/line";
import { MedicalDataError } from "@/lib/icd10";
import { InvoiceWriteError, prepareInvoiceWrite } from "@/lib/server/invoiceWrite";
import {
    advanceNumberCounter,
    allocateInvoiceNumber,
    numberExists,
    NUMBER_TAKEN_MESSAGE,
    repairDuplicateNumber,
} from "@/lib/server/invoiceNumberAllocation";
import { Query, ID, Permission, Role } from "node-appwrite";
import {
    createSessionClient,
    createAdminClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";
import { isCollectionNotFound } from "@/lib/appwrite-errors";

// GET all invoices with client info
export async function GET() {
    try {
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

        // Get invoices filtered by userId
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.INVOICES,
            [
                Query.equal("userId", user.$id),
                Query.orderDesc("$createdAt"),
                Query.limit(1000),
            ],
        );

        // Get all clients for this user to join
        const clientsResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.CLIENTS,
            [Query.equal("userId", user.$id), Query.limit(1000)],
        );

        const clientsMap = new Map(
            clientsResponse.documents.map((c) => [
                c.$id,
                {
                    id: c.$id,
                    name: c.name,
                    contact_person: c.contactPerson ?? undefined,
                    address_line1: c.addressLine1,
                    address_line2: c.addressLine2 ?? undefined,
                    postal_code: c.postalCode,
                    city: c.city,
                    country: c.country || "Deutschland",
                    email: c.email ?? undefined,
                    phone: c.phone ?? undefined,
                    vat_id: c.vatId ?? undefined,
                    tax_number: c.taxNumber ?? undefined,
                    leitweg_id: c.leitwegId ?? undefined,
                    created_at: new Date(c.$createdAt).getTime(),
                    updated_at: new Date(c.$updatedAt).getTime(),
                },
            ]),
        );

        // Map documents to invoice format with client
        const invoices = response.documents.map((doc) => ({
            id: doc.$id,
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
            client: clientsMap.get(doc.clientId) || undefined,
        }));

        return NextResponse.json(invoices);
    } catch (error) {
        if (error instanceof IdentifierValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
        console.error("Error fetching invoices:", error);
        if (isCollectionNotFound(error)) {
            return NextResponse.json([]);
        }
        return NextResponse.json(
            { error: "Failed to fetch invoices" },
            { status: 500 },
        );
    }
}

// POST create new invoice with items
export async function POST(request: NextRequest) {
    try {
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

        const body = await request.json();
        const { invoiceData: prepared, items, medical, companyDoc } = await prepareInvoiceWrite(databases, user.$id, body);
        const issueDate: string = typeof body.issue_date === "string" && body.issue_date ? body.issue_date : new Date().toISOString().slice(0, 10);

        // Sequential invoice number: allocate when blank, validate when explicit.
        let invoiceNumber: string = typeof body.invoice_number === "string" ? body.invoice_number.trim() : "";
        let allocatedSeq = 0;
        if (!invoiceNumber) {
            const allocated = await allocateInvoiceNumber(databases, user.$id, companyDoc, issueDate);
            invoiceNumber = allocated.number;
            allocatedSeq = allocated.seq;
        } else if (await numberExists(databases, user.$id, invoiceNumber)) {
            return NextResponse.json({ error: NUMBER_TAKEN_MESSAGE }, { status: 409 });
        }

        const invoiceId = ID.unique();
        const invoiceData: Record<string, unknown> = {
            userId: user.$id,
            ...prepared,
            invoiceNumber,
            issueDate,
            status: "draft",
            ...(medical ? { medicalData: JSON.stringify(medical) } : {}),
        };

        // Optional attributes that may not exist in all Appwrite schemas
        const optionalAttrs: Record<string, unknown> = {
            correctionType: null,
            correctsInvoiceId: null,
        };

        // Create invoice — handle 409 (duplicate from double-click) and unknown attributes
        const permissions = [
            Permission.read(Role.user(user.$id)),
            Permission.update(Role.user(user.$id)),
            Permission.delete(Role.user(user.$id)),
        ];

        try {
            await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.INVOICES,
                invoiceId,
                { ...invoiceData, ...optionalAttrs },
                permissions,
            );
        } catch (createError) {
            const errMsg = (createError as { message?: string })?.message || "";
            const errCode = (createError as { code?: number })?.code;

            if (errMsg.includes("Unknown attribute")) {
                await databases.createDocument(
                    DATABASE_ID,
                    COLLECTIONS.INVOICES,
                    invoiceId,
                    invoiceData,
                    permissions,
                );
            } else if (errCode === 409) {
                // Already exists from a previous attempt — return it as success
                return NextResponse.json({ id: invoiceId });
            } else {
                throw createError;
            }
        }

        // Create invoice items
        for (const item of items) {
            await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.INVOICE_ITEMS,
                ID.unique(),
                { invoiceId, ...item },
                [
                    Permission.read(Role.user(user.$id)),
                    Permission.update(Role.user(user.$id)),
                    Permission.delete(Role.user(user.$id)),
                ],
            );
        }

        if (allocatedSeq > 0) await advanceNumberCounter(databases, user.$id, allocatedSeq);
        invoiceNumber = await repairDuplicateNumber(databases, user.$id, invoiceId, invoiceNumber, companyDoc, issueDate);

        return NextResponse.json({ id: invoiceId, invoiceNumber });
    } catch (error) {
        if (error instanceof InvoiceWriteError) return NextResponse.json({ error: error.message }, { status: error.status });
        if (error instanceof IdentifierValidationError || error instanceof GoaeValidationError || error instanceof MedicalDataError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        console.error("Error creating invoice:", error);
        const appwriteError = error as {
            code?: number;
            type?: string;
            message?: string;
            response?: { message?: string };
        };
        if (appwriteError.code) {
            console.error("Appwrite error code:", appwriteError.code);
            console.error("Appwrite error type:", appwriteError.type);
        }
        let userMessage = "Fehler beim Erstellen der Rechnung";
        let statusCode = 500;
        if (appwriteError.code === 401 || appwriteError.code === 403) {
            userMessage = "Sitzung abgelaufen – bitte erneut anmelden";
            statusCode = 401;
        } else if (appwriteError.code === 400 && /Unknown attribute: "?(goaeData|medicalData)/.test(appwriteError.message || "")) {
            userMessage = "Datenbankschema für GOÄ/Diagnosen fehlt – bitte `npm run migrate:medical` ausführen";
            statusCode = 400;
        } else if (appwriteError.code === 400) {
            userMessage = appwriteError.response?.message || appwriteError.message || "Ungültige Daten – bitte alle Pflichtfelder prüfen";
            statusCode = 400;
        } else if (appwriteError.code === 404) {
            userMessage = "Patient oder Datenbank nicht gefunden – bitte Firmendaten unter Einstellungen prüfen";
            statusCode = 404;
        } else if (appwriteError.message) {
            userMessage = appwriteError.message;
        }
        return NextResponse.json(
            { error: userMessage, details: appwriteError.message || "Unknown error", code: appwriteError.code },
            { status: statusCode },
        );
    }
}
