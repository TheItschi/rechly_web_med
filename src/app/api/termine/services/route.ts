import { NextResponse, type NextRequest } from "next/server";
import { businessContext, authFail } from "../_lib";
import { DB, T, TermineError, newId } from "@/lib/termine/store";

function fail(error: unknown, fallback: string) {
    const auth = authFail(error);
    if (auth) return auth;
    if (error instanceof TermineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: fallback }, { status: 500 });
}

function validService(b: Record<string, unknown>) {
    const name = typeof b.name === "string" ? b.name.trim().slice(0, 200) : "";
    if (!name) throw new TermineError("Bitte einen Leistungsnamen angeben.");
    const durationMinutes = Number(b.durationMinutes);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 1440)
        throw new TermineError("Ungültige Dauer (5–1440 Minuten).");
    const priceCents = Math.round(Number(b.priceCents ?? 0));
    if (!Number.isFinite(priceCents) || priceCents < 0 || priceCents > 100000000)
        throw new TermineError("Ungültiger Preis.");
    return {
        name,
        description: typeof b.description === "string" ? b.description.trim().slice(0, 2000) : undefined,
        category: typeof b.category === "string" ? b.category.trim().slice(0, 100) : undefined,
        durationMinutes,
        priceCents,
        currency: typeof b.currency === "string" && /^[A-Z]{3}$/.test(b.currency) ? b.currency : "EUR",
        prepMinutes: Math.max(0, Math.min(240, Math.floor(Number(b.prepMinutes ?? 0)) || 0)),
        cleanupMinutes: Math.max(0, Math.min(240, Math.floor(Number(b.cleanupMinutes ?? 0)) || 0)),
        active: b.active !== false,
        publicVisible: b.publicVisible !== false,
        staffIds: Array.isArray(b.staffIds) ? b.staffIds.filter((x): x is string => typeof x === "string").slice(0, 50) : [],
        sortOrder: Number.isInteger(Number(b.sortOrder)) ? Number(b.sortOrder) : 0,
    };
}

export async function GET() {
    try {
        const { store } = await businessContext();
        const rows = await store.list(T.SERVICES);
        return NextResponse.json({ services: rows });
    } catch (error) {
        return fail(error, "Leistungen konnten nicht geladen werden.");
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
        const data = validService(body);
        const created = await store.db.createDocument(DB, T.SERVICES, newId(), { userId: store.userId, ...data }, store.perms());
        return NextResponse.json({ service: created }, { status: 201 });
    } catch (error) {
        return fail(error, "Leistung konnte nicht erstellt werden.");
    }
}
