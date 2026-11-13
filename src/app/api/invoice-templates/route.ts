import { NextRequest, NextResponse } from "next/server";
import { Query, ID, Permission, Role } from "node-appwrite";
import { createSessionClient, createAdminClient, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite-server";
import { cleanString, sanitizeTemplatePayload, type InvoiceTemplate, type InvoiceTemplatePayload } from "@/lib/invoiceTemplates";

async function authenticated() {
    let account;
    try {
        account = (await createSessionClient()).account;
    } catch {
        return null;
    }
    const user = await account.get().catch(() => null);
    if (!user) return null;
    const { databases } = await createAdminClient();
    return { databases, user };
}

const toJson = (doc: Record<string, unknown>): InvoiceTemplate => ({
    id: doc.$id as string,
    name: doc.name as string,
    payload: JSON.parse(String(doc.payload ?? "{}")) as InvoiceTemplatePayload,
    createdAt: new Date(doc.$createdAt as string).getTime(),
});

// GET /api/invoice-templates — own templates, newest first
export async function GET() {
    const auth = await authenticated();
    if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    try {
        const res = await auth.databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICE_TEMPLATES, [
            Query.equal("userId", auth.user.$id),
            Query.orderDesc("$createdAt"),
            Query.limit(100),
        ]);
        return NextResponse.json({ templates: res.documents.map((d) => toJson(d as unknown as Record<string, unknown>)) });
    } catch (error) {
        const msg = error instanceof Error ? error.message : "";
        if (msg.includes("not found") || (error as { code?: number }).code === 404) return NextResponse.json({ templates: [] });
        console.error("Error listing invoice templates:", error);
        return NextResponse.json({ error: "Vorlagen konnten nicht geladen werden." }, { status: 500 });
    }
}

// POST /api/invoice-templates — save the current draft as template
export async function POST(request: NextRequest) {
    const auth = await authenticated();
    if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    try {
        const body = (await request.json()) as Record<string, unknown> | null;
        const name = cleanString(body?.name, 120);
        if (!name) return NextResponse.json({ error: "Bitte einen Vorlagennamen angeben." }, { status: 400 });
        const payload = sanitizeTemplatePayload(body?.payload);
        if (!payload.ok) return NextResponse.json({ error: payload.error }, { status: 400 });
        if (payload.value.clientId) {
            const client = await auth.databases.getDocument(DATABASE_ID, COLLECTIONS.CLIENTS, payload.value.clientId).catch(() => null);
            if (client?.userId !== auth.user.$id) delete payload.value.clientId;
        }
        const doc = await auth.databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.INVOICE_TEMPLATES,
            ID.unique(),
            { userId: auth.user.$id, name, payload: JSON.stringify(payload.value) },
            [
                Permission.read(Role.user(auth.user.$id)),
                Permission.update(Role.user(auth.user.$id)),
                Permission.delete(Role.user(auth.user.$id)),
            ],
        );
        return NextResponse.json({ template: toJson(doc as unknown as Record<string, unknown>) }, { status: 201 });
    } catch (error) {
        console.error("Error saving invoice template:", error);
        const msg = (error as { message?: string })?.message || "";
        if (/collection.*not found|Collection with the requested ID/i.test(msg)) {
            return NextResponse.json({ error: "Datenbankschema für Vorlagen fehlt – bitte `npm run migrate:medical` ausführen" }, { status: 400 });
        }
        return NextResponse.json({ error: "Vorlage konnte nicht gespeichert werden." }, { status: 500 });
    }
}
