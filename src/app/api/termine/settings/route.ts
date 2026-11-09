import { loadCompanyDefaults } from "@/lib/termine/settings-defaults";
import { NextResponse, type NextRequest } from "next/server";
import { businessContext, authFail } from "../_lib";
import { DB, T, TermineError, isUnprovisioned } from "@/lib/termine/store";
import { loadSettings } from "@/lib/termine/booking";
import { validateSettingsPatch } from "@/lib/termine/settings-validation";

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
    return NextResponse.json({ error: "Einstellungen konnten nicht geladen werden." }, { status: 500 });
}

export async function GET() {
    try {
        const { store, userId } = await businessContext();
        const [settings, companyDefaults] = await Promise.all([
            loadSettings(store),
            loadCompanyDefaults(store.db, userId),
        ]);
        return NextResponse.json({ settings, companyDefaults });
    } catch (error) {
        return fail(error);
    }
}

const KEYS = [
    "displayName",
    "description",
    "timezone",
    "language",
    "slotIntervalMinutes",
    "minNoticeMinutes",
    "maxHorizonDays",
    "cancelNoticeMinutes",
    "rescheduleNoticeMinutes",
    "confirmationMode",
    "allowAnyStaff",
    "showPrices",
    "currency",
    "contactEmail",
    "contactPhone",
    "address",
    "website",
    "enabled",
    "published",
] as const;

export async function PATCH(request: NextRequest) {
    try {
        const { store } = await businessContext();
        let body: Record<string, unknown>;
        try {
            body = await request.json();
            if (!body || typeof body !== "object") throw new Error();
        } catch {
            return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
        }
        const patch: Record<string, unknown> = {};
        for (const k of KEYS) if (k in body) patch[k] = body[k];
        validateSettingsPatch(patch);
        if (patch.slotIntervalMinutes !== undefined && ![15, 30].includes(Number(patch.slotIntervalMinutes))) {
            return NextResponse.json({ error: "Ungültiges Zeitraster (15 oder 30 Minuten)." }, { status: 400 });
        }
        if (typeof patch.language === "string" && !["de", "en"].includes(patch.language)) {
            return NextResponse.json({ error: "Ungültige Sprache." }, { status: 400 });
        }
        for (const n of ["minNoticeMinutes", "maxHorizonDays", "cancelNoticeMinutes", "rescheduleNoticeMinutes"]) {
            if (patch[n] !== undefined && (!Number.isInteger(Number(patch[n])) || Number(patch[n]) < 0)) {
                return NextResponse.json({ error: "Ungültige Richtwerte." }, { status: 400 });
            }
        }
        const existing = await loadSettings(store);
        if (!existing) {
            return NextResponse.json({ error: "Bitte zuerst Ihre Buchungs-URL aktivieren." }, { status: 400 });
        }
        // Slug changes go through the claim endpoint (atomic reservation).
        const updated = await store.db.updateDocument(DB, T.SETTINGS, existing.$id, patch);
        return NextResponse.json({ settings: updated });
    } catch (error) {
        return fail(error);
    }
}
