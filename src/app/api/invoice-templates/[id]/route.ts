import { NextRequest, NextResponse } from "next/server";
import { createSessionClient, createAdminClient, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite-server";

// DELETE /api/invoice-templates/[id] — delete own template
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    let account;
    try {
        account = (await createSessionClient()).account;
    } catch {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    try {
        const user = await account.get();
        const { databases } = await createAdminClient();
        const { id } = await params;
        const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.INVOICE_TEMPLATES, id);
        if (doc.userId !== user.$id) return NextResponse.json({ error: "Not found" }, { status: 404 });
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.INVOICE_TEMPLATES, id);
        return NextResponse.json({ deleted: true });
    } catch (error) {
        if ((error as { code?: number }).code === 404) return NextResponse.json({ error: "Not found" }, { status: 404 });
        console.error("Error deleting invoice template:", error);
        return NextResponse.json({ error: "Vorlage konnte nicht gelöscht werden." }, { status: 500 });
    }
}
