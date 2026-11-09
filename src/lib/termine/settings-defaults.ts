import { Query, type Databases } from "node-appwrite";
import { DB } from "./store";

export const DEFAULTS = {
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
