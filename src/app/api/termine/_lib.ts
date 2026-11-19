import { NextResponse } from "next/server";
import { createAdminClient, createSessionClient } from "@/lib/appwrite-server";
import { TermineStore } from "@/lib/termine/store";
import { headers } from "next/headers";
import { isEmailVerifiedUser } from "@/lib/server/security";

/** Authenticated business context: session identity + tenant-scoped store. */
export async function businessContext() {
    const incoming = await headers(), origin = incoming.get("origin"), host = incoming.get("host");
    let foreignOrigin = false;
    try { foreignOrigin = !!origin && new URL(origin).host !== host; } catch { foreignOrigin = true; }
    if (incoming.get("sec-fetch-site") === "cross-site" || foreignOrigin) throw {status:403,message:"Anfrage von dieser Website nicht erlaubt."};
    let account;
    try {
        const sessionClient = await createSessionClient();
        account = sessionClient.account;
    } catch {
        throw { status: 401 as const, message: "Not authenticated" };
    }
    const { databases } = await createAdminClient();
    let user;
    try { user = await account.get(); } catch { throw {status:401,message:"Not authenticated"}; }
    if (!user) throw { status: 401 as const, message: "Not authenticated" };
    // Termine (public booking pages, customer notifications) is verified-only:
    // it must not be operable from throwaway or mistyped-email accounts.
    // Desktop/local profiles are verified by construction.
    if (!isEmailVerifiedUser(user)) throw { status: 403 as const, message: "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse, um Termine zu nutzen. Den Bestätigungslink können Sie im Dashboard erneut anfordern." };
    return { userId: user.$id, store: new TermineStore(databases, user.$id) };
}

export function authFail(error: unknown) {
    if (typeof error === "object" && error && "status" in error) {
        const e = error as unknown as { status: number; message: string };
        return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return null;
}
