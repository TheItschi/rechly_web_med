import { NextResponse, type NextRequest } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient, DATABASE_ID } from "@/lib/appwrite-server";
import { getOptionalEnv } from "@/lib/env";
import { DB, T, TermineStore } from "@/lib/termine/store";
import { confirmationEmail, markOutboxFailed, markOutboxSent, resendSender, type OutboxRow } from "@/lib/termine/notify";
import type { AppointmentRow } from "@/lib/termine/booking";

function unauthorized() {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Process pending notification jobs. Triggered by external cron:
 *   POST /api/cron/termine-notifications  (Authorization: Bearer <CLEANUP_API_SECRET>)
 * Same pattern as /api/cleanup-guests. Bounded batch per run.
 */
export async function POST(request: NextRequest) {
    const secret = getOptionalEnv("CLEANUP_API_SECRET");
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return unauthorized();
    const dry = new URL(request.url).searchParams.get("dry") === "1";
    const { databases } = await createAdminClient();
    const sender = resendSender(process.env.RESEND_API_KEY);
    let processed = 0;
    let sent = 0;
    const failed: Array<{ id: string; error: string }> = [];
    // Outbox rows carry their owner's userId; process per-owner stores.
    const all = await databases.listDocuments(DB, T.OUTBOX, [
        Query.equal("status", "pending"),
        Query.limit(50),
    ]);
    const byUser = new Map<string, OutboxRow[]>();
    for (const j of all.documents as unknown as OutboxRow[]) {
        if (j.attempts >= 8) continue;
        if (j.nextAttemptAt && j.nextAttemptAt > new Date().toISOString()) continue;
        const list = byUser.get((j as unknown as { userId: string }).userId) ?? [];
        list.push(j);
        byUser.set((j as unknown as { userId: string }).userId, list);
    }
    for (const [userId, jobs] of byUser) {
        const store = new TermineStore(databases, userId);
        for (const job of jobs.slice(0, 10)) {
            processed++;
            try {
                if (!dry) {
                    const appt = (await databases.getDocument(DATABASE_ID, T.APPOINTMENTS, job.appointmentId)) as unknown as AppointmentRow;
                    const name = await businessName(databases, userId);
                    const lang = "de";
                    if (job.kind === "booking_confirm" || job.kind === "booking_business") {
                        const manageUrl = `https://${process.env.NEXT_PUBLIC_APP_URL ?? "rechly.de"}`;
                        await sender.send(confirmationEmail(appt, name, manageUrl, lang));
                    } else {
                        // Other kinds reuse the confirmation template shape for now; specific
                        // cancel/reschedule templates are rendered on the manage page itself.
                        const manageUrl = `https://${process.env.NEXT_PUBLIC_APP_URL ?? "rechly.de"}`;
                        await sender.send(confirmationEmail(appt, name, manageUrl, lang));
                    }
                    await markOutboxSent(store, job.$id);
                    sent++;
                }
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                if (!dry) await markOutboxFailed(store, job.$id, job.attempts, msg);
                failed.push({ id: job.$id, error: msg.slice(0, 120) });
            }
        }
    }
    return NextResponse.json({ processed, sent, failed: failed.length, dry });
}

async function businessName(databases: Awaited<ReturnType<typeof createAdminClient>>["databases"], userId: string): Promise<string> {
    try {
        const res = await databases.listDocuments(DB, T.SETTINGS, [Query.equal("userId", userId), Query.limit(1)]);
        const s = res.documents[0] as unknown as { displayName?: string } | undefined;
        return s?.displayName ?? "Rechly Termine";
    } catch {
        return "Rechly Termine";
    }
}
