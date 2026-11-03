import { IdentifierValidationError, parseGTIN, readEInvoiceData, snapshotIdentifiers } from "@/lib/eRechnung/identifiers";
import { NextRequest, NextResponse } from "next/server";
import { GoaeValidationError, normalizeGoaeLine } from "@/lib/goae/line";
import { MedicalDataError, normalizeMedicalData } from "@/lib/icd10";
import { loadGoaeCatalog } from "@/lib/server/goaeCatalogStore";
import { Query, ID, Permission, Role } from "node-appwrite";
import {
    createSessionClient,
    createAdminClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";
import { isCollectionNotFound } from "@/lib/appwrite-errors";
import {
    calculateInvoiceTotals,
    calculateLineItemTotals,
} from "@/lib/currencyUtils";

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
        // Resolve only tenant-owned source records before taking an immutable identifier snapshot.
        const customer = await databases.getDocument(DATABASE_ID, COLLECTIONS.CLIENTS, body.client_id);
        if (customer.userId !== user.$id) return NextResponse.json({ error: "Not found" }, { status: 404 });
        const companies = await databases.listDocuments(DATABASE_ID, COLLECTIONS.COMPANY_INFO, [Query.equal("userId", user.$id), Query.limit(1)]);
        const identifiers = snapshotIdentifiers(readEInvoiceData(customer.eInvoiceData), readEInvoiceData(companies.documents[0]?.eInvoiceData), body.e_invoice);
        if (!Array.isArray(body.items)) return NextResponse.json({ error: "Invalid items" }, { status: 400 });
        await loadGoaeCatalog(); // activates an uploaded GOÄ catalogue for price/points
        for (const item of body.items) {
            item.gtin = parseGTIN(item.gtin);
            // GOÄ lines: the price is always Einfachsatz × Steigerungssatz.
            if (item.goae) {
                const { data, unitPrice } = normalizeGoaeLine(item.goae);
                item.goae = data;
                item.price = unitPrice;
            }
        }
        const medical = normalizeMedicalData(body.medical);
        const invoiceId = ID.unique();

        // Calculate totals
        const totals = calculateInvoiceTotals(
            body.items.map(
                (item: {
                    quantity: number;
                    price: number;
                    tax_rate_percent: number;
                    discount_percent?: number;
                }) => ({
                    quantity: item.quantity,
                    price: item.price,
                    tax_rate_percent: item.tax_rate_percent,
                    discount_percent: item.discount_percent || 0,
                }),
            ),
        );

        // Create invoice document with permissions
        // Build document data, keeping optional/newer attributes separate
        const invoiceData: Record<string, unknown> = {
            userId: user.$id,
            ...(Object.keys(identifiers).length ? { eInvoiceData: JSON.stringify(identifiers) } : {}),
            clientId: body.client_id,
            invoiceNumber: body.invoice_number,
            issueDate: body.issue_date,
            dueDate: body.due_date || null,
            subtotal: totals.netAfterDiscount,
            totalVat: totals.totalVAT,
            totalGross: totals.totalGross,
            status: "draft",
            notes: body.notes || null,
            purchaseOrderRef: body.purchase_order_ref || null,
            deliveryDate: body.delivery_date || null,
            paymentTerms: body.payment_terms || null,
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
        for (const item of body.items) {
            const itemCalc = calculateLineItemTotals(
                item.quantity,
                item.price,
                item.tax_rate_percent,
                item.discount_percent || 0,
            );

            await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.INVOICE_ITEMS,
                ID.unique(),
                {
                    invoiceId: invoiceId,
                    productId: item.product_id || null,
                    description: item.description,
                    ...(item.gtin ? { gtin: item.gtin } : {}),
                    ...(item.goae ? { goaeData: JSON.stringify(item.goae) } : {}),
                    quantity: item.quantity,
                    unitOfMeasure: item.unit_of_measure || "Stück",
                    price: item.price,
                    taxRatePercent: item.tax_rate_percent,
                    discountPercent: item.discount_percent || 0,
                    subtotal: itemCalc.subtotal,
                    taxAmount: itemCalc.taxAmount,
                    total: itemCalc.total,
                },
                [
                    Permission.read(Role.user(user.$id)),
                    Permission.update(Role.user(user.$id)),
                    Permission.delete(Role.user(user.$id)),
                ],
            );
        }

        return NextResponse.json({ id: invoiceId });
    } catch (error) {
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
