import { NextResponse, type NextRequest } from "next/server";
import { businessContext, authFail } from "../_lib";
import { DB, T, TermineError, atomic, isUnprovisioned, missing, newId } from "@/lib/termine/store";
import { loadSettings } from "@/lib/termine/booking";
import { normalizeSlug, validateSlug } from "@/lib/termine/slug";
import { DEFAULTS, loadCompanyDefaults } from "../settings/route";

function fail(error: unknown) {
    const auth = authFail(error);
    if (auth) return auth;
    if (isUnprovisioned(error)) {
        return NextResponse.json(
            { error: "Online-Buchung ist auf diesem Server noch nicht eingerichtet (Datenbank-Migration ausstehend)." },
            { status: 503 },
        );
    }
    if (error instanceof TermineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Einrichtung fehlgeschlagen." }, { status: 500 });
}

/** Slug availability (authenticated user — also checks whether another tenant already reserved it). */
export async function GET(request: NextRequest) {
    try {
        const { store, userId } = await businessContext();
        const slug = normalizeSlug(new URL(request.url).searchParams.get("slug") ?? "");
        const err = validateSlug(slug);
        if (err) return NextResponse.json({ available: false, reason: err, slug });
        try {
            const doc = await store.db.getDocument(DB, T.SLUGS, slug);
            if (doc && doc.userId !== userId) {
                return NextResponse.json({ available: false, reason: "taken", slug });
            }
        } catch (error) {
            if (!missing(error) && !isUnprovisioned(error)) throw error;
        }
        return NextResponse.json({ available: true, slug });
    } catch (error) {
        return fail(error);
    }
}

/** Activate Online Booking OR atomically update the tenant's booking slug, inheriting company defaults. */
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

        const [existing, companyDefaults] = await Promise.all([
            loadSettings(store),
            loadCompanyDefaults(store.db, userId),
        ]);

        if (existing) {
            // Update slug atomically if changed
            if (existing.slug === slug) {
                return NextResponse.json({ slug, settings: existing }, { status: 200 });
            }
            const updated = await atomic(store.db, userId, async (tx) => {
                try {
                    await tx.db.createDocument(DB, T.SLUGS, slug, { userId }, tx.perms(), tx.transactionId);
                } catch (error) {
                    if ((error as { code?: number }).code === 409)
                        throw new TermineError("Dieser Name ist bereits vergeben.", 409);
                    throw error;
                }
                if (existing.slug) {
                    try {
                        const prevSlugDoc = await tx.db.getDocument(DB, T.SLUGS, existing.slug, [], tx.transactionId);
                        if (prevSlugDoc.userId === userId) {
                            await tx.db.deleteDocument(DB, T.SLUGS, existing.slug, tx.transactionId);
                        }
                    } catch (error) {
                        if (!missing(error)) throw error;
                    }
                }
                return tx.db.updateDocument(
                    DB,
                    T.SETTINGS,
                    existing.$id,
                    {
                        slug,
                        ...(typeof body.displayName === "string" && body.displayName.trim()
                            ? { displayName: body.displayName.trim().slice(0, 200) }
                            : {}),
                    },
                    undefined,
                    tx.transactionId,
                );
            });
            return NextResponse.json({ slug, settings: updated }, { status: 200 });
        }

        const displayName =
            typeof body.displayName === "string" && body.displayName.trim()
                ? body.displayName.trim().slice(0, 200)
                : companyDefaults.displayName?.slice(0, 200) || null;
        if (!displayName) return NextResponse.json({ error: "Bitte einen Firmennamen angeben." }, { status: 400 });

        const created = await atomic(store.db, userId, async (tx) => {
            try {
                await tx.db.createDocument(DB, T.SLUGS, slug, { userId }, tx.perms(), tx.transactionId);
            } catch (error) {
                if ((error as { code?: number }).code === 409)
                    throw new TermineError("Dieser Name ist bereits vergeben.", 409);
                throw error;
            }
            return tx.db.createDocument(
                DB,
                T.SETTINGS,
                newId(),
                {
                    userId,
                    slug,
                    displayName,
                    ...DEFAULTS,
                    ...(companyDefaults.contactEmail ? { contactEmail: companyDefaults.contactEmail } : {}),
                    ...(companyDefaults.contactPhone ? { contactPhone: companyDefaults.contactPhone } : {}),
                    ...(companyDefaults.address ? { address: companyDefaults.address } : {}),
                    ...(companyDefaults.website ? { website: companyDefaults.website } : {}),
                },
                tx.perms(),
                tx.transactionId,
            );
        });
        return NextResponse.json({ slug, settings: created }, { status: 201 });
    } catch (error) {
        return fail(error);
    }
}
