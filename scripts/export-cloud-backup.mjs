#!/usr/bin/env node
/**
 * Read-only Appwrite project export (users metadata, row JSONL, and optional files).
 * Never logs row contents — prints counts and SHA-256 checksums only.
 *
 * Usage:
 *   APPWRITE_API_ENDPOINT=https://source-appwrite.example.com/v1 \
 *   APPWRITE_PROJECT_ID=your-project-id APPWRITE_API_KEY=your-server-key \
 *   node scripts/export-cloud-backup.mjs [--out .cache/appwrite-export] [--include-files]
 */
import { Client, Databases, Storage, Users, Query } from "node-appwrite";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const endpoint = process.env.APPWRITE_API_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const project = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const key = process.env.APPWRITE_API_KEY;
if (!endpoint || !project || !key) {
    console.error("Missing APPWRITE_API_ENDPOINT / APPWRITE_PROJECT_ID / APPWRITE_API_KEY");
    process.exit(2);
}

const DATABASE_ID = "rechly-db";
const TABLES = [
    "user_company", "clients", "products", "invoices", "invoice_items",
    "dunning_notices", "offers", "offer_items", "recurring_invoices",
    "recurring_invoice_items", "expenses", "bank_transactions", "workspace_records",
];
const BUCKET = "receipts";
const outArg = process.argv.indexOf("--out");
const outDir = outArg > -1 ? process.argv[outArg + 1] : `.cache/appwrite-export-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const includeFiles = process.argv.includes("--include-files");

const client = new Client().setEndpoint(endpoint).setProject(project).setKey(key);
const databases = new Databases(client);
const users = new Users(client);
const storage = new Storage(client);
const sha = (v) => createHash("sha256").update(v).digest("hex");

await mkdir(outDir, { recursive: true });
if (includeFiles) await mkdir(path.join(outDir, "files"), { recursive: true });

async function listAll(fn, makeQueries) {
    const all = [];
    let cursor;
    for (;;) {
        const queries = makeQueries(cursor);
        const res = await fn(queries);
        const docs = res.documents ?? res.users ?? res.files ?? [];
        all.push(...docs);
        if (docs.length < 100) break;
        const last = docs[docs.length - 1];
        if (!last || last.$id === cursor) throw new Error("Pagination did not advance");
        cursor = last.$id;
    }
    return all;
}

const manifest = { endpoint, project, exportedAt: new Date().toISOString(), tables: {}, files: {}, users: {} };

try {
    const userList = await listAll((q) => users.list(q), (c) => [Query.limit(100), ...(c ? [Query.cursorAfter(c)] : [])]);
    manifest.users = {
        count: userList.length,
        idHash: sha(userList.map((u) => u.$id).sort().join("\n")),
        withOAuth: userList.filter((u) => (u.identities?.length ?? 0) > 0).length,
    };
    console.log(`users: ${userList.length}`);

    for (const table of TABLES) {
        try {
            const rows = await listAll(
                (q) => databases.listDocuments(DATABASE_ID, table, q),
                (c) => [Query.limit(100), Query.orderAsc("$id"), ...(c ? [Query.cursorAfter(c)] : [])],
            );
            await writeFile(path.join(outDir, `${table}.jsonl`), rows.map((r) => JSON.stringify(r)).join("\n"), "utf8");
            manifest.tables[table] = {
                count: rows.length,
                idHash: sha(rows.map((r) => r.$id).sort().join("\n")),
                contentHash: sha(rows.map((r) => JSON.stringify({ ...r, $createdAt: "", $updatedAt: "" })).join("\n")),
            };
            console.log(`${table}: ${rows.length}`);
        } catch (e) {
            if (String(e).includes("not found") || e?.code === 404) {
                manifest.tables[table] = { count: 0, note: "collection absent" };
                console.log(`${table}: absent`);
            } else throw e;
        }
    }

    const files = await listAll((q) => storage.listFiles(BUCKET, q), (c) => [Query.limit(100), ...(c ? [Query.cursorAfter(c)] : [])]);
    manifest.files = { count: files.length, totalBytes: files.reduce((s, f) => s + (f.sizeOriginal || 0), 0) };
    console.log(`files: ${files.length}`);
    if (includeFiles) {
        for (const f of files) {
            const buf = await storage.getFileDownload(BUCKET, f.$id);
            await writeFile(path.join(outDir, "files", f.$id), Buffer.from(buf));
        }
        console.log("file contents downloaded");
    }

    await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
    console.log(`DONE -> ${outDir} (manifest.json contains counts+hashes only)`);
} catch (e) {
    console.error("Export failed:", e?.message ?? e);
    process.exit(1);
}
