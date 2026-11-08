import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite-server";
import { TermineError, TermineStore } from "@/lib/termine/store";
import { loadManaged } from "../route";
import { cancelBooking, loadSettings } from "@/lib/termine/booking";
import { clientIp } from "@/lib/termine/ratelimit";

function fail(error: unknown) {
    if (error instanceof TermineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Die Stornierung ist fehlgeschlagen." }, { status: 500 });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params;
        const ctx = await loadManaged(clientIp(request), token);
        const { databases } = await createAdminClient();
        const store = new TermineStore(databases, ctx.businessUserId);
        const settings = await loadSettings(store);
        if (!settings) throw new TermineError("Buchung nicht verfügbar.", 404);
        const updated = await cancelBooking(store, settings, ctx.appointment.$id, "customer");
        return NextResponse.json({ status: updated.status });
    } catch (error) {
        return fail(error);
    }
}
