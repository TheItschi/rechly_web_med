import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync("appwrite.config.json", "utf8")) as {
    tables: Array<{
        $id: string;
        columns: Array<{ key: string; type: string; required: boolean; size?: number; default?: unknown }>;
    }>;
};
const table = (id: string) => config.tables.find((t) => t.$id === id);
const setupSource = readFileSync("src/app/api/admin/setup-collections/route.ts", "utf8");

test("recurring item discountPercent is an optional double with a creatable default", () => {
    const ri = table("recurring_invoice_items");
    assert.ok(ri, "recurring_invoice_items table exists in config");
    const col = ri.columns.find((c) => c.key === "discountPercent");
    assert.ok(col, "discountPercent column declared (writers always send it)");
    assert.equal(col.type, "double");
    // Appwrite rejects defaults on required attributes — that was the prod failure.
    assert.equal(col.required, false);
});

test("invoice_templates payload is declared off-row sized, not an inline varchar", () => {
    const templates = table("invoice_templates");
    assert.ok(templates, "invoice_templates table exists in config");
    const payload = templates.columns.find((c) => c.key === "payload");
    assert.ok(payload, "payload column declared");
    assert.equal(payload.type, "string");
    // >= 100k forces off-row TEXT storage; a 16k varchar exceeds the row-size limit.
    assert.ok((payload.size ?? 0) >= 100_000, `payload size ${payload.size} would be stored inline`);
});

test("setup route creates both attributes in their creatable form", () => {
    // The recurring discount must not be created as required+default again.
    assert.doesNotMatch(setupSource, /"recurring_invoice_items",\s*"discountPercent",\s*true/);
    // Template payload must be created at the off-row size, not 16000.
    assert.match(setupSource, /"invoice_templates",\s*"payload",\s*1_000_000/);
});
