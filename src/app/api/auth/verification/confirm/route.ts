import { NextRequest, NextResponse } from "next/server";
import { Account, Client } from "node-appwrite";
import { getAppwriteEndpoint, getAppwriteProjectId } from "@/lib/env";
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
                { code: "rate_limited", error: "Too many attempts. Please wait a minute and try again." },
                { status: 429, headers: { "Retry-After": String(limit.retryAfterSec ?? 60) } },
            );
        }

        const body = await request.json().catch(() => null);
        const { userId, secret } = body ?? {};
        if (typeof userId !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/.test(userId)
            || typeof secret !== "string" || !secret || secret.length > 256) {
            return NextResponse.json({ code: "invalid_link", error: "Invalid request." }, { status: 400 });
        }

        // The emailed secret is the credential. No admin key or login session is
        // needed (the recipient may open the link on a different device).
        const account = new Account(new Client()
            .setEndpoint(getAppwriteEndpoint())
            .setProject(getAppwriteProjectId()));
        await account.updateEmailVerification({ userId, secret });
        return NextResponse.json({ success: true });
    } catch (error) {
        const { code, type } = error as { code?: number; type?: string };
        if (type === "user_invalid_token" || type === "user_not_found") {
            return NextResponse.json(
                { code: "invalid_link", error: "Verification link is invalid, expired or already used. Please request a new one." },
                { status: 400 },
            );
        }
        if (code === 429) {
            return NextResponse.json(
                { code: "rate_limited", error: "Too many attempts. Please wait and try again." },
                { status: 429, headers: { "Retry-After": "60" } },
            );
        }
        // Do not log the full SDK exception: it may contain the emailed secret.
        console.error("Verification service failure", { code, type });
        return NextResponse.json(
            { code: "verification_unavailable", error: "Verification is temporarily unavailable. Please try again later." },
            { status: 503 },
        );
    }
}
