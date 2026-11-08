#!/usr/bin/env node
/**
 * Source vs destination Appwrite migration verifier (read-only on both sides).
 *
 *   SRC_ENDPOINT=https://source.example.com/v1 SRC_PROJECT=... SRC_KEY=... \
 *   DST_ENDPOINT=https://dest.example.com/v1 DST_PROJECT=... DST_KEY=... \
 *   node scripts/verify-migration.mjs
 *
 * Prints counts and SHA-256 comparisons only. Exits 1 on any mismatch.
 */
import { Client, Databases, Users, Query } from "node-appwrite";
import { createHash } from "node:crypto";

const DATABASE_ID = "rechly-db";
const TABLES = [
    "user_company", "clients", "products", "invoices", "invoice_items",
    "dunning_notices", "offers", "offer_items", "recurring_invoices",
    "recurring_invoice_items", "expenses", "bank_transactions", "workspace_records",
];
const sha = (v) => createHash("sha256").update(v).digest("hex");

function makeSide(prefix) {
    const endpoint = process.env[`${prefix}_ENDPOINT`];
    const project = process.env[`${prefix}_PROJECT`];
    const key = process.env[`${prefix}_KEY`];
    if (!endpoint || !project || !key) {
        console.error(`Missing ${prefix}_ENDPOINT / ${prefix}_PROJECT / ${prefix}_KEY`);
        process.exit(2);
    }
    const client = new Client().setEndpoint(endpoint).setProject(project).setKey(key);
    return { databases: new Databases(client), users: new Users(client) };
}

async function listAll(fn, makeQueries) {
    const all = [];
    let cursor;
    for (;;) {
        const res = await fn(makeQueries(cursor));
        const docs = res.documents ?? res.users ?? [];
        all.push(...docs);
        if (docs.length < 100) break;
        const last = docs[docs.length - 1];
        if (!last || last.$id === cursor) throw new Error("Pagination did not advance");
        cursor = last.$id;
    }
    return all;
}

const src = makeSide("SRC");
const dst = makeSide("DST");
let failures = 0;
const report = [];

function check(item, srcVal, dstVal, notes = "") {
    const match = srcVal === dstVal;
    if (!match) failures++;
    report.push({ item, source: srcVal, destination: dstVal, match, notes });
}

try {
    const [su, du] = await Promise.all([
        listAll((q) => src.users.list(q), (c) => [Query.limit(100), ...(c ? [Query.cursorAfter(c)] : [])]),
        listAll((q) => dst.users.list(q), (c) => [Query.limit(100), ...(c ? [Query.cursorAfter(c)] : [])]),
    ]);
    check("users.count", su.length, du.length);
    check("users.ids", sha(su.map((u) => u.$id).sort().join("\n")), sha(du.map((u) => u.$id).sort().join("\n")));
    check("users.emailVerified", su.filter((u) => u.emailVerification).length, du.filter((u) => u.emailVerification).length);

    const srcUserIds = new Set(su.map((u) => u.$id));
    for (const table of TABLES) {
        const fetchRows = (side) => listAll(
            (q) => side.databases.listDocuments(DATABASE_ID, table, q),
            (c) => [Query.limit(100), Query.orderAsc("$id"), ...(c ? [Query.cursorAfter(c)] : [])],
        ).catch((e) => {
            if (e?.code === 404 || String(e).includes("not found")) return [];
            throw e;
        });
        const [sr, dr] = await Promise.all([fetchRows(src), fetchRows(dst)]);
        check(`${table}.count`, sr.length, dr.length);
        check(`${table}.ids`, sha(sr.map((r) => r.$id).sort().join("\n")), sha(dr.map((r) => r.$id).sort().join("\n")));
        check(
            `${table}.content(no-timestamps)`,
            sha(sr.map((r) => JSON.stringify({ ...r, $createdAt: "", $updatedAt: "" })).join("\n")),
            sha(dr.map((r) => JSON.stringify({ ...r, $createdAt: "", $updatedAt: "" })).join("\n")),
            "$createdAt/$updatedAt reset by official migration — compare via independent export",
        );
        const orphaned = dr.filter((r) => r.userId && !srcUserIds.has(r.userId)).length;
        check(`${table}.orphanedOwners`, 0, orphaned, "rows whose userId is not a migrated user");
    }

    console.table(report);
    console.log(failures === 0 ? "VERIFY: PASS" : `VERIFY: FAIL (${failures} mismatches)`);
    process.exit(failures === 0 ? 0 : 1);
} catch (e) {
    console.error("Verification error:", e?.message ?? e);
    process.exit(1);
}
