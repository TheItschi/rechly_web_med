import { NextResponse } from "next/server";
import { loadManaged } from "@/lib/termine/managed";
import { clientIp } from "@/lib/termine/ratelimit";
import { buildIcs } from "@/lib/termine/notify";
import { addMinutesUtc } from "@/lib/termine/time";
import { TermineError } from "@/lib/termine/store";
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params,
            { appointment: a, businessName } = await loadManaged(clientIp(request), token);
        if (a.status === "PENDING") throw new TermineError("Die Anfrage wurde noch nicht bestätigt.", 409);
        return new NextResponse(
            buildIcs({
                uid: a.$id,
                startUtc: a.startUtc,
                endUtc: addMinutesUtc(a.startUtc, a.durationMinutes),
                summary: `${a.serviceNameSnapshot} — ${businessName}`,
                sequence: Math.floor(Date.parse(a.$updatedAt) / 1000),
                cancelled: a.status.startsWith("CANCELLED"),
            }),
            {
                headers: {
                    "Content-Type": "text/calendar;charset=utf-8",
                    "Content-Disposition": 'attachment; filename="termin.ics"',
                    "Cache-Control": "no-store",
                    "Referrer-Policy": "no-referrer",
                },
            },
        );
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof TermineError ? error.message : "Kalendereintrag nicht verfügbar." },
            { status: error instanceof TermineError ? error.status : 503 },
        );
    }
}
