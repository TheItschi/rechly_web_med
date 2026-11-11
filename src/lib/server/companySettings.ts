import { ID, Permission, Query, Role, type Databases, type Models } from "node-appwrite";
import { eInvoiceWrite, readEInvoiceData } from "../eRechnung/identifiers";

export class CompanySettingsError extends Error {
    constructor(message: string, public status = 400, public field?: string) {
        super(message);
    }
}

const fields = [
    ["name", "name", 255, "Firmenname", true],
    ["legal_form", "legalForm", 100, "Rechtsform"],
    ["address_line1", "addressLine1", 255, "Straße und Hausnummer", true],
    ["address_line2", "addressLine2", 255, "Adresszusatz"],
    ["postal_code", "postalCode", 20, "Postleitzahl", true],
    ["city", "city", 100, "Ort", true],
    ["country", "country", 100, "Land"],
    ["email", "email", 255, "E-Mail-Adresse", true],
    ["phone", "phone", 50, "Telefonnummer"],
    ["website", "website", 255, "Webseite"],
    ["vat_id", "vatId", 50, "Umsatzsteuer-ID"],
    ["tax_number", "taxNumber", 50, "Steuernummer"],
    ["commercial_register_number", "commercialRegisterNumber", 100, "Handelsregisternummer"],
    ["registry_court", "registryCourt", 100, "Registergericht"],
    ["managing_directors", "managingDirectors", 255, "Geschäftsführung"],
    ["bank_name", "bankName", 100, "Bankname"],
    ["bank_iban", "bankIban", 34, "IBAN", true],
    ["bank_bic", "bankBic", 11, "BIC"],
    ["payment_terms_default", "paymentTermsDefault", 500, "Zahlungsbedingungen"],
    ["logo_base64", "logoBase64", 5_000_000, "Logo"],
    ["invoice_number_prefix", "invoiceNumberPrefix", 32, "Rechnungsnummer-Präfix"],
    ["invoice_number_pattern", "invoiceNumberPattern", 64, "Rechnungsnummer-Format"],
] as const;

type CompanyDocument = Models.Document & Record<string, unknown>;
type CompanyDatabase = Pick<Databases, "listDocuments" | "createDocument" | "updateDocument">;
const databaseId = "rechly-db";
const collection = "user_company";

export function companyWrite(body: unknown, userId: string, existing?: CompanyDocument) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new CompanySettingsError("Die Firmendaten haben ein ungültiges Format.");
    }
    const input = body as Record<string, unknown>;
    const data: Record<string, unknown> = { userId };
    for (const definition of fields) {
        const [api, db, max, label] = definition;
        const required = definition.length === 5 && definition[4];
        if (input[api] === undefined) {
            if (required && !existing?.[db]) throw new CompanySettingsError(`${label}: Bitte ausfüllen.`, 400, api);
            continue; // A partial/older client must not erase fields it did not send.
        }
        let value = input[api];
        if (api === "payment_terms_default" && typeof value === "number" && Number.isFinite(value)) value = String(value);
        if (value != null && typeof value !== "string") throw new CompanySettingsError(`${label}: Bitte einen Text eingeben.`, 400, api);
        let text = typeof value === "string" ? value.trim() : "";
        if (api === "country" && !text) text = "Deutschland";
        if (api === "bank_iban" || api === "bank_bic") text = text.replace(/\s+/g, "").toUpperCase();
        if (required && !text) throw new CompanySettingsError(`${label}: Bitte ausfüllen.`, 400, api);
        if (text.length > max) throw new CompanySettingsError(`${label}: Höchstens ${max.toLocaleString("de-DE")} Zeichen erlaubt.`, 400, api);
        if (api === "bank_bic" && text && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(text)) {
            throw new CompanySettingsError("BIC: Bitte 8 oder 11 Zeichen ohne Leerzeichen eingeben.", 400, api);
        }
        // Unused optional fields must not require newer Appwrite attributes.
        // Explicitly clearing a previously stored value still writes null.
        if (text || existing?.[db]) data[db] = text || null;
    }
    if (!existing && data.country === undefined) data.country = "Deutschland";
    if (input.next_invoice_number !== undefined) {
        const value = input.next_invoice_number;
        if (value === null || value === "") {
            if (existing?.nextInvoiceNumber != null) data.nextInvoiceNumber = null;
        } else {
            const number = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
            if (!Number.isSafeInteger(number) || number < 1) {
                throw new CompanySettingsError("Nächste Rechnungsnummer: Bitte eine positive ganze Zahl eingeben.", 400, "next_invoice_number");
            }
            data.nextInvoiceNumber = number;
        }
    }
    if (input.is_small_business !== undefined) {
        if (typeof input.is_small_business !== "boolean") throw new CompanySettingsError("Kleinunternehmer: Ungültige Auswahl.", 400, "is_small_business");
        if (input.is_small_business || existing?.isSmallBusiness === true) data.isSmallBusiness = input.is_small_business;
    }
    const identifiers = eInvoiceWrite(input.e_invoice);
    if (identifiers.eInvoiceData !== undefined && (identifiers.eInvoiceData !== "{}" || Object.keys(readEInvoiceData(existing?.eInvoiceData)).length > 0)) {
        data.eInvoiceData = identifiers.eInvoiceData;
    }
    return data;
}

