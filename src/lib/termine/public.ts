import { Query, type Databases } from "node-appwrite";
import { createAdminClient, DATABASE_ID } from "@/lib/appwrite-server";
import { T } from "@/lib/termine/store";
import { TermineError } from "@/lib/termine/store";
import type { SettingsRow } from "@/lib/termine/booking";

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

/** Resolve a published, enabled business by slug. Throws 404 otherwise. */
export async function resolvePublicBusiness(slug: string): Promise<{ db: Databases; settings: SettingsRow }> {
    const { databases } = await createAdminClient();
    const found = await databases.listDocuments(DATABASE_ID, T.SETTINGS, [
        Query.equal("slug", slug),
        Query.limit(2),
    ]);
    const settings = (found.documents as unknown as SettingsRow[]).find((s) => s.enabled && s.published);
    if (!settings) throw new TermineError("Diese Buchungsseite existiert nicht.", 404);
    return { db: databases, settings };
}

export function toPublicBusiness(s: SettingsRow): PublicBusiness {
    return {
        userId: s.userId as string,
        slug: s.slug,
        displayName: s.displayName,
        description: (s as unknown as { description?: string }).description,
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
        contactEmail: (s as unknown as { contactEmail?: string }).contactEmail,
        contactPhone: (s as unknown as { contactPhone?: string }).contactPhone,
        address: (s as unknown as { address?: string }).address,
        website: (s as unknown as { website?: string }).website,
    };
}
