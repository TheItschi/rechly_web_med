import { NextResponse, type NextRequest } from "next/server";
import { businessContext, authFail } from "../../_lib";
import { DB, T, TermineError, newId, newToken, tokenHash } from "@/lib/termine/store";
import { addMinutesUtc } from "@/lib/termine/time";
import { canTransition, type TermineStatus } from "@/lib/termine/types";
import { cancelBooking, loadSettings, type AppointmentRow } from "@/lib/termine/booking";
import { confirmationEmail, resendSender } from "@/lib/termine/notify";

function fail(error: unknown, fallback: string) {
    const auth = authFail(error);
    if (auth) return auth;
    if (error instanceof TermineError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Termine appointment PATCH error:", error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { store } = await businessContext();
        const { id } = await params;
        return NextResponse.json({ appointment: await store.own<AppointmentRow>(T.APPOINTMENTS, id) });
    } catch (error) {
        return fail(error, "Termin nicht gefunden.");
    }
}

/** Status transitions + internal note. Legal transitions enforced by state machine. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { store } = await businessContext();
        const { id } = await params;
        const appt = await store.own<AppointmentRow>(T.APPOINTMENTS, id);
        let body: Record<string, unknown>;
        try {
            body = await request.json();
            if (!body || typeof body !== "object") throw new Error();
        } catch {
            return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
        }
        const patch: Record<string, unknown> = {};
        if (typeof body.status === "string") {
            const next = body.status as TermineStatus;
            if (!canTransition(appt.status, next)) {
                return NextResponse.json({ error: `Übergang von ${appt.status} nach ${next} ist nicht erlaubt.` }, { status: 409 });
            }
            if (next === "CANCELLED_BY_BUSINESS") {
                const settings = await loadSettings(store);
                if (settings) {
                    const cancelled = await cancelBooking(store, settings, id, "business");
                    return NextResponse.json({ appointment: cancelled });
                }
                patch.cancelledAt = new Date().toISOString();
            }
            patch.status = next;
            if (next === "COMPLETED") patch.completedAt = new Date().toISOString();
            if (appt.status === "PENDING" && next === "CONFIRMED") {
                const manageToken = newToken();
                try {
                    await store.db.createDocument(
                        DB,
                        T.TOKENS,
                        newId(),
                        {
                            userId: store.userId,
                            appointmentId: id,
                            purpose: "manage",
                            tokenHash: tokenHash(manageToken),
                            expiresAt: addMinutesUtc(appt.startUtc, 60 * 24 * 90),
                        },
                        store.perms(),
                    );
                    (patch as Record<string, unknown>)._sendToken = manageToken;
                } catch (tokenErr) {
                    console.error("Failed to persist manage token on confirmation:", tokenErr);
                }
            }
        }
        if (typeof body.internalNote === "string") patch.internalNote = body.internalNote.slice(0, 1000);
        if (Object.keys(patch).length === 0) return NextResponse.json({ appointment: appt });
        const tokenToSend = (patch as Record<string, unknown>)._sendToken as string | undefined;
        delete (patch as Record<string, unknown>)._sendToken;

        const updated = await store.db.updateDocument(DB, T.APPOINTMENTS, id, patch);

        if (tokenToSend) {
            try {
                const settings = await loadSettings(store);
                const manageUrl = `${new URL(request.url).origin}/buchen/verwalten/${tokenToSend}`;
                const sender = resendSender(process.env.RESEND_API_KEY);
                await sender.send(
                    confirmationEmail(
                        updated as unknown as AppointmentRow,
                        settings?.displayName ?? "Rechly Termine",
                        manageUrl,
                        settings?.language === "en" ? "en" : "de",
                    ),
                );
            } catch {
                /* Non-blocking: outbox worker retries or email skipped if no key */
            }
        }

        return NextResponse.json({ appointment: updated });
    } catch (error) {
        return fail(error, "Termin konnte nicht aktualisiert werden.");
    }
}
