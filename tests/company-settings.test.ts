import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { companyWrite, companyRead, companyFailure, saveCompanySettings, CompanySettingsError } from "../src/lib/server/companySettings";

const config = JSON.parse(readFileSync("appwrite.config.json", "utf8"));
function findCompany(value: unknown): { columns: { key: string; type: string; required: boolean; size?: number }[] } | undefined {
    if (value && typeof value === "object") {
        const object = value as Record<string, unknown>;
        if (object.$id === "user_company") return object as unknown as ReturnType<typeof findCompany>;
        for (const child of Object.values(object)) { const found = findCompany(child); if (found) return found; }
    }
    return undefined;
}
const columns = findCompany(config)!.columns;
const input = {
    name: "Beispiel Flächenwerbung GmbH", address_line1: "Musterstraße 10", postal_code: "50667", city: "Köln",
    email: "office@example.invalid", bank_iban: " de89 3704 0044 0532 0130 00 ", bank_bic: " coba de ff xxx ",
    payment_terms_default: "Zahlbar innerhalb von 14 Tagen.",
};
type Doc = Parameters<typeof companyRead>[0];
const doc = (data: Record<string, unknown> = {}) => ({ $id: "own", $createdAt: "2026-11-11T00:00:00Z", $updatedAt: "2026-11-11T00:00:00Z", ...data }) as Doc;
function backend(missing: string[] = [], initial?: Doc) {
    const rows = [doc({ $id: "other", userId: "other", name: "Other business" }), ...(initial ? [initial] : [])];
    const writes: Record<string, unknown>[] = [];
    function validate(data: Record<string, unknown>, existing?: Doc) {
        for (const [key, value] of Object.entries(data)) {
            const column = columns.find((col) => col.key === key && !missing.includes(key));
            if (!column) throw Object.assign(new Error(`Invalid document structure: Unknown attribute: "${key}"`), { code: 400 });
            if (value !== null && typeof value !== column.type) throw Error(`Wrong type for ${key}`);
            if (typeof value === "string" && value.length > (column.size ?? Infinity)) throw Error(`Too long: ${key}`);
        }
        for (const col of columns.filter((col) => col.required)) assert.ok(data[col.key] ?? existing?.[col.key], col.key);
    }
    const services = {
        async listDocuments(_: string, collection: string, queries: string[]) {
            assert.equal(collection, "user_company");
            const filter = queries.map((q) => JSON.parse(q)).find((q) => q.method === "equal");
            assert.equal(filter.attribute, "userId");
            return { documents: rows.filter((r) => r.userId === filter.values[0]) };
        },
        async createDocument(_: string, __: string, id: string, data: Record<string, unknown>, permissions: string[]) {
            validate(data); assert.ok(permissions.every((p) => p.includes('user:owner')));
            const result = doc({ ...data, $id: id }); rows.push(result); writes.push(data); return result;
        },
        async updateDocument(_: string, __: string, id: string, data: Record<string, unknown>) {
            const current = rows.find((r) => r.$id === id)!; assert.equal(current.userId, "owner");
            validate(data, current); Object.assign(current, data); writes.push(data); return current;
        },
    };
    return { db: services as unknown as Parameters<typeof saveCompanySettings>[0], rows, writes };
}

test("creates and updates a German company against the declared Appwrite schema; preserves tenant ownership", async () => {
    const fixture = backend();
    const saved = await saveCompanySettings(fixture.db, "owner", { ...input, userId: "other", id: "other" });
    assert.equal(saved.name, input.name); assert.equal(saved.bank_iban, "DE89370400440532013000"); assert.equal(saved.bank_bic, "COBADEFFXXX");
    await saveCompanySettings(fixture.db, "owner", { name: "Aktualisierte GmbH" });
    assert.equal(fixture.rows.find((r) => r.userId === "owner")!.name, "Aktualisierte GmbH");
    assert.equal(fixture.rows[0].name, "Other business");
    assert.equal(fixture.rows.length, 2);
});

test("unused newer optional fields do not block saving on older schemas", async () => {
    const fixture = backend(["eInvoiceData", "legalForm", "registryCourt", "isSmallBusiness"]);
    const saved = await saveCompanySettings(fixture.db, "owner", { ...input, legal_form: "", registry_court: null, is_small_business: false, e_invoice: { seller_identifier: { value: "" } } });
    assert.equal(saved.name, input.name);
    assert.equal(fixture.writes[0].eInvoiceData, undefined);
    await saveCompanySettings(fixture.db, "owner", { ...input, e_invoice: {} });
    assert.equal(fixture.rows.length, 2);
});

