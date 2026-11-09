import { attemptDelivery } from "@/lib/termine/delivery";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite-server";
import { TermineError, TermineStore } from "@/lib/termine/store";
import { loadManaged } from "@/lib/termine/managed";
import { rescheduleBooking, loadSettings } from "@/lib/termine/booking";
import { clientIp } from "@/lib/termine/ratelimit";
import { bookingJson } from "@/lib/termine/http";

function fail(error: unknown) {
    if (error instanceof TermineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Die Umbuchung ist fehlgeschlagen." }, { status: 500 });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
    try {
        const validatedBody = await bookingJson(request);
        const { token } = await params;
        let body: Record<string, unknown>;
        try {
            body = validatedBody;
            if (!body || typeof body !== "object" || typeof body.newStartUtc !== "string") throw new Error();
        } catch {
            return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
        }
        const ctx = await loadManaged(clientIp(request), token);
        const { databases } = await createAdminClient();
        const store = new TermineStore(databases, ctx.businessUserId);
        const settings = await loadSettings(store);
        if (!settings) throw new TermineError("Buchung nicht verfügbar.", 404);
        const updated = await rescheduleBooking(store, settings, {
            appointmentId: ctx.appointment.$id,
            newStartUtc: body.newStartUtc as string,
            actor: "customer",
        });
        await attemptDelivery(store, updated.$id);
        return NextResponse.json({ status: updated.status, startUtc: updated.startUtc, endUtc: updated.endUtc });
    } catch (error) {
        return fail(error);
    }
}
