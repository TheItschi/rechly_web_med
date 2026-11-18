import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite-server";
import { isDesktopRuntime } from "@/lib/runtime";
import { AUTH_LIMITS, clientIp, rateLimit } from "@/lib/server/security";

export async function POST(request: NextRequest) {
    try {
        if (isDesktopRuntime) {
            return NextResponse.json(
                { error: "Password recovery is not available in desktop mode" },
                { status: 400 },
            );
        }
        const limit = rateLimit(
            `auth:recovery-confirm:${clientIp(request)}`,
            AUTH_LIMITS.recovery.max,
            AUTH_LIMITS.recovery.windowMs
        );
        if (!limit.ok) {
            return NextResponse.json(
                { error: "Too many attempts. Please wait a minute and try again." },
                { status: 429, headers: { "Retry-After": String(limit.retryAfterSec ?? 60) } }
            );
        }
        const { userId, secret, password } = await request.json();
        if (!userId || !secret || !password || typeof password !== "string" || password.length < 8) {
            return NextResponse.json(
                { error: "Invalid request. Password must be at least 8 characters." },
                { status: 400 },
            );
        }
        const { account } = await createAdminClient();
        await account.updateRecovery(userId, secret, password);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Recovery confirm error:", error);
        return NextResponse.json(
            { error: "Recovery link is invalid or has expired. Please request a new one." },
            { status: 400 }
        );
    }
}
