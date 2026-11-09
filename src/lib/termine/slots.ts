import { computeAvailability } from "./availability";
import { engineInput, prepMinutes, type AppointmentRow, type SettingsRow } from "./booking";
import { TermineError, type TermineStore } from "./store";
import { dateInTz, validDate, wallToUtc } from "./time";

export async function availableSlots(
    store: TermineStore,
    settings: SettingsRow,
    query: URLSearchParams,
    appointment?: AppointmentRow,
) {
    const fromDate = query.get("from") || dateInTz(new Date().toISOString(), settings.timezone),
        days = Number(query.get("days") || 31);
    const serviceId = appointment?.serviceId || query.get("serviceId"),
        staffId = appointment?.staffId || query.get("staffId") || undefined;
    if (!serviceId || !validDate(fromDate) || !Number.isInteger(days) || days < 1 || days > 31)
        throw new TermineError("Ungültiger Zeitraum oder Leistung.");
    const zone = query.get("timezone") || settings.timezone;
    try {
        new Intl.DateTimeFormat("en", { timeZone: zone });
    } catch {
        throw new TermineError("Ungültige Zeitzone.");
    }
    const until = new Date(fromDate + "T12:00:00Z");
    until.setUTCDate(until.getUTCDate() + days);
    const fromInstant = wallToUtc(fromDate, "00:00", zone),
        toInstant = wallToUtc(until.toISOString().slice(0, 10), "00:00", zone);
    if (!fromInstant || !toInstant)
        throw new TermineError("Dieser Zeitraum ist in der gewählten Zeitzone nicht verfügbar.");
    const businessFrom = dateInTz(fromInstant, settings.timezone),
        businessTo = dateInTz(toInstant, settings.timezone);
    const span = Math.round((Date.parse(businessTo) - Date.parse(businessFrom)) / 86400000) + 1;
    const ei = await engineInput(store, serviceId, businessFrom, span),
        s = ei.service;
    if (!s.active || !s.publicVisible)
        throw new TermineError("Diese Leistung ist nicht online buchbar.", 404);
    if (staffId && s.staffIds.length && !s.staffIds.includes(staffId))
        throw new TermineError("Ungültige Mitarbeiterauswahl.");
    const prep = appointment ? prepMinutes(appointment) : s.prepMinutes;
    const input = {
        service: {
            ...s,
            id: s.$id,
            durationMinutes: appointment?.durationMinutes ?? s.durationMinutes,
            prepMinutes: prep,
            cleanupMinutes: appointment ? appointment.bufferMinutes - prep : s.cleanupMinutes,
        },
        staff: ei.staffRows.map((s) => ({ ...s, id: s.$id })),
        week: ei.week,
        overrides: ei.overrides,
        blocks: ei.blockRows.map((b) => ({ ...b, id: b.$id, staffId: b.staffId || null })),
        appointments: ei.appointments.filter((a) => a.id !== appointment?.$id),
        settings,
    };
    const slots = [];
    for (let offset = 0; offset < span; offset += 31) {
        const date = new Date(businessFrom + "T12:00:00Z");
        date.setUTCDate(date.getUTCDate() + offset);
        slots.push(
            ...computeAvailability(input, {
                serviceId,
                staffId,
                fromDate: date.toISOString().slice(0, 10),
                days: Math.min(31, span - offset),
            }).filter((s) => s.startUtc >= fromInstant && s.startUtc < toInstant),
        );
    }
    const byDate: Record<string, typeof slots> = {};
    for (const slot of slots) (byDate[dateInTz(slot.startUtc, zone)] ??= []).push(slot);
    return { slots: byDate, timezone: zone, fromDate, days };
}
