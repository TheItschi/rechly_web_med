import { NextRequest, NextResponse } from "next/server";
import { Query, ID, Permission, Role } from "node-appwrite";
import {
    createSessionClient,
    createAdminClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";

const MAX_ITEMS = 100;

function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function cleanString(value: unknown, max: number): string | undefined {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim().slice(0, max);
    return trimmed || undefined;
}

/**
 * Normalized invoice template payload stored in the `payload` attribute.
 * Line items keep the create-form shape so applying is a direct mapping.
 */
export interface InvoiceTemplatePayload {
    clientId?: string;
    notes?: string;
    paymentTerms?: string;
    deliveryDateStart?: string;
    deliveryDateEnd?: string;
    items: Array<{
        description: string;
        quantity: number;
        unitOfMeasure: string;
        price: number;
        taxRatePercent: number;
        discount: number;
        serviceDateStart?: string;
        serviceDateEnd?: string;
        productId?: string;
    }>;
}

function validDate(value: unknown): string | undefined {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const d = new Date(value + "T00:00:00Z");
    return Number.isNaN(d.getTime()) ? undefined : value;
}

function sanitizePayload(raw: unknown): { ok: true; value: InvoiceTemplatePayload } | { ok: false; error: string } {
    const body = asRecord(raw);
    if (!body) return { ok: false, error: "Ungültige Vorlage." };
    const itemsRaw = Array.isArray(body.items) ? body.items.slice(0, MAX_ITEMS) : [];
    const items: InvoiceTemplatePayload["items"] = [];
    for (const entry of itemsRaw) {
        const item = asRecord(entry);
        if (!item) continue;
        const description = cleanString(item.description, 500);
        if (!description) continue;
        items.push({
            description,
            quantity: Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0 ? Number(item.quantity) : 1,
            unitOfMeasure: cleanString(item.unitOfMeasure, 32) ?? "Stück",
            price: Number.isFinite(Number(item.price)) && Number(item.price) >= 0 ? Number(item.price) : 0,
            taxRatePercent: Number.isFinite(Number(item.taxRatePercent)) ? Number(item.taxRatePercent) : 19,
            discount: Number.isFinite(Number(item.discount)) && Number(item.discount) >= 0 ? Number(item.discount) : 0,
            ...(validDate(item.serviceDateStart) ? { serviceDateStart: item.serviceDateStart as string } : {}),
            ...(validDate(item.serviceDateEnd) ? { serviceDateEnd: item.serviceDateEnd as string } : {}),
            ...(typeof item.productId === "string" && item.productId ? { productId: item.productId.slice(0, 64) } : {}),
        });
    }
    return {
        ok: true,
        value: {
            ...(typeof body.clientId === "string" && body.clientId ? { clientId: body.clientId.slice(0, 64) } : {}),
            ...(cleanString(body.notes, 1000) ? { notes: cleanString(body.notes, 1000) } : {}),
            ...(cleanString(body.paymentTerms, 1000) ? { paymentTerms: cleanString(body.paymentTerms, 1000) } : {}),
            ...(validDate(body.deliveryDateStart) ? { deliveryDateStart: body.deliveryDateStart as string } : {}),
            ...(validDate(body.deliveryDateEnd) ? { deliveryDateEnd: body.deliveryDateEnd as string } : {}),
            items,
        },
    };
}

async function authenticated() {
    let account;
    try {
        const sessionClient = await createSessionClient();
        account = sessionClient.account;
    } catch {
        return null;
    }
    const { databases } = await createAdminClient();
    const user = await account.get().catch(() => null);
    if (!user) return null;
    return { databases, user };
}

function toJson(doc: Record<string, unknown>) {
    return {
        id: doc.$id as string,
        name: doc.name as string,
        payload: JSON.parse(String(doc.payload ?? "{}")) as InvoiceTemplatePayload,
        createdAt: new Date(doc.$createdAt as string).getTime(),
    };
}

// GET /api/invoice-templates — list own templates
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
        if (msg.includes("not found") || (error as { code?: number }).code === 404) {
            return NextResponse.json({ templates: [] });
        }
        console.error("Error listing invoice templates:", error);
        return NextResponse.json({ error: "Failed to load templates" }, { status: 500 });
    }
}

// POST /api/invoice-templates — save current draft as template
export async function POST(request: NextRequest) {
    const auth = await authenticated();
    if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    try {
        const body = await request.json();
        const record = asRecord(body);
        const name = record ? cleanString(record.name, 120) : undefined;
        if (!name) return NextResponse.json({ error: "Bitte einen Vorlagennamen angeben." }, { status: 400 });
        const payload = sanitizePayload(record ? record.payload : undefined);
        if (!payload.ok) return NextResponse.json({ error: payload.error }, { status: 400 });
        const doc = await auth.databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.INVOICE_TEMPLATES,
            ID.unique(),
            {
                userId: auth.user.$id,
                name,
                payload: JSON.stringify(payload.value),
            },
            [
                Permission.read(Role.user(auth.user.$id)),
                Permission.update(Role.user(auth.user.$id)),
                Permission.delete(Role.user(auth.user.$id)),
            ],
        );
        return NextResponse.json({ template: toJson(doc as unknown as Record<string, unknown>) }, { status: 201 });
    } catch (error) {
        console.error("Error saving invoice template:", error);
        return NextResponse.json({ error: "Template konnte nicht gespeichert werden." }, { status: 500 });
    }
}
