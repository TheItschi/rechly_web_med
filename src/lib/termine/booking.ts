import { Query } from "node-appwrite";
import { DB, T, TermineStore, atomic, newId, newToken, recordId, reservationId, tokenHash, type Row } from "./store";
import { TermineError } from "./store";
import { ACTIVE_STATUSES, type TermineAppointment, type TermineStatus } from "./types";
import { computeAvailability, type AppointmentLike } from "./availability";
import { addMinutesUtc, dateInTz, dayjs, intervalsOverlap } from "./time";
import { findOrCreateCustomer } from "./customers";

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
export async function engineInput(
    store: TermineStore,
    serviceId: string,
    fromDate: string,
    days: number,
) {
    const service = await store.own<ServiceRow>(T.SERVICES, serviceId);
    const since = dayjs(fromDate, "YYYY-MM-DD").subtract(1, "day").format("YYYY-MM-DD");
    // Bounded read: only appointments that can intersect the window matter.
    const [rawStaff, hoursRows, blockRows, apptRows] = await Promise.all([
        store.list<StaffRow>(T.STAFF),
        store.list<HoursRow>(T.HOURS),
        store.list(T.BLOCKS as never) as Promise<Array<Row & { staffId?: string; startUtc: string; endUtc: string }>>,
        store.list<AppointmentRow>(T.APPOINTMENTS, [Query.greaterThanEqual("startUtc", since)]),
    ]);
    const staffRows = rawStaff.length > 0
        ? rawStaff
        : [{
            $id: recordId(store.userId, "staff:owner"),
            userId: store.userId,
            name: (await loadSettings(store))?.displayName?.trim() || "Inhaber",
            active: true,
            bookable: true,
            serviceIds: [serviceId],
        } as StaffRow];
    const to = new Date(fromDate + "T00:00:00Z");
    to.setUTCDate(to.getUTCDate() + days);
    const toDate = to.toISOString().slice(0, 10);
    const week: Record<string, { periods: Array<{ start: string; end: string }>; breaks: Array<{ start: string; end: string }> }> = {};
    const overrides: Array<{ date: string; closed: boolean; periods?: Array<{ start: string; end: string }> }> = [];
    for (const h of hoursRows) {
        if (h.kind === "week" && h.day !== undefined) {
            week[h.day] = { periods: parsePeriods(h.periods), breaks: parsePeriods(h.breaks) };
        } else if (h.kind === "override" && h.date) {
            overrides.push({ date: h.date, closed: h.closed, periods: h.closed ? undefined : parsePeriods(h.periods) });
        }
    }
    const appointments: AppointmentLike[] = apptRows
        .filter((a) => ACTIVE_STATUSES.has(a.status) && a.startUtc.slice(0, 10) <= toDate)
        .map((a) => ({ staffId: a.staffId, startUtc: a.startUtc, endUtc: a.endUtc, status: a.status }));
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
    if (!settings.enabled) throw new TermineError("Die Online-Buchung ist derzeit deaktiviert.", 403);
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
                const tokens = await tx.list<Row & { appointmentId: string }>(T.TOKENS, [
                    Query.equal("appointmentId", existing[0].$id),
                    Query.limit(1),
                ]);
                void tokens;
                throw new TermineError("Diese Buchung wurde bereits erstellt.", 409);
            }
        }

        // Staff selection: explicit or first eligible (deterministic).
        let allStaff = await tx.list<StaffRow>(T.STAFF);
        if (allStaff.length === 0) {
            allStaff = [{
                $id: recordId(store.userId, "staff:owner"),
                userId: store.userId,
                name: settings.displayName || "Inhaber",
                active: true,
                bookable: true,
                serviceIds: [service.$id],
            } as StaffRow];
        }
        const eligible = allStaff.filter(
            (s) =>
                s.active &&
                s.bookable &&
                (service.staffIds.length === 0 || service.staffIds.includes(s.$id)) &&
                (!input.staffId || s.$id === input.staffId),
        );
        if (eligible.length === 0) throw new TermineError("Kein verfügbarer Mitarbeiter für diese Leistung.", 409);
        const staffId = input.staffId ?? eligible.map((s) => s.$id).sort()[0];

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
                    minNoticeMinutes: settings.minNoticeMinutes,
                    maxHorizonDays: settings.maxHorizonDays,
                },
            },
            { serviceId: service.$id, staffId, fromDate: day, days: 1, nowUtc: input.nowUtc },
        );
        if (!slots.some((s) => s.startUtc === input.startUtc && s.staffId === staffId))
            throw new TermineError("Dieser Zeitpunkt ist leider nicht mehr verfügbar.", 409);

        const endUtc = addMinutesUtc(input.startUtc, service.durationMinutes + service.cleanupMinutes);
        const appointmentId = input.idempotencyKey
            ? recordId(store.userId, `appt:${input.idempotencyKey}`)
            : newId();
        const status = input.source === "manual" || settings.confirmationMode === "automatic" ? "CONFIRMED" : "PENDING";

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
                throw new TermineError("Dieser Zeitraum wurde gerade belegt. Bitte einen anderen Zeitpunkt wählen.", 409);
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

        const appointment: Omit<AppointmentRow, "$id" | "$createdAt" | "$updatedAt" | "$permissions" | "$collectionId" | "$databaseId" | "$sequence"> & { userId: string } = {
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
            { userId: store.userId, appointmentId, action: `created:${input.source}`, detail: `${service.name} @ ${input.startUtc}` },
            tx.perms(),
            tx.transactionId,
        );
        await tx.db.createDocument(
            DB,
            T.OUTBOX,
            newId(),
            {
                userId: store.userId,
                kind: status === "CONFIRMED"
                    ? (input.source === "manual" ? "booking_business" : "booking_confirm")
                    : "booking_request",
                appointmentId,
                payload: JSON.stringify({ appointmentId }),
                status: "pending",
                attempts: 0,
            },
            tx.perms(),
            tx.transactionId,
        );

        const created = await tx.db.getDocument(
            DB,
            T.APPOINTMENTS,
            appointmentId,
            [],
            tx.transactionId,
        );
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
    return atomic(store.db, store.userId, async (tx) => {
        const appt = await tx.own<AppointmentRow>(T.APPOINTMENTS, input.appointmentId);
        if (appt.status !== "PENDING" && appt.status !== "CONFIRMED")
            throw new TermineError("Dieser Termin kann nicht mehr verschoben werden.", 409);
        const noticeMs =
            (input.actor === "customer" ? settings.rescheduleNoticeMinutes : 0) * 60_000;
        const nowMs = Date.parse(input.nowUtc ?? new Date().toISOString());
        if (Date.parse(appt.startUtc) - nowMs < noticeMs)
            throw new TermineError("Der Umbuchungszeitraum ist überschritten.", 409);

        const staffId = input.newStaffId ?? appt.staffId;
        const service = await tx.own<ServiceRow>(T.SERVICES, appt.serviceId);
        const day = dateInTz(input.newStartUtc, settings.timezone);
        const ei = await engineInput(tx, service.$id, day, 1);
        // Exclude the appointment itself from overlap detection.
        ei.appointments = ei.appointments.filter(
            (a) =>
                !(
                    a.staffId === appt.staffId &&
                    a.startUtc === appt.startUtc &&
                    a.endUtc === appt.endUtc
                ),
        );
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
                    minNoticeMinutes: 0,
                    maxHorizonDays: settings.maxHorizonDays,
                },
            },
            { serviceId: service.$id, staffId, fromDate: day, days: 1, nowUtc: input.nowUtc },
        );
        if (!slots.some((s) => s.startUtc === input.newStartUtc))
            throw new TermineError("Der neue Zeitpunkt ist leider nicht verfügbar.", 409);

        const endUtc = addMinutesUtc(input.newStartUtc, service.durationMinutes + service.cleanupMinutes);
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
                { userId: store.userId, staffId: appt.staffId, startUtc: appt.startUtc, appointmentId: appt.$id },
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
            { staffId, startUtc: input.newStartUtc, endUtc },
            undefined,
            tx.transactionId,
        );
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
        } catch {
            /* Reservation may already be gone after a retry; status change is authoritative. */
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
