import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { businessContext, authFail } from "../_lib";
import { DB, T, atomic, type Row } from "@/lib/termine/store";
import { loadSettings } from "@/lib/termine/booking";
import type { OutboxRow } from "@/lib/termine/notify";

export async function GET() {
    try {
        const { store } = await businessContext();
        const count = async (status: string) =>
            (
                await store.db.listDocuments(DB, T.OUTBOX, [
                    Query.equal("userId", store.userId),
                    Query.equal("status", status),
                    Query.limit(1),
                ])
            ).total;
        const [pending, failed, settings, services, hours] = await Promise.all([
            count("pending"),
            count("failed"),
            loadSettings(store),
            store.list<Row & { active: boolean; publicVisible: boolean }>(T.SERVICES),
            store.list<Row & { closed: boolean; periods: string }>(T.HOURS),
        ]);
        return NextResponse.json(
            {
                mailConfigured: !!process.env.RESEND_API_KEY,
                retryAuthConfigured: !!process.env.CLEANUP_API_SECRET,
                pending,
                failed,
                published: !!(settings?.enabled && settings?.published),
                hasServices: services.some((s) => s.active && s.publicVisible),
                hasHours: hours.some((h) => !h.closed && JSON.parse(String(h.periods || "[]")).length > 0),
            },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        return (
            authFail(error) ||
            NextResponse.json({ error: "Buchungsstatus konnte nicht geladen werden." }, { status: 503 })
        );
    }
}

/** Requeue exhausted jobs; the scheduled worker performs delivery with its normal lease. */
export async function POST() {
    try {
        const { store } = await businessContext();
        if (!process.env.RESEND_API_KEY)
            return NextResponse.json(
                { error: "Bitte zuerst den E-Mail-Versand auf dem Server einrichten." },
                { status: 503 },
            );
        const rows = await store.db.listDocuments(DB, T.OUTBOX, [
            Query.equal("userId", store.userId),
            Query.equal("status", "failed"),
            Query.limit(20),
        ]);
        let queued = 0;
        for (const row of rows.documents) {
            queued += await atomic(store.db, store.userId, async (tx) => {
                const job = await tx.own<Row & OutboxRow>(T.OUTBOX, row.$id);
                if (job.status !== "failed") return 0;
                await tx.db.updateDocument(
                    DB,
                    T.OUTBOX,
                    job.$id,
                    {
                        status: "pending",
                        attempts: 0,
                        nextAttemptAt: new Date().toISOString(),
                        lastError: null,
                    },
                    undefined,
                    tx.transactionId,
                );
                return 1;
            });
        }
        return NextResponse.json({ queued });
    } catch (error) {
        return (
            authFail(error) ||
            NextResponse.json({ error: "Erneuter Versand konnte nicht vorgemerkt werden." }, { status: 503 })
        );
    }
}
