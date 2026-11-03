import type { GoaeFeeType } from "./fees";

/**
 * Rule-annotated excerpt of the GOÄ Gebührenverzeichnis.
 *
 * Only a curated set of frequently billed numbers is shipped; the official
 * text (Anlage zur GOÄ) remains authoritative. Extend this list – or load an
 * additional catalogue via `registerGoaeCatalog()` – for your Fachgebiet.
 * Numbers that are not in the catalogue can still be billed; they are only
 * checked by the generic rules (Gebührenrahmen, Begründung, Leistungsdatum).
 */
export interface GoaeCatalogEntry {
    number: string;
    title: string;
    points: number;
    feeType: GoaeFeeType;
    /** Abschnitt of the Gebührenverzeichnis ("B", "C", … "O"); "Z" for Zuschläge */
    section: string;
    /** Not billable alongside these numbers on the same day (checked symmetrically) */
    notWith?: string[];
    /** Billable only alone or together with these numbers (Zuschläge ignored) */
    onlyWith?: string[];
    /** No other fee may be billed at the same Inanspruchnahme (e.g. Nr. 2) */
    alone?: boolean;
    /** Requires at least one of these numbers on the same day */
    requiresOneOf?: string[];
    maxPerDay?: number;
    /** Max. per Behandlungsfall (Zeitraum eines Monats nach erster Inanspruchnahme) */
    maxPerCase?: number;
    maxPerPeriod?: { count: number; months?: number; calendarYear?: boolean };
    /** Not billable in the same Behandlungsfall as these numbers */
    notWithInCase?: string[];
    /** Mindestdauer in minutes that must be documented */
    minMinutes?: number;
    /** Billing more than once per day requires Uhrzeit and reason */
    repeatSameDayNeedsReason?: boolean;
    /** Note that must be reflected on the invoice text */
    invoiceHint?: string;
}

const NOT_WITH_PSYCH = [
    "804", "805", "806", "807", "808", "809", "810", "811", "812", "817", "835", "849",
    "861", "862", "863", "864", "870", "871", "886", "887",
];
const BASIC_CONTACTS = ["1", "3", "4", "5", "6", "7", "8", "45", "46", "48", "50", "51"];

export const GOAE_CATALOG: GoaeCatalogEntry[] = [
    // ── Abschnitt B: Grundleistungen und allgemeine Leistungen ──────────────
    { number: "1", title: "Beratung – auch mittels Fernsprecher", points: 80, feeType: "personal", section: "B", notWith: NOT_WITH_PSYCH, repeatSameDayNeedsReason: true },
    { number: "2", title: "Ausstellung von Wiederholungsrezepten und/oder Überweisungen und/oder Übermittlung von Befunden oder ärztlichen Anordnungen durch die Arzthelferin", points: 30, feeType: "technical", section: "B", alone: true },
    { number: "3", title: "Eingehende, das gewöhnliche Maß übersteigende Beratung – auch mittels Fernsprecher", points: 150, feeType: "personal", section: "B", onlyWith: ["5", "6", "7", "8", "800", "801"], notWith: NOT_WITH_PSYCH, minMinutes: 10, repeatSameDayNeedsReason: true },
    { number: "4", title: "Erhebung der Fremdanamnese über einen Kranken und/oder Unterweisung und Führung der Bezugsperson(en)", points: 220, feeType: "personal", section: "B", maxPerCase: 1, notWith: ["30", "34", "801", "806", "807", "816", "817", "835"] },
    { number: "5", title: "Symptombezogene Untersuchung", points: 80, feeType: "personal", section: "B", notWith: ["6", "7", "8"], repeatSameDayNeedsReason: true },
    { number: "6", title: "Vollständige körperliche Untersuchung mindestens eines der folgenden Organsysteme: alle Augenabschnitte, HNO-Bereich, stomatognathes System, Nieren und ableitende Harnwege, Gefäßstatus", points: 100, feeType: "personal", section: "B", notWith: ["5", "7", "8"], repeatSameDayNeedsReason: true },
    { number: "7", title: "Vollständige körperliche Untersuchung mindestens eines der folgenden Organsysteme: Haut, Stütz- und Bewegungsorgane, Brustorgane, Bauchorgane, weiblicher Genitaltrakt", points: 160, feeType: "personal", section: "B", notWith: ["5", "6", "8"], repeatSameDayNeedsReason: true },
    { number: "8", title: "Untersuchung zur Erhebung des Ganzkörperstatus", points: 260, feeType: "personal", section: "B", notWith: ["5", "6", "7", "800"], repeatSameDayNeedsReason: true },
    { number: "15", title: "Einleitung und Koordination flankierender therapeutischer und sozialer Maßnahmen während der kontinuierlichen ambulanten Betreuung eines chronisch Kranken", points: 300, feeType: "personal", section: "B", maxPerPeriod: { count: 1, calendarYear: true }, notWithInCase: ["4"] },
    { number: "34", title: "Erörterung (Dauer mindestens 20 Minuten) der Auswirkungen einer Krankheit auf die Lebensgestaltung", points: 300, feeType: "personal", section: "B", minMinutes: 20, maxPerPeriod: { count: 2, months: 6 }, notWith: ["1", "3", "4", "15", "30", ...NOT_WITH_PSYCH] },
    { number: "45", title: "Visite im Krankenhaus", points: 70, feeType: "personal", section: "B" },
    { number: "50", title: "Besuch, einschließlich Beratung und symptombezogener Untersuchung", points: 320, feeType: "personal", section: "B", notWith: ["1", "5", "45", "46", "48", "52"] },
    { number: "70", title: "Kurze Bescheinigung oder kurzes Zeugnis, Arbeitsunfähigkeitsbescheinigung", points: 40, feeType: "personal", section: "B" },
    { number: "75", title: "Ausführlicher schriftlicher Krankheits- und Befundbericht", points: 130, feeType: "personal", section: "B" },

    // ── Zuschläge zu Beratungen und Untersuchungen (nur einfacher Satz) ─────
    { number: "A", title: "Zuschlag für außerhalb der Sprechstunde erbrachte Leistungen", points: 70, feeType: "surcharge", section: "Z", notWith: ["B", "C", "D"], requiresOneOf: BASIC_CONTACTS, maxPerDay: 1 },
    { number: "B", title: "Zuschlag für in der Zeit zwischen 20 und 22 Uhr oder 6 und 8 Uhr außerhalb der Sprechstunde erbrachte Leistungen", points: 180, feeType: "surcharge", section: "Z", notWith: ["C"], requiresOneOf: BASIC_CONTACTS, maxPerDay: 1 },
    { number: "C", title: "Zuschlag für in der Zeit zwischen 22 und 6 Uhr erbrachte Leistungen", points: 320, feeType: "surcharge", section: "Z", requiresOneOf: BASIC_CONTACTS, maxPerDay: 1 },
    { number: "D", title: "Zuschlag für an Samstagen, Sonn- oder Feiertagen erbrachte Leistungen", points: 220, feeType: "surcharge", section: "Z", requiresOneOf: BASIC_CONTACTS, maxPerDay: 1, invoiceHint: "Samstags innerhalb der Sprechstunde nur mit halbem Satz (Faktor 0,5)." },
    { number: "K1", title: "Zuschlag zu Untersuchungen nach den Nummern 5, 6, 7 oder 8 bei Kindern bis zum vollendeten 4. Lebensjahr", points: 120, feeType: "surcharge", section: "Z", requiresOneOf: ["5", "6", "7", "8"], maxPerDay: 1 },

    // ── Abschnitt C: Nichtgebietsbezogene Sonderleistungen ─────────────────
    { number: "250", title: "Blutentnahme mittels Spritze, Kanüle oder Katheter aus der Vene", points: 40, feeType: "technical", section: "C" },
    { number: "252", title: "Injektion, subkutan, submukös, intrakutan oder intramuskulär", points: 40, feeType: "personal", section: "C" },
    { number: "253", title: "Injektion, intravenös", points: 70, feeType: "personal", section: "C" },
    { number: "410", title: "Ultraschalluntersuchung eines Organs", points: 200, feeType: "personal", section: "C", maxPerDay: 1, invoiceHint: "Das untersuchte Organ ist in der Rechnung anzugeben." },
    { number: "420", title: "Ultraschalluntersuchung von bis zu drei weiteren Organen im Anschluss an eine der Leistungen nach den Nummern 410 bis 418, je Organ", points: 80, feeType: "personal", section: "C", maxPerDay: 3, requiresOneOf: ["410", "411", "412", "413", "414", "415", "416", "417", "418"], invoiceHint: "Die untersuchten Organe sind in der Rechnung anzugeben." },
];

