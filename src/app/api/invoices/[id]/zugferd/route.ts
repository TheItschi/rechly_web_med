import { readEInvoiceData } from "@/lib/eRechnung/identifiers";
import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import {
    createSessionClient,
    createAdminClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";
import { generateZUGFeRDPDF } from "@/lib/eRechnung/zugferd";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
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
        const user = await account.get();

        const doc = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.INVOICES,
            id,
        );
        if (doc.userId !== user.$id) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const [itemsRes, clientDoc, companyRes] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, [
                Query.equal("invoiceId", id),
                Query.limit(200),
            ]),
            databases
                .getDocument(DATABASE_ID, COLLECTIONS.CLIENTS, doc.clientId)
                .catch(() => null),
            databases.listDocuments(DATABASE_ID, COLLECTIONS.COMPANY_INFO, [
                Query.equal("userId", user.$id),
                Query.limit(1),
            ]),
        ]);

        if (clientDoc && clientDoc.userId !== user.$id) return NextResponse.json({ error: "Not found" }, { status: 404 });
        const companyDoc = companyRes.documents[0];
        if (!companyDoc) {
            return NextResponse.json(
                { error: "Company info not configured" },
                { status: 422 },
            );
        }

        const company = {
            id: companyDoc.$id,
            user_id: companyDoc.userId || "",
            name: companyDoc.name || "",
            address_line1: companyDoc.addressLine1 || companyDoc.address || "",
            address_line2: companyDoc.addressLine2 ?? undefined,
            postal_code: companyDoc.postalCode || "",
            city: companyDoc.city || "",
            country: companyDoc.country || "DE",
            email: companyDoc.email || undefined,
            phone: companyDoc.phone ?? undefined,
            managing_directors: companyDoc.managingDirectors ?? undefined,
            is_small_business: companyDoc.isSmallBusiness ?? false,
            website: companyDoc.website ?? undefined,
            vat_id: companyDoc.vatId || undefined,
            tax_number: companyDoc.taxNumber || undefined,
            bank_iban: companyDoc.bankIban || undefined,
            bank_bic: companyDoc.bankBic ?? undefined,
            bank_name: companyDoc.bankName ?? undefined,
        logo_base64: companyDoc.logoBase64 ?? undefined,
            payment_terms_default: companyDoc.paymentTermsDefault ?? 14,
            invoice_number_prefix: companyDoc.invoiceNumberPrefix ?? "RE",
            next_invoice_number: companyDoc.nextInvoiceNumber ?? 1,
            datev_chart_of_accounts:
                companyDoc.datevChartOfAccounts ?? undefined,
            datev_consultant_number:
                companyDoc.datevConsultantNumber ?? undefined,
            datev_client_number: companyDoc.datevClientNumber ?? undefined,
            created_at: new Date(companyDoc.$createdAt).getTime(),
            updated_at: new Date(companyDoc.$updatedAt).getTime(),
        };

        const client = clientDoc
            ? {
                  id: clientDoc.$id,
                  name: clientDoc.name,
                  address_line1: clientDoc.addressLine1,
                  address_line2: clientDoc.addressLine2 ?? undefined,
                  postal_code: clientDoc.postalCode,
                  city: clientDoc.city,
                  country: clientDoc.country || "DE",
                  email: clientDoc.email ?? undefined,
                  vat_id: clientDoc.vatId ?? undefined,
                  leitweg_id: clientDoc.leitwegId ?? undefined,
                  created_at: 0,
                  updated_at: 0,
              }
            : undefined;

        const items = itemsRes.documents.map((item) => ({
            id: item.$id,
            invoice_id: id,
            description: item.description,
            gtin: item.gtin || undefined,
            quantity: item.quantity,
            unit_of_measure: item.unitOfMeasure || "C62",
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
            client_id: doc.clientId,
            invoice_number: doc.invoiceNumber,
            issue_date: doc.issueDate,
            due_date: doc.dueDate ?? undefined,
            subtotal: doc.subtotal ?? 0,
            total_vat: doc.totalVat ?? 0,
            total_gross: doc.totalGross ?? 0,
            status: doc.status || "draft",
            correction_type: doc.correctionType ?? null,
            corrects_invoice_id: doc.correctsInvoiceId ?? null,
            notes: doc.notes ?? undefined,
            payment_terms: doc.paymentTerms ?? undefined,
            purchase_order_ref: doc.purchaseOrderRef ?? undefined,
            delivery_date: doc.deliveryDate ?? undefined,
            created_at: 0,
            updated_at: 0,
            client,
            items,
        };

        const pdfBuffer = await generateZUGFeRDPDF(invoice, company);

        return new Response(new Uint8Array(pdfBuffer), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="zugferd-${doc.invoiceNumber}.pdf"`,
            },
        });
    } catch (error) {
        console.error("ZUGFeRD error:", error);
        const msg =
            error instanceof Error
                ? error.message
                : "Failed to generate ZUGFeRD PDF";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
