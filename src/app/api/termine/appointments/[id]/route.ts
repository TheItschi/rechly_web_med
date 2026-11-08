import { NextResponse, type NextRequest } from "next/server";
import { businessContext, authFail } from "../../_lib";
import { DB, T, TermineError } from "@/lib/termine/store";
import { canTransition, type TermineStatus } from "@/lib/termine/types";
import type { AppointmentRow } from "@/lib/termine/booking";

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
        return NextResponse.json({ appointment: await store.own<AppointmentRow>(T.APPOINTMENTS, id) });
    } catch (error) {
        return fail(error, "Termin nicht gefunden.");
    }
}

/** Status transitions + internal note. Legal transitions enforced by state machine. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { store } = await businessContext();
        const { id } = await params;
        const appt = await store.own<AppointmentRow>(T.APPOINTMENTS, id);
        let body: Record<string, unknown>;
        try {
            body = await request.json();
            if (!body || typeof body !== "object") throw new Error();
        } catch {
            return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
        }
        const patch: Record<string, unknown> = {};
        if (typeof body.status === "string") {
            const next = body.status as TermineStatus;
            if (!canTransition(appt.status, next)) {
                return NextResponse.json({ error: `Übergang von ${appt.status} nach ${next} ist nicht erlaubt.` }, { status: 409 });
            }
            patch.status = next;
            if (next === "CANCELLED_BY_BUSINESS") patch.cancelledAt = new Date().toISOString();
            if (next === "COMPLETED") patch.completedAt = new Date().toISOString();
        }
        if (typeof body.internalNote === "string") patch.internalNote = body.internalNote.slice(0, 1000);
        if (Object.keys(patch).length === 0) return NextResponse.json({ appointment: appt });
        const updated = await store.db.updateDocument(DB, T.APPOINTMENTS, id, patch);
        return NextResponse.json({ appointment: updated });
    } catch (error) {
        return fail(error, "Termin konnte nicht aktualisiert werden.");
    }
}
