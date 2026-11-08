import type {
    AvailabilityQuery,
    AvailabilitySlot,
    BlockedTime,
    DaySchedule,
    ScheduleOverride,
    TermineService,
    TermineStaff,
    WeekSchedule,
} from "./types";
import { ACTIVE_STATUSES } from "./types";
import { addMinutesUtc, dateInTz, dayjs, intervalsOverlap, wallToMinutes, wallToUtc } from "./time";

export interface BusyInterval {
    staffId: string;
    startUtc: string;
    endUtc: string;
}

export interface AppointmentLike {
    staffId: string;
    startUtc: string;
    endUtc: string;
    status: string;
}

export interface EngineInput {
    service: TermineService;
    staff: TermineStaff[];
    week: WeekSchedule;
    overrides: ScheduleOverride[];
    blocks: BlockedTime[];
    appointments: AppointmentLike[];
    settings: {
        timezone: string;
        slotIntervalMinutes: number;
        minNoticeMinutes: number;
        maxHorizonDays: number;
    };
}

interface WindowMs {
    start: number;
    end: number;
}

function toMs(iso: string): number {
    return dayjs.utc(iso).valueOf();
}

function dayWindows(day: string, schedule: DaySchedule | null, tz: string): WindowMs[] {
    if (!schedule) return [];
    const out: WindowMs[] = [];
    for (const p of schedule.periods) {
        const s = wallToUtc(day, p.start, tz);
        const e = wallToUtc(day, p.end, tz);
        if (!s || !e || s >= e) continue;
        out.push({ start: toMs(s), end: toMs(e) });
    }
    // Subtract breaks.
    for (const b of schedule.breaks) {
        const bs = wallToUtc(day, b.start, tz);
        const be = wallToUtc(day, b.end, tz);
        if (!bs || !be || bs >= be) continue;
        const bms = toMs(bs);
        const bme = toMs(be);
        const next: WindowMs[] = [];
        for (const w of out) {
            if (bme <= w.start || bms >= w.end) {
                next.push(w);
                continue;
            }
            if (bms > w.start) next.push({ start: w.start, end: bms });
            if (bme < w.end) next.push({ start: bme, end: w.end });
        }
        out.length = 0;
        out.push(...next);
    }
    return out;
}

function scheduleFor(date: string, week: WeekSchedule, overrides: ScheduleOverride[]): DaySchedule | null {
    const o = overrides.find((x) => x.date === date);
    if (o) return o.closed ? null : { periods: o.periods ?? [], breaks: [] };
    const dow = String(dayjs(date, "YYYY-MM-DD").day());
    return week[dow] ?? null;
}

/**
 * Pure availability computation. No I/O, no current time except via `nowUtc`.
 * Returns genuinely bookable (startUtc, staffId) pairs sorted by time.
 */
export function computeAvailability(input: EngineInput, query: AvailabilityQuery): AvailabilitySlot[] {
    const { service, settings } = input;
    const tz = settings.timezone;
    const interval = settings.slotIntervalMinutes;
    const eligible = input.staff
        .filter((s) => s.active && s.bookable && service.staffIds.includes(s.id))
        .filter((s) => !query.staffId || s.id === query.staffId)
        .sort((a, b) => (a.id < b.id ? -1 : 1));
    if (eligible.length === 0) return [];

    const nowMs = toMs(query.nowUtc ?? new Date().toISOString());
    const horizonMs = nowMs + settings.maxHorizonDays * 24 * 60 * 60 * 1000;
    const busy: BusyInterval[] = [];
    for (const a of input.appointments) {
        if (!ACTIVE_STATUSES.has(a.status as never)) continue;
        busy.push({ staffId: a.staffId, startUtc: a.startUtc, endUtc: a.endUtc });
    }
    for (const b of input.blocks) {
        if (b.staffId) busy.push({ staffId: b.staffId, startUtc: b.startUtc, endUtc: b.endUtc });
        else for (const s of eligible) busy.push({ staffId: s.id, startUtc: b.startUtc, endUtc: b.endUtc });
    }

    const slots: AvailabilitySlot[] = [];
    const days = Math.max(1, Math.min(31, query.days));
    for (let d = 0; d < days; d++) {
        const day = dayjs(query.fromDate, "YYYY-MM-DD").add(d, "day").format("YYYY-MM-DD");
        const sched = scheduleFor(day, input.week, input.overrides);
        if (!sched) continue;
        const windows = dayWindows(day, sched, tz);
        if (windows.length === 0) continue;
        // Candidate wall-minute starts across the union of working windows.
        const starts = new Set<number>();
        for (const w of windows) {
            const wStartWall = Number(dayjs(w.start).tz(tz).format("H")) * 60 + Number(dayjs(w.start).tz(tz).format("m"));
            const wEndWall = Number(dayjs(w.end).tz(tz).format("H")) * 60 + Number(dayjs(w.end).tz(tz).format("m"));
            const aligned = Math.ceil(wStartWall / interval) * interval;
            for (let m = aligned; m + service.durationMinutes + service.cleanupMinutes <= wEndWall; m += interval) {
                starts.add(m);
            }
        }
        for (const m of [...starts].sort((a, b) => a - b)) {
            const hh = String(Math.floor(m / 60)).padStart(2, "0");
            const mm = String(m % 60).padStart(2, "0");
            const startUtc = wallToUtc(day, `${hh}:${mm}`, tz);
            if (!startUtc) continue; // DST gap
            const startMs = toMs(startUtc);
            if (startMs < nowMs + settings.minNoticeMinutes * 60_000) continue;
            if (startMs > horizonMs) continue;
            const endUtc = addMinutesUtc(startUtc, service.durationMinutes + service.cleanupMinutes);
            const occupiedStart = addMinutesUtc(startUtc, -service.prepMinutes);
            const inside = windows.some((w) => startMs >= w.start && toMs(endUtc) <= w.end);
            if (!inside) continue;
            // First eligible staff with a free interval wins this start (deterministic order).
            for (const staff of eligible) {
                const clash = busy.some(
                    (b) => b.staffId === staff.id && intervalsOverlap(occupiedStart, endUtc, b.startUtc, b.endUtc),
                );
                if (clash) continue;
                slots.push({ startUtc, staffId: staff.id });
                break;
            }
        }
    }
    return slots.sort((a, b) => (a.startUtc < b.startUtc ? -1 : 1));
}

export { wallToMinutes };
