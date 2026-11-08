import { Query, type Databases } from "node-appwrite";
import { isTermineEnabled } from "../features";
import { T, TermineStore, type Row } from "../termine/store";
import { loadSettings, type AppointmentRow, type ServiceRow, type StaffRow } from "../termine/booking";
import { dateInTz, utcToWall } from "../termine/time";
import type { TermineStatus } from "../termine/types";
import { atomic, WorkspaceStore, object, text, recordId } from "./store";
import { WorkspaceError } from "./repository";
import { validateEvent, occurrences, importCalendar, exportCalendar, type CalendarEvent } from "./calendar";

export interface CalendarBookingItem {
    id: string;
    serviceId: string;
    staffId: string;
    staffName?: string;
    staffColor?: string;
    customerId?: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    customerNote?: string;
    internalNote?: string;
    startUtc: string;
    endUtc: string;
    wallStart: string;
    wallEnd: string;
    businessTimezone: string;
    durationMinutes: number;
    status: TermineStatus;
    serviceNameSnapshot: string;
    servicePriceCents: number;
    currency: string;
    linkedInvoiceId?: string;
}

export interface CalendarBlockItem {
    id: string;
    staffId?: string;
    staffName?: string;
    startUtc: string;
    endUtc: string;
    wallStart: string;
    wallEnd: string;
    reason?: string;
}

export async function calendarEvents(store: WorkspaceStore) {
    return (await store.rows())
        .filter((r) => r.kind === "calendar")
        .map((row) => JSON.parse(row.payload) as CalendarEvent);
}

export async function calendarSnapshot(store: WorkspaceStore, from: string, to: string) {
    const rows = await store.rows();
    const events = rows
        .filter((r) => r.kind === "calendar")
        .map((r) => JSON.parse(r.payload) as CalendarEvent);
    let items;
    try {
        items = occurrences(events, from, to);
    } catch (error) {
        throw new WorkspaceError((error as Error).message);
    }
    const tasks = rows
        .filter((r) => r.kind === "tasks")
        .map((r) => JSON.parse(r.payload) as { id: string; title: string; status: string; due_date: string });
    const invoices = await store.list("invoices").catch(() => []);
    const deadlines = [
        ...tasks
            .filter((t) => t.status !== "done" && t.due_date)
            .map((t) => ({
                id: "task:" + t.id,
                title: t.title,
                date: t.due_date,
                href: "/dashboard/workspace?tab=tasks",
                kind: "task",
            })),
        ...invoices
            .filter((i) => !["draft", "paid", "cancelled"].includes(i.status) && i.dueDate)
            .map((i) => ({
                id: "invoice:" + i.$id,
                title: String(i.invoiceNumber),
                date: String(i.dueDate),
                href: "/dashboard/invoices/" + i.$id,
                kind: "invoice",
            })),
    ].filter((d) => d.date >= from.slice(0, 10) && d.date < to.slice(0, 10));

    if (!isTermineEnabled()) {
        return {
            events,
            items,
            deadlines,
            bookings: [] as CalendarBookingItem[],
            blocks: [] as CalendarBlockItem[],
            staff: [] as Array<{ id: string; name: string; color?: string; active: boolean; bookable: boolean; serviceIds: string[] }>,
            services: [] as Array<{ id: string; name: string; durationMinutes: number; priceCents: number; currency: string; active: boolean; staffIds: string[] }>,
            termineConfigured: false,
            termineTimezone: "Europe/Berlin",
        };
    }

    const termine = new TermineStore(store.db, store.userId, store.transactionId);
    const utcLower = new Date(Date.parse(from.slice(0, 10) + "T00:00:00Z") - 36 * 3600 * 1000).toISOString();
    const utcUpper = new Date(Date.parse(to.slice(0, 10) + "T00:00:00Z") + 36 * 3600 * 1000).toISOString();

    const [settings, appts, blockRows, staffRows, serviceRows] = await Promise.all([
        loadSettings(termine).catch(() => null),
        termine
            .list<AppointmentRow>(T.APPOINTMENTS, [
                Query.greaterThanEqual("startUtc", utcLower),
                Query.lessThanEqual("startUtc", utcUpper),
                Query.orderAsc("startUtc"),
            ])
            .catch(() => [] as AppointmentRow[]),
        termine
            .list<Row & { staffId?: string; startUtc: string; endUtc: string; reason?: string }>(T.BLOCKS)
            .catch(() => [] as Array<Row & { staffId?: string; startUtc: string; endUtc: string; reason?: string }>),
        termine.list<StaffRow>(T.STAFF).catch(() => [] as StaffRow[]),
        termine.list<ServiceRow>(T.SERVICES).catch(() => [] as ServiceRow[]),
    ]);

    const tz = settings?.timezone || "Europe/Berlin";
    const staffById = new Map(staffRows.map((s) => [s.$id, s]));

    const bookings: CalendarBookingItem[] = appts
        .filter((a) => a.status !== "CANCELLED_BY_CUSTOMER" && a.status !== "CANCELLED_BY_BUSINESS")
        .map((a) => {
            const apptTz = a.businessTimezone || tz;
            const wallStart = `${dateInTz(a.startUtc, apptTz)}T${utcToWall(a.startUtc, apptTz)}`;
            const wallEnd = `${dateInTz(a.endUtc, apptTz)}T${utcToWall(a.endUtc, apptTz)}`;
            const st = staffById.get(a.staffId);
            return {
                id: a.$id,
                serviceId: a.serviceId,
                staffId: a.staffId,
                staffName: st?.name,
                staffColor: st?.color,
                customerId: a.customerId,
                customerName: a.customerName,
                customerEmail: a.customerEmail,
                customerPhone: a.customerPhone,
                customerNote: a.customerNote,
                internalNote: a.internalNote,
                startUtc: a.startUtc,
                endUtc: a.endUtc,
                wallStart,
                wallEnd,
                businessTimezone: apptTz,
                durationMinutes: a.durationMinutes,
                status: a.status,
                serviceNameSnapshot: a.serviceNameSnapshot,
                servicePriceCents: a.servicePriceCents,
                currency: a.currency,
                linkedInvoiceId: a.linkedInvoiceId,
            };
        })
        .filter((b) => b.wallStart < to && b.wallEnd > from);

    const blocks: CalendarBlockItem[] = blockRows
        .map((b) => {
            const wallStart = `${dateInTz(b.startUtc, tz)}T${utcToWall(b.startUtc, tz)}`;
            const wallEnd = `${dateInTz(b.endUtc, tz)}T${utcToWall(b.endUtc, tz)}`;
            return {
                id: b.$id,
                staffId: b.staffId || undefined,
                staffName: b.staffId ? staffById.get(b.staffId)?.name : undefined,
                startUtc: b.startUtc,
                endUtc: b.endUtc,
                wallStart,
                wallEnd,
                reason: b.reason,
            };
        })
        .filter((b) => b.wallStart < to && b.wallEnd > from);

    return {
        events,
        items,
        deadlines,
        bookings,
        blocks,
        staff: staffRows.map((s) => ({
            id: s.$id,
            name: s.name,
            color: s.color,
            active: s.active,
            bookable: s.bookable,
            serviceIds: s.serviceIds,
        })),
        services: serviceRows.map((s) => ({
            id: s.$id,
            name: s.name,
            durationMinutes: s.durationMinutes,
            priceCents: s.priceCents,
            currency: s.currency,
            active: s.active,
            staffIds: s.staffIds,
        })),
        termineConfigured: Boolean(settings),
        termineTimezone: tz,
    };
}

