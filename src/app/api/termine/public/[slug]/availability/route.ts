import { NextResponse } from "next/server";
import { TermineError, TermineStore } from "@/lib/termine/store";
import { resolvePublicBusiness } from "@/lib/termine/public";
import { availableSlots } from "@/lib/termine/slots";
import { clientIp, rateLimit, PUBLIC_LIMITS } from "@/lib/termine/ratelimit";
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const rl = rateLimit(
            "avail:" + clientIp(request),
            PUBLIC_LIMITS.availability.max,
            PUBLIC_LIMITS.availability.windowMs,
        );
        if (!rl.ok)
            return NextResponse.json(
                { error: "Zu viele Anfragen. Bitte kurz warten." },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
            );
        const { slug } = await params,
            { db, settings } = await resolvePublicBusiness(slug);
        return NextResponse.json(
            await availableSlots(
                new TermineStore(db, settings.userId),
                settings,
                new URL(request.url).searchParams,
            ),
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof TermineError
                        ? error.message
                        : "Verfügbarkeit konnte nicht geladen werden.",
            },
            { status: error instanceof TermineError ? error.status : 503 },
        );
    }
}
