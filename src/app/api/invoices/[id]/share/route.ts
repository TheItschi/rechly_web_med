import { NextRequest, NextResponse } from "next/server";
import { createSessionClient, createAdminClient, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite-server";
import { getSiteUrl } from "@/lib/env";
import { generateShareToken } from "@/lib/shareToken";

async function loadOwnedInvoice(id: string) {
    let account;
    try {
        account = (await createSessionClient()).account;
    } catch {
        return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
    }
    const user = await account.get().catch(() => null);
    if (!user) return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };

    const { databases } = await createAdminClient();
    const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.INVOICES, id).catch(() => null);
    if (!doc || doc.userId !== user.$id) {
        return { error: NextResponse.json({ error: "Invoice not found" }, { status: 404 }) };
    }
    return { databases, doc };
}

function schemaMissing(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("Unknown attribute") || message.includes("shareToken");
}

/** Create (or return) the public share link for an invoice. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const owned = await loadOwnedInvoice(id);
        if ("error" in owned) return owned.error;
        const { databases, doc } = owned;

        const existing = (doc as { shareToken?: string }).shareToken;
        const token = existing || generateShareToken();
        if (!existing) {
            try {
                await databases.updateDocument(DATABASE_ID, COLLECTIONS.INVOICES, id, { shareToken: token });
            } catch (error) {
                if (schemaMissing(error)) {
                    return NextResponse.json(
                        { error: "Share links are not enabled on this instance yet. Run: node scripts/migrate-share-token.mjs" },
                        { status: 501 },
                    );
                }
                throw error;
            }
        }
        return NextResponse.json({ token, url: `${getSiteUrl()}/i/${token}` });
    } catch (error) {
        console.error("Share link error:", error);
        return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
    }
}

/** Revoke the public share link. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const owned = await loadOwnedInvoice(id);
        if ("error" in owned) return owned.error;
        try {
            await owned.databases.updateDocument(DATABASE_ID, COLLECTIONS.INVOICES, id, { shareToken: null });
        } catch (error) {
            if (schemaMissing(error)) return NextResponse.json({ success: true });
            throw error;
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Share revoke error:", error);
        return NextResponse.json({ error: "Failed to revoke share link" }, { status: 500 });
    }
}
