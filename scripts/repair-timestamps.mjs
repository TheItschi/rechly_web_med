#!/usr/bin/env node
/**
 * Restore original $createdAt / $updatedAt timestamps in self-hosted Appwrite
 * MariaDB from an export directory produced by scripts/export-cloud-backup.mjs.
 *
 * Official Appwrite migrations reset _createdAt/_updatedAt to migration time.
 * This script restores millisecond UTC timestamps per document $id and flushes
 * affected Redis document cache keys. Defaults to dry-run unless --apply is set.
 *
 * Usage:
 *   node scripts/repair-timestamps.mjs --export-dir .cache/appwrite-export \
 *     --project <project-id> --ssh <user@host> [--apply]
 */
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const argVal = (flag, fallback = "") => {
    const i = process.argv.indexOf(flag);
    return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const exportDir = argVal("--export-dir", ".cache/appwrite-export");
const projectUid = argVal("--project") || process.env.APPWRITE_PROJECT_ID || "";
const sshTarget = argVal("--ssh") || process.env.APPWRITE_SSH_TARGET || "";
const apply = process.argv.includes("--apply");

if (!/^[a-zA-Z0-9._-]{1,64}$/.test(projectUid) || !sshTarget) {
    console.error("Usage: node scripts/repair-timestamps.mjs --export-dir <dir> --project <id> --ssh <user@host> [--apply]");
    process.exit(2);
}

const TABLES = [
    "user_company", "clients", "products", "invoices", "invoice_items",
    "dunning_notices", "offers", "offer_items", "recurring_invoices",
    "recurring_invoice_items", "expenses", "bank_transactions",
];

function toMariaDbUtc(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid timestamp: ${iso}`);
    const formatted = d.toISOString().slice(0, 23).replace("T", " ");
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/.test(formatted)) {
        throw new Error(`Unexpected formatted timestamp: ${formatted}`);
    }
    return formatted;
}

const payload = {};
let totalRows = 0;

for (const table of TABLES) {
    const filePath = path.join(exportDir, `${table}.jsonl`);
    let raw = "";
    try {
        raw = await readFile(filePath, "utf8");
    } catch {
        continue;
    }
    const entries = [];
    for (const line of raw.split("\n")) {
        if (!line.trim()) continue;
        const doc = JSON.parse(line);
        const id = doc.$id;
        if (!/^[a-zA-Z0-9._-]{1,64}$/.test(id)) {
            throw new Error(`Unsafe $id in ${table}: ${id}`);
        }
        entries.push({
            id,
            createdAt: toMariaDbUtc(doc.$createdAt),
            updatedAt: toMariaDbUtc(doc.$updatedAt),
        });
    }
    if (entries.length > 0) {
        payload[table] = entries;
        totalRows += entries.length;
    }
}

console.log(`Prepared ${totalRows} timestamp records across ${Object.keys(payload).length} non-empty tables (${apply ? "APPLY" : "DRY-RUN"}).`);

const remotePy = `
import json, subprocess, sys

data = json.loads(sys.stdin.read())
project_uid = data["projectUid"]
apply_mode = data["apply"]
tables = data["payload"]

env = dict(
    l.split("=", 1)
    for l in open("/opt/appwrite/.env").read().splitlines()
    if "=" in l and not l.startswith("#")
)
db_pass = env["_APP_DB_PASS"]
db_user = env.get("_APP_DB_USER", "user")

def sql(query, stdin_sql=None):
    cmd = [
        "docker", "exec", "-i", "-e", f"MYSQL_PWD={db_pass}",
        "appwrite-mariadb", "mariadb", "-u", db_user, "-N", "-B", "appwrite"
    ]
    if query is not None:
        cmd.extend(["-e", query])
    return subprocess.check_output(cmd, input=stdin_sql, text=True).strip()

pid = sql(f"SELECT _id FROM \`_console_projects\` WHERE _uid = '{project_uid}';")
if not pid:
    raise RuntimeError(f"Project {project_uid} not found")

db_id = sql(f"SELECT _id FROM \`_{pid}_databases\` WHERE _uid = 'rechly-db';")
if not db_id:
    raise RuntimeError("Database rechly-db not found")

col_rows = sql(f"SELECT _uid, _id FROM \`_{pid}_database_{db_id}\`;").splitlines()
col_map = dict(r.split("\\t", 1) for r in col_rows if "\\t" in r)

for col_uid, entries in tables.items():
    col_id = col_map.get(col_uid)
    if not col_id:
        print(f"WARN: collection {col_uid} missing on destination")
        continue
    phys = f"_{pid}_database_{db_id}_collection_{col_id}"
    ids_csv = ",".join("'" + e["id"] + "'" for e in entries)
    matched = int(sql(f"SELECT COUNT(*) FROM \`{phys}\` WHERE _uid IN ({ids_csv});"))
    if not apply_mode:
        print(f"[dry-run] {col_uid} ({phys}): {matched}/{len(entries)} rows matched")
        continue
    stmts = ["START TRANSACTION;"]
    for e in entries:
        cid = e["id"]
        ca = e["createdAt"]
        ua = e["updatedAt"]
        stmts.append(
            f"UPDATE \`{phys}\` SET _createdAt = '{ca}', _updatedAt = '{ua}' WHERE _uid = '{cid}';"
        )
    stmts.append("COMMIT;")
    sql(None, "\\n".join(stmts))
    sample = sql(f"SELECT MIN(_createdAt), MAX(_updatedAt) FROM \`{phys}\` WHERE _uid IN ({ids_csv});")
    print(f"[applied] {col_uid} ({phys}): updated {matched}/{len(entries)} rows | range: {sample}")

if apply_mode:
    keys_out = subprocess.check_output(
        ["docker", "exec", "appwrite-redis", "redis-cli", "--scan", "--pattern", f"default-cache-:_{pid}::*database_{db_id}*"],
        text=True
    ).splitlines()
    keys = [k for k in keys_out if k.strip()]
    if keys:
        subprocess.run(
            ["docker", "exec", "-i", "appwrite-redis", "redis-cli", "DEL", *keys],
            check=True, stdout=subprocess.DEVNULL
        )
    print(f"Invalidated {len(keys)} Redis document cache keys for project _{pid}.")
`;

const b64Py = Buffer.from(remotePy, "utf8").toString("base64");
const res = spawnSync(
    "ssh",
    ["-o", "BatchMode=yes", sshTarget, `python3 -c "import base64; exec(base64.b64decode('${b64Py}'))"`],
    {
        input: JSON.stringify({ projectUid, apply, payload }),
        encoding: "utf8",
    },
);

if (res.stdout) process.stdout.write(res.stdout);
if (res.stderr) process.stderr.write(res.stderr);
if (res.status !== 0) process.exit(res.status ?? 1);
