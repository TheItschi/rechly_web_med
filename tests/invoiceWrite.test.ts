import test from "node:test";
import assert from "node:assert/strict";
import type { Databases } from "node-appwrite";

// invoiceWrite imports the Appwrite server config, which validates these on load.
process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??= "http://localhost/v1";
process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ??= "test";
const lib = import("../src/lib/server/invoiceWrite");

type Row = { $id: string; [key: string]: unknown };

/** In-memory Appwrite stand-in with optional failure injection. */
function backend(seed: Record<string, Row[]> = {}) {
    const records: Record<string, Row[]> = { clients: [], user_company: [], invoices: [], invoice_items: [], ...seed };
    const fail: { create?: (fields: Record<string, unknown>, count: number) => Error | undefined; update?: Error } = {};
    let creates = 0;
    const db = {
        async getDocument(_db: string, collection: string, id: string) {
            const row = records[collection].find((r) => r.$id === id);
            if (!row) throw Object.assign(new Error("Document not found"), { code: 404 });
            return row;
        },
        async listDocuments(_db: string, collection: string, queries: string[]) {
            let rows = [...records[collection]].sort((a, b) => a.$id.localeCompare(b.$id));
            for (const query of queries.map((q) => JSON.parse(q))) {
                if (query.method === "equal") rows = rows.filter((row) => query.values.includes(row[query.attribute]));
                if (query.method === "cursorAfter") rows = rows.filter((row) => row.$id.localeCompare(query.values[0]) > 0);
            }
            return { documents: rows, total: rows.length };
        },
        async createDocument(_db: string, collection: string, id: string, fields: Record<string, unknown>) {
            const error = fail.create?.(fields, ++creates);
            if (error) throw error;
            records[collection].push({ $id: id, ...fields });
        },
        async updateDocument(_db: string, collection: string, id: string, fields: Record<string, unknown>) {
            if (fail.update) throw fail.update;
            Object.assign(records[collection].find((r) => r.$id === id)!, fields);
        },
        async deleteDocument(_db: string, collection: string, id: string) {
            records[collection] = records[collection].filter((r) => r.$id !== id);
        },
    } as unknown as Databases;
    return { db, records, fail };
}

const item = (description: string, price = 100) => ({ description, quantity: 1, price, tax_rate_percent: 19, discount_percent: 0 });
const draftSeed = () => ({
    invoices: [{ $id: "inv1", userId: "alice", status: "draft", invoiceNumber: "RE-1", totalGross: 119 }],
    invoice_items: [
        { $id: "old1", invoiceId: "inv1", description: "Alt 1" },
        { $id: "old2", invoiceId: "inv1", description: "Alt 2" },
        { $id: "other", invoiceId: "inv2", description: "Andere Rechnung" },
    ],
});

test("resolveInvoiceSource only accepts the user's own clients and requires items", async () => {
    const w = await lib;
    const { db } = backend({ clients: [{ $id: "c-alice", userId: "alice" }, { $id: "c-bob", userId: "bob" }] });
    await assert.rejects(w.resolveInvoiceSource(db, "alice", { client_id: "c-bob", items: [] }), (e: unknown) => e instanceof w.InvoiceWriteError && e.status === 404);
    await assert.rejects(w.resolveInvoiceSource(db, "alice", { client_id: "c-alice" }), (e: unknown) => e instanceof w.InvoiceWriteError && e.status === 400);
    const { items } = await w.resolveInvoiceSource(db, "alice", { client_id: "c-alice", items: [{ ...item("A"), gtin: " 4006381333931 " }] });
    assert.equal(items[0].gtin, "4006381333931");
});

test("buildInvoiceContent derives totals and the effective delivery date", async () => {
    const w = await lib;
    const { fields, deliveryDateStart, deliveryDateEnd } = w.buildInvoiceContent(
        { client_id: "c1", delivery_date_start: "2026-11-01", delivery_date_end: "2026-11-05" },
        [item("A", 100), { ...item("B", 50), quantity: 2 }],
        {},
    );
    assert.equal(fields.subtotal, 200);
    assert.equal(fields.totalVat, 38);
    assert.equal(fields.totalGross, 238);
    assert.equal(fields.deliveryDate, "2026-11-05");
    assert.equal(deliveryDateStart, "2026-11-01");
    assert.equal(deliveryDateEnd, "2026-11-05");
    assert.equal("eInvoiceData" in fields, false);
});

