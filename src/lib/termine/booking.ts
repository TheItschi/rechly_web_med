import { Query } from "node-appwrite";
import {
    DB,
    T,
    TermineStore,
    atomic,
    newId,
    newToken,
    recordId,
    reservationId,
    tokenHash,
    type Row,
} from "./store";
import { TermineError } from "./store";
import { ACTIVE_STATUSES, canTransition, type TermineAppointment, type TermineStatus } from "./types";
import { computeAvailability, type AppointmentLike } from "./availability";
import { addMinutesUtc, canonicalInstant, dateInTz, dayjs, intervalsOverlap } from "./time";
import { findOrCreateCustomer } from "./customers";

/** Serialize overlapping intervals even when their starts differ. Guard rows persist;
 * every transaction writes a fresh revision so Appwrite detects concurrent changes. */
async function guardInterval(tx: TermineStore, staffId: string, start: string, end: string) {
    const first = Date.parse(start.slice(0, 10)),
        last = Date.parse(end.slice(0, 10));
    for (let day = first; day <= last; day += 86400000) {
        const startUtc = new Date(day).toISOString(),
            id = recordId(tx.userId, `guard:${staffId}:${startUtc}`);
        const fields = { userId: tx.userId, staffId, startUtc, appointmentId: newId() };
        try {
            await tx.own(T.RESERVATIONS, id);
            await tx.db.updateDocument(DB, T.RESERVATIONS, id, fields, undefined, tx.transactionId);
        } catch (error) {
            if (!(error instanceof TermineError && error.status === 404)) throw error;
            await tx.db.createDocument(DB, T.RESERVATIONS, id, fields, tx.perms(), tx.transactionId);
        }
    }
}

function instant(value: string) {
    try {
        return canonicalInstant(value);
    } catch {
        throw new TermineError("Ungültiger Zeitpunkt. Bitte Datum, Uhrzeit und Zeitzone prüfen.");
    }
}

export function prepMinutes(a: AppointmentRow) {
    const cleanup = Math.max(0, (Date.parse(a.endUtc) - Date.parse(a.startUtc)) / 60000 - a.durationMinutes);
    return Math.max(0, a.bufferMinutes - cleanup);
}

export interface ServiceRow extends Row {
    name: string;
    description?: string;
    category?: string;
    durationMinutes: number;
    priceCents: number;
    currency: string;
    prepMinutes: number;
    cleanupMinutes: number;
    active: boolean;
    publicVisible: boolean;
    staffIds: string[];
    sortOrder: number;
    productId?: string;
    taxRatePercent?: number;
}

export interface StaffRow extends Row {
    name: string;
    description?: string;
    active: boolean;
    bookable: boolean;
    serviceIds: string[];
    color?: string;
}

export interface HoursRow extends Row {
    kind: "week" | "override";
    day?: string;
    date?: string;
    closed: boolean;
    periods: string;
    breaks: string;
}

export interface SettingsRow extends Row {
    slug: string;
    displayName: string;
    timezone: string;
    language: string;
    slotIntervalMinutes: 15 | 30;
    minNoticeMinutes: number;
    maxHorizonDays: number;
    cancelNoticeMinutes: number;
    rescheduleNoticeMinutes: number;
    confirmationMode: "automatic" | "manual";
    allowAnyStaff: boolean;
    showPrices: boolean;
    enabled: boolean;
    published: boolean;
    currency: string;
}

export interface AppointmentRow extends Row {
    serviceId: string;
    staffId: string;
    customerId?: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    customerNote?: string;
    startUtc: string;
    endUtc: string;
    businessTimezone: string;
    durationMinutes: number;
    bufferMinutes: number;
    status: TermineStatus;
    serviceNameSnapshot: string;
    servicePriceCents: number;
    currency: string;
    source: string;
    internalNote?: string;
    linkedInvoiceId?: string;
    idempotencyKey?: string;
}

function parsePeriods(raw: unknown): Array<{ start: string; end: string }> {
    try {
        const v = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!Array.isArray(v)) return [];
        return v.filter((p) => p && typeof p.start === "string" && typeof p.end === "string");
    } catch {
        return [];
    }
}

