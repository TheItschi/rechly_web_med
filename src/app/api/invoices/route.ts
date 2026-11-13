import { IdentifierValidationError } from "@/lib/eRechnung/identifiers";
import { NextRequest, NextResponse } from "next/server";
import { Query, ID, Permission, Role, type Databases } from "node-appwrite";
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
    createItemDocuments,
    InvoiceWriteError,
    numberExists,
    NUMBER_TAKEN_MESSAGE,
    resolveInvoiceSource,
} from "@/lib/server/invoiceWrite";
import {
    DEFAULT_NUMBER_PATTERN,
    DEFAULT_NUMBER_PREFIX,
    formatInvoiceNumber,
    suggestNextSequence,
    validateNumberPattern,
} from "@/lib/invoiceNumbering";

/** Resolve effective pattern/prefix from a company doc with safe defaults. */
function resolveNumberFormat(
    company: unknown,
    dateISO: string,
    seq: number,
): string {
    const c = (company ?? {}) as Record<string, unknown>;
    const rawPattern = typeof c.invoiceNumberPattern === "string" ? c.invoiceNumberPattern : undefined;
    const pattern = rawPattern && validateNumberPattern(rawPattern) === null ? rawPattern : DEFAULT_NUMBER_PATTERN;
    const prefix =
        typeof c.invoiceNumberPrefix === "string" && c.invoiceNumberPrefix.trim()
            ? c.invoiceNumberPrefix.trim().slice(0, 32)
            : DEFAULT_NUMBER_PREFIX;
    return formatInvoiceNumber({ pattern, prefix, dateISO, seq });
}

/**
 * Allocate the next free invoice number for sequential numbering.
 * Check-then-create with bounded retries; a post-create duplicate check
 * repairs the rare concurrent-allocation race by renumbering this invoice.
 */
async function allocateInvoiceNumber(
    databases: Databases,
    userId: string,
    company: unknown,
    issueDate: string,
): Promise<{ number: string; seq: number }> {
    const c = (company ?? {}) as Record<string, unknown>;
    let seq =
        typeof c.nextInvoiceNumber === "number" && Number.isInteger(c.nextInvoiceNumber) && (c.nextInvoiceNumber as number) > 0
            ? (c.nextInvoiceNumber as number)
            : 1;
    for (let attempt = 0; attempt < 50; attempt++) {
        const candidate = resolveNumberFormat(company, issueDate, seq);
        const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICES, [
            Query.equal("userId", userId),
            Query.equal("invoiceNumber", candidate),
            Query.limit(1),
        ]);
        if (existing.total === 0) return { number: candidate, seq };
        seq += 1;
    }
    throw Object.assign(new Error("Keine freie Rechnungsnummer gefunden. Bitte Prefix oder Startnummer anpassen."), { code: 409 });
}

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
            delivery_date_start: doc.deliveryDateStart ?? undefined,
            delivery_date_end: doc.deliveryDateEnd ?? undefined,
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
        // Resolve only tenant-owned source records before taking an immutable identifier snapshot.
        const { identifiers, companyDoc, items } = await resolveInvoiceSource(databases, user.$id, body);
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
        const { fields, deliveryDateStart, deliveryDateEnd } = buildInvoiceContent(body, items, identifiers);
        const invoiceId = ID.unique();

        // Create invoice document with permissions
        // Build document data, keeping optional/newer attributes separate
        const invoiceData: Record<string, unknown> = {
            userId: user.$id,
            ...fields,
            invoiceNumber,
            issueDate,
            status: "draft",
        };

        // Newer invoice-level service-period attrs (may not exist pre-migration).
        const invoicePeriodAttrs: Record<string, unknown> = {
            ...(deliveryDateStart ? { deliveryDateStart } : {}),
            ...(deliveryDateEnd ? { deliveryDateEnd } : {}),
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
                { ...invoiceData, ...invoicePeriodAttrs, ...optionalAttrs },
                permissions,
            );
        } catch (createError) {
            const errMsg = (createError as { message?: string })?.message || "";
            const errCode = (createError as { code?: number })?.code;

            if (errMsg.includes("Unknown attribute")) {
                try {
                    await databases.createDocument(
                        DATABASE_ID,
                        COLLECTIONS.INVOICES,
                        invoiceId,
                        { ...invoiceData, ...optionalAttrs },
                        permissions,
                    );
                } catch (retryError) {
                    const retryMsg = (retryError as { message?: string })?.message || "";
                    if (!retryMsg.includes("Unknown attribute")) throw retryError;
                    await databases.createDocument(
                        DATABASE_ID,
                        COLLECTIONS.INVOICES,
                        invoiceId,
                        invoiceData,
                        permissions,
                    );
                }
            } else if (errCode === 409) {
                // Already exists from a previous attempt — return it as success.
                // (No invoice number: the conflicting document keeps the authoritative one.)
                return NextResponse.json({ id: invoiceId });
            } else {
                throw createError;
            }
        }

        // Create invoice items (service dates omitted when empty; unknown
        // attributes fall back for schemas that predate the migration).
        await createItemDocuments(databases, user.$id, buildItemDocuments(invoiceId, items));

        if (allocatedSeq > 0) {
            try {
                // Advance the counter past the allocated sequence number.
                const companyDocs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.COMPANY_INFO, [
                    Query.equal("userId", user.$id),
                    Query.limit(1),
                ]);
                const current = companyDocs.documents[0];
                if (current && (typeof current.nextInvoiceNumber !== "number" || current.nextInvoiceNumber <= allocatedSeq)) {
                    await databases.updateDocument(DATABASE_ID, COLLECTIONS.COMPANY_INFO, current.$id, {
                        nextInvoiceNumber: allocatedSeq + 1,
                    });
                }
            } catch {
                // Best effort only: the pre-create uniqueness check keeps numbering
                // correct even if the counter update is lost.
            }
        }

        // Self-healing duplicate detection: if a concurrent request created the
        // same number first, renumber this invoice instead of leaving a duplicate.
        try {
            const sameNumber = await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICES, [
                Query.equal("userId", user.$id),
                Query.equal("invoiceNumber", invoiceNumber),
                Query.limit(10),
            ]);
            const conflicts = sameNumber.documents.filter((d) => d.$id !== invoiceId);
            if (conflicts.length > 0) {
                const numbers = conflicts.map((d) =>
                    String((d as unknown as { invoiceNumber?: unknown }).invoiceNumber ?? ""),
                );
                const seq = suggestNextSequence([...numbers, invoiceNumber]);
                const repaired = resolveNumberFormat(companyDoc, issueDate, seq);
                if (!(await numberExists(databases, user.$id, repaired, invoiceId))) {
                    await databases.updateDocument(DATABASE_ID, COLLECTIONS.INVOICES, invoiceId, {
                        invoiceNumber: repaired,
                    });
                    invoiceNumber = repaired;
                }
            }
        } catch {
            // Verification is best effort; the number was unique at creation time.
        }

        return NextResponse.json({ id: invoiceId, invoiceNumber });
    } catch (error) {
        if (error instanceof IdentifierValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
        if (error instanceof InvoiceWriteError) return NextResponse.json({ error: error.message }, { status: error.status });
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
        } else if (appwriteError.code === 400) {
            userMessage = appwriteError.response?.message || appwriteError.message || "Ungültige Daten – bitte alle Pflichtfelder prüfen";
            statusCode = 400;
        } else if (appwriteError.code === 404) {
            userMessage = "Kunde oder Datenbank nicht gefunden – bitte Firmendaten unter Einstellungen prüfen";
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
