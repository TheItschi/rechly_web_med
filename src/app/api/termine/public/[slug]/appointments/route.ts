import { NextResponse } from "next/server";
import { T, TermineError, TermineStore } from "@/lib/termine/store";
import { resolvePublicBusiness } from "@/lib/termine/public";
import { createBooking, type ServiceRow } from "@/lib/termine/booking";
import { confirmationEmail, resendSender } from "@/lib/termine/notify";
import { clientIp, rateLimit, PUBLIC_LIMITS } from "@/lib/termine/ratelimit";

function fail(error: unknown) {
    if (error instanceof TermineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Die Buchung konnte nicht erstellt werden." }, { status: 500 });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const rl = rateLimit(`book:${clientIp(request)}`, PUBLIC_LIMITS.bookingCreate.max, PUBLIC_LIMITS.bookingCreate.windowMs);
        if (!rl.ok) return NextResponse.json({ error: "Zu viele Buchungsversuche. Bitte kurz warten." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
        const { slug } = await params;
        let body: Record<string, unknown>;
        try {
            body = await request.json();
            if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
        } catch {
            return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
        }
        if (typeof body.serviceId !== "string" || typeof body.startUtc !== "string") {
            return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
        }
        const { db, settings } = await resolvePublicBusiness(slug);
        const store = new TermineStore(db, settings.userId);
        const { appointment, manageToken } = await createBooking(store, settings, {
            serviceId: body.serviceId,
            staffId: typeof body.staffId === "string" ? body.staffId : undefined,
            startUtc: body.startUtc,
            customerName: String(body.customerName ?? ""),
            customerEmail: String(body.customerEmail ?? ""),
            customerPhone: typeof body.customerPhone === "string" ? body.customerPhone : undefined,
            customerNote: typeof body.customerNote === "string" ? body.customerNote : undefined,
            source: "public",
            idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey.slice(0, 100) : undefined,
        });

        const service = await store.own<ServiceRow>(T.SERVICES, appointment.serviceId);
        void service;
        // Best effort: confirmation email now; the outbox job retries on failure.
        try {
            const manageUrl = `${new URL(request.url).origin}/buchen/verwalten/${manageToken}`;
            const sender = resendSender(process.env.RESEND_API_KEY);
            await sender.send(confirmationEmail(appointment as never, settings.displayName, manageUrl, settings.language === "en" ? "en" : "de"));
        } catch {
            /* Outbox retry covers this. */
        }

        return NextResponse.json(
            {
                appointmentId: appointment.$id,
                status: appointment.status,
                startUtc: appointment.startUtc,
                endUtc: appointment.endUtc,
                manageToken,
            },
            { status: 201 },
        );
    } catch (error) {
        return fail(error);
    }
}
