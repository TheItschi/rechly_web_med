import { NextResponse } from "next/server";
import { TermineError, TermineStore } from "@/lib/termine/store";
import { resolvePublicBusiness } from "@/lib/termine/public";
import { createBooking } from "@/lib/termine/booking";
import { attemptDelivery } from "@/lib/termine/delivery";
import { bookingJson } from "@/lib/termine/http";
import { clientIp, rateLimit, PUBLIC_LIMITS } from "@/lib/termine/ratelimit";
export const maxDuration = 60;
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const body = await bookingJson(request);
        const rl = rateLimit(
            "book:" + clientIp(request),
            PUBLIC_LIMITS.bookingCreate.max,
            PUBLIC_LIMITS.bookingCreate.windowMs,
        );
        if (!rl.ok)
            return NextResponse.json(
                { error: "Zu viele Buchungsversuche. Bitte kurz warten." },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
            );
        if (typeof body.serviceId !== "string" || typeof body.startUtc !== "string")
            throw new TermineError("Bitte Leistung und Uhrzeit auswählen.");
        const { slug } = await params,
            { db, settings } = await resolvePublicBusiness(slug),
            store = new TermineStore(db, settings.userId);
        const { appointment, manageToken } = await createBooking(store, settings, {
            serviceId: body.serviceId,
            startUtc: body.startUtc,
            staffId: typeof body.staffId === "string" ? body.staffId : undefined,
            customerName: String(body.customerName || ""),
            customerEmail: String(body.customerEmail || ""),
            customerPhone: typeof body.customerPhone === "string" ? body.customerPhone : undefined,
            customerNote: typeof body.customerNote === "string" ? body.customerNote : undefined,
            idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined,
            source: "public",
        });
        const delivery = await attemptDelivery(store, appointment.$id);
        return NextResponse.json(
            {
                appointmentId: appointment.$id,
                status: appointment.status,
                startUtc: appointment.startUtc,
                endUtc: appointment.endUtc,
                manageToken,
                delivery,
            },
            { status: 201, headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof TermineError
                        ? error.message
                        : "Buchung fehlgeschlagen. Bitte erneut versuchen.",
            },
            { status: error instanceof TermineError ? error.status : 503 },
        );
    }
}
