/**
 * GOÄ-Prüfmodul: validates the GOÄ lines of an invoice against the
 * Gebührenrahmen and the Abrechnungsbestimmungen in the catalogue
 * (Ausschlüsse, Häufigkeiten, Behandlungsfall, Zeiträume).
 *
 * Pure and synchronous so it can run live in the browser and again on the
 * server. "Same session" is approximated by "same Leistungsdatum"; separate
 * Inanspruchnahmen on one day must be documented with times and can be
 * confirmed by the user.
 */
import { findGoaeEntry, goaeSectionOf, guessGoaeFeeType, normalizeGoaeNumber } from "./catalog";
import { exceedsMaximum, GOAE_FEE_FRAMES, needsJustification, formatFactor, type GoaeFeeType } from "./fees";

export type GoaeSeverity = "error" | "warning" | "info";

export interface GoaeCheckLine {
    key: string;
    number: string;
    factor: number;
    quantity: number;
    /** YYYY-MM-DD */
    serviceDate?: string;
    justification?: string;
    feeType?: GoaeFeeType;
    /** Abweichende Vereinbarung nach § 2 GOÄ */
    feeAgreement?: boolean;
}

/** Already billed GOÄ services of the same patient (other invoices). */
export interface GoaeHistoryEntry {
    number: string;
    serviceDate: string;
    quantity: number;
    invoiceNumber?: string;
}

export interface GoaeFinding {
    severity: GoaeSeverity;
    code: string;
    message: string;
    lineKeys: string[];
}

export interface GoaeCheckOptions {
    history?: GoaeHistoryEntry[];
    /** Invoice date, YYYY-MM-DD; service dates after it are flagged */
    invoiceDate?: string;
    diagnosisCount?: number;
}

const C_TO_O = new Set(["C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"]);
const MIN_JUSTIFICATION_LENGTH = 10;

type Occurrence = {
    number: string;
    date: string;
    quantity: number;
    key?: string; // set for lines of the current invoice
    invoiceNumber?: string;
};

const parseDate = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
};
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const addMonths = (s: string, months: number) => {
    const d = parseDate(s);
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + months);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last));
    return fmt(d);
};
const de = (s: string) => s.split("-").reverse().join(".");
const nr = (n: string) => (/^\d/.test(n) ? `Nr. ${n}` : `Zuschlag ${n}`);
const isValidDate = (s?: string): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseDate(s).getTime());

/**
 * Behandlungsfall (Allg. Best. B): "Zeitraum eines Monats nach der jeweils
 * ersten Inanspruchnahme". Without diagnosis-level episode tracking every
 * contact of the patient opens or continues one case.
 */
export function assignTreatmentCases(dates: string[]): Map<string, number> {
    const sorted = [...new Set(dates)].sort();
    const caseOf = new Map<string, number>();
    let caseId = -1;
    let caseEnd = "";
    for (const date of sorted) {
        if (caseId < 0 || date >= caseEnd) {
            caseId += 1;
            caseEnd = addMonths(date, 1);
        }
        caseOf.set(date, caseId);
    }
    return caseOf;
}