export async function loadSettings(store: TermineStore): Promise<SettingsRow | null> {
    const rows = await store.list<SettingsRow>(T.SETTINGS, [Query.limit(1)]);
    return rows[0] ?? null;
}

/** Assemble engine input for a service over [fromDate, fromDate+days). */
export async function engineInput(store: TermineStore, serviceId: string, fromDate: string, days: number) {
    const service = await store.own<ServiceRow>(T.SERVICES, serviceId);
    const since = dayjs(fromDate, "YYYY-MM-DD").subtract(1, "day").format("YYYY-MM-DD");
    // Bounded read: only appointments that can intersect the window matter.
    const [rawStaff, hoursRows, blockRows, apptRows] = await Promise.all([
        store.list<StaffRow>(T.STAFF),
        store.list<HoursRow>(T.HOURS),
        store.list(T.BLOCKS as never) as Promise<
            Array<Row & { staffId?: string; startUtc: string; endUtc: string }>
        >,
        store.list<AppointmentRow>(T.APPOINTMENTS, [Query.greaterThanEqual("startUtc", since)]),
    ]);
    const staffRows =
        rawStaff.length > 0
            ? rawStaff
            : [
                  {
                      $id: recordId(store.userId, "staff:owner"),
                      userId: store.userId,
                      name: (await loadSettings(store))?.displayName?.trim() || "Inhaber",
                      active: true,
                      bookable: true,
                      serviceIds: [serviceId],
                  } as StaffRow,
              ];
    const to = new Date(fromDate + "T00:00:00Z");
    to.setUTCDate(to.getUTCDate() + days);
    const toDate = to.toISOString().slice(0, 10);
    const week: Record<
        string,
        { periods: Array<{ start: string; end: string }>; breaks: Array<{ start: string; end: string }> }
    > = {};
    const overrides: Array<{
        date: string;
        closed: boolean;
        periods?: Array<{ start: string; end: string }>;
    }> = [];
    for (const h of hoursRows) {
        if (h.kind === "week" && h.day !== undefined) {
            week[h.day] = {
                periods: h.closed ? [] : parsePeriods(h.periods),
                breaks: parsePeriods(h.breaks),
            };
        } else if (h.kind === "override" && h.date) {
            overrides.push({
                date: h.date,
                closed: h.closed,
                periods: h.closed ? undefined : parsePeriods(h.periods),
            });
        }
    }
    const appointments: AppointmentLike[] = apptRows
        .filter((a) => ACTIVE_STATUSES.has(a.status) && a.startUtc.slice(0, 10) <= toDate)
        .map((a) => ({
            id: a.$id,
            staffId: a.staffId,
            startUtc: addMinutesUtc(a.startUtc, -prepMinutes(a)),
            endUtc: a.endUtc,
            status: a.status,
        }));
    return { service, staffRows, week, overrides, blockRows, appointments };
}

export interface CreateBookingInput {
    serviceId: string;
    staffId?: string;
    customerId?: string;
    startUtc: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    customerNote?: string;
    internalNote?: string;
    source: "public" | "manual";
    idempotencyKey?: string;
    nowUtc?: string;
}

