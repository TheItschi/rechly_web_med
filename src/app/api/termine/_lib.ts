import { NextResponse } from "next/server";
import { createAdminClient, createSessionClient } from "@/lib/appwrite-server";
import { TermineStore } from "@/lib/termine/store";

/** Authenticated business context: session identity + tenant-scoped store. */
export async function businessContext() {
    let account;
    try {
        const sessionClient = await createSessionClient();
        account = sessionClient.account;
    } catch {
        throw { status: 401 as const, message: "Not authenticated" };
    }
    const { databases } = await createAdminClient();
    const user = await account.get();
    if (!user) throw { status: 401 as const, message: "Not authenticated" };
    return { userId: user.$id, store: new TermineStore(databases, user.$id) };
}

export function authFail(error: unknown) {
    if (typeof error === "object" && error && "status" in error) {
        const e = error as unknown as { status: number; message: string };
        return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return null;
}
