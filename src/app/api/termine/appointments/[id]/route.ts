import { NextResponse, type NextRequest } from "next/server";
import { businessContext, authFail } from "../../_lib";
import { T, TermineError } from "@/lib/termine/store";
import { updateBooking, cancelBooking, loadSettings, type AppointmentRow } from "@/lib/termine/booking";
import type { TermineStatus } from "@/lib/termine/types";
import { bookingJson } from "@/lib/termine/http";
import { attemptDelivery } from "@/lib/termine/delivery";
export const maxDuration = 60;
function fail(error: unknown) {
    return (
        authFail(error) ||
        NextResponse.json(
            {
                error:
                    error instanceof TermineError
                        ? error.message
                        : "Termin konnte nicht geladen oder gespeichert werden.",
            },
            { status: error instanceof TermineError ? error.status : 503 },
        )
    );
}
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { store } = await businessContext(),
            { id } = await params;
        return NextResponse.json({ appointment: await store.own<AppointmentRow>(T.APPOINTMENTS, id) });
    } catch (error) {
        return fail(error);
    }
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const body = await bookingJson(request),
            { store } = await businessContext(),
            { id } = await params;
        if (body.status === "CANCELLED_BY_BUSINESS") {
            const settings = await loadSettings(store);
            if (!settings) throw new TermineError("Termineinstellungen fehlen.", 409);
            const appointment = await cancelBooking(store, settings, id, "business");
            await attemptDelivery(store, id);
            return NextResponse.json({ appointment });
        }
        const appointment = await updateBooking(store, id, {
            status: typeof body.status === "string" ? (body.status as TermineStatus) : undefined,
            internalNote: typeof body.internalNote === "string" ? body.internalNote : undefined,
        });
        if (body.status === "CONFIRMED") await attemptDelivery(store, id);
        return NextResponse.json({ appointment });
    } catch (error) {
        return fail(error);
    }
}
