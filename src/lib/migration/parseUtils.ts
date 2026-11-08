import type { ExpenseCategory } from "@/types";
import type { InvoiceStatus } from "./types";

/**
 * Decode an ArrayBuffer or Uint8Array that might be UTF-8 or Windows-1252 (Latin1).
 * Competitor exports from Lexware Office, DATEV, or German Excel often use Windows-1252.
 */
export function decodeFileBuffer(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    // Strip UTF-8 BOM if present
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        return new TextDecoder("utf-8").decode(bytes.subarray(3));
    }

    const utf8Text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    // If replacement character U+FFFD appears, it's Windows-1252 / ISO-8859-1
    if (utf8Text.includes("\uFFFD")) {
        return new TextDecoder("windows-1252").decode(bytes);
    }
    return utf8Text;
}

/**
 * Parse German or international number strings into a clean JS number.
 * Examples:
 * - "1.234,56 €" -> 1234.56
 * - "120,50" -> 120.5
 * - "1,234.56" -> 1234.56
 * - "19 %" -> 19
 */
export function parseFlexibleNumber(raw: unknown): number {
    if (typeof raw === "number") {
        return Number.isFinite(raw) ? raw : 0;
    }
    if (typeof raw !== "string") return 0;

    const cleaned = raw
        .replace(/[€$£%\s\u00A0]/g, "")
        .replace(/EUR/gi, "")
        .trim();
    if (!cleaned) return 0;

    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");

    let normalized = cleaned;
    if (lastComma > -1 && lastDot > -1) {
        if (lastComma > lastDot) {
            // German format: 1.234,56
            normalized = cleaned.replace(/\./g, "").replace(",", ".");
        } else {
            // English format: 1,234.56
            normalized = cleaned.replace(/,/g, "");
        }
    } else if (lastComma > -1) {
        // Only comma present: 120,50 -> 120.50
        normalized = cleaned.replace(",", ".");
    }

    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Parse German (`24.10.2026`, `24.10.26`), ISO (`2026-10-24`), compact (`20261024`),
 * or slash (`24/10/2026`) dates into `YYYY-MM-DD`.
 */
export function parseFlexibleDate(raw: unknown, fallbackDate?: string): string {
    const fallback = fallbackDate || new Date().toISOString().slice(0, 10);
    if (typeof raw !== "string" && typeof raw !== "number") return fallback;
    const str = String(raw).trim();
    if (!str) return fallback;

    // ISO YYYY-MM-DD (or YYYY-MM-DDTHH:mm...)
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    // German DD.MM.YYYY or DD.MM.YY
    const deMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
    if (deMatch) {
        const day = deMatch[1].padStart(2, "0");
        const month = deMatch[2].padStart(2, "0");
        const year = deMatch[3].length === 2 ? `20${deMatch[3]}` : deMatch[3];
        return `${year}-${month}-${day}`;
    }

    // Compact YYYYMMDD (e.g. XRechnung CII or DATEV)
    const compactMatch = str.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (compactMatch) {
        return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
    }

    // Slash DD/MM/YYYY
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
        const day = slashMatch[1].padStart(2, "0");
        const month = slashMatch[2].padStart(2, "0");
        const year = slashMatch[3];
        return `${year}-${month}-${day}`;
    }

    return fallback;
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
    const parts = isoDate.split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        return isoDate;
    }
    const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days));
    return dt.toISOString().slice(0, 10);
}

export function normalizeCountry(raw: unknown): string {
    const val = String(raw ?? "").trim();
    if (!val) return "Deutschland";
    const upper = val.toUpperCase();
    if (upper === "DE" || upper === "DEU" || upper === "GERMANY" || upper === "DEUTSCHLAND") {
        return "Deutschland";
    }
    if (upper === "AT" || upper === "AUT" || upper === "AUSTRIA" || upper === "ÖSTERREICH") {
        return "Österreich";
    }
    if (upper === "CH" || upper === "CHE" || upper === "SWITZERLAND" || upper === "SCHWEIZ") {
        return "Schweiz";
    }
    return val;
}