export async function mutateCalendar(db: Databases, userId: string, input: unknown) {
    const raw = object(input);
    if (raw.action === "preview" || raw.action === "import") {
        const source = text(raw.source, 5 * 1024 * 1024, true),
            zone = text(raw.timeZone, 100, true);
        let parsed: CalendarEvent[];
        try {
            new Intl.DateTimeFormat("en", { timeZone: zone });
            parsed = importCalendar(source, [], zone);
        } catch (error) {
            throw new WorkspaceError((error as Error).message);
        }
        const existing = await calendarEvents(new WorkspaceStore(db, userId));
        const known = new Set(existing.map((e) => e.uid || e.id));
        const additions = parsed.filter((e) => !known.has(e.id));
        if (raw.action === "preview")
            return {
                count: additions.length,
                skipped: parsed.length - additions.length,
                titles: additions.slice(0, 10).map((e) => e.title),
            };
        let imported = 0,
            skipped = parsed.length - additions.length;
        // Small transactions fit Appwrite Free's operation budget. Retry skips committed UIDs.
        for (let offset = 0; offset < Math.min(additions.length, 40); offset += 40) {
            const batch = additions.slice(offset, offset + 40);
            try {
                const count = await atomic(db, userId, async (store) => {
                    let count = 0;
                    for (const e of batch) {
                        const id = recordId(userId, "calendar:" + e.id);
                        if (await store.find("calendar", id)) continue;
                        await store.put("calendar", { ...e, id, uid: e.id, updated_at: Date.now() }, false);
                        count++;
                    }
                    return count;
                });
                imported += count;
                skipped += batch.length - count;
            } catch {
                return {
                    imported,
                    skipped,
                    remaining: additions.length - offset,
                    error: "Import unterbrochen. Bereits importierte Termine bleiben erhalten; erneuter Import überspringt sie.",
                };
            }
        }
        return { imported, skipped, remaining: Math.max(0, additions.length - 40) };
    }
    return atomic(db, userId, async (store) => {
        const id = raw.id ? text(raw.id, 100, true) : undefined;
        const previous = id ? await store.find<CalendarEvent>("calendar", id) : undefined;
        if (id && !previous) throw new WorkspaceError("Termin nicht gefunden.", 404);
        if (previous && raw.updated_at !== previous.updated_at)
            throw new WorkspaceError("Dieser Termin wurde geändert. Bitte neu laden.", 409);
        if (raw.action === "delete") {
            if (!previous) throw new WorkspaceError("Termin nicht gefunden.", 404);
            if (raw.occurrence && previous.repeat !== "none") {
                const day = text(raw.occurrence, 10, true);
                let value;
                try {
                    value = validateEvent({ ...previous, exceptions: [...previous.exceptions, day] }, [previous]);
                } catch (error) {
                    throw new WorkspaceError((error as Error).message);
                }
                await store.put(
                    "calendar",
                    { ...value, uid: previous.uid, updated_at: Math.max(Date.now(), previous.updated_at + 1) },
                    true,
                );
            } else await store.remove(previous.id);
            return null;
        }
        if (raw.action !== "save") throw new WorkspaceError("Unbekannte Aktion.");
        let event;
        try {
            event = validateEvent({ ...raw, exceptions: previous?.exceptions || [] }, previous ? [previous] : []);
        } catch (error) {
            throw new WorkspaceError((error as Error).message);
        }
        const result = {
            ...event,
            uid: previous?.uid || event.id,
            updated_at: Math.max(Date.now(), (previous?.updated_at || 0) + 1),
        };
        await store.put("calendar", result, !!previous);
        return result;
    });
}

export async function calendarExport(store: WorkspaceStore) {
    return exportCalendar(await calendarEvents(store));
}
