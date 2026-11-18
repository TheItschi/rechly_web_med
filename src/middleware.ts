import { NextResponse, type NextRequest } from "next/server";
import { slugFromHost } from "@/lib/termine/slug";

/**
 * Subdomain routing for booking pages: <slug>.rechly.de/* -> /buchen/[slug]/*.
 * Runs behind self-hosted Traefik / reverse proxy (Host header preserved).
 * Path-based /buchen/[slug] keeps working (local dev, previews, no-DNS setups).
 * Trust note: only the bare host is used; x-forwarded-host is ignored so a
 * client cannot spoof tenancy. Traefik overwrites Host only from the
 * actual SNI/connection, which is what we read.
 */
const APEX = "rechly.de";
const BYPASS = /^\/(api|_next|favicon|.*\.[a-z0-9]+$)/i;

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Routes that authenticate without the session cookie (bearer secret or
 * unguessable token) or change no server state. CSRF needs ambient cookie
 * authority, so these are exempt from the Origin check below.
 */
const CSRF_EXEMPT = [
    "/api/cleanup-guests",
    "/api/cron/",
    "/api/admin/",
    "/api/public/",
    "/api/termine/public/",
    "/api/termine/manage/",
];

/**
 * Defense-in-depth CSRF check for cookie-authenticated API mutations.
 * SameSite=lax alone does not stop same-site attacks (booking tenants live
 * on <slug>.rechly.de subdomains), so reject cross-site browser requests:
 * `Sec-Fetch-Site: cross-site` or an Origin whose host differs from Host.
 * Requests without an Origin header (curl, server-to-server, native apps)
 * are not browser CSRF vectors and pass through to normal auth.
 */
function csrfRejected(request: NextRequest): boolean {
    const path = request.nextUrl.pathname;
    if (!path.startsWith("/api/")) return false;
    if (!MUTATING_METHODS.has(request.method)) return false;
    if (CSRF_EXEMPT.some((prefix) => path.startsWith(prefix))) return false;

    if (request.headers.get("sec-fetch-site") === "cross-site") return true;

    const origin = request.headers.get("origin");
    if (!origin) return false;
    try {
        return new URL(origin).host !== (request.headers.get("host") ?? "");
    } catch {
        return true;
    }
}

export function middleware(request: NextRequest) {
    if (csrfRejected(request)) {
        return NextResponse.json(
            { error: "Request origin not allowed." },
            { status: 403 },
        );
    }

    const path = request.nextUrl.pathname;
    if (BYPASS.test(path) || path.startsWith("/buchen/") || path.startsWith("/dashboard")) {
        return NextResponse.next();
    }
    const slug = slugFromHost(request.headers.get("host"), APEX);
    if (!slug) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = `/buchen/${slug}${path === "/" ? "" : path}`;
    return NextResponse.rewrite(url);
}

export const config = {
    matcher: ["/api/:path*", "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