/** Server-side booking creation with atomic overlap protection. */
export async function createBooking(
    store: TermineStore,
    settings: SettingsRow,
    input: CreateBookingInput,
): Promise<{ appointment: AppointmentRow; manageToken: string }> {
    input = { ...input, startUtc: instant(input.startUtc) };
    if (
        input.idempotencyKey &&
        (input.idempotencyKey.length > 100 || !/^[\w:.-]+$/.test(input.idempotencyKey))
    )
        throw new TermineError("Ungültiger Buchungsschlüssel.");
    if (input.source === "public" && !settings.enabled)
        throw new TermineError("Die Online-Buchung ist derzeit deaktiviert.", 403);
    if (input.source === "public" && !settings.published)
        throw new TermineError("Die Online-Buchung ist derzeit nicht verfügbar.", 403);
    const name = input.customerName.trim();
    if (!name || name.length > 120) throw new TermineError("Bitte einen gültigen Namen angeben.");
    const email = input.customerEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200)
        throw new TermineError("Bitte eine gültige E-Mail-Adresse angeben.");

    return atomic(store.db, store.userId, async (tx) => {
        const service = await tx.own<ServiceRow>(T.SERVICES, input.serviceId);
        if (!service.active || (input.source === "public" && !service.publicVisible))
            throw new TermineError("Diese Dienstleistung ist derzeit nicht buchbar.", 410);

        if (input.idempotencyKey) {
            const existing = await tx.list<AppointmentRow>(T.APPOINTMENTS, [
                Query.equal("idempotencyKey", input.idempotencyKey),
                Query.limit(1),
            ]);
            if (existing[0]) {
                const a = existing[0];
                if (
                    a.startUtc !== input.startUtc ||
                    a.serviceId !== input.serviceId ||
                    a.customerEmail !== email ||
                    a.customerName !== name ||
                    (input.staffId && a.staffId !== input.staffId) ||
                    !["PENDING", "CONFIRMED"].includes(a.status)
                )
                    throw new TermineError("Dieser Buchungsschlüssel wurde bereits verwendet.", 409);
                const jobs = await tx.list<Row & { payload: string }>(T.OUTBOX, [
                    Query.equal("appointmentId", existing[0].$id),
                ]);
                for (const job of jobs) {
                    const payload = JSON.parse(job.payload);
                    if (payload.manageToken)
                        return { appointment: a, manageToken: String(payload.manageToken) };
                }
                throw new TermineError("Diese Buchung wurde bereits erstellt.", 409);
            }
        }

        // Staff selection: explicit or first eligible (deterministic).
        let allStaff = await tx.list<StaffRow>(T.STAFF);
        if (allStaff.length === 0) {
            allStaff = [
                {
                    $id: recordId(store.userId, "staff:owner"),
                    userId: store.userId,
                    name: settings.displayName || "Inhaber",
                    active: true,
                    bookable: true,
                    serviceIds: [service.$id],
                } as StaffRow,
            ];
        }
        const eligible = allStaff.filter(
            (s) =>
                s.active &&
                s.bookable &&
                (service.staffIds.length === 0 || service.staffIds.includes(s.$id)) &&
                (!input.staffId || s.$id === input.staffId),
        );
        if (eligible.length === 0)
            throw new TermineError("Kein verfügbarer Mitarbeiter für diese Leistung.", 409);
        // Validate the requested slot against real availability.
        const day = dateInTz(input.startUtc, settings.timezone);
        const ei = await engineInput(tx, service.$id, day, 1);
        const slots = computeAvailability(
            {
                service: {
                    id: service.$id,
                    name: service.name,
                    durationMinutes: service.durationMinutes,
                    priceCents: service.priceCents,
                    currency: service.currency,
                    prepMinutes: service.prepMinutes,
                    cleanupMinutes: service.cleanupMinutes,
                    active: service.active,
                    publicVisible: service.publicVisible,
                    staffIds: service.staffIds,
                    sortOrder: service.sortOrder,
                },
                staff: ei.staffRows.map((s) => ({
                    id: s.$id,
                    name: s.name,
                    active: s.active,
                    bookable: s.bookable,
                    serviceIds: s.serviceIds,
                })),
                week: ei.week,
                overrides: ei.overrides,
                blocks: ei.blockRows.map((b) => ({
                    id: b.$id,
                    staffId: b.staffId ?? null,
                    startUtc: b.startUtc,
                    endUtc: b.endUtc,
                })),
                appointments: ei.appointments,
                settings: {
                    timezone: settings.timezone,
                    slotIntervalMinutes: settings.slotIntervalMinutes,
                    minNoticeMinutes: input.source === "manual" ? 0 : settings.minNoticeMinutes,
                    maxHorizonDays: settings.maxHorizonDays,
                },
            },
            { serviceId: service.$id, staffId: input.staffId, fromDate: day, days: 1, nowUtc: input.nowUtc },
        );
        const selectedSlot = slots.find((s) => s.startUtc === input.startUtc);
        if (!selectedSlot) throw new TermineError("Dieser Zeitpunkt ist leider nicht mehr verfügbar.", 409);
        const staffId = selectedSlot.staffId;

        const endUtc = addMinutesUtc(input.startUtc, service.durationMinutes + service.cleanupMinutes);
        await guardInterval(tx, staffId, addMinutesUtc(input.startUtc, -service.prepMinutes), endUtc);
        const appointmentId = input.idempotencyKey
            ? recordId(store.userId, `appt:${input.idempotencyKey}`)
            : newId();
        const status =
            input.source === "manual" || settings.confirmationMode === "automatic" ? "CONFIRMED" : "PENDING";

        // Deterministic reservation first: concurrent commits collide on $id.
        try {
            await tx.db.createDocument(
                DB,
                T.RESERVATIONS,
                reservationId(store.userId, staffId, input.startUtc),
                {
                    userId: store.userId,
                    staffId,
                    startUtc: input.startUtc,
                    appointmentId,
                },
                tx.perms(),
                tx.transactionId,
            );
        } catch (error) {
            if ((error as { code?: number }).code === 409)
                throw new TermineError(
                    "Dieser Zeitraum wurde gerade belegt. Bitte einen anderen Zeitpunkt wählen.",
                    409,
                );
            throw error;
        }

        const { id: customerId } = await findOrCreateCustomer(
            tx.db,
            store.userId,
            {
                customerId: input.customerId,
                name,
                email,
                phone: input.customerPhone,
            },
            tx.transactionId,
        );

        const appointment: Omit<
            AppointmentRow,
            | "$id"
            | "$createdAt"
            | "$updatedAt"
            | "$permissions"
            | "$collectionId"
            | "$databaseId"
            | "$sequence"
        > & { userId: string } = {
            userId: store.userId,
            serviceId: service.$id,
            staffId,
            customerId,
            customerName: name,
            customerEmail: email,
            customerPhone: input.customerPhone?.trim().slice(0, 40) || undefined,
            customerNote: input.customerNote?.trim().slice(0, 500) || undefined,
            internalNote: input.internalNote?.trim().slice(0, 1000) || undefined,
            startUtc: input.startUtc,
            endUtc,
            businessTimezone: settings.timezone,
            durationMinutes: service.durationMinutes,
            bufferMinutes: service.prepMinutes + service.cleanupMinutes,
            status: status as AppointmentRow["status"],
            serviceNameSnapshot: service.name,
            servicePriceCents: service.priceCents,
            currency: service.currency,
            source: input.source,
            idempotencyKey: input.idempotencyKey,
        };
        await tx.db.createDocument(
            DB,
            T.APPOINTMENTS,
            appointmentId,
            appointment,
            tx.perms(),
            tx.transactionId,
        );

        const manageToken = newToken();
        await tx.db.createDocument(
            DB,
            T.TOKENS,
            newId(),
            {
                userId: store.userId,
                appointmentId,
                purpose: "manage",
                tokenHash: tokenHash(manageToken),
                expiresAt: addMinutesUtc(input.startUtc, 60 * 24 * 90),
            },
            tx.perms(),
            tx.transactionId,
        );
        await tx.db.createDocument(
            DB,
            T.AUDIT,
            newId(),
            {
                userId: store.userId,
                appointmentId,
                action: `created:${input.source}`,
                detail: `${service.name} @ ${input.startUtc}`,
            },
            tx.perms(),
            tx.transactionId,
        );
        await tx.db.createDocument(
            DB,
            T.OUTBOX,
            newId(),
            {
                userId: store.userId,
                kind:
                    status === "CONFIRMED"
                        ? input.source === "manual"
                            ? "booking_business"
                            : "booking_confirm"
                        : "booking_request",
                appointmentId,
                payload: JSON.stringify({ appointmentId, manageToken, startUtc: input.startUtc }),
                status: "pending",
                attempts: 0,
            },
            tx.perms(),
            tx.transactionId,
        );

        const created = await tx.db.getDocument(DB, T.APPOINTMENTS, appointmentId, [], tx.transactionId);
        return { appointment: created as unknown as AppointmentRow, manageToken };
    });
}

