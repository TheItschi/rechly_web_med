import { NextResponse, type NextRequest } from "next/server";
import { slugFromHost } from "@/lib/termine/slug";

/**
 * Subdomain routing for booking pages: <slug>.rechly.de/* -> /buchen/[slug]/*.
 * Runs on Vercel and behind the self-hosted Traefik (Host header preserved).
 * Path-based /buchen/[slug] keeps working (local dev, previews, no-DNS setups).
 * Trust note: only the bare host is used; x-forwarded-host is ignored so a
 * client cannot spoof tenancy. Traefik/Vercel overwrite Host only from the
 * actual SNI/connection, which is what we read.
 */
const APEX = "rechly.de";
const BYPASS = /^\/(api|_next|favicon|.*\.[a-z0-9]+$)/i;

export function middleware(request: NextRequest) {
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
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