export function normalizeUnitOfMeasure(raw: unknown): string {
    const val = String(raw ?? "").trim();
    if (!val) return "Stück";
    const lower = val.toLowerCase();
    if (
        lower === "stk" ||
        lower === "stk." ||
        lower === "stück" ||
        lower === "stueck" ||
        lower === "c62" ||
        lower === "h87" ||
        lower === "pce" ||
        lower === "pcs" ||
        lower === "piece"
    ) {
        return "Stück";
    }
    if (
        lower === "std" ||
        lower === "std." ||
        lower === "stunde" ||
        lower === "stunden" ||
        lower === "h" ||
        lower === "hr" ||
        lower === "hur" ||
        lower === "hour"
    ) {
        return "Stunde";
    }
    if (
        lower === "psch" ||
        lower === "psch." ||
        lower === "pauschal" ||
        lower === "pauschale" ||
        lower === "ls"
    ) {
        return "Pauschale";
    }
    if (lower === "tag" || lower === "tage" || lower === "day" || lower === "pt") {
        return "Tag";
    }
    if (lower === "monat" || lower === "monate" || lower === "mon" || lower === "month") {
        return "Monat";
    }
    return val;
}

export function normalizeTaxRate(raw: unknown, fallback = 19): number {
    if (raw === undefined || raw === null || String(raw).trim() === "") {
        return fallback;
    }
    const str = String(raw).trim().toLowerCase();
    if (str.includes("steuerfrei") || str.includes("kleinunternehmer") || str === "0" || str === "0%") {
        return 0;
    }
    const num = parseFlexibleNumber(raw);
    if (num === 0 || num === 7 || num === 19) return num;
    if (num > 0 && num < 1) {
        // e.g. 0.19 -> 19
        return Math.round(num * 100);
    }
    if (num >= 0 && num <= 100) return num;
    return fallback;
}

export function normalizeInvoiceStatus(raw: unknown): InvoiceStatus {
    const str = String(raw ?? "").trim().toLowerCase();
    if (!str) return "paid";
    if (
        str.includes("bezahlt") ||
        str.includes("paid") ||
        str.includes("beglichen") ||
        str.includes("erledigt") ||
        str.includes("gebucht")
    ) {
        return "paid";
    }
    if (
        str.includes("storn") ||
        str.includes("cancel") ||
        str.includes("gutschrift")
    ) {
        return "cancelled";
    }
    if (str.includes("entwurf") || str.includes("draft")) {
        return "draft";
    }
    if (
        str.includes("offen") ||
        str.includes("versendet") ||
        str.includes("gestellt") ||
        str.includes("überfällig") ||
        str.includes("ueberfaellig") ||
        str.includes("mahnung") ||
        str.includes("overdue") ||
        str.includes("open") ||
        str.includes("sent") ||
        str.includes("unpaid")
    ) {
        return "sent";
    }
    return "paid";
}

export function normalizeExpenseCategory(raw: unknown, description = ""): ExpenseCategory {
    const combined = `${String(raw ?? "")} ${description}`.toLowerCase();
    if (
        combined.includes("software") ||
        combined.includes("saas") ||
        combined.includes("hosting") ||
        combined.includes("cloud") ||
        combined.includes("lizenz") ||
        combined.includes("domain") ||
        combined.includes("github") ||
        combined.includes("openai") ||
        combined.includes("adobe")
    ) {
        return "software";
    }
    if (
        combined.includes("hardware") ||
        combined.includes("laptop") ||
        combined.includes("macbook") ||
        combined.includes("monitor") ||
        combined.includes("computer") ||
        combined.includes("gerät")
    ) {
        return "hardware";
    }
    if (
        combined.includes("reise") ||
        combined.includes("travel") ||
        combined.includes("hotel") ||
        combined.includes("bahn") ||
        combined.includes("flug") ||
        combined.includes("tank") ||
        combined.includes("fahrt")
    ) {
        return "travel";
    }
    if (
        combined.includes("marketing") ||
        combined.includes("werbung") ||
        combined.includes("google ads") ||
        combined.includes("meta") ||
        combined.includes("anzeigen")
    ) {
        return "marketing";
    }
    if (
        combined.includes("beratung") ||
        combined.includes("consulting") ||
        combined.includes("steuerberater") ||
        combined.includes("rechtsanwalt") ||
        combined.includes("buchhaltung")
    ) {
        return "consulting";
    }
    if (combined.includes("miete") || combined.includes("rent") || combined.includes("coworking")) {
        return "rent";
    }
    if (
        combined.includes("nebenkosten") ||
        combined.includes("strom") ||
        combined.includes("wasser") ||
        combined.includes("heizung") ||
        combined.includes("utilities")
    ) {
        return "utilities";
    }
    if (combined.includes("versicherung") || combined.includes("insurance")) {
        return "insurance";
    }
    if (
        combined.includes("büro") ||
        combined.includes("buero") ||
        combined.includes("office") ||
        combined.includes("telefon") ||
        combined.includes("internet") ||
        combined.includes("porto") ||
        combined.includes("papier")
    ) {
        return "office";
    }
    return "other";
}

