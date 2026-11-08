// Operator-only, additive setup. Creates Termine tables; never touches existing collections.
// Usage: APPWRITE_API_ENDPOINT=... APPWRITE_API_KEY=<scoped schema key> node scripts/migrate-termine.mjs
// Requires a key with databases.read/write on the project (createCollection/Attribute/Index).
import { Client, Databases } from "node-appwrite";
const { APPWRITE_API_ENDPOINT: endpoint, APPWRITE_PROJECT_ID: project, APPWRITE_API_KEY: key } = process.env;
if (!endpoint || !project || !key) throw new Error("Configure Appwrite endpoint, project and a scoped schema API key.");
const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
const database = "rechly-db";

const TABLES = {
    termine_settings: { name: "Termine Business Settings", indexes: [] },
    termine_slugs: { name: "Termine Booking Slugs", indexes: [] },
    termine_services: { name: "Termine Services", indexes: [["termine_service_sort", "key", ["userId", "sortOrder"]]] },
    termine_staff: { name: "Termine Staff", indexes: [] },
    termine_hours: { name: "Termine Working Hours", indexes: [["termine_hours_kind", "key", ["userId", "kind"]]] },
    termine_blocks: { name: "Termine Blocked Time", indexes: [["termine_blocks_staff", "key", ["userId", "staffId"]]] },
    termine_appointments: { name: "Termine Appointments", indexes: [["termine_appt_owner", "key", ["userId", "startUtc"]], ["termine_appt_status", "key", ["userId", "status"]]] },
    termine_reservations: { name: "Termine Reservations", indexes: [["termine_res_owner", "key", ["userId", "staffId"]]] },
    termine_customers: { name: "Termine Customers", indexes: [["termine_customer_email", "key", ["userId", "customerEmail"]]] },
    termine_tokens: { name: "Termine Manage Tokens", indexes: [] },
    termine_outbox: { name: "Termine Notification Outbox", indexes: [["termine_outbox_pending", "key", ["status", "nextAttemptAt"]]] },
    termine_audit: { name: "Termine Audit Events", indexes: [["termine_audit_appt", "key", ["appointmentId"]]] },
};

async function ensureTable(id, name) {
    try {
        await db.createCollection(database, id, name, [], true);
        console.log("created table", id);
    } catch (error) {
        if (error.code !== 409) throw error;
    }
    const existing = await db.getCollection(database, id);
    if (!existing.documentSecurity || existing.$permissions.length) throw new Error(`${id} must use document security with no collection-level permissions.`);
}