test("buildItemDocuments omits empty service dates", async () => {
    const w = await lib;
    const [plain, dated] = w.buildItemDocuments("inv1", [item("A"), { ...item("B"), service_date_start: "2026-11-01", service_date_end: "" }]);
    assert.equal("serviceDateStart" in plain, false);
    assert.equal(dated.serviceDateStart, "2026-11-01");
    assert.equal("serviceDateEnd" in dated, false);
    assert.equal(plain.total, 119);
});

test("createItemDocuments falls back for schemas without service-date attributes", async () => {
    const w = await lib;
    const { db, records, fail } = backend();
    fail.create = (fields) => ("serviceDateStart" in fields ? new Error('Invalid document structure: Unknown attribute: "serviceDateStart"') : undefined);
    const created = await w.createItemDocuments(db, "alice", w.buildItemDocuments("inv1", [{ ...item("A"), service_date_start: "2026-11-01" }]));
    assert.equal(created.length, 1);
    assert.equal(records.invoice_items[0].description, "A");
    assert.equal("serviceDateStart" in records.invoice_items[0], false);
});

test("replaceDraftItems swaps the items after the invoice update succeeded", async () => {
    const w = await lib;
    const { db, records } = backend(draftSeed());
    await w.replaceDraftItems(db, "alice", "inv1", w.buildItemDocuments("inv1", [item("Neu 1"), item("Neu 2"), item("Neu 3")]), () =>
        db.updateDocument("rechly-db", "invoices", "inv1", { totalGross: 357 }),
    );
    const own = records.invoice_items.filter((r) => r.invoiceId === "inv1").map((r) => r.description).sort();
    assert.deepEqual(own, ["Neu 1", "Neu 2", "Neu 3"]);
    assert.ok(records.invoice_items.some((r) => r.$id === "other"), "items of other invoices stay untouched");
    assert.equal(records.invoices[0].totalGross, 357);
});

test("replaceDraftItems rolls back created items when an item fails", async () => {
    const w = await lib;
    const { db, records, fail } = backend(draftSeed());
    fail.create = (_fields, count) => (count === 2 ? new Error("network error") : undefined);
    let updated = false;
    await assert.rejects(
        w.replaceDraftItems(db, "alice", "inv1", w.buildItemDocuments("inv1", [item("Neu 1"), item("Neu 2")]), async () => { updated = true; }),
        /network error/,
    );
    assert.equal(updated, false);
    assert.deepEqual(records.invoice_items.filter((r) => r.invoiceId === "inv1").map((r) => r.$id).sort(), ["old1", "old2"]);
});

test("replaceDraftItems rolls back created items when the invoice update fails", async () => {
    const w = await lib;
    const { db, records, fail } = backend(draftSeed());
    fail.update = new Error("update failed");
    await assert.rejects(
        w.replaceDraftItems(db, "alice", "inv1", w.buildItemDocuments("inv1", [item("Neu 1")]), () =>
            db.updateDocument("rechly-db", "invoices", "inv1", { totalGross: 119 }),
        ),
        /update failed/,
    );
    assert.deepEqual(records.invoice_items.filter((r) => r.invoiceId === "inv1").map((r) => r.$id).sort(), ["old1", "old2"]);
});

test("numberExists ignores the invoice being edited", async () => {
    const w = await lib;
    const { db } = backend({ invoices: [{ $id: "inv1", userId: "alice", invoiceNumber: "RE-1" }, { $id: "inv2", userId: "alice", invoiceNumber: "RE-2" }] });
    assert.equal(await w.numberExists(db, "alice", "RE-1", "inv1"), false);
    assert.equal(await w.numberExists(db, "alice", "RE-2", "inv1"), true);
    assert.equal(await w.numberExists(db, "bob", "RE-2"), false);
});
