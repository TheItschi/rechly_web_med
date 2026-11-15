// Operator-only additive migration. Never expose schema changes as a public API.
// Adds the invoice-numbering attributes on user_company (invoiceNumberPrefix,
// invoiceNumberPattern, nextInvoiceNumber). Without them, saving company
// settings that contain numbering values fails with "Unknown attribute".
import { Client, Databases } from "node-appwrite";
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const key = process.env.APPWRITE_API_KEY;
if (!endpoint || !project || !key) throw new Error("Set Appwrite endpoint, project and scoped API key in the environment.");
const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));

async function ensure(name, create) {
    try { await create(); }
    catch (error) { if (error.code !== 409) throw error; }
    for (let attempt = 0; attempt < 60; attempt++) {
        const value = await db.getAttribute("rechly-db", "user_company", name);
        if (value.status === "available") { console.log(`user_company.${name}: ready`); return; }
        if (value.status === "failed" || value.status === "stuck") throw new Error(`Attribute creation failed: user_company.${name}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error(`Attribute still pending: user_company.${name}; retry later.`);
}

await ensure("invoiceNumberPrefix", () => db.createStringAttribute("rechly-db", "user_company", "invoiceNumberPrefix", 32, false));
await ensure("invoiceNumberPattern", () => db.createStringAttribute("rechly-db", "user_company", "invoiceNumberPattern", 64, false));
await ensure("nextInvoiceNumber", () => db.createIntegerAttribute("rechly-db", "user_company", "nextInvoiceNumber", false));
