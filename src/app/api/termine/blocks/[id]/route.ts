import { NextRequest, NextResponse } from "next/server";
import { businessContext, authFail } from "../../_lib";
import { DB, T, TermineError } from "@/lib/termine/store";

function fail(error: unknown, fallback: string) {
    const auth = authFail(error);
    if (auth) return auth;
    if (error instanceof TermineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { store } = await businessContext();
        const { id } = await params;
        await store.own(T.BLOCKS, id);
        await store.db.deleteDocument(DB, T.BLOCKS, id);
        return NextResponse.json({ deleted: true });
    } catch (error) {
        return fail(error, "Abwesenheit konnte nicht gelöscht werden.");
    }
}
