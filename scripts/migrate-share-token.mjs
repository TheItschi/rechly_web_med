// Operator-only additive migration. Never expose schema changes as a public API.
// Adds the optional `shareToken` attribute used by public invoice links (/i/[token]).
import { Client, Databases } from "node-appwrite";
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const key = process.env.APPWRITE_API_KEY;
if (!endpoint || !project || !key) throw new Error("Set Appwrite endpoint, project and scoped API key in the environment.");
const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
try { await db.createStringAttribute("rechly-db", "invoices", "shareToken", 64, false); }
catch (error) { if (error.code !== 409) throw error; }
let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
    const value = await db.getAttribute("rechly-db", "invoices", "shareToken");
    if (value.type !== "string" || value.size < 64 || value.required) throw new Error("Incompatible attribute: invoices.shareToken");
    if (value.status === "available") { ready = true; break; }
    if (value.status === "failed" || value.status === "stuck") throw new Error("Attribute creation failed: invoices.shareToken");
    await new Promise(resolve => setTimeout(resolve, 1000));
}
if (!ready) throw new Error("Attribute still pending: invoices.shareToken; retry later.");
console.log("invoices.shareToken: ready");
