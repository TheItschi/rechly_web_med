/**
 * In-memory sliding-window rate limiter for public booking endpoints.
 * Single-instance scope: fine for a single VPS deployment (per-instance budgets);
 * limits are abuse mitigation, the transactional booking guard is authoritative.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterSec?: number } {
    const now = Date.now();
    const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (arr.length >= max) {
        const retryAfterSec = Math.ceil((arr[0] + windowMs - now) / 1000);
        return { ok: false, retryAfterSec: Math.max(retryAfterSec, 1) };
    }
    arr.push(now);
    if (hits.size > 5000) {
        const oldest = [...hits.entries()].sort((a, b) => (a[1][0] ?? 0) - (b[1][0] ?? 0))[0];
        if (oldest) hits.delete(oldest[0]);
    }
    hits.set(key, arr);
    return { ok: true };
}

export function clientIp(request: Request): string {
    const fwd = request.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return request.headers.get("x-real-ip") ?? "unknown";
}

export const PUBLIC_LIMITS = {
    availability: { max: 60, windowMs: 60_000 },
    bookingCreate: { max: 10, windowMs: 60_000 },
    manage: { max: 30, windowMs: 60_000 },
} as const;
