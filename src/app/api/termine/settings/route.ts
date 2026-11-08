import { NextResponse, type NextRequest } from "next/server";
import { Query, type Databases } from "node-appwrite";
import { businessContext, authFail } from "../_lib";
import { DB, T, TermineError, isUnprovisioned } from "@/lib/termine/store";
import { loadSettings, type SettingsRow } from "@/lib/termine/booking";

const DEFAULTS = {
    timezone: "Europe/Berlin",
    language: "de",
    slotIntervalMinutes: 30,
    minNoticeMinutes: 120,
    maxHorizonDays: 60,
    cancelNoticeMinutes: 1440,
    rescheduleNoticeMinutes: 1440,
    confirmationMode: "automatic",
    allowAnyStaff: true,
    showPrices: true,
    currency: "EUR",
    enabled: false,
    published: false,
} as const;

export interface CompanyBookingDefaults {
    displayName?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    website?: string;
}

export async function loadCompanyDefaults(
    db: Databases,
    userId: string,
): Promise<CompanyBookingDefaults> {
    try {
        const res = await db.listDocuments(DB, "user_company", [
            Query.equal("userId", userId),
            Query.limit(1),
        ]);
        const doc = res.documents[0];
        if (!doc || doc.userId !== userId) return {};
        const addressParts = [
            doc.addressLine1,
            doc.addressLine2,
            [doc.postalCode, doc.city].filter(Boolean).join(" "),
        ]
            .map((p) => (typeof p === "string" ? p.trim() : ""))
            .filter((p) => p && p !== "—" && p !== "00000 Unbekannt");
        return {
            displayName: typeof doc.name === "string" && doc.name.trim() ? doc.name.trim() : undefined,
            contactEmail: typeof doc.email === "string" && doc.email.trim() ? doc.email.trim() : undefined,
            contactPhone: typeof doc.phone === "string" && doc.phone.trim() ? doc.phone.trim() : undefined,
            address: addressParts.length ? addressParts.join(", ") : undefined,
            website: typeof doc.website === "string" && doc.website.trim() ? doc.website.trim() : undefined,
        };
    } catch {
        return {};
    }
}

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
        if (typeof patch.timezone === "string" && !/^[A-Za-z_]+\/[A-Za-z_+-]+$/.test(patch.timezone)) {
            return NextResponse.json({ error: "Ungültige Zeitzone." }, { status: 400 });
        }
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

export { DEFAULTS };
export type { SettingsRow };
