import { attemptDelivery } from "@/lib/termine/delivery";
export const maxDuration = 60;
import { NextResponse, type NextRequest } from "next/server";
import { businessContext, authFail } from "../../../_lib";
import { TermineError } from "@/lib/termine/store";
import { loadSettings, rescheduleBooking } from "@/lib/termine/booking";

function fail(error: unknown) {
    const auth = authFail(error);
    if (auth) return auth;
    if (error instanceof TermineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Die Umbuchung ist fehlgeschlagen." }, { status: 500 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { store } = await businessContext();
        const { id } = await params;
        let body: Record<string, unknown>;
        try {
            body = await request.json();
            if (!body || typeof body !== "object" || typeof body.newStartUtc !== "string") throw new Error();
        } catch {
            return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
        }
        const settings = await loadSettings(store);
        if (!settings) throw new TermineError("Termine ist nicht eingerichtet.", 400);
        const updated = await rescheduleBooking(store, settings, {
            appointmentId: id,
            newStartUtc: body.newStartUtc as string,
            newStaffId: typeof body.newStaffId === "string" ? body.newStaffId : undefined,
            actor: "business",
        });
        await attemptDelivery(store, updated.$id);
        return NextResponse.json({ appointment: updated });
    } catch (error) {
        return fail(error);
    }
}
