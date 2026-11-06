import { NextRequest, NextResponse } from "next/server";
import { ID, Permission, Query, Role } from "node-appwrite";
import {
    createSessionClient,
    createAdminClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";
import { calculateLineItemTotals } from "@/lib/currencyUtils";
import type {
    NormalizedMigrationClient,
    NormalizedMigrationExpense,
    NormalizedMigrationInvoice,
    NormalizedMigrationProduct,
} from "@/lib/migration/importer";

interface EntityImportCounters {
    inserted: number;
    skipped: number;
    failed: number;
}

export interface MigrationImportResult {
    clients: EntityImportCounters;
    products: EntityImportCounters;
    invoices: EntityImportCounters;
    expenses: EntityImportCounters;
    offers: EntityImportCounters;
    autoCreatedClients: number;
    companyRestored: boolean;
    errors: string[];
}

function normalizeLookupKey(str: unknown): string {
    return String(str ?? "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

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

        const user = await account.get();
        if (!user) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 },
            );
        }

        const { databases } = await createAdminClient();
        const body = await request.json();

        const skipDuplicates = body.skipDuplicates !== false;
        const incomingClients: NormalizedMigrationClient[] = Array.isArray(
            body.clients,
        )
            ? body.clients
            : [];
        const incomingProducts: NormalizedMigrationProduct[] = Array.isArray(
            body.products,
        )
            ? body.products
            : [];
        const incomingInvoices: NormalizedMigrationInvoice[] = Array.isArray(
            body.invoices,
        )
            ? body.invoices
            : [];
        const incomingExpenses: NormalizedMigrationExpense[] = Array.isArray(
            body.expenses,
        )
            ? body.expenses
            : [];
        const incomingOffers: Array<Record<string, unknown>> = Array.isArray(
            body.offers,
        )
            ? body.offers
            : [];
        const incomingCompany: Record<string, unknown> | null =
            body.company && typeof body.company === "object"
                ? body.company
                : null;

        const permissions = [
            Permission.read(Role.user(user.$id)),
            Permission.update(Role.user(user.$id)),
            Permission.delete(Role.user(user.$id)),
        ];

        const result: MigrationImportResult = {
            clients: { inserted: 0, skipped: 0, failed: 0 },
            products: { inserted: 0, skipped: 0, failed: 0 },
            invoices: { inserted: 0, skipped: 0, failed: 0 },
            expenses: { inserted: 0, skipped: 0, failed: 0 },
            offers: { inserted: 0, skipped: 0, failed: 0 },
            autoCreatedClients: 0,
            companyRestored: false,
            errors: [],
        };

        // 1. Optional Company Info restore (if user has no company yet or company is in backup)
        if (incomingCompany && incomingCompany.name) {
            try {
                const existingCompany = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.COMPANY_INFO,
                    [Query.equal("userId", user.$id), Query.limit(1)],
                );
                if (existingCompany.documents.length === 0) {
                    await databases.createDocument(
                        DATABASE_ID,
                        COLLECTIONS.COMPANY_INFO,
                        ID.unique(),
                        {
                            userId: user.$id,
                            name: String(incomingCompany.name || ""),
                            legalForm: incomingCompany.legal_form || null,
                            addressLine1: String(
                                incomingCompany.address_line1 || "—",
                            ),
                            addressLine2: incomingCompany.address_line2 || null,
                            postalCode: String(
                                incomingCompany.postal_code || "00000",
                            ),
                            city: String(incomingCompany.city || "Berlin"),
                            country: String(
                                incomingCompany.country || "Deutschland",
                            ),
                            email: String(
                                incomingCompany.email || user.email || "",
                            ),
                            phone: incomingCompany.phone || null,
                            website: incomingCompany.website || null,
                            vatId: incomingCompany.vat_id || null,
                            taxNumber: incomingCompany.tax_number || null,
                            commercialRegisterNumber:
                                incomingCompany.commercial_register_number ||
                                null,
                            registryCourt:
                                incomingCompany.registry_court || null,
                            managingDirectors:
                                incomingCompany.managing_directors || null,
                            bankName: incomingCompany.bank_name || null,
                            bankIban: String(
                                incomingCompany.bank_iban || "",
                            ).replace(/\s+/g, ""),
                            bankBic: incomingCompany.bank_bic || null,
                            logoBase64: incomingCompany.logo_base64 || null,
                            isSmallBusiness: Boolean(
                                incomingCompany.is_small_business,
                            ),
                            paymentTermsDefault:
                                incomingCompany.payment_terms_default || null,
                        },
                        permissions,
                    );
                    result.companyRestored = true;
                }
            } catch (err) {
                console.error("Failed to restore company info:", err);
            }
        }

        // Load existing clients for deduplication and invoice->client linking
        const existingClientsRes = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.CLIENTS,
            [Query.equal("userId", user.$id), Query.limit(5000)],
        );

        const clientByName = new Map<string, string>();
        const clientByEmail = new Map<string, string>();
        for (const doc of existingClientsRes.documents) {
            const normName = normalizeLookupKey(doc.name);
            if (normName) clientByName.set(normName, doc.$id);
            const normEmail = normalizeLookupKey(doc.email);
            if (normEmail) clientByEmail.set(normEmail, doc.$id);
        }

        // 2. Import Clients
        for (const c of incomingClients) {
            const name = String(c.name ?? "").trim();
            if (!name) continue;

            const normName = normalizeLookupKey(name);
            const normEmail = normalizeLookupKey(c.email);

            if (
                skipDuplicates &&
                (clientByName.has(normName) ||
                    (normEmail && clientByEmail.has(normEmail)))
            ) {
                result.clients.skipped += 1;
                continue;
            }

            try {
                const doc = await databases.createDocument(
                    DATABASE_ID,
                    COLLECTIONS.CLIENTS,
                    ID.unique(),
                    {
                        userId: user.$id,
                        name,
                        contactPerson: c.contact_person || null,
                        clientType: c.client_type || "b2b",
                        addressLine1: c.address_line1 || "—",
                        addressLine2: c.address_line2 || null,
                        postalCode: c.postal_code || "00000",
                        city: c.city || "Unbekannt",
                        country: c.country || "Deutschland",
                        email: c.email || null,
                        phone: c.phone || null,
                        vatId: c.vat_id || null,
                        taxNumber: c.tax_number || null,
                        leitwegId: c.leitweg_id || null,
                    },
                    permissions,
                );
                clientByName.set(normName, doc.$id);
                if (normEmail) clientByEmail.set(normEmail, doc.$id);
                result.clients.inserted += 1;
            } catch (err) {
                result.clients.failed += 1;
                result.errors.push(
                    `Kunde "${name}": ${err instanceof Error ? err.message : "Fehler"}`,
                );
            }
        }

        // 3. Import Products
        if (incomingProducts.length > 0) {
            const existingProductsRes = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.PRODUCTS,
                [Query.equal("userId", user.$id), Query.limit(5000)],
            );
            const existingProductNames = new Set(
                existingProductsRes.documents.map((p) =>
                    normalizeLookupKey(p.name),
                ),
            );

            for (const p of incomingProducts) {
                const name = String(p.name ?? "").trim();
                if (!name) continue;
                const normName = normalizeLookupKey(name);

                if (skipDuplicates && existingProductNames.has(normName)) {
                    result.products.skipped += 1;
                    continue;
                }

                try {
                    await databases.createDocument(
                        DATABASE_ID,
                        COLLECTIONS.PRODUCTS,
                        ID.unique(),
                        {
                            userId: user.$id,
                            name,
                            description: p.description || null,
                            price: Math.max(0, Number(p.price) || 0),
                            taxRatePercent: Number.isFinite(p.tax_rate_percent)
                                ? Number(p.tax_rate_percent)
                                : 19,
                            unitOfMeasure: p.unit_of_measure || "Stück",
                        },
                        permissions,
                    );
                    existingProductNames.add(normName);
                    result.products.inserted += 1;
                } catch (err) {
                    result.products.failed += 1;
                    result.errors.push(
                        `Produkt "${name}": ${err instanceof Error ? err.message : "Fehler"}`,
                    );
                }
            }
        }

        // Helper to resolve or auto-create a client for an invoice/offer
        const resolveOrCreateClientId = async (inv: {
            client_name: string;
            client_email?: string;
            client_address?: string;
            client_postal_code?: string;
            client_city?: string;
            client_country?: string;
            client_vat_id?: string;
            client_leitweg_id?: string;
        }): Promise<string> => {
            const cName = String(
                inv.client_name || "Importierter Kunde",
            ).trim();
            const normName = normalizeLookupKey(cName);
            const normEmail = normalizeLookupKey(inv.client_email);

            if (normName && clientByName.has(normName)) {
                return clientByName.get(normName)!;
            }
            if (normEmail && clientByEmail.has(normEmail)) {
                return clientByEmail.get(normEmail)!;
            }

            const newClientDoc = await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.CLIENTS,
                ID.unique(),
                {
                    userId: user.$id,
                    name: cName,
                    contactPerson: null,
                    clientType: inv.client_leitweg_id ? "b2g" : "b2b",
                    addressLine1: inv.client_address || "—",
                    addressLine2: null,
                    postalCode: inv.client_postal_code || "00000",
                    city: inv.client_city || "Unbekannt",
                    country: inv.client_country || "Deutschland",
                    email: inv.client_email || null,
                    phone: null,
                    vatId: inv.client_vat_id || null,
                    taxNumber: null,
                    leitwegId: inv.client_leitweg_id || null,
                },
                permissions,
            );
            clientByName.set(normName, newClientDoc.$id);
            if (normEmail) clientByEmail.set(normEmail, newClientDoc.$id);
            result.autoCreatedClients += 1;
            return newClientDoc.$id;
        };

        // 4. Import Outgoing Invoices
        if (incomingInvoices.length > 0) {
            const existingInvoicesRes = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.INVOICES,
                [Query.equal("userId", user.$id), Query.limit(5000)],
            );
            const existingInvoiceNumbers = new Set(
                existingInvoicesRes.documents.map((i) =>
                    normalizeLookupKey(i.invoiceNumber),
                ),
            );

            for (const inv of incomingInvoices) {
                const invNo = String(inv.invoice_number ?? "").trim();
                if (!invNo) continue;
                const normNo = normalizeLookupKey(invNo);

                if (skipDuplicates && existingInvoiceNumbers.has(normNo)) {
                    result.invoices.skipped += 1;
                    continue;
                }

                try {
                    const clientId = await resolveOrCreateClientId(inv);
                    const invoiceId = ID.unique();

                    await databases.createDocument(
                        DATABASE_ID,
                        COLLECTIONS.INVOICES,
                        invoiceId,
                        {
                            userId: user.$id,
                            clientId,
                            invoiceNumber: invNo,
                            issueDate: inv.issue_date,
                            dueDate: inv.due_date || inv.issue_date,
                            deliveryDate: inv.delivery_date || inv.issue_date,
                            subtotal: Number(inv.subtotal) || 0,
                            totalVat: Number(inv.total_vat) || 0,
                            totalGross: Number(inv.total_gross) || 0,
                            status: inv.status || "paid",
                            notes: inv.notes || null,
                            purchaseOrderRef: inv.purchase_order_ref || null,
                            paymentTerms: inv.payment_terms || null,
                        },
                        permissions,
                    );

                    const items =
                        Array.isArray(inv.items) && inv.items.length > 0
                            ? inv.items
                            : [
                                  {
                                      description: `Rechnung ${invNo}`,
                                      quantity: 1,
                                      unit_of_measure: "Pauschale",
                                      price: Number(inv.subtotal) || 0,
                                      tax_rate_percent: 19,
                                  },
                              ];

                    for (const item of items) {
                        const calc = calculateLineItemTotals(
                            Number(item.quantity) || 1,
                            Number(item.price) || 0,
                            Number.isFinite(item.tax_rate_percent)
                                ? Number(item.tax_rate_percent)
                                : 19,
                            Number(item.discount_percent) || 0,
                        );
                        await databases.createDocument(
                            DATABASE_ID,
                            COLLECTIONS.INVOICE_ITEMS,
                            ID.unique(),
                            {
                                invoiceId,
                                productId: null,
                                description:
                                    item.description || `Rechnung ${invNo}`,
                                quantity: Number(item.quantity) || 1,
                                unitOfMeasure:
                                    item.unit_of_measure || "Stück",
                                price: Number(item.price) || 0,
                                taxRatePercent: Number.isFinite(
                                    item.tax_rate_percent,
                                )
                                    ? Number(item.tax_rate_percent)
                                    : 19,
                                discountPercent:
                                    Number(item.discount_percent) || 0,
                                subtotal: calc.subtotal,
                                taxAmount: calc.taxAmount,
                                total: calc.total,
                            },
                            permissions,
                        );
                    }

                    existingInvoiceNumbers.add(normNo);
                    result.invoices.inserted += 1;
                } catch (err) {
                    result.invoices.failed += 1;
                    result.errors.push(
                        `Rechnung "${invNo}": ${err instanceof Error ? err.message : "Fehler"}`,
                    );
                }
            }
        }

        // 5. Import Offers (from full backup)
        if (incomingOffers.length > 0) {
            const existingOffersRes = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.OFFERS,
                [Query.equal("userId", user.$id), Query.limit(5000)],
            );
            const existingOfferNumbers = new Set(
                existingOffersRes.documents.map((o) =>
                    normalizeLookupKey(o.offerNumber),
                ),
            );

            for (const off of incomingOffers) {
                const offerNo = String(off.offer_number ?? "").trim();
                if (!offerNo) continue;
                const normNo = normalizeLookupKey(offerNo);

                if (skipDuplicates && existingOfferNumbers.has(normNo)) {
                    result.offers.skipped += 1;
                    continue;
                }

                try {
                    const clientId = await resolveOrCreateClientId({
                        client_name: String(
                            off.client_name || "Importierter Kunde",
                        ),
                        client_email: off.client_email
                            ? String(off.client_email)
                            : undefined,
                    });
                    const offerId = ID.unique();

                    await databases.createDocument(
                        DATABASE_ID,
                        COLLECTIONS.OFFERS,
                        offerId,
                        {
                            userId: user.$id,
                            clientId,
                            offerNumber: offerNo,
                            issueDate: String(off.issue_date || ""),
                            validUntil: off.valid_until
                                ? String(off.valid_until)
                                : null,
                            subtotal: Number(off.subtotal) || 0,
                            totalVat: Number(off.total_vat) || 0,
                            totalGross: Number(off.total_gross) || 0,
                            status: String(off.status || "draft"),
                            notes: off.notes ? String(off.notes) : null,
                            purchaseOrderRef: off.purchase_order_ref
                                ? String(off.purchase_order_ref)
                                : null,
                            paymentTerms: off.payment_terms
                                ? String(off.payment_terms)
                                : null,
                            convertedInvoiceId: null,
                        },
                        permissions,
                    );

                    const items = Array.isArray(off.items) ? off.items : [];
                    for (const rawItem of items) {
                        const item = rawItem as Record<string, unknown>;
                        const calc = calculateLineItemTotals(
                            Number(item.quantity) || 1,
                            Number(item.price) || 0,
                            Number(item.tax_rate_percent ?? 19),
                            Number(item.discount_percent) || 0,
                        );
                        await databases.createDocument(
                            DATABASE_ID,
                            COLLECTIONS.OFFER_ITEMS,
                            ID.unique(),
                            {
                                offerId,
                                productId: null,
                                description: String(
                                    item.description || `Angebot ${offerNo}`,
                                ),
                                quantity: Number(item.quantity) || 1,
                                unitOfMeasure: String(
                                    item.unit_of_measure || "Stück",
                                ),
                                price: Number(item.price) || 0,
                                taxRatePercent: Number(
                                    item.tax_rate_percent ?? 19,
                                ),
                                discountPercent:
                                    Number(item.discount_percent) || 0,
                                subtotal: calc.subtotal,
                                taxAmount: calc.taxAmount,
                                total: calc.total,
                            },
                            permissions,
                        );
                    }

                    existingOfferNumbers.add(normNo);
                    result.offers.inserted += 1;
                } catch (err) {
                    result.offers.failed += 1;
                    result.errors.push(
                        `Angebot "${offerNo}": ${err instanceof Error ? err.message : "Fehler"}`,
                    );
                }
            }
        }

        // 6. Import Expenses
        if (incomingExpenses.length > 0) {
            const existingExpensesRes = await databases
                .listDocuments(DATABASE_ID, COLLECTIONS.EXPENSES, [
                    Query.equal("userId", user.$id),
                    Query.limit(5000),
                ])
                .catch(() => ({ documents: [] }));

            const existingExpenseSignatures = new Set(
                existingExpensesRes.documents.map((e) =>
                    normalizeLookupKey(
                        `${e.date}|${e.vendorName}|${Number(e.amountGross).toFixed(2)}`,
                    ),
                ),
            );

            for (const exp of incomingExpenses) {
                const sig = normalizeLookupKey(
                    `${exp.date}|${exp.vendor_name}|${Number(exp.amount_gross).toFixed(2)}`,
                );
                if (skipDuplicates && existingExpenseSignatures.has(sig)) {
                    result.expenses.skipped += 1;
                    continue;
                }

                try {
                    await databases.createDocument(
                        DATABASE_ID,
                        COLLECTIONS.EXPENSES,
                        ID.unique(),
                        {
                            userId: user.$id,
                            date: exp.date,
                            vendorName: exp.vendor_name || "Lieferant",
                            description: exp.description || exp.vendor_name,
                            category: exp.category || "other",
                            amountNet: Number(exp.amount_net) || 0,
                            vatRatePercent: Number.isFinite(
                                exp.vat_rate_percent,
                            )
                                ? Number(exp.vat_rate_percent)
                                : 19,
                            vatAmount: Number(exp.vat_amount) || 0,
                            amountGross: Number(exp.amount_gross) || 0,
                            paymentMethod:
                                exp.payment_method || "bank_transfer",
                            receiptFileId: null,
                            notes: exp.notes || null,
                        },
                        permissions,
                    );
                    existingExpenseSignatures.add(sig);
                    result.expenses.inserted += 1;
                } catch (err) {
                    result.expenses.failed += 1;
                    result.errors.push(
                        `Ausgabe "${exp.vendor_name}": ${err instanceof Error ? err.message : "Fehler"}`,
                    );
                }
            }
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error in migration import:", error);
        return NextResponse.json(
            { error: "Failed to run migration import" },
            { status: 500 },
        );
    }
}
