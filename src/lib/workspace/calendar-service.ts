import type { Databases } from "node-appwrite";
import { atomic, WorkspaceStore, object, text, recordId } from "./store";
import { WorkspaceError } from "./repository";
import { validateEvent, occurrences, importCalendar, exportCalendar, type CalendarEvent } from "./calendar";
export async function calendarEvents(store: WorkspaceStore) {
    return (await store.rows()).filter(r => r.kind === "calendar").map(row => JSON.parse(row.payload) as CalendarEvent);
}
export async function calendarSnapshot(store: WorkspaceStore, from: string, to: string) {
    const rows = await store.rows();
    const events = rows.filter(r => r.kind === "calendar").map(r => JSON.parse(r.payload) as CalendarEvent);
    let items;
    try { items = occurrences(events, from, to); } catch (error) { throw new WorkspaceError((error as Error).message); }
    const tasks = rows.filter(r => r.kind === "tasks").map(r => JSON.parse(r.payload) as { id: string; title: string; status: string; due_date: string });
    const invoices = await store.list("invoices");
    const deadlines = [...tasks.filter(t => t.status !== "done" && t.due_date).map(t => ({ id: "task:" + t.id, title: t.title, date: t.due_date, href: "/dashboard/workspace?tab=tasks", kind: "task" })), ...invoices.filter(i => !["draft", "paid", "cancelled"].includes(i.status) && i.dueDate).map(i => ({ id: "invoice:" + i.$id, title: String(i.invoiceNumber), date: String(i.dueDate), href: "/dashboard/invoices/" + i.$id, kind: "invoice" }))].filter(d => d.date >= from.slice(0,10) && d.date < to.slice(0,10));
    return { events, items, deadlines };
}
export async function mutateCalendar(db: Databases, userId: string, input: unknown) {
    const raw = object(input);
    if (raw.action === "preview" || raw.action === "import") {
        const source = text(raw.source, 5 * 1024 * 1024, true), zone = text(raw.timeZone, 100, true);
        let parsed: CalendarEvent[];
        try { new Intl.DateTimeFormat("en", { timeZone: zone }); parsed = importCalendar(source, [], zone); }
        catch (error) { throw new WorkspaceError((error as Error).message); }
        const existing = await calendarEvents(new WorkspaceStore(db, userId));
        const known = new Set(existing.map(e => e.uid || e.id));
        const additions = parsed.filter(e => !known.has(e.id));
        if (raw.action === "preview") return { count: additions.length, skipped: parsed.length - additions.length, titles: additions.slice(0, 10).map(e => e.title) };
        let imported = 0, skipped = parsed.length - additions.length;
        // Small transactions fit Appwrite Free's operation budget. Retry skips committed UIDs.
        for (let offset = 0; offset < Math.min(additions.length, 40); offset += 40) {
            const batch = additions.slice(offset, offset + 40);
            try {
                const count = await atomic(db, userId, async store => {
                    let count = 0;
                    for (const e of batch) {
                        const id = recordId(userId, "calendar:" + e.id);
                        if (await store.find("calendar", id)) continue;
                        await store.put("calendar", { ...e, id, uid: e.id, updated_at: Date.now() }, false); count++;
                    }
                    return count;
                });
                imported += count; skipped += batch.length - count;
            } catch { return { imported, skipped, remaining: additions.length - offset, error: "Import unterbrochen. Bereits importierte Termine bleiben erhalten; erneuter Import überspringt sie." }; }
        }
        return { imported, skipped, remaining: Math.max(0, additions.length - 40) };
    }
    return atomic(db, userId, async store => {
        const id = raw.id ? text(raw.id, 100, true) : undefined;
        const previous = id ? await store.find<CalendarEvent>("calendar", id) : undefined;
        if (id && !previous) throw new WorkspaceError("Termin nicht gefunden.", 404);
        if (previous && raw.updated_at !== previous.updated_at) throw new WorkspaceError("Dieser Termin wurde geändert. Bitte neu laden.", 409);
        if (raw.action === "delete") {
            if (!previous) throw new WorkspaceError("Termin nicht gefunden.", 404);
            if (raw.occurrence && previous.repeat !== "none") {
                const day = text(raw.occurrence, 10, true);
                let value;
                try { value = validateEvent({ ...previous, exceptions: [...previous.exceptions, day] }, [previous]); } catch (error) { throw new WorkspaceError((error as Error).message); }
                await store.put("calendar", { ...value, uid: previous.uid, updated_at: Math.max(Date.now(), previous.updated_at + 1) }, true);
            } else await store.remove(previous.id);
            return null;
        }
        if (raw.action !== "save") throw new WorkspaceError("Unbekannte Aktion.");
        let event;
        try { event = validateEvent({ ...raw, exceptions: previous?.exceptions || [] }, previous ? [previous] : []); }
        catch (error) { throw new WorkspaceError((error as Error).message); }
        const result = { ...event, uid: previous?.uid || event.id, updated_at: Math.max(Date.now(), (previous?.updated_at || 0) + 1) };
        await store.put("calendar", result, !!previous); return result;
    });
}
export async function calendarExport(store: WorkspaceStore) { return exportCalendar(await calendarEvents(store)); }
