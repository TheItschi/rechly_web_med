import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuthURL } from "@/lib/appwrite-server";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow using server-side token creation
 * This bypasses ad blockers since the redirect happens server-side
 */
export async function GET(request: NextRequest) {
    try {
        // Get the origin from various sources (handle proxies/load balancers)
        const forwardedHost = request.headers.get("x-forwarded-host");
        const forwardedProto =
            request.headers.get("x-forwarded-proto") || "https";
        const host = request.headers.get("host");

        // Determine the actual origin
        let origin: string;
        if (forwardedHost) {
            origin = `${forwardedProto}://${forwardedHost}`;
        } else if (host && !host.includes("localhost")) {
            origin = `https://${host}`;
        } else if (process.env.NEXT_PUBLIC_APP_URL) {
            origin = process.env.NEXT_PUBLIC_APP_URL;
        } else {
            origin = request.nextUrl.origin;
        }

        logger.debug("OAuth origin detection:", { forwardedHost, host, origin });

        // Use api/auth/callback for both success and failure to properly handle errors
        const successUrl = `${origin}/api/auth/callback`;
        const failureUrl = `${origin}/api/auth/callback`;

        const redirectUrl = await getGoogleOAuthURL(successUrl, failureUrl);

        return NextResponse.redirect(redirectUrl);
    } catch (error) {
        console.error("OAuth initiation error:", error);
        return NextResponse.redirect(
            new URL("/login?error=oauth_init_failed", request.url)
        );
    }
}
