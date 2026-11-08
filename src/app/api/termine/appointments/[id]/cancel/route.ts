import { NextResponse, type NextRequest } from "next/server";
import { businessContext, authFail } from "../../../_lib";
import { TermineError } from "@/lib/termine/store";
import { cancelBooking, loadSettings } from "@/lib/termine/booking";

function fail(error: unknown) {
    const auth = authFail(error);
    if (auth) return auth;
    if (error instanceof TermineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Die Stornierung ist fehlgeschlagen." }, { status: 500 });
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { store } = await businessContext();
        const { id } = await params;
        const settings = await loadSettings(store);
        if (!settings) throw new TermineError("Termine ist nicht eingerichtet.", 400);
        const updated = await cancelBooking(store, settings, id, "business");
        return NextResponse.json({ appointment: updated });
    } catch (error) {
        return fail(error);
    }
}
