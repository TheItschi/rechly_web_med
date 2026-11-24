// Operator-only additive migration. Never expose schema changes as a public API.
// Fixes the two attributes the setup endpoint could not create:
//  - recurring_invoice_items.discountPercent was declared required+default,
//    which Appwrite rejects; created here as optional float with default 0.
//  - invoice_templates.payload at 16k chars exceeded MariaDB's inline
//    row-size limit; created at 1,000,000 so Appwrite stores it off-row
//    (TEXT), same pattern as scripts/migrate-einvoice.mjs.
// Also creates the invoice_templates collection/index if they are missing.
// Existing compatible attributes are accepted (409 = already there).
import { Client, Databases, IndexType, Permission, Role } from "node-appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const key = process.env.APPWRITE_API_KEY;
if (!endpoint || !project || !key) throw new Error("Set Appwrite endpoint, project and scoped API key in the environment.");
const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
const DB = "rechly-db";

async function waitAvailable(collection, attribute, check) {
    for (let attempt = 0; attempt < 60; attempt++) {
        const value = await db.getAttribute(DB, collection, attribute);
        check(value);
        if (value.status === "available") return;
        if (value.status === "failed" || value.status === "stuck") throw new Error(`Attribute creation failed: ${collection}.${attribute}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error(`Attribute still pending: ${collection}.${attribute}; retry later.`);
}

async function ensure(create, collection, attribute, check) {
    try { await create(); }
    catch (error) { if (error.code !== 409) throw error; }
    await waitAvailable(collection, attribute, check);
    console.log(`${collection}.${attribute}: ready`);
}

await ensure(
    () => db.createFloatAttribute(DB, "recurring_invoice_items", "discountPercent", false, undefined, undefined, 0),
    "recurring_invoice_items",
    "discountPercent",
    (value) => { if (value.type !== "double" && value.type !== "float") throw new Error("Incompatible attribute: recurring_invoice_items.discountPercent"); },
);

try {
    await db.createCollection(DB, "invoice_templates", "invoice_templates", [Permission.create(Role.users())], true);
    console.log("invoice_templates: collection created");
} catch (error) {
    if (error.code !== 409) throw error;
    console.log("invoice_templates: collection exists");
}
await ensure(
    () => db.createStringAttribute(DB, "invoice_templates", "userId", 64, true),
    "invoice_templates",
    "userId",
    (value) => { if (value.type !== "string") throw new Error("Incompatible attribute: invoice_templates.userId"); },
);
await ensure(
    () => db.createStringAttribute(DB, "invoice_templates", "name", 120, true),
    "invoice_templates",
    "name",
    (value) => { if (value.type !== "string") throw new Error("Incompatible attribute: invoice_templates.name"); },
);
await ensure(
    () => db.createStringAttribute(DB, "invoice_templates", "payload", 1_000_000, true),
    "invoice_templates",
    "payload",
    (value) => { if (value.type !== "string" || value.size < 16000) throw new Error("Incompatible attribute: invoice_templates.payload"); },
);
try {
    await db.createIndex(DB, "invoice_templates", "userId_idx", IndexType.Key, ["userId"], ["ASC"]);
    console.log("invoice_templates.userId_idx: created");
} catch (error) {
    if (error.code !== 409) throw error;
    console.log("invoice_templates.userId_idx: exists");
}
