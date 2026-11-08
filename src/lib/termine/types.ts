/**
 * Rechly Termine — domain models.
 * Storage rows carry Appwrite metadata ($id, userId, $createdAt); pure
 * domain objects below describe the validated shapes used by the engine.
 */

export type TermineStatus =
    | "PENDING"
    | "CONFIRMED"
    | "COMPLETED"
    | "CANCELLED_BY_CUSTOMER"
    | "CANCELLED_BY_BUSINESS"
    | "NO_SHOW";

/** Terminal states: history is preserved, no further transitions allowed. */
export const TERMINAL_STATUSES: ReadonlySet<TermineStatus> = new Set([
    "COMPLETED",
    "CANCELLED_BY_CUSTOMER",
    "CANCELLED_BY_BUSINESS",
    "NO_SHOW",
]);

/** States that occupy staff time and block availability. Cancelled and no-show
 * slots are released; completed appointments keep blocking their slot so
 * history is never rewritten into a double booking. */
export const ACTIVE_STATUSES: ReadonlySet<TermineStatus> = new Set([
    "PENDING",
    "CONFIRMED",
    "COMPLETED",
]);

const TRANSITIONS: Record<TermineStatus, ReadonlySet<TermineStatus>> = {
    PENDING: new Set(["CONFIRMED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_BUSINESS", "NO_SHOW"]),
    CONFIRMED: new Set(["COMPLETED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_BUSINESS", "NO_SHOW"]),
    COMPLETED: new Set(),
    CANCELLED_BY_CUSTOMER: new Set(),
    CANCELLED_BY_BUSINESS: new Set(),
    NO_SHOW: new Set(),
};

export function canTransition(from: TermineStatus, to: TermineStatus): boolean {
    return TRANSITIONS[from]?.has(to) ?? false;
}

export interface TermineSettings {
    enabled: boolean;
    published: boolean;
    slug: string;
    displayName: string;
    description?: string;
    timezone: string;
    language: "de" | "en";
    slotIntervalMinutes: 15 | 30;
    minNoticeMinutes: number;
    maxHorizonDays: number;
    cancelNoticeMinutes: number;
    rescheduleNoticeMinutes: number;
    confirmationMode: "automatic" | "manual";
    allowAnyStaff: boolean;
    showPrices: boolean;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    website?: string;
    logoFileId?: string;
    coverFileId?: string;
    currency: string;
}

export interface TermineService {
    id: string;
    name: string;
    description?: string;
    category?: string;
    durationMinutes: number;
    priceCents: number;
    currency: string;
    prepMinutes: number;
    cleanupMinutes: number;
    active: boolean;
    publicVisible: boolean;
    staffIds: string[];
    sortOrder: number;
}

export interface TermineStaff {
    id: string;
    name: string;
    description?: string;
    active: boolean;
    bookable: boolean;
    serviceIds: string[];
    color?: string;
}

export interface WorkingPeriod {
    start: string; // "HH:MM" wall time in business tz
    end: string; // "HH:MM", may exceed 24:00 for overnight? No — clamped to day
}

export interface DaySchedule {
    periods: WorkingPeriod[];
    breaks: WorkingPeriod[];
}

export type WeekSchedule = Record<string, DaySchedule>; // keys 0..6 (Sun..Sat)

export interface ScheduleOverride {
    date: string; // YYYY-MM-DD
    closed: boolean;
    periods?: WorkingPeriod[];
}

export interface BlockedTime {
    id: string;
    staffId: string | null; // null = whole business
    startUtc: string;
    endUtc: string;
    reason?: string;
}

export interface TermineAppointment {
    id: string;
    businessUserId: string;
    serviceId: string;
    staffId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    customerNote?: string;
    startUtc: string;
    endUtc: string;
    businessTimezone: string;
    durationMinutes: number;
    bufferMinutes: number;
    status: TermineStatus;
    serviceNameSnapshot: string;
    servicePriceCents: number;
    currency: string;
    source: "public" | "manual" | "import";
    internalNote?: string;
    linkedInvoiceId?: string | null;
    manageTokenHash?: string;
    idempotencyKey?: string;
}

export interface AvailabilitySlot {
    startUtc: string;
    staffId: string;
}

export interface AvailabilityQuery {
    serviceId: string;
    staffId?: string; // undefined = any eligible staff
    fromDate: string; // YYYY-MM-DD in business tz
    days: number; // 1..31
    nowUtc?: string;
}
