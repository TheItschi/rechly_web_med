/** Slug normalization, validation and reservation for booking subdomains. */

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;
export const MAX_SLUG_LENGTH = 50;

const RESERVED = new Set([
    "www", "api", "app", "admin", "auth", "login", "logout", "dashboard",
    "mail", "smtp", "ftp", "status", "support", "help", "billing", "cdn",
    "static", "assets", "dev", "staging", "test", "termine", "buchen",
    "booking", "bookings", "calendar", "kalender", "console", "root",
    "superuser", "webmail", "blog", "shop", "docs", "hilfe", "kontakt",
    "impressum", "datenschutz", "agb", "cookies", "rechnung", "register",
    "onboarding", "settings", "tools", " Desktop".trim(), "desktop",
]);

export function normalizeSlug(raw: unknown): string {
    if (typeof raw !== "string") return "";
    return raw
        .trim()
        .toLowerCase()
        .replace(/ß/g, "ss")
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, MAX_SLUG_LENGTH);
}

export type SlugError = "empty" | "invalid" | "reserved" | "too_long";

export function validateSlug(slug: string): SlugError | null {
    if (!slug) return "empty";
    if (slug.length > MAX_SLUG_LENGTH) return "too_long";
    if (!SLUG_PATTERN.test(slug)) return "invalid";
    if (RESERVED.has(slug)) return "reserved";
    return null;
}

/** Extract tenant slug from a Host header value. Returns null for non-tenant hosts. */
export function slugFromHost(host: string | null, apexDomain: string): string | null {
    if (!host) return null;
    const bare = host.split(",")[0].trim().toLowerCase().split(":")[0];
    if (!bare.endsWith("." + apexDomain) || bare === apexDomain) return null;
    const sub = bare.slice(0, -(apexDomain.length + 1));
    if (!sub || sub.includes(".")) return null;
    return validateSlug(sub) ? null : sub;
}

export const RESERVED_SLUGS: ReadonlySet<string> = RESERVED;
