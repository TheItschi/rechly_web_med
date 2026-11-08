import { Query, type Databases } from "node-appwrite";
import { createAdminClient, DATABASE_ID } from "@/lib/appwrite-server";
import { isTermineEnabled } from "@/lib/features";
import { T, TermineError, isUnprovisioned } from "@/lib/termine/store";
import type { SettingsRow } from "@/lib/termine/booking";
import { loadCompanyDefaults, type CompanyBookingDefaults } from "@/app/api/termine/settings/route";

export interface PublicBusiness {
    userId: string;
    slug: string;
    displayName: string;
    description?: string;
    timezone: string;
    language: string;
    slotIntervalMinutes: number;
    minNoticeMinutes: number;
    maxHorizonDays: number;
    cancelNoticeMinutes: number;
    rescheduleNoticeMinutes: number;
    confirmationMode: string;
    allowAnyStaff: boolean;
    showPrices: boolean;
    currency: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    website?: string;
}

/** Resolve a published, enabled business by slug, enriched with core Company Info defaults. Throws 404 otherwise. */
export async function resolvePublicBusiness(
    slug: string,
): Promise<{ db: Databases; settings: SettingsRow; companyDefaults: CompanyBookingDefaults }> {
    if (!isTermineEnabled()) {
        throw new TermineError("Diese Buchungsseite existiert nicht.", 404);
    }
    const { databases } = await createAdminClient();
    let found;
    try {
        found = await databases.listDocuments(DATABASE_ID, T.SETTINGS, [
            Query.equal("slug", slug),
            Query.limit(2),
        ]);
    } catch (error) {
        if (isUnprovisioned(error)) {
            throw new TermineError("Diese Buchungsseite existiert nicht.", 404);
        }
        throw error;
    }
    const settings = (found.documents as unknown as SettingsRow[]).find((s) => s.enabled && s.published);
    if (!settings) throw new TermineError("Diese Buchungsseite existiert nicht.", 404);
    const companyDefaults = await loadCompanyDefaults(databases, String(settings.userId));
    return { db: databases, settings, companyDefaults };
}

export function toPublicBusiness(
    s: SettingsRow,
    companyDefaults: CompanyBookingDefaults = {},
): PublicBusiness {
    const ext = s as unknown as {
        description?: string;
        contactEmail?: string;
        contactPhone?: string;
        address?: string;
        website?: string;
    };
    return {
        userId: s.userId as string,
        slug: s.slug,
        displayName: s.displayName || companyDefaults.displayName || s.slug,
        description: ext.description,
        timezone: s.timezone,
        language: s.language,
        slotIntervalMinutes: s.slotIntervalMinutes,
        minNoticeMinutes: s.minNoticeMinutes,
        maxHorizonDays: s.maxHorizonDays,
        cancelNoticeMinutes: s.cancelNoticeMinutes,
        rescheduleNoticeMinutes: s.rescheduleNoticeMinutes,
        confirmationMode: s.confirmationMode,
        allowAnyStaff: s.allowAnyStaff,
        showPrices: s.showPrices,
        currency: s.currency,
        contactEmail: ext.contactEmail || companyDefaults.contactEmail,
        contactPhone: ext.contactPhone || companyDefaults.contactPhone,
        address: ext.address || companyDefaults.address,
        website: ext.website || companyDefaults.website,
    };
}
