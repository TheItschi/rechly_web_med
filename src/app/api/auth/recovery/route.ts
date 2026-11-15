import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite-server";
import { getSiteUrl } from "@/lib/env";
import { isDesktopRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
    try {
        if (isDesktopRuntime) {
            return NextResponse.json(
                { error: "Password recovery is not available in desktop mode" },
                { status: 400 },
            );
        }
        const { email } = await request.json();
        if (!email || typeof email !== "string") {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }
        const { account } = await createAdminClient();
        await account.createRecovery(email, `${getSiteUrl()}/reset-password`);
        // Always report success so the endpoint does not reveal registered emails.
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: true });
    }
}
