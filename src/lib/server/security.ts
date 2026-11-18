/**
 * Shared server-side security helpers: in-memory rate limiting, SSRF guard
 * for user-configured outbound AI endpoints, and upload size accounting.
 *
 * Rate-limit scope note: counters live per instance and reset on restart.
 * That is abuse mitigation (brute-force / cost spikes), not an accounting
 * boundary — same trade-off as src/lib/termine/ratelimit.ts.
 */

// ---------------------------------------------------------------------------
// Rate limiting (sliding window, per key)
// ---------------------------------------------------------------------------

const hits = new Map<string, number[]>();

export function rateLimit(
    key: string,
    max: number,
    windowMs: number,
): { ok: boolean; retryAfterSec?: number } {
    const now = Date.now();
    const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (arr.length >= max) {
        const retryAfterSec = Math.ceil((arr[0] + windowMs - now) / 1000);
        return { ok: false, retryAfterSec: Math.max(retryAfterSec, 1) };
    }
    arr.push(now);
    if (hits.size > 5000) {
        for (const [k, v] of hits.entries()) {
            if (v.every((t) => now - t >= windowMs)) hits.delete(k);
        }
    }
    hits.set(key, arr);
    return { ok: true };
}

export function clientIp(request: Request): string {
    const fwd = request.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return request.headers.get("x-real-ip") ?? "unknown";
}

/** Budgets for credential endpoints (per IP). Generous for humans, useless for brute force. */
export const AUTH_LIMITS = {
    login: { max: 10, windowMs: 60_000 },
    register: { max: 5, windowMs: 60_000 },
    recovery: { max: 5, windowMs: 60_000 },
} as const;

// ---------------------------------------------------------------------------
// SSRF guard for user-configured AI base URLs
// ---------------------------------------------------------------------------

function parseIpv4(host: string): number[] | null {
    const parts = host.split(".");
    if (parts.length !== 4) return null;
    const nums = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
    if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    return nums;
}

function isPrivateIpv4(host: string): boolean {
    const ip = parseIpv4(host);
    if (!ip) return false;
    const [a, b] = ip;
    return (
        a === 0 || // "this" network / 0.0.0.0
        a === 10 || // RFC1918
        a === 127 || // loopback
        (a === 169 && b === 254) || // link-local (incl. cloud metadata)
        (a === 172 && b >= 16 && b <= 31) || // RFC1918
        (a === 192 && b === 168) || // RFC1918
        (a === 192 && b === 0) || // IETF special registry
        (a === 198 && (b === 18 || b === 19)) || // benchmarking
        (a === 100 && b >= 64 && b <= 127) || // CGNAT shared space
        a >= 240 // reserved / broadcast
    );
}

function isCloudMetadataHost(host: string): boolean {
    return (
        host === "169.254.169.254" ||
        host === "100.100.100.200" || // Alibaba metadata
        host === "metadata.google.internal" ||
        host === "metadata" ||
        host === "fd00:ec2::254"
    );
}

export function isPrivateOrLoopbackHost(rawHost: string): boolean {
    const host = rawHost.trim().toLowerCase().replace(/^\[/, "").replace(/\]$/, "").replace(/\.$/, "");
    if (!host) return true;
    if (isCloudMetadataHost(host)) return true;
    if (host === "localhost" || host.endsWith(".localhost")) return true;
    if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".lan") || host.endsWith(".home")) return true;
    if (isPrivateIpv4(host)) return true;
    // IPv6 literals: loopback, unspecified, link-local fe80::/10, unique-local fc00::/7.
    if (host.includes(":")) {
        if (host === "::1" || host === "::") return true;
        const first = host.split(":")[0];
        const head = parseInt(first || "0", 16);
        if (Number.isFinite(head)) {
            if (head >= 0xfe80 && head <= 0xfebf) return true; // fe80::/10
            if (head >= 0xfc00 && head <= 0xfdff) return true; // fc00::/7
        }
        // IPv4-mapped IPv6, e.g. ::ffff:127.0.0.1
        const mapped = host.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
        if (mapped && isPrivateIpv4(mapped[1])) return true;
        return false;
    }
    // Bare integer / hex host forms (e.g. http://2130706433) — URL parsers
    // may resolve these to 127.0.0.1, so treat them as unsafe.
    if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/.test(host)) return true;
    return false;
}

/**
 * Local AI endpoints (Ollama on localhost/LAN) are legitimate for desktop
 * and laptop installs, but must never be reachable from a hosted instance.
 * Allow them only for desktop mode, an explicit operator opt-in, a loopback
 * public app URL (laptop install), or non-production runs.
 */
export function localAiEndpointsAllowed(): boolean {
    if (process.env.RECHLY_DESKTOP === "1") return true;
    if (process.env.RECHLY_ALLOW_LOCAL_AI_ENDPOINTS === "1") return true;
    if (process.env.NODE_ENV !== "production") return true;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (appUrl) {
        try {
            const host = new URL(appUrl).hostname.toLowerCase();
            if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
        } catch {
            // fall through to deny
        }
    }
    return false;
}

export type OutboundUrlVerdict = { ok: true; url: URL } | { ok: false; error: string };

/**
 * Validate a user-configured outbound AI URL before the server fetches it.
 * Blocks non-http(s) schemes and private/loopback targets (SSRF). Cloud
 * metadata endpoints stay blocked even when local endpoints are allowed.
 * Note: this checks the literal host; a public DNS name rebinding to a
 * private address is out of scope for this layer.
 */
export function validateOutboundAiUrl(
    rawUrl: string,
    options?: { allowLocal?: boolean },
): OutboundUrlVerdict {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        return { ok: false, error: "Invalid AI endpoint URL." };
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        return { ok: false, error: "AI endpoint URL must use http or https." };
    }
    const host = url.hostname.toLowerCase();
    if (isCloudMetadataHost(host)) {
        return { ok: false, error: "AI endpoint URL is not allowed." };
    }
    const allowLocal = options?.allowLocal ?? localAiEndpointsAllowed();
    if (!allowLocal && isPrivateOrLoopbackHost(host)) {
        return {
            ok: false,
            error: "AI endpoint URL must not point to a private or loopback address on a hosted instance. Self-hosters can opt in with RECHLY_ALLOW_LOCAL_AI_ENDPOINTS=1.",
        };
    }
    return { ok: true, url };
}

// ---------------------------------------------------------------------------
// Upload size accounting (reject before decoding/allocating)
// ---------------------------------------------------------------------------

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // matches the receipts bucket limit

/** Decoded byte size of a base64 payload, computed without decoding it. */
export function base64DecodedSize(value: string): number {
    const clean = value.replace(/\s/g, "");
    if (!clean) return 0;
    const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
    return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

export function isOversizedBase64(value: unknown, maxBytes: number = MAX_UPLOAD_BYTES): boolean {
    if (typeof value !== "string" || !value) return false;
    // Cheap length pre-check avoids scanning huge strings twice.
    if (value.length > Math.ceil(maxBytes / 3) * 4 + 4) return true;
    return base64DecodedSize(value) > maxBytes;
}
