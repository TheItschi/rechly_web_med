/**
 * Shared cache helper for zustand stores.
 * All entity stores use the same 5-minute TTL + loading guard.
 */

export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function isCacheValid(lastFetched: number | null, force = false): boolean {
    if (force) return false;
    if (!lastFetched) return false;
    return Date.now() - lastFetched < CACHE_DURATION;
}
