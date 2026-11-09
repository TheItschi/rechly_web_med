import { NextResponse } from "next/server";
import { loadManaged } from "@/lib/termine/managed";
import { createAdminClient } from "@/lib/appwrite-server";
import { TermineStore, TermineError } from "@/lib/termine/store";
import { availableSlots } from "@/lib/termine/slots";
import { clientIp } from "@/lib/termine/ratelimit";
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params,
            ctx = await loadManaged(clientIp(request), token),
            a = ctx.appointment;
        if (
            !["PENDING", "CONFIRMED"].includes(a.status) ||
            Date.parse(a.startUtc) - Date.now() < ctx.settings.rescheduleNoticeMinutes * 60000
        )
            throw new TermineError("Dieser Termin kann nicht mehr online verschoben werden.", 409);
        const { databases } = await createAdminClient();
        return NextResponse.json(
            await availableSlots(
                new TermineStore(databases, ctx.businessUserId),
                ctx.settings,
                new URL(request.url).searchParams,
                a,
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
