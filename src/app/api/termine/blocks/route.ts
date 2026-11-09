import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { businessContext, authFail } from "../_lib";
import { DB, T, TermineError, newId } from "@/lib/termine/store";
import { canonicalInstant } from "@/lib/termine/time";

function fail(error: unknown, fallback: string) {
    const auth = authFail(error);
    if (auth) return auth;
    if (error instanceof TermineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(request: NextRequest) {
    try {
        const { store } = await businessContext();
        const staffId = new URL(request.url).searchParams.get("staffId");
        return NextResponse.json({
            blocks: await store.list(T.BLOCKS, staffId ? [Query.equal("staffId", staffId)] : []),
        });
    } catch (error) {
        return fail(error, "Abwesenheiten konnten nicht geladen werden.");
    }
}

export async function POST(request: NextRequest) {
    try {
        const { store } = await businessContext();
        let body: Record<string, unknown>;
        try {
            body = await request.json();
            if (!body || typeof body !== "object") throw new Error();
        } catch {
            return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
        }
        let startUtc:string,endUtc:string;
        try {startUtc=canonicalInstant(String(body.startUtc??""));endUtc=canonicalInstant(String(body.endUtc??""));}catch{throw new TermineError("Ungültiger Zeitraum.");}
        if (!Date.parse(startUtc) || !Date.parse(endUtc) || !(startUtc < endUtc)) {
            return NextResponse.json({ error: "Ungültiger Zeitraum." }, { status: 400 });
        }
        if(typeof body.staffId === "string" && body.staffId) await store.own(T.STAFF,body.staffId);
        const created = await store.db.createDocument(
            DB,
            T.BLOCKS,
            newId(),
            {
                userId: store.userId,
                staffId: typeof body.staffId === "string" && body.staffId ? body.staffId : null,
                startUtc,
                endUtc,
                reason: typeof body.reason === "string" ? body.reason.slice(0, 300) : undefined,
            },
            store.perms(),
        );
        return NextResponse.json({ block: created }, { status: 201 });
    } catch (error) {
        return fail(error, "Abwesenheit konnte nicht gespeichert werden.");
    }
}
