import { eInvoiceWrite, readEInvoiceData, IdentifierValidationError } from "@/lib/eRechnung/identifiers";
import { NextRequest, NextResponse } from "next/server";
import { Query, Permission, Role } from "node-appwrite";
import {
    createSessionClient,
    createAdminClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";

// GET company info
export async function GET() {
    try {
        let account;
        try {
            const sessionClient = await createSessionClient();
            account = sessionClient.account;
        } catch {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        const { databases } = await createAdminClient();

        // Get current user
        const user = await account.get();
        if (!user) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        // Get company info for this user
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.COMPANY_INFO,
            [Query.equal("userId", user.$id), Query.limit(1)]
        );

        if (response.documents.length === 0) {
            return NextResponse.json(null);
        }

        const doc = response.documents[0];
        const company = {
            id: doc.$id,
            e_invoice: readEInvoiceData(doc.eInvoiceData),
            name: doc.name,
            legal_form: doc.legalForm ?? undefined,
            address_line1: doc.addressLine1,
            address_line2: doc.addressLine2 ?? undefined,
            postal_code: doc.postalCode,
            city: doc.city,
            country: doc.country || "Deutschland",
            email: doc.email,
            phone: doc.phone ?? undefined,
            website: doc.website ?? undefined,
            vat_id: doc.vatId ?? undefined,
            tax_number: doc.taxNumber ?? undefined,
            commercial_register_number:
                doc.commercialRegisterNumber ?? undefined,
            registry_court: doc.registryCourt ?? undefined,
            managing_directors: doc.managingDirectors ?? undefined,
            bank_name: doc.bankName ?? undefined,
            bank_iban: doc.bankIban,
            bank_bic: doc.bankBic ?? undefined,
            logo_base64: doc.logoBase64 ?? undefined,
            professional_title: doc.professionalTitle ?? undefined,
            signature_base64: doc.signatureBase64 ?? undefined,
            invoice_number_prefix: doc.invoiceNumberPrefix ?? undefined,
            invoice_number_pattern: doc.invoiceNumberPattern ?? undefined,
            next_invoice_number: doc.nextInvoiceNumber ?? undefined,
            is_small_business: doc.isSmallBusiness ?? false,
            payment_terms_default: doc.paymentTermsDefault,
            created_at: new Date(doc.$createdAt).getTime(),
            updated_at: new Date(doc.$updatedAt).getTime(),
        };

        return NextResponse.json(company);
    } catch (error) {
        if (error instanceof IdentifierValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
        console.error("Error fetching company:", error);
        return NextResponse.json(
            { error: "Failed to fetch company" },
            { status: 500 }
        );
    }
}

// POST create or update company info
export async function POST(request: NextRequest) {
    try {
        let account;
        try {
            const sessionClient = await createSessionClient();
            account = sessionClient.account;
        } catch {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        const { databases } = await createAdminClient();

        // Get current user
        const user = await account.get();
        if (!user) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { ID } = await import("node-appwrite");

        // Check if company already exists
        const existing = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.COMPANY_INFO,
            [Query.equal("userId", user.$id), Query.limit(1)]
        );

        const data = {
            userId: user.$id,
            ...eInvoiceWrite(body.e_invoice),
            name: body.name,
            legalForm: body.legal_form || null,
            addressLine1: body.address_line1,
            addressLine2: body.address_line2 || null,
            postalCode: body.postal_code,
            city: body.city,
            country: body.country || "Deutschland",
            email: body.email,
            phone: body.phone || null,
            website: body.website || null,
            vatId: body.vat_id || null,
            taxNumber: body.tax_number || null,
            commercialRegisterNumber: body.commercial_register_number || null,
            registryCourt: body.registry_court || null,
            managingDirectors: body.managing_directors || null,
            bankName: body.bank_name || null,
            // Strip spaces: the BIC column holds 11 chars, e-invoices expect a compact IBAN
            bankIban: typeof body.bank_iban === "string" ? body.bank_iban.replace(/\s+/g, "").toUpperCase() : body.bank_iban,
            bankBic: body.bank_bic ? String(body.bank_bic).replace(/\s+/g, "").toUpperCase() : null,
            logoBase64: body.logo_base64 || null,
            // Briefkopf/Faksimile (Privatliquidation) – only sent when the client
            // knows these fields, so unmigrated Appwrite schemas keep working.
            ...("professional_title" in body ? { professionalTitle: body.professional_title || null } : {}),
            ...("signature_base64" in body ? { signatureBase64: body.signature_base64 || null } : {}),
            // Sequential numbering – only when the client sends these fields.
            ...("invoice_number_pattern" in body
                ? {
                      invoiceNumberPrefix:
                          typeof body.invoice_number_prefix === "string" && body.invoice_number_prefix.trim()
                              ? body.invoice_number_prefix.trim().slice(0, 32)
                              : null,
                      invoiceNumberPattern:
                          typeof body.invoice_number_pattern === "string" && body.invoice_number_pattern.trim()
                              ? body.invoice_number_pattern.trim().slice(0, 64)
                              : null,
                      nextInvoiceNumber:
                          Number.isInteger(Number(body.next_invoice_number)) && Number(body.next_invoice_number) > 0
                              ? Math.floor(Number(body.next_invoice_number))
                              : null,
                  }
                : {}),
            isSmallBusiness: !!body.is_small_business,
            paymentTermsDefault: body.payment_terms_default,
        };

        let doc;
        if (existing.documents.length > 0) {
            // Update existing
            doc = await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.COMPANY_INFO,
                existing.documents[0].$id,
                data
            );
        } else {
            // Create new with permissions
            doc = await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.COMPANY_INFO,
                ID.unique(),
                data,
                [
                    Permission.read(Role.user(user.$id)),
                    Permission.update(Role.user(user.$id)),
                    Permission.delete(Role.user(user.$id)),
                ]
            );
        }

        const company = {
            id: doc.$id,
            e_invoice: readEInvoiceData(doc.eInvoiceData),
            name: doc.name,
            legal_form: doc.legalForm ?? undefined,
            address_line1: doc.addressLine1,
            address_line2: doc.addressLine2 ?? undefined,
            postal_code: doc.postalCode,
            city: doc.city,
            country: doc.country || "Deutschland",
            email: doc.email,
            phone: doc.phone ?? undefined,
            website: doc.website ?? undefined,
            vat_id: doc.vatId ?? undefined,
            tax_number: doc.taxNumber ?? undefined,
            commercial_register_number:
                doc.commercialRegisterNumber ?? undefined,
            registry_court: doc.registryCourt ?? undefined,
            managing_directors: doc.managingDirectors ?? undefined,
            bank_name: doc.bankName ?? undefined,
            bank_iban: doc.bankIban,
            bank_bic: doc.bankBic ?? undefined,
            logo_base64: doc.logoBase64 ?? undefined,
            professional_title: doc.professionalTitle ?? undefined,
            signature_base64: doc.signatureBase64 ?? undefined,
            invoice_number_prefix: doc.invoiceNumberPrefix ?? undefined,
            invoice_number_pattern: doc.invoiceNumberPattern ?? undefined,
            next_invoice_number: doc.nextInvoiceNumber ?? undefined,
            is_small_business: doc.isSmallBusiness ?? false,
            payment_terms_default: doc.paymentTermsDefault,
            created_at: new Date(doc.$createdAt).getTime(),
            updated_at: new Date(doc.$updatedAt).getTime(),
        };

        return NextResponse.json(company);
    } catch (error) {
        if (error instanceof IdentifierValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
        console.error("Error saving company:", error);
        if (/Unknown attribute: "?(professionalTitle|signatureBase64|invoiceNumberPrefix|invoiceNumberPattern|nextInvoiceNumber)/.test((error as { message?: string })?.message || "")) {
            return NextResponse.json({ error: "Datenbankschema für Briefkopf/Faksimile/Rechnungsnummern fehlt – bitte `npm run migrate:medical` ausführen" }, { status: 400 });
        }
        return NextResponse.json(
            { error: "Failed to save company" },
            { status: 500 }
        );
    }
}
