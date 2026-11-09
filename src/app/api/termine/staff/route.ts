import { NextResponse, type NextRequest } from "next/server";
import { businessContext, authFail } from "../_lib";
import { DB, T, TermineError, newId } from "@/lib/termine/store";
import { validateCatalogPatch } from "@/lib/termine/catalog-validation";

function fail(error: unknown, fallback: string) {
    const auth = authFail(error);
    if (auth) return auth;
    if (error instanceof TermineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: fallback }, { status: 500 });
}

function validStaff(b: Record<string, unknown>) {
    const name = typeof b.name === "string" ? b.name.trim().slice(0, 200) : "";
    if (!name) throw new TermineError("Bitte einen Namen angeben.");
    return {
        name,
        description: typeof b.description === "string" ? b.description.trim().slice(0, 2000) : undefined,
        active: b.active !== false,
        bookable: b.bookable !== false,
        serviceIds: Array.isArray(b.serviceIds) ? b.serviceIds.filter((x): x is string => typeof x === "string").slice(0, 100) : [],
        color: typeof b.color === "string" && /^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : undefined,
    };
}

export async function GET() {
    try {
        const { store } = await businessContext();
        return NextResponse.json({ staff: await store.list(T.STAFF) });
    } catch (error) {
        return fail(error, "Mitarbeiter konnten nicht geladen werden.");
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
        const data = validStaff(body);
        await validateCatalogPatch(store, data, "staff");
        const created = await store.db.createDocument(DB, T.STAFF, newId(), { userId: store.userId, ...data }, store.perms());
        return NextResponse.json({ staff: created }, { status: 201 });
    } catch (error) {
        return fail(error, "Mitarbeiter konnte nicht erstellt werden.");
    }
}
