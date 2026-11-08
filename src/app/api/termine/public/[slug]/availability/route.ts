import { NextResponse } from "next/server";
import { T, TermineError, TermineStore } from "@/lib/termine/store";
import { resolvePublicBusiness } from "@/lib/termine/public";
import { engineInput } from "@/lib/termine/booking";
import type { ServiceRow } from "@/lib/termine/booking";
import { computeAvailability } from "@/lib/termine/availability";
import { clientIp, rateLimit, PUBLIC_LIMITS } from "@/lib/termine/ratelimit";

function fail(error: unknown) {
    if (error instanceof TermineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Verfügbarkeit konnte nicht geladen werden." }, { status: 500 });
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const rl = rateLimit(`avail:${clientIp(request)}`, PUBLIC_LIMITS.availability.max, PUBLIC_LIMITS.availability.windowMs);
        if (!rl.ok) return NextResponse.json({ error: "Zu viele Anfragen. Bitte kurz warten." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
        const { slug } = await params;
        const url = new URL(request.url);
        const serviceId = url.searchParams.get("serviceId");
        const staffId = url.searchParams.get("staffId") ?? undefined;
        const fromDate = url.searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
        const days = Math.max(1, Math.min(31, Number(url.searchParams.get("days") ?? 14)));
        if (!serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });

        const { db, settings } = await resolvePublicBusiness(slug);
        const store = new TermineStore(db, settings.userId);
        const service = await store.own<ServiceRow>(T.SERVICES, serviceId);
        if (!service.active || !service.publicVisible) return NextResponse.json({ error: "Diese Dienstleistung ist nicht verfügbar.", status: 404 } as never, { status: 404 });
        if (staffId && !service.staffIds.includes(staffId)) return NextResponse.json({ error: "Ungültige Auswahl." }, { status: 400 });

        const ei = await engineInput(store, service.$id, fromDate, days);
        const slots = computeAvailability(
            {
                service: {
                    id: service.$id, name: service.name, durationMinutes: service.durationMinutes,
                    priceCents: service.priceCents, currency: service.currency, prepMinutes: service.prepMinutes,
                    cleanupMinutes: service.cleanupMinutes, active: true, publicVisible: true,
                    staffIds: service.staffIds, sortOrder: service.sortOrder,
                },
                staff: ei.staffRows.filter((s) => s.active && s.bookable).map((s) => ({ id: s.$id, name: s.name, active: true, bookable: true, serviceIds: s.serviceIds })),
                week: ei.week, overrides: ei.overrides,
                blocks: ei.blockRows.map((b) => ({ id: b.$id, staffId: b.staffId ?? null, startUtc: b.startUtc, endUtc: b.endUtc })),
                appointments: ei.appointments,
                settings: {
                    timezone: settings.timezone, slotIntervalMinutes: settings.slotIntervalMinutes,
                    minNoticeMinutes: settings.minNoticeMinutes, maxHorizonDays: settings.maxHorizonDays,
                },
            },
            { serviceId: service.$id, staffId, fromDate, days },
        );
        // Group by date for the date picker; times carry staff assignment.
        const byDate: Record<string, Array<{ startUtc: string; staffId: string }>> = {};
        for (const s of slots) {
            const day = s.startUtc.slice(0, 10);
            (byDate[day] ??= []).push(s);
        }
        return NextResponse.json({ slots: byDate, timezone: settings.timezone });
    } catch (error) {
        return fail(error);
    }
}