test("entered optional data is never silently discarded if a schema migration is missing", async () => {
    const fixture = backend(["eInvoiceData"]);
    await assert.rejects(saveCompanySettings(fixture.db, "owner", { ...input, e_invoice: { seller_identifier: { value: "SELLER-42" } } }), (error) => {
        assert.equal(companyFailure(error).status, 503); return true;
    });
    assert.equal(fixture.writes.length, 0);
});

test("updates preserve omitted logo, identifiers and small-business choice; explicit clears work", async () => {
    const existing = doc({ ...companyWrite(input, "owner"), eInvoiceData: '{"seller_identifier":{"value":"SELLER-42"}}', logoBase64: "data:image/png;base64,AAAA", isSmallBusiness: true });
    const fixture = backend([], existing);
    await saveCompanySettings(fixture.db, "owner", { name: "New name" });
    assert.equal(existing.logoBase64, "data:image/png;base64,AAAA"); assert.equal(existing.isSmallBusiness, true);
    assert.equal(existing.eInvoiceData, '{"seller_identifier":{"value":"SELLER-42"}}');
    await saveCompanySettings(fixture.db, "owner", { logo_base64: "", e_invoice: {}, is_small_business: false });
    assert.equal(existing.logoBase64, null); assert.equal(existing.eInvoiceData, "{}"); assert.equal(existing.isSmallBusiness, false);
});

test("long inputs, invalid BIC and wrong types are actionable validation failures before a write", async () => {
    for (const [field, value] of [["payment_terms_default", "a".repeat(501)], ["bank_bic", "BIC-INVALID"], ["name", {}], ["name", "   "], ["is_small_business", "false"]] as const) {
        const fixture = backend();
        await assert.rejects(saveCompanySettings(fixture.db, "owner", { ...input, [field]: value }), (error) => {
            assert.ok(error instanceof CompanySettingsError); assert.equal(error.field, field); assert.equal(error.status, 400); return true;
        });
        assert.equal(fixture.writes.length, 0);
    }
});

test("payment terms accept the full schema length and legacy numeric values are normalized", () => {
    assert.equal(companyWrite({ ...input, payment_terms_default: "x".repeat(500) }, "owner").paymentTermsDefault, "x".repeat(500));
    assert.equal(companyWrite({ ...input, payment_terms_default: 14 }, "owner").paymentTermsDefault, "14");
    assert.throws(() => companyWrite(null, "owner"), CompanySettingsError);
});

test("invoice numbering survives company edits and remains editable after integrating newer settings", () => {
    const existing = doc({ ...companyWrite(input, "owner"), invoiceNumberPrefix: "CN", invoiceNumberPattern: "{PREFIX}-{NUM:4}", nextInvoiceNumber: 42 });
    const edited = { ...existing, ...companyWrite({ name: "New name" }, "owner", existing) };
    assert.equal(companyRead(edited).invoice_number_prefix, "CN");
    assert.equal(companyRead(edited).invoice_number_pattern, "{PREFIX}-{NUM:4}");
    assert.equal(companyRead(edited).next_invoice_number, 42);
    const updated = companyWrite({ invoice_number_prefix: " RE ", invoice_number_pattern: "{YYYY}-{NUM}", next_invoice_number: "43" }, "owner", existing);
    assert.equal(updated.invoiceNumberPrefix, "RE");
    assert.equal(updated.invoiceNumberPattern, "{YYYY}-{NUM}");
    assert.equal(updated.nextInvoiceNumber, 43);
    assert.equal(companyWrite({ next_invoice_number: null }, "owner", existing).nextInvoiceNumber, null);
    const blank = companyWrite({ ...input, invoice_number_prefix: "", invoice_number_pattern: "", next_invoice_number: null }, "owner");
    assert.equal(blank.invoiceNumberPrefix, undefined);
    assert.equal(blank.invoiceNumberPattern, undefined);
    assert.equal(blank.nextInvoiceNumber, undefined);
    assert.throws(() => companyWrite({ next_invoice_number: -1 }, "owner", existing), CompanySettingsError);
});

test("upstream errors are useful without leaking raw values or secrets", () => {
    const failure = companyFailure({ code: 400, message: 'Invalid document structure: Attribute "bankBic" has invalid type. secret-value' });
    assert.equal(failure.field, "bank_bic"); assert.equal(failure.status, 400); assert.ok(!failure.message.includes("secret-value"));
    assert.equal(companyFailure({ code: 429 }).status, 429);
    assert.ok(!companyFailure(new Error("secret-key")).message.includes("secret-key"));
});
