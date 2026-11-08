import { NextResponse, type NextRequest } from "next/server";
import { Query } from "node-appwrite";
import { businessContext, authFail } from "../_lib";
import { T, TermineError } from "@/lib/termine/store";
import { createBooking, loadSettings, type AppointmentRow } from "@/lib/termine/booking";

function fail(error: unknown, fallback: string) {
    const auth = authFail(error);
    if (auth) return auth;
    if (error instanceof TermineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(request: NextRequest) {
    try {
        const { store } = await businessContext();
        const q = new URL(request.url).searchParams;
        const queries: string[] = [Query.orderAsc("startUtc"), Query.limit(500)];
        if (q.get("from")) queries.push(Query.greaterThanEqual("startUtc", q.get("from")!));
        if (q.get("to")) queries.push(Query.lessThan("startUtc", q.get("to")!));
        if (q.get("status")) queries.push(Query.equal("status", q.get("status")!));
        if (q.get("staffId")) queries.push(Query.equal("staffId", q.get("staffId")!));
        if (q.get("customerId")) queries.push(Query.equal("customerId", q.get("customerId")!));
        return NextResponse.json({ appointments: await store.list<AppointmentRow>(T.APPOINTMENTS, queries) });
    } catch (error) {
        return fail(error, "Termine konnten nicht geladen werden.");
    }
}

/** Manual booking by staff (bypasses public visibility + notice rules, links Rechly Client). */
export async function POST(request: NextRequest) {
    try {
        const { store } = await businessContext();
        const settings = await loadSettings(store);
        if (!settings) return NextResponse.json({ error: "Bitte zuerst Termine einrichten." }, { status: 400 });
        let body: Record<string, unknown>;
        try {
            body = await request.json();
            if (!body || typeof body !== "object") throw new Error();
        } catch {
            return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
        }
        if (typeof body.serviceId !== "string" || typeof body.startUtc !== "string") {
            return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
        }
        const { appointment } = await createBooking(store, settings, {
            serviceId: body.serviceId,
            staffId: typeof body.staffId === "string" && body.staffId ? body.staffId : undefined,
            customerId: typeof body.customerId === "string" && body.customerId ? body.customerId : undefined,
            startUtc: body.startUtc,
            customerName: String(body.customerName ?? ""),
            customerEmail: String(body.customerEmail ?? ""),
            customerPhone: typeof body.customerPhone === "string" ? body.customerPhone : undefined,
            customerNote: typeof body.customerNote === "string" ? body.customerNote : undefined,
            internalNote: typeof body.internalNote === "string" ? body.internalNote : undefined,
            source: "manual",
        });
        return NextResponse.json({ appointment }, { status: 201 });
    } catch (error) {
        return fail(error, "Termin konnte nicht erstellt werden.");
    }
}
