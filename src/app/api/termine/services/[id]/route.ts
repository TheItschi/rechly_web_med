import { NextResponse, type NextRequest } from "next/server";
import { businessContext, authFail } from "../../_lib";
import { DB, T, TermineError } from "@/lib/termine/store";
import type { ServiceRow } from "@/lib/termine/booking";

function fail(error: unknown, fallback: string) {
    const auth = authFail(error);
    if (auth) return auth;
    if (error instanceof TermineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { store } = await businessContext();
        const { id } = await params;
        return NextResponse.json({ service: await store.own<ServiceRow>(T.SERVICES, id) });
    } catch (error) {
        return fail(error, "Leistung nicht gefunden.");
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { store } = await businessContext();
        const { id } = await params;
        await store.own(T.SERVICES, id);
        let body: Record<string, unknown>;
        try {
            body = await request.json();
            if (!body || typeof body !== "object") throw new Error();
        } catch {
            return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
        }
        const allowed = ["name", "description", "category", "durationMinutes", "priceCents", "currency", "prepMinutes", "cleanupMinutes", "active", "publicVisible", "staffIds", "sortOrder", "productId", "taxRatePercent"] as const;
        const patch: Record<string, unknown> = {};
        for (const k of allowed) if (k in body) patch[k] = body[k];
        if (typeof patch.name === "string" && !patch.name.trim()) return NextResponse.json({ error: "Bitte einen Leistungsnamen angeben." }, { status: 400 });
        const updated = await store.db.updateDocument(DB, T.SERVICES, id, patch);
        return NextResponse.json({ service: updated });
    } catch (error) {
        return fail(error, "Leistung konnte nicht gespeichert werden.");
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { store } = await businessContext();
        const { id } = await params;
        await store.own(T.SERVICES, id);
        await store.db.deleteDocument(DB, T.SERVICES, id);
        return NextResponse.json({ deleted: true });
    } catch (error) {
        return fail(error, "Leistung konnte nicht gelöscht werden.");
    }
}
