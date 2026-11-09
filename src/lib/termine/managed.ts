import { Query } from "node-appwrite";
import { createAdminClient, DATABASE_ID } from "@/lib/appwrite-server";
import { DB, T, TermineError, tokenHash } from "@/lib/termine/store";
import type { AppointmentRow } from "@/lib/termine/booking";
import { rateLimit, PUBLIC_LIMITS } from "@/lib/termine/ratelimit";
import type { SettingsRow } from "@/lib/termine/booking";

export interface ManagedContext {
    businessUserId: string;
    businessName: string;
    appointment: AppointmentRow;
    settings: SettingsRow;
}

export async function loadManaged(ip: string, token: string): Promise<ManagedContext> {
    const rl = rateLimit(
        `manage:${ip}:${token.slice(0, 8)}`,
        PUBLIC_LIMITS.manage.max,
        PUBLIC_LIMITS.manage.windowMs,
    );
    if (!rl.ok) throw new TermineError("Zu viele Anfragen. Bitte kurz warten.", 429);
    if (!/^[0-9a-f]{32,128}$/i.test(token)) throw new TermineError("Ungültiger Link.", 404);
    const { databases } = await createAdminClient();
    const found = await databases.listDocuments(DB, T.TOKENS, [
        Query.equal("tokenHash", tokenHash(token)),
        Query.limit(1),
    ]);
    const row = found.documents[0] as unknown as
        | { appointmentId: string; expiresAt: string; userId: string; purpose: string }
        | undefined;
    if (
        !row ||
        row.purpose !== "manage" ||
        !Number.isFinite(Date.parse(row.expiresAt)) ||
        Date.parse(row.expiresAt) < Date.now()
    )
        throw new TermineError("Dieser Link ist abgelaufen.", 410);
    const [appt, settings] = await Promise.all([
        databases.getDocument(DATABASE_ID, T.APPOINTMENTS, row.appointmentId),
        databases.listDocuments(DB, T.SETTINGS, [Query.equal("userId", row.userId), Query.limit(1)]),
    ]);
    if (!appt || appt.$id !== row.appointmentId || appt.userId !== row.userId || !settings.documents[0])
        throw new TermineError("Buchung nicht gefunden.", 404);
    const businessName =
        (settings.documents[0] as unknown as { displayName?: string } | undefined)?.displayName ?? "";
    return {
        businessUserId: row.userId,
        businessName,
        appointment: appt as unknown as AppointmentRow,
        settings: settings.documents[0] as unknown as SettingsRow,
    };
}

export function publicAppointment(a: AppointmentRow, businessName: string) {
    return {
        serviceName: a.serviceNameSnapshot,
        startUtc: a.startUtc,
        endUtc: a.endUtc,
        timezone: a.businessTimezone,
        durationMinutes: a.durationMinutes,
        status: a.status,
        businessName,
    };
}
