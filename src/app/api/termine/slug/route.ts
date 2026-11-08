import { NextResponse, type NextRequest } from "next/server";
import { businessContext, authFail } from "../_lib";
import { DB, T, TermineError, atomic, newId } from "@/lib/termine/store";
import { loadSettings } from "@/lib/termine/booking";
import { normalizeSlug, validateSlug } from "@/lib/termine/slug";
import { DEFAULTS } from "../settings/route";

function fail(error: unknown) {
    const auth = authFail(error);
    if (auth) return auth;
    if (error instanceof TermineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Einrichtung fehlgeschlagen." }, { status: 500 });
}

/** Slug availability (authenticated wizard only — no public enumeration). */
export async function GET(request: NextRequest) {
    try {
        await businessContext();
        const slug = normalizeSlug(new URL(request.url).searchParams.get("slug") ?? "");
        const err = validateSlug(slug);
        if (err) return NextResponse.json({ available: false, reason: err });
        return NextResponse.json({ available: true, slug });
    } catch (error) {
        return fail(error);
    }
}

/** Activate Termine: atomically reserve the slug and create settings. */
export async function POST(request: NextRequest) {
    try {
        const { store, userId } = await businessContext();
        let body: Record<string, unknown>;
        try {
            body = await request.json();
            if (!body || typeof body !== "object") throw new Error();
        } catch {
            return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
        }
        const slug = normalizeSlug(body.slug);
        const slugErr = validateSlug(slug);
        if (slugErr) return NextResponse.json({ error: "Dieser Name ist nicht verfügbar.", reason: slugErr }, { status: 400 });
        const displayName = typeof body.displayName === "string" && body.displayName.trim() ? body.displayName.trim().slice(0, 200) : null;
        if (!displayName) return NextResponse.json({ error: "Bitte einen Firmennamen angeben." }, { status: 400 });
        if (await loadSettings(store)) return NextResponse.json({ error: "Termine ist bereits eingerichtet." }, { status: 409 });

        await atomic(store.db, userId, async (tx) => {
            try {
                await tx.db.createDocument(DB, T.SLUGS, slug, { userId }, tx.perms(), tx.transactionId);
            } catch (error) {
                if ((error as { code?: number }).code === 409)
                    throw new TermineError("Dieser Name ist bereits vergeben.", 409);
                throw error;
            }
            await tx.db.createDocument(
                DB,
                T.SETTINGS,
                newId(),
                { userId, slug, displayName, ...DEFAULTS },
                tx.perms(),
                tx.transactionId,
            );
        });
        return NextResponse.json({ slug }, { status: 201 });
    } catch (error) {
        return fail(error);
    }
}