async function ensureAttr(table, key, type, size, required, array = false) {
    try {
        if (type === "string") await db.createStringAttribute(database, table, key, size, required, undefined, array);
        else if (type === "integer") await db.createIntegerAttribute(database, table, key, required, undefined, undefined, array);
        else if (type === "boolean") await db.createBooleanAttribute(database, table, key, required, undefined, array);
        else if (type === "datetime") await db.createDatetimeAttribute(database, table, key, required, undefined, array);
        else if (type === "email") await db.createEmailAttribute(database, table, key, required, undefined, array);
    } catch (error) { if (error.code !== 409) throw error; }
    for (let i = 0; i < 90; i++) {
        const attr = await db.getAttribute(database, table, key);
        if (attr.type !== type && !(type === "email" && attr.type === "string")) throw new Error(`Incompatible attribute ${table}.${key}.`);
        if (attr.status === "available") return;
        if (["failed", "stuck"].includes(attr.status)) throw new Error(`Attribute failed: ${table}.${key}.`);
        await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error(`Attribute still pending: ${table}.${key}; rerun later.`);
}

async function ensureIndex(table, key, type, attributes) {
    try {
        await db.createIndex(database, table, key, type, attributes);
        console.log("created index", table, key);
    } catch (error) { if (error.code !== 409) throw error; }
    for (let i = 0; i < 90; i++) {
        const index = await db.getIndex(database, table, key);
        if (index.attributes.join() !== attributes.join()) throw new Error(`Incompatible index ${table}.${key}.`);
        if (index.status === "available") return;
        if (["failed", "stuck"].includes(index.status)) throw new Error(`Index failed: ${table}.${key}.`);
        await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error(`Index still pending: ${table}.${key}; rerun later.`);
}

const S = (k, size, required = false) => [k, "string", size, required, false];
const STR_ARR = (k, size) => [k, "string", size, false, true];
const I = (k, required = false) => [k, "integer", 0, required, false];
const B = (k, required = false) => [k, "boolean", 0, required, false];
const DT = (k, required = false) => [k, "datetime", 0, required, false];
const E = (k, required = false) => [k, "email", 0, required, false];

const COLUMNS = {
    termine_settings: [S("slug", 50, true), S("displayName", 200, true), S("timezone", 60, true), S("language", 5, true), I("slotIntervalMinutes", true), I("minNoticeMinutes", true), I("maxHorizonDays", true), I("cancelNoticeMinutes", true), I("rescheduleNoticeMinutes", true), S("confirmationMode", 20, true), B("allowAnyStaff", true), B("showPrices", true), B("enabled", true), B("published", true), S("currency", 10, true), S("description", 2000), S("contactEmail", 200), S("contactPhone", 40), S("address", 500), S("website", 300), S("logoFileId", 100), S("coverFileId", 100)],
    termine_slugs: [],
    termine_services: [S("name", 200, true), S("description", 2000), S("category", 100), I("durationMinutes", true), I("priceCents", true), S("currency", 10, true), I("prepMinutes", true), I("cleanupMinutes", true), B("active", true), B("publicVisible", true), STR_ARR("staffIds", 100), I("sortOrder", true)],
    termine_staff: [S("name", 200, true), S("description", 2000), B("active", true), B("bookable", true), STR_ARR("serviceIds", 100), S("color", 20)],
    termine_hours: [S("kind", 20, true), S("day", 5), S("date", 10), B("closed", true), S("periods", 4000), S("breaks", 4000)],
    termine_blocks: [S("staffId", 100), DT("startUtc", true), DT("endUtc", true), S("reason", 300)],
    termine_appointments: [S("serviceId", 100, true), S("staffId", 100, true), S("customerId", 100), S("customerName", 200, true), E("customerEmail", true), S("customerPhone", 40), S("customerNote", 500), DT("startUtc", true), DT("endUtc", true), S("businessTimezone", 60, true), I("durationMinutes", true), I("bufferMinutes", true), S("status", 30, true), S("serviceNameSnapshot", 200, true), I("servicePriceCents", true), S("currency", 10, true), S("source", 20, true), S("internalNote", 1000), S("linkedInvoiceId", 100), S("idempotencyKey", 100)],
    termine_reservations: [S("staffId", 100, true), DT("startUtc", true), S("appointmentId", 100, true)],
    termine_customers: [S("name", 200, true), E("customerEmail", true), S("phone", 40)],
    termine_tokens: [S("appointmentId", 100, true), S("purpose", 20, true), S("tokenHash", 100, true), DT("expiresAt", true)],
    termine_outbox: [S("kind", 60, true), S("appointmentId", 100, true), S("payload", 8000, true), S("status", 20, true), I("attempts", true), DT("nextAttemptAt"), S("lastError", 500)],
    termine_audit: [S("appointmentId", 100, true), S("action", 60, true), S("detail", 1000)],
};

for (const [table, def] of Object.entries(TABLES)) {
    await ensureTable(table, def.name);
    for (const [k, t, size, req, arr] of COLUMNS[table]) await ensureAttr(table, k, t, size, req, arr);
    for (const [key, type, attrs] of def.indexes) await ensureIndex(table, key, type, attrs);
}
// Booking correctness depends on transactions; fail fast on old servers.
const transaction = await db.createTransaction(60);
await db.updateTransaction(transaction.$id, false, true);
console.log("Termine schema ready. Set NEXT_PUBLIC_RECHLY_TERMINE_ENABLED=1 and rebuild/redeploy to enable it.");
