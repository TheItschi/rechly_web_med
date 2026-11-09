import { NextResponse, type NextRequest } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite-server";
import { getOptionalEnv } from "@/lib/env";
import { DB, T, TermineStore } from "@/lib/termine/store";
import { deliverJob } from "@/lib/termine/delivery";
import { resendSender, type OutboxRow } from "@/lib/termine/notify";
export const maxDuration = 60;
export async function POST(request: NextRequest) {
    const secret = getOptionalEnv("CLEANUP_API_SECRET");
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { databases } = await createAdminClient(),
        dry = new URL(request.url).searchParams.get("dry") === "1";
    if (!dry && !process.env.RESEND_API_KEY)
        return NextResponse.json({ error: "Email delivery is not configured" }, { status: 503 });
    let sent = 0,
        queued = 0,
        processed = 0,
        cursor: string | undefined;
    const started = Date.now();
    // Paginate past leased/future jobs so one retrying account cannot starve others.
    for (let page = 0; page < 10 && processed < 20 && Date.now() - started < 25000; page++) {
        const rows = await databases.listDocuments(DB, T.OUTBOX, [
            Query.equal("status", "pending"),
            Query.limit(50),
            ...(cursor ? [Query.cursorAfter(cursor)] : []),
        ]);
        for (const job of rows.documents as unknown as (OutboxRow & { userId: string })[]) {
            if (processed >= 20 || Date.now() - started >= 25000) break;
            if (job.nextAttemptAt && Date.parse(job.nextAttemptAt) > Date.now()) continue;
            processed++;
            if (dry) continue;
            const result = await deliverJob(
                new TermineStore(databases, job.userId),
                job.$id,
                resendSender(process.env.RESEND_API_KEY),
            );
            if (result === "sent") sent++;
            if (result === "queued") queued++;
        }
        if (rows.documents.length < 50) break;
        cursor = rows.documents.at(-1)!.$id;
    }
    return NextResponse.json({ processed, sent, queued, dry });
}
