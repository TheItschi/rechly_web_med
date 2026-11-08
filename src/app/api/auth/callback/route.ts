import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
    createSessionFromOAuth,
    createSessionClient,
} from "@/lib/appwrite-server";

/**
 * Get the actual origin (handles proxies/load balancers)
 */
function getOrigin(request: NextRequest): string {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("host");

    if (forwardedHost) {
        return `${forwardedProto}://${forwardedHost}`;
    } else if (host && !host.includes("localhost")) {
        return `https://${host}`;
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL;
    }
    return request.nextUrl.origin;
}

/**
 * GET /api/auth/callback
 * Handles OAuth callback - receives userId and secret from Appwrite
 * Creates session cookie and redirects to appropriate page
 */
export async function GET(request: NextRequest) {
    const origin = getOrigin(request);

    try {
        logger.debug("OAuth callback origin:", origin);

        const { searchParams } = request.nextUrl;
        const userId = searchParams.get("userId");
        const secret = searchParams.get("secret");
        const error = searchParams.get("error");

        logger.debug("OAuth callback received:", {
            userId: !!userId,
            secret: !!secret,
            error,
        });

        // Handle OAuth error - check for user_already_exists
        if (error) {
            console.error("OAuth error from provider:", error);

            // Check if this is the "account exists" error (in English or German)
            const lowerError = error.toLowerCase();
            if (
                lowerError.includes("user_already_exists") ||
                lowerError.includes("already exists") ||
                lowerError.includes("existiert bereits") ||
                lowerError.includes("409")
            ) {
                const errorMessage = encodeURIComponent(
                    JSON.stringify({
                        type: "user_already_exists",
                        message:
                            "An account with this email already exists. Please log in with your email and password.",
                    })
                );
                return NextResponse.redirect(
                    `${origin}/login?error=${errorMessage}`
                );
            }

            return NextResponse.redirect(
                `${origin}/login?error=${encodeURIComponent(error)}`
            );
        }

        // Validate required params
        if (!userId || !secret) {
            console.error("Missing userId or secret in callback");
            return NextResponse.redirect(
                `${origin}/login?error=missing_params`
            );
        }

        // Create session from OAuth token
        try {
            await createSessionFromOAuth(userId, secret);
            logger.debug("Session created for user:", userId);
        } catch (sessionError: unknown) {
            console.error("Session creation error:", sessionError);

            // Check if it's a user_already_exists error (in English or German)
            const errorMessage =
                sessionError instanceof Error
                    ? sessionError.message
                    : String(sessionError);
            const lowerErrorMsg = errorMessage.toLowerCase();
            if (
                lowerErrorMsg.includes("user_already_exists") ||
                lowerErrorMsg.includes("already exists") ||
                lowerErrorMsg.includes("existiert bereits") ||
                lowerErrorMsg.includes("409")
            ) {
                const error = encodeURIComponent(
                    JSON.stringify({
                        type: "user_already_exists",
                        message:
                            "An account with this email already exists. Please log in with your email and password.",
                    })
                );
                return NextResponse.redirect(`${origin}/login?error=${error}`);
            }

            return NextResponse.redirect(
                `${origin}/login?error=session_creation_failed`
            );
        }

        // Check if user has company info (to determine onboarding)
        try {
            const { account } = await createSessionClient();
            const user = await account.get();

            // Get user preferences or check company info
            // For now, redirect to callback page which handles this check
            logger.debug("User authenticated:", user.$id);

            // Redirect to the client-side callback to check onboarding status
            return NextResponse.redirect(`${origin}/auth/callback?from=ssr`);
        } catch (sessionError) {
            console.error("Session verification error:", sessionError);
            return NextResponse.redirect(`${origin}/auth/callback?from=ssr`);
        }
    } catch (error) {
        console.error("OAuth callback error:", error);
        return NextResponse.redirect(
            `${origin}/login?error=session_creation_failed`
        );
    }
}
