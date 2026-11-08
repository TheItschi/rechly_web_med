import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const BUSINESS_TZ = "Europe/Berlin";

/** Minutes since midnight for "HH:MM". Throws on invalid input. */
export function wallToMinutes(wall: string): number {
    const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(wall.trim());
    if (!m) throw new Error(`Invalid wall time: ${wall}`);
    return Number(m[1]) * 60 + Number(m[2]);
}

export function minutesToWall(min: number): string {
    const h = Math.floor(min / 60);
    const mm = min % 60;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** YYYY-MM-DD in the given tz for a UTC instant. */
export function dateInTz(utcIso: string, tz: string): string {
    return dayjs.utc(utcIso).tz(tz).format("YYYY-MM-DD");
}

/** Combine a tz-local date + wall time into a UTC ISO instant. Returns null for nonexistent wall times (spring DST gap). */
export function wallToUtc(date: string, wall: string, tz: string): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    let minutes: number;
    try {
        minutes = wallToMinutes(wall);
    } catch {
        return null;
    }
    const guess = dayjs.tz(`${date} ${minutesToWall(minutes)}`, "YYYY-MM-DD HH:mm", tz);
    if (!guess.isValid()) return null;
    // Round-trip check: a spring-forward gap shifts the wall time — treat as nonexistent.
    if (guess.format("YYYY-MM-DD HH:mm") !== `${date} ${minutesToWall(minutes)}`) return null;
    return guess.utc().toISOString();
}

/** UTC instant → "HH:MM" wall time in tz. */
export function utcToWall(utcIso: string, tz: string): string {
    return dayjs.utc(utcIso).tz(tz).format("HH:mm");
}

/** Add minutes to a UTC instant. */
export function addMinutesUtc(utcIso: string, minutes: number): string {
    return dayjs.utc(utcIso).add(minutes, "minute").toISOString();
}

export function minutesBetweenUtc(aUtc: string, bUtc: string): number {
    return dayjs.utc(bUtc).diff(dayjs.utc(aUtc), "minute");
}

/** True when [aStart,aEnd) overlaps [bStart,bEnd). Touching edges do not overlap. */
export function intervalsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
    return aStart < bEnd && bStart < aEnd;
}

/** Dayjs instances for the engine (exported for tests, not for UI formatting). */
export { dayjs };