export interface RescheduleInput {
    appointmentId: string;
    newStartUtc: string;
    newStaffId?: string;
    actor: "business" | "customer";
    nowUtc?: string;
}

export async function rescheduleBooking(
    store: TermineStore,
    settings: SettingsRow,
    input: RescheduleInput,
): Promise<AppointmentRow> {
    input = { ...input, newStartUtc: instant(input.newStartUtc) };
    return atomic(store.db, store.userId, async (tx) => {
        const appt = await tx.own<AppointmentRow>(T.APPOINTMENTS, input.appointmentId);
        if (appt.status !== "PENDING" && appt.status !== "CONFIRMED")
            throw new TermineError("Dieser Termin kann nicht mehr verschoben werden.", 409);
        if (appt.startUtc === input.newStartUtc && (!input.newStaffId || input.newStaffId === appt.staffId))
            return appt;
        const noticeMs = (input.actor === "customer" ? settings.rescheduleNoticeMinutes : 0) * 60_000;
        const nowMs = Date.parse(input.nowUtc ?? new Date().toISOString());
        if (Date.parse(appt.startUtc) - nowMs < noticeMs)
            throw new TermineError("Der Umbuchungszeitraum ist überschritten.", 409);

        const staffId = input.newStaffId ?? appt.staffId;
        const service = await tx.own<ServiceRow>(T.SERVICES, appt.serviceId);
        if (!service.active || (input.actor === "customer" && !service.publicVisible))
            throw new TermineError(
                "Diese Leistung ist nicht mehr online umbuchbar. Bitte das Unternehmen kontaktieren.",
                409,
            );
        if (service.staffIds.length && !service.staffIds.includes(staffId))
            throw new TermineError("Dieser Mitarbeiter ist dieser Leistung nicht zugeordnet.", 409);
        const day = dateInTz(input.newStartUtc, settings.timezone);
        const ei = await engineInput(tx, service.$id, day, 1);
        // Exclude the appointment itself from overlap detection.
        ei.appointments = ei.appointments.filter((a) => a.id !== appt.$id);
        const prep = prepMinutes(appt),
            cleanup = appt.bufferMinutes - prep;
        const slots = computeAvailability(
            {
                service: {
                    id: service.$id,
                    name: service.name,
                    durationMinutes: appt.durationMinutes,
                    priceCents: service.priceCents,
                    currency: service.currency,
                    prepMinutes: prep,
                    cleanupMinutes: cleanup,
                    active: true,
                    publicVisible: true,
                    staffIds: [staffId],
                    sortOrder: 0,
                },
                staff: ei.staffRows
                    .filter((s) => s.$id === staffId)
                    .map((s) => ({
                        id: s.$id,
                        name: s.name,
                        active: s.active,
                        bookable: s.bookable,
                        serviceIds: [service.$id],
                    })),
                week: ei.week,
                overrides: ei.overrides,
                blocks: ei.blockRows.map((b) => ({
                    id: b.$id,
                    staffId: b.staffId ?? null,
                    startUtc: b.startUtc,
                    endUtc: b.endUtc,
                })),
                appointments: ei.appointments,
                settings: {
                    timezone: settings.timezone,
                    slotIntervalMinutes: settings.slotIntervalMinutes,
                    minNoticeMinutes: input.actor === "customer" ? settings.minNoticeMinutes : 0,
                    maxHorizonDays: settings.maxHorizonDays,
                },
            },
            { serviceId: service.$id, staffId, fromDate: day, days: 1, nowUtc: input.nowUtc },
        );
        if (!slots.some((s) => s.startUtc === input.newStartUtc))
            throw new TermineError("Der neue Zeitpunkt ist leider nicht verfügbar.", 409);

        const endUtc = addMinutesUtc(input.newStartUtc, appt.durationMinutes + cleanup);
        await guardInterval(tx, staffId, addMinutesUtc(input.newStartUtc, -prep), endUtc);
        await guardInterval(tx, appt.staffId, addMinutesUtc(appt.startUtc, -prep), appt.endUtc);
        // Release old reservation, claim the new one — delete first so a retry
        // after a crash never leaves both slots occupied.
        await tx.db.deleteDocument(
            DB,
            T.RESERVATIONS,
            reservationId(store.userId, appt.staffId, appt.startUtc),
            tx.transactionId,
        );
        try {
            await tx.db.createDocument(
                DB,
                T.RESERVATIONS,
                reservationId(store.userId, staffId, input.newStartUtc),
                { userId: store.userId, staffId, startUtc: input.newStartUtc, appointmentId: appt.$id },
                tx.perms(),
                tx.transactionId,
            );
        } catch (error) {
            // Restore the original reservation before failing so the booking is never lost.
            await tx.db.createDocument(
                DB,
                T.RESERVATIONS,
                reservationId(store.userId, appt.staffId, appt.startUtc),
                {
                    userId: store.userId,
                    staffId: appt.staffId,
                    startUtc: appt.startUtc,
                    appointmentId: appt.$id,
                },
                tx.perms(),
                tx.transactionId,
            );
            if ((error as { code?: number }).code === 409)
                throw new TermineError("Der neue Zeitpunkt wurde gerade belegt.", 409);
            throw error;
        }
        const updated = await tx.db.updateDocument(
            DB,
            T.APPOINTMENTS,
            appt.$id,
            { staffId, startUtc: input.newStartUtc, endUtc, businessTimezone: settings.timezone },
            undefined,
            tx.transactionId,
        );
        // Keep the original private link usable when moving far into the future.
        const tokens = await tx.list<Row & { expiresAt: string }>(T.TOKENS, [
            Query.equal("appointmentId", appt.$id),
        ]);
        const expiresAt = addMinutesUtc(input.newStartUtc, 90 * 24 * 60);
        for (const token of tokens) {
            if (Date.parse(token.expiresAt) < Date.parse(expiresAt))
                await tx.db.updateDocument(
                    DB,
                    T.TOKENS,
                    token.$id,
                    { expiresAt },
                    undefined,
                    tx.transactionId,
                );
        }
        await tx.db.createDocument(
            DB,
            T.AUDIT,
            newId(),
            {
                userId: store.userId,
                appointmentId: appt.$id,
                action: `rescheduled:${input.actor}`,
                detail: `${appt.startUtc} -> ${input.newStartUtc}`,
            },
            tx.perms(),
            tx.transactionId,
        );
        await tx.db.createDocument(
            DB,
            T.OUTBOX,
            newId(),
            {
                userId: store.userId,
                kind: "booking_rescheduled",
                appointmentId: appt.$id,
                payload: JSON.stringify({ appointmentId: appt.$id, startUtc: input.newStartUtc }),
                status: "pending",
                attempts: 0,
            },
            tx.perms(),
            tx.transactionId,
        );
        return updated as unknown as AppointmentRow;
    });
}

