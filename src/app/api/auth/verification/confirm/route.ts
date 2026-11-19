import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite-server";
import { isDesktopRuntime } from "@/lib/runtime";
import { AUTH_LIMITS, clientIp, rateLimit } from "@/lib/server/security";

/**
 * POST /api/auth/verification/confirm
 * Completes email verification with the userId + secret from the emailed link.
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
            `auth:verification-confirm:${clientIp(request)}`,
            AUTH_LIMITS.recovery.max,
            AUTH_LIMITS.recovery.windowMs,
        );
        if (!limit.ok) {
            return NextResponse.json(
                { error: "Too many attempts. Please wait a minute and try again." },
                { status: 429, headers: { "Retry-After": String(limit.retryAfterSec ?? 60) } },
            );
        }

        const { userId, secret } = await request.json();
        if (!userId || !secret || typeof userId !== "string" || typeof secret !== "string") {
            return NextResponse.json({ error: "Invalid request." }, { status: 400 });
        }

        const { account } = await createAdminClient();
        await account.updateEmailVerification({ userId, secret });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Verification confirm error:", error);
        return NextResponse.json(
            { error: "Verification link is invalid or has expired. Please request a new one." },
            { status: 400 },
        );
    }
}
