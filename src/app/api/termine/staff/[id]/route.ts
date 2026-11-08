import { NextResponse, type NextRequest } from "next/server";
import { businessContext, authFail } from "../../_lib";
import { DB, T, TermineError } from "@/lib/termine/store";

function fail(error: unknown, fallback: string) {
    const auth = authFail(error);
    if (auth) return auth;
    if (error instanceof TermineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { store } = await businessContext();
        const { id } = await params;
        await store.own(T.STAFF, id);
        let body: Record<string, unknown>;
        try {
            body = await request.json();
            if (!body || typeof body !== "object") throw new Error();
        } catch {
            return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
        }
        const allowed = ["name", "description", "active", "bookable", "serviceIds", "color"] as const;
        const patch: Record<string, unknown> = {};
        for (const k of allowed) if (k in body) patch[k] = body[k];
        const updated = await store.db.updateDocument(DB, T.STAFF, id, patch);
        return NextResponse.json({ staff: updated });
    } catch (error) {
        return fail(error, "Mitarbeiter konnte nicht gespeichert werden.");
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { store } = await businessContext();
        const { id } = await params;
        await store.own(T.STAFF, id);
        await store.db.deleteDocument(DB, T.STAFF, id);
        return NextResponse.json({ deleted: true });
    } catch (error) {
        return fail(error, "Mitarbeiter konnte nicht gelöscht werden.");
    }
}
