import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/appwrite-server";
import { getSiteUrl } from "@/lib/env";
import { isDesktopRuntime } from "@/lib/runtime";
import { AUTH_LIMITS, clientIp, isEmailVerifiedUser, rateLimit } from "@/lib/server/security";

/**
 * POST /api/auth/verification
 * Sends (or resends) the email-verification link to the signed-in user.
 */
export async function POST(request: NextRequest) {
    try {
        if (isDesktopRuntime) {
            return NextResponse.json(
                { error: "Email verification is not available in desktop mode" },
                { status: 400 },
            );
        }
        const limit = rateLimit(
            `auth:verification:${clientIp(request)}`,
            AUTH_LIMITS.recovery.max,
            AUTH_LIMITS.recovery.windowMs,
        );
        if (!limit.ok) {
            return NextResponse.json(
                { error: "Too many attempts. Please wait a minute and try again." },
                { status: 429, headers: { "Retry-After": String(limit.retryAfterSec ?? 60) } },
            );
        }

        let account;
        let user;
        try {
            ({ account } = await createSessionClient());
            user = await account.get();
        } catch {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }
        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }
        if (!user.email) {
            return NextResponse.json(
                { error: "Guest accounts have no email to verify. Create an account first." },
                { status: 400 },
            );
        }
        if (isEmailVerifiedUser(user)) {
            return NextResponse.json({ success: true, alreadyVerified: true });
        }

        await account.createEmailVerification({ url: `${getSiteUrl()}/verify` });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Verification send error:", error);
        return NextResponse.json(
            { error: "Could not send the verification email. Please try again later." },
            { status: 500 },
        );
    }
}
