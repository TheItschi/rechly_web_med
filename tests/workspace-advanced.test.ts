import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Databases } from "node-appwrite";
import { getDesktopClients } from "../src/lib/desktop/appwrite-compat";
import { eraseGuestWorkspace, mutateWorkspace, readWorkspace } from "../src/lib/workspace/repository";
import { WorkspaceStore, DB, atomic } from "../src/lib/workspace/store";
import { mutateWork, readWork, deleteTimeInvoice } from "../src/lib/workspace/work";
import { mutateCalendar, calendarSnapshot, calendarExport } from "../src/lib/workspace/calendar-service";
import { timeCsv } from "../src/lib/workspace/work-types";
import { exportCalendar, validateEvent } from "../src/lib/workspace/calendar";

process.env.RECHLY_DATA_DIR = mkdtempSync(join(tmpdir(), "rechly-advanced-"));
const db = getDesktopClients().databases as unknown as Databases;
let serial = 0;
async function fixture() {
    const user = `test-${++serial}`;
    await db.createDocument(DB, "clients", user + "-client", { userId: user, name: "Müller" });
    await db.createDocument(DB, "user_company", user + "-company", { userId: user, isSmallBusiness: false });
    const p = await mutateWorkspace(db, user, { action: "save", collection: "projects", record: { name: "Website", client_id: user + "-client", description: "", status: "active", due_date: "", budget: 2000 } });
    return { user, project: p!.id, store: new WorkspaceStore(db, user) };
}
const entry = (project: string) => ({ action: "save", project_id: project, description: "Beratung", date: "2026-11-08", minutes: 90, rate: 100, cost_rate: 40, billable: true });
const event = () => ({ action: "save", title: "Planung", start: "2026-11-08T09:00", end: "2026-11-08T10:00", allDay: false, category: "work", location: "Büro", notes: "Grüße", repeat: "weekly", interval: 1, until: "", reminder: 15 });

