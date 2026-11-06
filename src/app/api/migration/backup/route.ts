import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import {
    createSessionClient,
    createAdminClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";
import type { RechlyBackupBundle } from "@/lib/migration/importer";

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

        const user = await account.get();
        if (!user) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 },
            );
        }

        const { databases } = await createAdminClient();

        const [
            companyRes,
            clientsRes,
            productsRes,
            invoicesRes,
            offersRes,
            expensesRes,
        ] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTIONS.COMPANY_INFO, [
                Query.equal("userId", user.$id),
                Query.limit(1),
            ]),
            databases.listDocuments(DATABASE_ID, COLLECTIONS.CLIENTS, [
                Query.equal("userId", user.$id),
                Query.limit(5000),
            ]),
            databases.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTS, [
                Query.equal("userId", user.$id),
                Query.limit(5000),
            ]),
            databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICES, [
                Query.equal("userId", user.$id),
                Query.orderDesc("$createdAt"),
                Query.limit(5000),
            ]),
            databases.listDocuments(DATABASE_ID, COLLECTIONS.OFFERS, [
                Query.equal("userId", user.$id),
                Query.orderDesc("$createdAt"),
                Query.limit(5000),
            ]),
            databases
                .listDocuments(DATABASE_ID, COLLECTIONS.EXPENSES, [
                    Query.equal("userId", user.$id),
                    Query.orderDesc("date"),
                    Query.limit(5000),
                ])
                .catch(() => ({ documents: [] })),
        ]);

        const clientById = new Map(
            clientsRes.documents.map((c) => [c.$id, c]),
        );

        const companyDoc = companyRes.documents[0];
        const company = companyDoc
            ? {
                  name: companyDoc.name,
                  legal_form: companyDoc.legalForm ?? undefined,
                  address_line1: companyDoc.addressLine1,
                  address_line2: companyDoc.addressLine2 ?? undefined,
                  postal_code: companyDoc.postalCode,
                  city: companyDoc.city,
                  country: companyDoc.country || "Deutschland",
                  email: companyDoc.email,
                  phone: companyDoc.phone ?? undefined,
                  website: companyDoc.website ?? undefined,
                  vat_id: companyDoc.vatId ?? undefined,
                  tax_number: companyDoc.taxNumber ?? undefined,
                  commercial_register_number:
                      companyDoc.commercialRegisterNumber ?? undefined,
                  registry_court: companyDoc.registryCourt ?? undefined,
                  managing_directors: companyDoc.managingDirectors ?? undefined,
                  bank_name: companyDoc.bankName ?? undefined,
                  bank_iban: companyDoc.bankIban,
                  bank_bic: companyDoc.bankBic ?? undefined,
                  logo_base64: companyDoc.logoBase64 ?? undefined,
                  is_small_business: companyDoc.isSmallBusiness ?? false,
                  payment_terms_default: companyDoc.paymentTermsDefault,
              }
            : null;

        const clients = clientsRes.documents.map((c) => ({
            name: String(c.name || ""),
            contact_person: c.contactPerson ?? undefined,
            client_type:
                c.clientType === "person"
                    ? ("person" as const)
                    : ("company" as const),
            address_line1: String(c.addressLine1 || "—"),
            address_line2: c.addressLine2 ?? undefined,
            postal_code: String(c.postalCode || "00000"),
            city: String(c.city || "Unbekannt"),
            country: String(c.country || "Deutschland"),
            email: c.email ?? undefined,
            phone: c.phone ?? undefined,
            vat_id: c.vatId ?? undefined,
            tax_number: c.taxNumber ?? undefined,
            leitweg_id: c.leitwegId ?? undefined,
        }));

        const products = productsRes.documents.map((p) => ({
            name: String(p.name || ""),
            description: p.description ?? undefined,
            price: Number(p.price ?? 0),
            tax_rate_percent: Number(p.taxRatePercent ?? 19),
            unit_of_measure: String(p.unitOfMeasure || "Stück"),
        }));

        // Fetch invoice line items
        const invoices = await Promise.all(
            invoicesRes.documents.map(async (inv) => {
                const itemsRes = await databases
                    .listDocuments(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, [
                        Query.equal("invoiceId", inv.$id),
                        Query.limit(500),
                    ])
                    .catch(() => ({ documents: [] }));

                const clientDoc = clientById.get(inv.clientId);

                return {
                    invoice_number: String(inv.invoiceNumber || ""),
                    issue_date: String(inv.issueDate || ""),
                    due_date: String(inv.dueDate || ""),
                    delivery_date: inv.deliveryDate ?? undefined,
                    status: inv.status || "paid",
                    client_name: String(
                        clientDoc?.name || "Importierter Kunde",
                    ),
                    client_email: clientDoc?.email ?? undefined,
                    client_address: clientDoc?.addressLine1 ?? undefined,
                    client_postal_code: clientDoc?.postalCode ?? undefined,
                    client_city: clientDoc?.city ?? undefined,
                    client_country: clientDoc?.country ?? undefined,
                    client_vat_id: clientDoc?.vatId ?? undefined,
                    client_leitweg_id: clientDoc?.leitwegId ?? undefined,
                    subtotal: Number(inv.subtotal ?? 0),
                    total_vat: Number(inv.totalVat ?? 0),
                    total_gross: Number(inv.totalGross ?? 0),
                    notes: inv.notes ?? undefined,
                    purchase_order_ref: inv.purchaseOrderRef ?? undefined,
                    payment_terms: inv.paymentTerms ?? undefined,
                    items: itemsRes.documents.map((item) => ({
                        description: String(item.description || "Position"),
                        quantity: Number(item.quantity ?? 1),
                        unit_of_measure: String(item.unitOfMeasure || "Stück"),
                        price: Number(item.price ?? 0),
                        tax_rate_percent: Number(item.taxRatePercent ?? 19),
                        discount_percent: Number(item.discountPercent ?? 0),
                    })),
                };
            }),
        );

        // Fetch offer line items
        const offers = await Promise.all(
            offersRes.documents.map(async (off) => {
                const itemsRes = await databases
                    .listDocuments(DATABASE_ID, COLLECTIONS.OFFER_ITEMS, [
                        Query.equal("offerId", off.$id),
                        Query.limit(500),
                    ])
                    .catch(() => ({ documents: [] }));

                const clientDoc = clientById.get(off.clientId);

                return {
                    offer_number: String(off.offerNumber || ""),
                    issue_date: String(off.issueDate || ""),
                    valid_until: off.validUntil ?? undefined,
                    status: off.status || "draft",
                    client_name: String(
                        clientDoc?.name || "Importierter Kunde",
                    ),
                    client_email: clientDoc?.email ?? undefined,
                    subtotal: Number(off.subtotal ?? 0),
                    total_vat: Number(off.totalVat ?? 0),
                    total_gross: Number(off.totalGross ?? 0),
                    notes: off.notes ?? undefined,
                    purchase_order_ref: off.purchaseOrderRef ?? undefined,
                    payment_terms: off.paymentTerms ?? undefined,
                    items: itemsRes.documents.map((item) => ({
                        description: String(item.description || "Position"),
                        quantity: Number(item.quantity ?? 1),
                        unit_of_measure: String(item.unitOfMeasure || "Stück"),
                        price: Number(item.price ?? 0),
                        tax_rate_percent: Number(item.taxRatePercent ?? 19),
                        discount_percent: Number(item.discountPercent ?? 0),
                    })),
                };
            }),
        );

        const expenses = expensesRes.documents.map((exp) => ({
            date: String(exp.date || ""),
            vendor_name: String(exp.vendorName || ""),
            description: String(exp.description || ""),
            category: exp.category || "other",
            amount_net: Number(exp.amountNet ?? 0),
            vat_rate_percent: Number(exp.vatRatePercent ?? 19),
            vat_amount: Number(exp.vatAmount ?? 0),
            amount_gross: Number(exp.amountGross ?? 0),
            payment_method: exp.paymentMethod || "bank_transfer",
            invoice_number: exp.invoiceNumber ?? undefined,
            notes: exp.notes ?? undefined,
        }));

        const bundle: RechlyBackupBundle = {
            rechlyBackupVersion: 1,
            exportedAt: new Date().toISOString(),
            sourceApp: "Rechly",
            company,
            clients,
            products,
            invoices,
            offers,
            expenses,
        };

        const dateStr = new Date().toISOString().slice(0, 10);
        return new NextResponse(JSON.stringify(bundle, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Content-Disposition": `attachment; filename="rechly-backup-${dateStr}.json"`,
            },
        });
    } catch (error) {
        console.error("Error generating backup bundle:", error);
        return NextResponse.json(
            { error: "Failed to generate backup" },
            { status: 500 },
        );
    }
}
