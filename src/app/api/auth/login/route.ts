import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, SESSION_COOKIE_NAME } from "@/lib/appwrite-server";
import { AUTH_LIMITS, clientIp, rateLimit } from "@/lib/server/security";

export async function POST(request: NextRequest) {
    try {
        const ip = clientIp(request);
        // Global per-IP budget plus a tighter per-account budget (added below once
        // the email is known) so NAT/shared offices are not locked out by one user.
        const globalLimit = rateLimit(`auth:login:ip:${ip}`, 60, 60_000);
        if (!globalLimit.ok) {
            return NextResponse.json(
                { error: "Too many attempts. Please wait a minute and try again." },
                { status: 429, headers: { "Retry-After": String(globalLimit.retryAfterSec ?? 60) } }
            );
        }

        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            );
        }

        const accountLimit = rateLimit(
            `auth:login:${ip}:${String(email).toLowerCase()}`,
            AUTH_LIMITS.login.max,
            AUTH_LIMITS.login.windowMs
        );
        if (!accountLimit.ok) {
            return NextResponse.json(
                { error: "Too many attempts. Please wait a minute and try again." },
                { status: 429, headers: { "Retry-After": String(accountLimit.retryAfterSec ?? 60) } }
            );
        }

        const { account } = await createAdminClient();

        // Create email session
        const session = await account.createEmailPasswordSession(
            email,
            password
        );

        // Cookie lifetime follows the Appwrite session, capped at 30 days.
        const THIRTY_DAYS = 60 * 60 * 24 * 30;
        const sessionExpiry = session.expire
            ? Math.floor((new Date(session.expire).getTime() - Date.now()) / 1000)
            : THIRTY_DAYS;
        const maxAge = Math.max(0, Math.min(THIRTY_DAYS, sessionExpiry));

        // Set session cookie
        const response = NextResponse.json({ success: true });
        response.cookies.set(SESSION_COOKIE_NAME, session.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge,
        });

        return response;
    } catch (error) {
        console.error("Login error:", error);
        // Generic message: never reveal whether the email exists or the password was wrong.
        return NextResponse.json(
            { error: "Invalid email or password" },
            { status: 401 }
        );
    }
}