test("time billing commits once under concurrency, locks entries, and draft deletion releases them", async () => {
    const f = await fixture();
    await mutateWork(db, f.user, entry(f.project));
    const saved = (await readWork(f.store)).entries[0];
    const bill = { action: "bill", project_id: f.project, entry_ids: [saved.id], issue_date: "2026-11-08", due_date: "2026-11-22", tax_rate: 19 };
    const results = await Promise.allSettled([mutateWork(db, f.user, bill), mutateWork(db, f.user, bill)]);
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    let data = await readWork(f.store);
    assert.equal(data.invoices.length, 1);
    assert.equal(data.invoices[0].subtotal, 150);
    assert.equal(data.entries[0].invoice_id, data.invoices[0].id);
    await assert.rejects(mutateWork(db, f.user, { ...entry(f.project), id: saved.id }), /gesperrt/);
    await assert.rejects(mutateWork(db, f.user, { action: "delete", id: saved.id }), /gelöscht/);
    await db.updateDocument(DB, "invoices", data.invoices[0].id, { status: "paid" });
    await assert.rejects(deleteTimeInvoice(db, f.user, data.invoices[0].id), /Rechnungsentwurfs/);
    await db.updateDocument(DB, "invoices", data.invoices[0].id, { status: "draft" });
    assert.equal(await deleteTimeInvoice(db, f.user, data.invoices[0].id), true);
    data = await readWork(f.store);
    assert.equal(data.invoices.length, 0); assert.equal(data.entries[0].invoice_id, "");
});
test("invoice write failure rolls back counter, entries, header and items", async () => {
    const f = await fixture(); await mutateWork(db, f.user, entry(f.project));
    const id = (await readWork(f.store)).entries[0].id;
    const broken = new Proxy(db, { get(target, key) {
        if (key === "createDocument") return async (...args: unknown[]) => { if (args[1] === "invoice_items") throw new Error("Test write failure"); return Reflect.apply(target.createDocument, target, args); };
        const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
    } });
    await assert.rejects(mutateWork(broken, f.user, { action: "bill", project_id: f.project, entry_ids: [id], issue_date: "2026-11-08", due_date: "2026-11-22" }), /Test write/);
    const data = await readWork(f.store);
    assert.equal(data.invoices.length, 0); assert.equal(data.entries[0].invoice_id, "");
    assert.equal((await f.store.rows()).filter(r => r.kind === "counters").length, 0);
});
test("one persistent timer per account; stale stop cannot stop a new timer", async () => {
    const f = await fixture();
    const results = await Promise.allSettled([mutateWork(db, f.user, { ...entry(f.project), action: "start" }), mutateWork(db, f.user, { ...entry(f.project), action: "start" })]);
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    const timer = (await readWork(new WorkspaceStore(db, f.user))).timer!;
    await assert.rejects(mutateWork(db, f.user, { action: "stop", token: timer.token, minutes: 1441, date: "2026-11-08" }));
    assert.equal((await readWork(f.store)).timer?.token, timer.token);
    await mutateWork(db, f.user, { action: "stop", token: timer.token, minutes: 30, date: "2026-11-08" });
    await mutateWork(db, f.user, { ...entry(f.project), action: "start" });
    await assert.rejects(mutateWork(db, f.user, { action: "cancel", token: timer.token }), /geändert/);
    const data = await readWork(f.store); assert.equal(data.entries.length, 1); assert.ok(data.timer);
});
test("tenant ownership, validation, invoice selection and project costs", async () => {
    const f = await fixture(), foreign = await fixture();
    await assert.rejects(mutateWork(db, f.user, entry(foreign.project)), /Projekt/);
    for (const patch of [{ date: "2026-02-31" }, { minutes: 0 }, { rate: Infinity }, { cost_rate: -1 }]) await assert.rejects(mutateWork(db, f.user, { ...entry(f.project), ...patch }));
    await mutateWork(db, f.user, { ...entry(f.project), description: "=SUM(A1)", billable: false });
    const id = (await readWork(f.store)).entries[0].id;
    await assert.rejects(mutateWork(db, foreign.user, { action: "delete", id }), /nicht gefunden/);
    await assert.rejects(mutateWork(db, f.user, { action: "bill", project_id: f.project, entry_ids: [id], issue_date: "2026-11-08", due_date: "2026-11-22" }), /nicht abrechenbare/);
    await mutateWork(db, f.user, { ...entry(f.project), id });
    await mutateWork(db, f.user, { action: "add_expense", project_id: f.project, vendor_name: "Druckerei", description: "Druck", date: "2026-11-08", amount_gross: 119, vat_rate: 19 });
    const data = await readWork(f.store), report = data.reports[0];
    assert.equal(report.labor, 60); assert.equal(report.costs, 100); assert.equal(report.value, 150); assert.equal(report.contribution, -10); assert.equal(report.budgetRemaining, 1840);
    await assert.rejects(mutateWork(db, foreign.user, { action: "link_expense", project_id: foreign.project, expense_id: data.expenses[0].id }));
    assert.equal((await readWork(foreign.store)).expenses.length, 0);
    assert.match(timeCsv({ ...data, entries: [{ ...data.entries[0], description: "=SUM(A1)" }] }), /'\=SUM/);
});
test("calendar recurrence, stale edits, exclusions, ICS preview/deduplication and tenant isolation", async () => {
    const f = await fixture(), other = await fixture();
    await mutateCalendar(db, f.user, event());
    let data = await calendarSnapshot(f.store, "2026-11-01T00:00", "2026-12-01T00:00");
    assert.equal(data.items.length, 4);
    const saved = data.events[0];
    await assert.rejects(mutateCalendar(db, other.user, { ...saved, action: "save" }), /nicht gefunden/);
    await mutateCalendar(db, f.user, { action: "delete", id: saved.id, updated_at: saved.updated_at, occurrence: "2026-11-15" });
    await assert.rejects(mutateCalendar(db, f.user, { ...saved, action: "save", title: "Stale" }), /geändert/);
    data = await calendarSnapshot(f.store, "2026-11-01T00:00", "2026-12-01T00:00"); assert.equal(data.items.length, 3);
    const ics = await calendarExport(f.store);
    const preview = await mutateCalendar(db, other.user, { action: "preview", source: ics, timeZone: "Europe/Berlin" });
    assert.equal((preview as { count: number }).count, 1);
    await mutateCalendar(db, other.user, { action: "import", source: ics, timeZone: "Europe/Berlin" });
    await mutateCalendar(db, other.user, { action: "import", source: ics, timeZone: "Europe/Berlin" });
    assert.equal((await calendarSnapshot(other.store, "2026-11-01T00:00", "2026-12-01T00:00")).events.length, 1);
    await assert.rejects(mutateCalendar(db, other.user, { action: "import", source: ics.replace("FREQ=WEEKLY", "FREQ=WEEKLY;COUNT=3"), timeZone: "Europe/Berlin" }));
});
test("transactions fail closed on unsupported backends", async () => {
    const unavailable = { createTransaction: async () => { throw new Error("unsupported"); } } as unknown as Databases;
    let ran = false; await assert.rejects(atomic(unavailable, "owner", async () => { ran = true; }), /Transaktionen/); assert.equal(ran, false);
});

test("large ICS imports resume in bounded atomic batches without duplicating committed events", async () => {
    const f = await fixture();
    const source = exportCalendar(Array.from({ length: 81 }, (_, i) => validateEvent({ ...event(), exceptions: [], title: `Event ${i}` }, [])));
    const request = { action: "import", source, timeZone: "Europe/Berlin" };
    assert.deepEqual(await mutateCalendar(db, f.user, request), { imported: 40, skipped: 0, remaining: 41 });
    const broken = new Proxy(db, { get(target, key) {
        if (key === "updateTransaction") return async () => { throw new Error("Connection interrupted"); };
        const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
    } });
    const failed = await mutateCalendar(broken, f.user, request) as { imported: number; remaining: number; error: string };
    assert.equal(failed.imported, 0); assert.equal(failed.remaining, 41); assert.ok(failed.error);
    assert.deepEqual(await mutateCalendar(db, f.user, request), { imported: 40, skipped: 40, remaining: 1 });
    assert.deepEqual(await mutateCalendar(db, f.user, request), { imported: 1, skipped: 80, remaining: 0 });
    assert.deepEqual(await mutateCalendar(db, f.user, request), { imported: 0, skipped: 81, remaining: 0 });
    assert.equal((await f.store.rows()).filter(r => r.kind === "calendar").length, 81);
});

test("business views coexist with time/calendar records and guest cleanup removes all kinds", async () => {
    const f = await fixture(), other = await fixture();
    await mutateWork(db, f.user, entry(f.project));
    await mutateCalendar(db, f.user, event());
    await mutateWork(db, f.user, { ...entry(f.project), action: "start" });
    const data = await readWorkspace(db, f.user); assert.equal(data.projects.length, 1);
    await mutateWorkspace(db, f.user, { action: "save", collection: "tasks", record: { title: "Follow up", project_id: f.project, assignee: "", due_date: "", priority: "normal", status: "todo" } });
    assert.equal((await readWorkspace(db, f.user)).tasks.length, 1);
    assert.ok(await eraseGuestWorkspace(db, f.user) >= 5); assert.equal((await f.store.rows()).length, 0);
    assert.equal((await other.store.rows()).length, 1);
});
