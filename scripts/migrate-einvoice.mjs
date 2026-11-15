// Operator-only additive migration. Never expose schema changes as a public API.
import { Client, Databases } from "node-appwrite";
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const key = process.env.APPWRITE_API_KEY;
if (!endpoint || !project || !key) throw new Error("Set Appwrite endpoint, project and scoped API key in the environment.");
const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
// Payloads are validated to 16,000 characters in the app, but the attributes
// are created much larger so Appwrite stores them off-row (TEXT) instead of
// as inline VARCHARs that can exceed MariaDB's row-size limit on wide
// collections (attribute_limit_exceeded). Existing attributes of at least
// the payload limit are accepted as compatible.
for (const [collection, attribute, createSize, minSize] of [
    ["clients", "eInvoiceData", 1000000, 16000],
    ["user_company", "eInvoiceData", 1000000, 16000],
    ["invoices", "eInvoiceData", 1000000, 16000],
    ["invoice_items", "gtin", 14, 14],
]) {
    try { await db.createStringAttribute("rechly-db", collection, attribute, createSize, false); }
    catch (error) { if (error.code !== 409) throw error; }
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
        const value = await db.getAttribute("rechly-db", collection, attribute);
        if (value.type !== "string" || value.size < minSize || value.required) throw new Error(`Incompatible attribute: ${collection}.${attribute}`);
        if (value.status === "available") { ready = true; break; }
        if (value.status === "failed" || value.status === "stuck") throw new Error(`Attribute creation failed: ${collection}.${attribute}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!ready) throw new Error(`Attribute still pending: ${collection}.${attribute}; retry later.`);
    console.log(`${collection}.${attribute}: ready`);
}
