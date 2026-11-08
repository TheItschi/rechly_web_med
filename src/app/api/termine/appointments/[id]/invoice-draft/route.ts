import { NextResponse, type NextRequest } from "next/server";
import { businessContext, authFail } from "../../../_lib";
import { TermineError, atomic, type TermineStore } from "@/lib/termine/store";
import { createDraftFromAppointment } from "@/lib/termine/invoices";

function fail(error: unknown) {
    const auth = authFail(error);
    if (auth) return auth;
    if (error instanceof TermineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Rechnungsentwurf konnte nicht erstellt werden." }, { status: 500 });
}

/** Convert a COMPLETED appointment into a draft invoice (idempotent, transactional). */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { store, userId } = await businessContext();
        const { id } = await params;
        const out = await atomic(store.db, userId, (tx: TermineStore) => createDraftFromAppointment(tx, id));
        return NextResponse.json(out, { status: out.existed ? 200 : 201 });
    } catch (error) {
        return fail(error);
    }
}