const catalogIndex = new Map<string, GoaeCatalogEntry>();
const rebuild = (entries: GoaeCatalogEntry[]) => {
    for (const entry of entries) catalogIndex.set(normalizeGoaeNumber(entry.number), entry);
};

export function normalizeGoaeNumber(value: string): string {
    return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

/** Add or override catalogue entries (e.g. Fachgebiets-Ziffern). */
export function registerGoaeCatalog(entries: GoaeCatalogEntry[]): void {
    rebuild(entries);
}

export function findGoaeEntry(number: string): GoaeCatalogEntry | undefined {
    if (catalogIndex.size === 0) rebuild(GOAE_CATALOG);
    return catalogIndex.get(normalizeGoaeNumber(number));
}

export function listGoaeCatalog(): GoaeCatalogEntry[] {
    if (catalogIndex.size === 0) rebuild(GOAE_CATALOG);
    return [...catalogIndex.values()];
}

/**
 * Abschnitt derived from the number range when the number is not in the
 * catalogue. Ranges follow the Gebührenverzeichnis (B: 1–109, C: 200–449, …).
 */
export function goaeSectionOf(number: string): string | undefined {
    const known = findGoaeEntry(number);
    if (known) return known.section;
    const n = Number.parseInt(normalizeGoaeNumber(number), 10);
    if (!Number.isFinite(n)) return undefined;
    const ranges: [number, number, string][] = [
        [1, 199, "B"], [200, 449, "C"], [450, 499, "D"], [500, 599, "E"],
        [600, 799, "F"], [800, 899, "G"], [1000, 1199, "H"], [1200, 1399, "I"],
        [1400, 1699, "J"], [1700, 1999, "K"], [2000, 3499, "L"], [3500, 4799, "M"],
        [4800, 4999, "N"], [5000, 5999, "O"], [6000, 6999, "P"],
    ];
    return ranges.find(([lo, hi]) => n >= lo && n <= hi)?.[2];
}

/** Best-effort fee type for numbers outside the catalogue. */
export function guessGoaeFeeType(number: string): GoaeFeeType {
    const known = findGoaeEntry(number);
    if (known) return known.feeType;
    const section = goaeSectionOf(number);
    if (section === "M") return "lab";
    if (section === "E" || section === "O") return "technical";
    if (/^[A-K]\d?$/.test(normalizeGoaeNumber(number))) return "surcharge";
    return "personal";
}