export async function cancelBooking(
    store: TermineStore,
    settings: SettingsRow,
    appointmentId: string,
    actor: "business" | "customer",
    nowUtc?: string,
): Promise<AppointmentRow> {
    return atomic(store.db, store.userId, async (tx) => {
        const appt = await tx.own<AppointmentRow>(T.APPOINTMENTS, appointmentId);
        if (appt.status !== "PENDING" && appt.status !== "CONFIRMED")
            throw new TermineError("Dieser Termin kann nicht mehr storniert werden.", 409);
        if (actor === "customer") {
            const nowMs = Date.parse(nowUtc ?? new Date().toISOString());
            if (Date.parse(appt.startUtc) - nowMs < settings.cancelNoticeMinutes * 60_000)
                throw new TermineError("Die Stornierungsfrist ist überschritten.", 409);
        }
        const status = actor === "customer" ? "CANCELLED_BY_CUSTOMER" : "CANCELLED_BY_BUSINESS";
        const updated = await tx.db.updateDocument(
            DB,
            T.APPOINTMENTS,
            appt.$id,
            { status },
            undefined,
            tx.transactionId,
        );
        try {
            await tx.db.deleteDocument(
                DB,
                T.RESERVATIONS,
                reservationId(store.userId, appt.staffId, appt.startUtc),
                tx.transactionId,
            );
        } catch (error) {
            if ((error as { code?: number }).code !== 404) throw error;
        }
        await tx.db.createDocument(
            DB,
            T.AUDIT,
            newId(),
            { userId: store.userId, appointmentId: appt.$id, action: `cancelled:${actor}` },
            tx.perms(),
            tx.transactionId,
        );
        await tx.db.createDocument(
            DB,
            T.OUTBOX,
            newId(),
            {
                userId: store.userId,
                kind: actor === "customer" ? "booking_cancelled_customer" : "booking_cancelled_business",
                appointmentId: appt.$id,
                payload: JSON.stringify({ appointmentId: appt.$id }),
                status: "pending",
                attempts: 0,
            },
            tx.perms(),
            tx.transactionId,
        );
        return updated as unknown as AppointmentRow;
    });
}