export function companyRead(doc: CompanyDocument) {
    const result: Record<string, unknown> = {
        id: doc.$id,
        e_invoice: readEInvoiceData(doc.eInvoiceData),
        is_small_business: doc.isSmallBusiness ?? false,
        next_invoice_number: doc.nextInvoiceNumber ?? undefined,
        created_at: new Date(doc.$createdAt).getTime(),
        updated_at: new Date(doc.$updatedAt).getTime(),
    };
    for (const [api, db] of fields) result[api] = doc[db] ?? undefined;
    result.country = doc.country || "Deutschland";
    return result;
}

export async function saveCompanySettings(db: CompanyDatabase, userId: string, body: unknown) {
    const existing = await db.listDocuments<CompanyDocument>(databaseId, collection, [Query.equal("userId", userId), Query.limit(1)]);
    const current = existing.documents[0];
    const data = companyWrite(body, userId, current);
    const doc = current
        ? await db.updateDocument<CompanyDocument>(databaseId, collection, current.$id, data)
        : await db.createDocument<CompanyDocument>(databaseId, collection, ID.unique(), data, [
            Permission.read(Role.user(userId)), Permission.update(Role.user(userId)), Permission.delete(Role.user(userId)),
        ]);
    return companyRead(doc);
}

/** Translate only known backend failures; never expose raw upstream messages or values. */
export function companyFailure(error: unknown) {
    if (error instanceof CompanySettingsError) return error;
    const backend = error as { code?: number; type?: string; message?: string } | null;
    const message = typeof backend?.message === "string" ? backend.message : "";
    const definition = fields.find(([, db]) => message.includes(`"${db}"`) || message.includes(`'${db}'`));
    if (backend?.code === 400 && /Unknown attribute/i.test(message)) {
        return new CompanySettingsError("Die Firmeneinstellungen sind auf dem Server noch nicht vollständig eingerichtet. Bitte den Support kontaktieren; Ihre Eingaben wurden nicht gespeichert.", 503, definition?.[0] ?? (message.includes('"eInvoiceData"') ? "e_invoice" : undefined));
    }
    if (backend?.code === 400 && definition && /Invalid document structure|Invalid.*attribute|Attribute.*invalid/i.test(message)) {
        return new CompanySettingsError(`${definition[3]}: Der Server akzeptiert diesen Wert nicht. Bitte Format und Länge prüfen.`, 400, definition[0]);
    }
    if (backend?.code === 429) return new CompanySettingsError("Zu viele Anfragen. Bitte kurz warten und erneut speichern.", 429);
    return new CompanySettingsError("Die Firmendaten konnten momentan nicht gespeichert werden. Ihre Eingaben bleiben erhalten. Bitte erneut versuchen oder den Support kontaktieren.", 503);
}
