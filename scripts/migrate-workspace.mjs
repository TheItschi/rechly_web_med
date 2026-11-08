// Operator-only, additive setup. No existing business collections are changed.
import { Client, Databases } from "node-appwrite";
const { NEXT_PUBLIC_APPWRITE_ENDPOINT: endpoint, NEXT_PUBLIC_APPWRITE_PROJECT_ID: project, APPWRITE_API_KEY: key } = process.env;
if (!endpoint || !project || !key) throw new Error("Configure Appwrite endpoint, project and a scoped schema API key.");
const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
const database = "rechly-db", collection = "workspace_records";
try { await db.createCollection(database, collection, "Optional workspace", [], true); }
catch (error) { if (error.code !== 409) throw error; }
const existing = await db.getCollection(database, collection);
if (!existing.documentSecurity || existing.$permissions.length) throw new Error("Workspace must use document security and no collection-level permissions.");
for (const [name, size] of [["userId", 100], ["kind", 20], ["payload", 160000]]) {
    try { await db.createStringAttribute(database, collection, name, size, true); }
    catch (error) { if (error.code !== 409) throw error; }
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
        const attr = await db.getAttribute(database, collection, name);
        if (attr.type !== "string" || attr.size < size || !attr.required) throw new Error(`Incompatible workspace attribute: ${name}`);
        if (attr.status === "available") { ready = true; break; }
        if (["failed", "stuck"].includes(attr.status)) throw new Error(`Attribute failed: ${name}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!ready) throw new Error(`Attribute still pending: ${name}; rerun later.`);
}
try { await db.createIndex(database, collection, "workspace_owner", "key", ["userId"]); }
catch (error) { if (error.code !== 409) throw error; }
let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
    const index = await db.getIndex(database, collection, "workspace_owner");
    if (index.type !== "key" || index.attributes.join() !== "userId") throw new Error("Incompatible workspace owner index.");
    if (index.status === "available") { ready = true; break; }
    if (["failed", "stuck"].includes(index.status)) throw new Error("Owner index creation failed.");
    await new Promise(resolve => setTimeout(resolve, 1000));
}
if (!ready) throw new Error("Owner index still pending; rerun later.");
console.log("Workspace ready. Set NEXT_PUBLIC_RECHLY_WORKSPACE_ENABLED=1 and rebuild/redeploy to enable it.");
