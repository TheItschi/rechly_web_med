import { NextResponse } from "next/server";
import { loadManaged, publicAppointment } from "@/lib/termine/managed";
import { TermineError } from "@/lib/termine/store";
import { clientIp } from "@/lib/termine/ratelimit";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params;
        const ctx = await loadManaged(clientIp(request), token);
        const a = ctx.appointment,
            s = ctx.settings,
            active = ["PENDING", "CONFIRMED"].includes(a.status);
        const cancelBefore = new Date(Date.parse(a.startUtc) - s.cancelNoticeMinutes * 60000).toISOString();
        const rescheduleBefore = new Date(
            Date.parse(a.startUtc) - s.rescheduleNoticeMinutes * 60000,
        ).toISOString();
        const contact = s as unknown as { contactEmail?: string; contactPhone?: string };
        return NextResponse.json(
            {
                appointment: {
                    ...publicAppointment(a, ctx.businessName),
                    slug: s.slug,
                    canCancel: active && Date.now() <= Date.parse(cancelBefore),
                    canReschedule: active && Date.now() <= Date.parse(rescheduleBefore),
                    cancelBefore,
                    rescheduleBefore,
                    maxHorizonDays: s.maxHorizonDays,
                    contactEmail: contact.contactEmail,
                    contactPhone: contact.contactPhone,
                },
            },
            { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } },
        );
    } catch (error) {
        if (error instanceof TermineError)
            return NextResponse.json({ error: error.message }, { status: error.status });
        return NextResponse.json({ error: "Buchung nicht gefunden." }, { status: 404 });
    }
}
