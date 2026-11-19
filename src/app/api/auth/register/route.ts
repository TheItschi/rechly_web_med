import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, SESSION_COOKIE_NAME } from "@/lib/appwrite-server";
import { AUTH_LIMITS, clientIp, rateLimit } from "@/lib/server/security";
import { getAppwriteEndpoint, getAppwriteProjectId, getSiteUrl } from "@/lib/env";
import { isDesktopRuntime } from "@/lib/runtime";
import { Account, Client, ID } from "node-appwrite";

export async function POST(request: NextRequest) {
    try {
        const ip = clientIp(request);
        const limit = rateLimit(
            `auth:register:${ip}`,
            AUTH_LIMITS.register.max,
            AUTH_LIMITS.register.windowMs
        );
        if (!limit.ok) {
            return NextResponse.json(
                { error: "Too many attempts. Please wait a minute and try again." },
                { status: 429, headers: { "Retry-After": String(limit.retryAfterSec ?? 60) } }
            );
        }

        const { email, password, name } = await request.json();

        if (!email || !password || !name) {
            return NextResponse.json(
                { error: "Email, password, and name are required" },
                { status: 400 }
            );
        }

        const { account } = await createAdminClient();

        // Create user account
        await account.create(ID.unique(), email, password, name);

        // Create session for the new user
        const session = await account.createEmailPasswordSession(
            email,
            password
        );

        // Send the verification email (fail-open: SMTP trouble must not block signup).
        if (!isDesktopRuntime) {
            try {
                const verifyClient = new Client()
                    .setEndpoint(getAppwriteEndpoint())
                    .setProject(getAppwriteProjectId())
                    .setSession(session.secret);
                await new Account(verifyClient).createEmailVerification({
                    url: `${getSiteUrl()}/verify`,
                });
            } catch (verifyError) {
                console.error("Verification email on register failed:", verifyError);
            }
        }

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
        console.error("Registration error:", error);
        // Map only well-known, safe cases; never echo raw backend messages.
        const code = (error as { code?: number })?.code;
        const type = (error as { type?: string })?.type;
        if (code === 409 || type === "user_already_exists" || type === "email_already_exists") {
            return NextResponse.json(
                { error: "An account with this email already exists." },
                { status: 409 }
            );
        }
        if (type?.includes("password")) {
            return NextResponse.json(
                { error: "Password does not meet the requirements. Use at least 8 characters." },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: "Registration failed. Please check your details and try again." },
            { status: 400 }
        );
    }
}