export function checkGoaeLines(lines: GoaeCheckLine[], options: GoaeCheckOptions = {}): GoaeFinding[] {
    const findings: GoaeFinding[] = [];
    const push = (severity: GoaeSeverity, code: string, message: string, lineKeys: string[]) => {
        const id = `${code}|${message}`;
        if (!findings.some((f) => `${f.code}|${f.message}` === id)) findings.push({ severity, code, message, lineKeys });
    };

    // ── Per-line checks ────────────────────────────────────────────────
    for (const line of lines) {
        const number = normalizeGoaeNumber(line.number);
        if (!number) {
            push("error", "missing-number", "GOÄ-Ziffer fehlt.", [line.key]);
            continue;
        }
        const entry = findGoaeEntry(number);
        const feeType = line.feeType ?? guessGoaeFeeType(number);
        const frame = GOAE_FEE_FRAMES[feeType];

        if (!isValidDate(line.serviceDate)) {
            push("error", "missing-date", `${nr(number)}: Leistungsdatum fehlt (§ 12 Abs. 2 Nr. 1 GOÄ).`, [line.key]);
        } else if (options.invoiceDate && line.serviceDate > options.invoiceDate) {
            push("warning", "date-after-invoice", `${nr(number)}: Leistungsdatum ${de(line.serviceDate)} liegt nach dem Rechnungsdatum.`, [line.key]);
        }

        if (!(line.factor > 0)) {
            push("error", "factor-invalid", `${nr(number)}: Steigerungssatz muss größer 0 sein.`, [line.key]);
        } else if (feeType === "surcharge") {
            if (line.factor !== 1 && !(number === "D" && line.factor === 0.5)) {
                push("error", "surcharge-factor", `${nr(number)}: Zuschläge sind nur mit dem einfachen Satz berechnungsfähig.`, [line.key]);
            }
        } else if (line.factor < frame.min) {
            push("warning", "factor-below-min", `${nr(number)}: Steigerungssatz ${formatFactor(line.factor)} unter dem Einfachsatz.`, [line.key]);
        } else if (exceedsMaximum(feeType, line.factor) && line.feeAgreement) {
            push("info", "fee-agreement", `${nr(number)}: Faktor über Höchstsatz – schriftliche Vereinbarung nach § 2 GOÄ muss vorliegen und der Rechnung beigefügt werden.`, [line.key]);
        } else if (exceedsMaximum(feeType, line.factor)) {
            push("error", "factor-above-max", `${nr(number)}: Steigerungssatz ${formatFactor(line.factor)} über dem Höchstsatz ${formatFactor(frame.max)} – nur mit abweichender Vereinbarung nach § 2 GOÄ zulässig.`, [line.key]);
        }
        if (feeType !== "surcharge" && needsJustification(feeType, line.factor)) {
            const reason = line.justification?.trim() ?? "";
            if (!reason) {
                push("error", "justification-missing", `${nr(number)}: Faktor ${formatFactor(line.factor)} überschreitet den Schwellenwert ${formatFactor(frame.threshold)} – Begründung erforderlich (§ 12 Abs. 3 GOÄ).`, [line.key]);
            } else if (reason.length < MIN_JUSTIFICATION_LENGTH) {
                push("warning", "justification-short", `${nr(number)}: Begründung ist sehr knapp – sie muss für den Patienten verständlich und nachvollziehbar sein.`, [line.key]);
            }
        }

        if (!entry) {
            push("info", "not-in-catalog", `${nr(number)}: keine Abrechnungsbestimmungen im Katalog hinterlegt – nur Gebührenrahmen geprüft.`, [line.key]);
        } else {
            if (entry.minMinutes) push("info", "min-duration", `${nr(number)}: Mindestdauer ${entry.minMinutes} Minuten – in der Dokumentation festhalten.`, [line.key]);
            if (entry.invoiceHint) push("info", "invoice-hint", `${nr(number)}: ${entry.invoiceHint}`, [line.key]);
        }
    }

    // ── Combination & frequency checks ─────────────────────────────────
    const current: Occurrence[] = lines
        .filter((l) => isValidDate(l.serviceDate) && normalizeGoaeNumber(l.number))
        .map((l) => ({ number: normalizeGoaeNumber(l.number), date: l.serviceDate!, quantity: Math.max(1, Math.round(l.quantity || 1)), key: l.key }));
    const history: Occurrence[] = (options.history ?? [])
        .filter((h) => isValidDate(h.serviceDate))
        .map((h) => ({ number: normalizeGoaeNumber(h.number), date: h.serviceDate, quantity: Math.max(1, Math.round(h.quantity || 1)), invoiceNumber: h.invoiceNumber }));
    const all = [...history, ...current];
    const keysOf = (occ: Occurrence[]) => occ.flatMap((o) => (o.key ? [o.key] : []));
    const refOf = (o: Occurrence) => (o.key ? "diese Rechnung" : o.invoiceNumber ? `Rechnung ${o.invoiceNumber}` : "frühere Rechnung");

    const byDate = new Map<string, Occurrence[]>();
    for (const o of all) byDate.set(o.date, [...(byDate.get(o.date) ?? []), o]);

    // Same-day rules — only report days that contain a line of this invoice.
    for (const [date, dayOcc] of byDate) {
        if (!dayOcc.some((o) => o.key)) continue;
        const numbers = new Set(dayOcc.map((o) => o.number));
        const count = (n: string) => dayOcc.filter((o) => o.number === n).reduce((s, o) => s + o.quantity, 0);
        const occOf = (n: string) => dayOcc.filter((o) => o.number === n);

        for (const n of numbers) {
            const entry = findGoaeEntry(n);
            if (!entry) continue;
            const mine = occOf(n);

            for (const other of entry.notWith ?? []) {
                if (other !== n && numbers.has(other)) {
                    const [a, b] = [n, other].sort();
                    push("error", "exclusion", `${nr(a)} ist am ${de(date)} nicht neben ${nr(b)} berechnungsfähig.`, keysOf([...occOf(a), ...occOf(b)]));
                }
            }
            if (entry.alone && numbers.size > 1) {
                push("error", "alone", `${nr(n)} ist am ${de(date)} nicht neben anderen Gebühren berechnungsfähig.`, keysOf(dayOcc));
            }
            if (entry.onlyWith) {
                const others = [...numbers].filter((x) => x !== n && guessGoaeFeeType(x) !== "surcharge" && !entry.onlyWith!.includes(x));
                if (others.length) {
                    push("error", "only-with", `${nr(n)} ist nur als einzige Leistung oder neben ${entry.onlyWith.map(nr).join(", ")} berechnungsfähig (am ${de(date)} zusätzlich: ${others.map(nr).join(", ")}).`, keysOf([...mine, ...others.flatMap(occOf)]));
                }
            }
            if (entry.requiresOneOf && !entry.requiresOneOf.some((x) => numbers.has(x))) {
                push("warning", "requires", `${nr(n)} am ${de(date)} setzt eine Leistung nach ${entry.requiresOneOf.slice(0, 8).map(nr).join(", ")}${entry.requiresOneOf.length > 8 ? " …" : ""} voraus.`, keysOf(mine));
            }
            if (entry.maxPerDay && count(n) > entry.maxPerDay) {
                push("error", "max-per-day", `${nr(n)} ist je Sitzung höchstens ${entry.maxPerDay}× berechnungsfähig (am ${de(date)}: ${count(n)}×).`, keysOf(mine));
            } else if (entry.repeatSameDayNeedsReason && count(n) > 1) {
                push("warning", "repeat-same-day", `${nr(n)} mehrfach am ${de(date)} – nur bei getrennten Inanspruchnahmen mit Uhrzeitangabe${n === "3" ? " und Begründung" : ""}.`, keysOf(mine));
            }
        }
    }

    // Behandlungsfall rules
    const caseOf = assignTreatmentCases(all.map((o) => o.date));
    const byCase = new Map<number, Occurrence[]>();
    for (const o of all) {
        const c = caseOf.get(o.date)!;
        byCase.set(c, [...(byCase.get(c) ?? []), o]);
    }
    for (const caseOcc of byCase.values()) {
        if (!caseOcc.some((o) => o.key)) continue;
        const start = caseOcc.map((o) => o.date).sort()[0];
        const label = `im Behandlungsfall ab ${de(start)}`;
        const numbers = new Set(caseOcc.map((o) => o.number));

        for (const n of numbers) {
            const entry = findGoaeEntry(n);
            if (!entry) continue;
            const mine = caseOcc.filter((o) => o.number === n);
            const total = mine.reduce((s, o) => s + o.quantity, 0);
            if (entry.maxPerCase && total > entry.maxPerCase) {
                push("error", "max-per-case", `${nr(n)} ist ${label} nur ${entry.maxPerCase}× berechnungsfähig (${total}×: ${[...new Set(mine.map(refOf))].join(", ")}).`, keysOf(mine));
            }
            for (const other of entry.notWithInCase ?? []) {
                if (numbers.has(other)) {
                    push("error", "exclusion-case", `${nr(other)} ist ${label} nicht neben ${nr(n)} berechnungsfähig.`, keysOf(caseOcc.filter((o) => o.number === n || o.number === other)));
                }
            }
        }

        // Allg. Best. B: Nr. 1 und/oder 5 neben Leistungen der Abschnitte C–O
        // im Behandlungsfall nur einmal.
        const days = [...new Set(caseOcc.map((o) => o.date))].sort();
        const combinedDays = days.filter((d) => {
            const dayNums = caseOcc.filter((o) => o.date === d).map((o) => o.number);
            return dayNums.some((x) => x === "1" || x === "5") && dayNums.some((x) => C_TO_O.has(goaeSectionOf(x) ?? ""));
        });
        const combinedQty = combinedDays.reduce((s, d) => s + caseOcc.filter((o) => o.date === d && (o.number === "1" || o.number === "5")).reduce((a, o) => a + o.quantity, 0), 0);
        if (combinedQty > 1) {
            const affected = caseOcc.filter((o) => combinedDays.includes(o.date) && (o.number === "1" || o.number === "5"));
            push("error", "nr1-5-with-sonderleistung", `Nr. 1 und/oder Nr. 5 sind neben Sonderleistungen (Abschnitte C–O) ${label} nur einmal berechnungsfähig (${combinedDays.map(de).join(", ")}).`, keysOf(affected));
        }
    }

    // Rolling periods / calendar year
    for (const o of current) {
        const entry = findGoaeEntry(o.number);
        const period = entry?.maxPerPeriod;
        if (!period) continue;
        const same = all.filter((x) => x.number === o.number);
        let inWindow: Occurrence[];
        let label: string;
        if (period.calendarYear) {
            inWindow = same.filter((x) => x.date.slice(0, 4) === o.date.slice(0, 4));
            label = `im Kalenderjahr ${o.date.slice(0, 4)}`;
        } else {
            const from = addMonths(o.date, -(period.months ?? 0));
            inWindow = same.filter((x) => x.date > from && x.date <= o.date);
            label = `innerhalb von ${period.months} Monaten`;
        }
        const total = inWindow.reduce((s, x) => s + x.quantity, 0);
        if (total > period.count) {
            push("error", "max-per-period", `${nr(o.number)} ist ${label} höchstens ${period.count}× berechnungsfähig (bis ${de(o.date)}: ${total}× – ${[...new Set(inWindow.map(refOf))].join(", ")}).`, keysOf(inWindow));
        }
    }

    if (lines.length && options.diagnosisCount === 0) {
        push("warning", "no-diagnosis", "Keine Diagnose angegeben – Kostenträger verlangen in der Regel eine Diagnose.", []);
    }

    const rank: Record<GoaeSeverity, number> = { error: 0, warning: 1, info: 2 };
    return findings.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