/** Overlap guard usable outside transactions (defense in depth for reads). */
export function hasOverlap(
    existing: Array<{ staffId: string; startUtc: string; endUtc: string }>,
    staffId: string,
    startUtc: string,
    endUtc: string,
): boolean {
    return existing.some(
        (e) => e.staffId === staffId && intervalsOverlap(startUtc, endUtc, e.startUtc, e.endUtc),
    );
}

export type { TermineAppointment };

/** Status validation, audit and confirmation delivery must commit together. */
export async function updateBooking(
    store: TermineStore,
    id: string,
    patch: { status?: TermineStatus; internalNote?: string },
) {
    return atomic(store.db, store.userId, async (tx) => {
        const appt = await tx.own<AppointmentRow>(T.APPOINTMENTS, id);
        const fields: Record<string, unknown> = {};
        if (patch.internalNote !== undefined) fields.internalNote = patch.internalNote.slice(0, 1000);
        if (patch.status) {
            if (!canTransition(appt.status, patch.status) || patch.status.startsWith("CANCELLED"))
                throw new TermineError(
                    "Dieser Statuswechsel ist nicht möglich. Bitte die Ansicht aktualisieren.",
                    409,
                );
            if (["COMPLETED", "NO_SHOW"].includes(patch.status) && Date.parse(appt.startUtc) > Date.now())
                throw new TermineError(
                    "Zukünftige Termine können noch nicht abgeschlossen oder als nicht erschienen markiert werden.",
                    409,
                );
            fields.status = patch.status;
            if (patch.status === "COMPLETED") fields.completedAt = new Date().toISOString();
            if (patch.status === "NO_SHOW") {
                try {
                    await tx.db.deleteDocument(
                        DB,
                        T.RESERVATIONS,
                        reservationId(tx.userId, appt.staffId, appt.startUtc),
                        tx.transactionId,
                    );
                } catch (error) {
                    if ((error as { code?: number }).code !== 404) throw error;
                }
            }
            await tx.db.createDocument(
                DB,
                T.AUDIT,
                newId(),
                { userId: tx.userId, appointmentId: id, action: `status:${patch.status}` },
                tx.perms(),
                tx.transactionId,
            );
            if (patch.status === "CONFIRMED")
                await tx.db.createDocument(
                    DB,
                    T.OUTBOX,
                    newId(),
                    {
                        userId: tx.userId,
                        appointmentId: id,
                        kind: "booking_confirm",
                        payload: JSON.stringify({ appointmentId: id, startUtc: appt.startUtc }),
                        status: "pending",
                        attempts: 0,
                    },
                    tx.perms(),
                    tx.transactionId,
                );
        }
        return Object.keys(fields).length
            ? ((await tx.db.updateDocument(
                  DB,
                  T.APPOINTMENTS,
                  id,
                  fields,
                  undefined,
                  tx.transactionId,
              )) as unknown as AppointmentRow)
            : appt;
    });
}
