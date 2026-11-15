import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite-server";
import { isDesktopRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
    try {
        if (isDesktopRuntime) {
            return NextResponse.json(
                { error: "Password recovery is not available in desktop mode" },
                { status: 400 },
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
        const message = error instanceof Error ? error.message : "Recovery failed";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
