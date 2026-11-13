// Operator-only additive migration for the medical extension (GOÄ + ICD-10-GM).
// Diagnoses and Begründungen are health data: the attributes are created with
// Appwrite's at-rest encryption when the server supports it.
import { Client, Databases } from "node-appwrite";
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const key = process.env.APPWRITE_API_KEY;
if (!endpoint || !project || !key) throw new Error("Set Appwrite endpoint, project and scoped API key in the environment.");
const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
for (const [collection, attribute, size, encrypt = true] of [
    ["invoices", "medicalData", 16000],
    ["invoice_items", "goaeData", 4000],
    ["user_company", "professionalTitle", 255, false],
    ["user_company", "signatureBase64", 5000000, false],
    ["user_company", "invoiceNumberPrefix", 32, false],
    ["user_company", "invoiceNumberPattern", 64, false],
]) {
    try {
        await db.createStringAttribute("rechly-db", collection, attribute, size, false, undefined, false, encrypt);
    } catch (error) {
        if (error.code === 409) { /* exists */ }
        else if (error.code === 400 || error.code === 401) {
            console.warn(`${collection}.${attribute}: encryption not available (${error.message}) – creating unencrypted`);
            try { await db.createStringAttribute("rechly-db", collection, attribute, size, false); }
            catch (inner) { if (inner.code !== 409) throw inner; }
        } else throw error;
    }
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
        const value = await db.getAttribute("rechly-db", collection, attribute);
        if (value.type !== "string" || value.size < size || value.required) throw new Error(`Incompatible attribute: ${collection}.${attribute}`);
        if (value.status === "available") { ready = true; break; }
        if (value.status === "failed" || value.status === "stuck") throw new Error(`Attribute creation failed: ${collection}.${attribute}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!ready) throw new Error(`Attribute still pending: ${collection}.${attribute}; retry later.`);
    console.log(`${collection}.${attribute}: ready`);
}

// Counter for sequential invoice numbers (integer attribute).
try {
    await db.createIntegerAttribute("rechly-db", "user_company", "nextInvoiceNumber", false, 1);
} catch (error) {
    if (error.code !== 409) throw error;
}
console.log("user_company.nextInvoiceNumber: ready");
