import { findGoaeEntry, guessGoaeFeeType, normalizeGoaeNumber } from "./catalog";
import { baseFeeFromPoints, exceedsMaximum, GOAE_FEE_FRAMES, goaeUnitAmount, needsJustification, round2, type GoaeFeeType } from "./fees";

/** GOÄ data attached to an invoice line (stored as JSON in invoice_items.goaeData). */
export interface GoaeLineData {
    number: string;
    factor: number;
    /** Einfachsatz in EUR */
    base_fee: number;
    points?: number;
    fee_type: GoaeFeeType;
    /** Datum der Leistungserbringung, YYYY-MM-DD */
    service_date: string;
    /** Begründung bei Überschreiten des Schwellenwerts (§ 12 Abs. 3 GOÄ) */
    justification?: string;
    /** Abweichende Vereinbarung nach § 2 GOÄ liegt vor (Faktor über Höchstsatz) */
    fee_agreement?: boolean;
}

export class GoaeValidationError extends Error {}

const FEE_TYPES: GoaeFeeType[] = ["personal", "technical", "lab", "surcharge"];

/**
 * Validates and normalises client input. Returns the cleaned data plus the
 * unit price the line must carry, so the stored amount can never drift from
 * Einfachsatz × Faktor.
 */
export function normalizeGoaeLine(raw: unknown): { data: GoaeLineData; unitPrice: number } {
    if (!raw || typeof raw !== "object") throw new GoaeValidationError("Ungültige GOÄ-Daten");
    const r = raw as Record<string, unknown>;
    const number = normalizeGoaeNumber(String(r.number ?? ""));
    if (!number || number.length > 12) throw new GoaeValidationError("GOÄ-Ziffer fehlt oder ist ungültig");

    const entry = findGoaeEntry(number);
    const feeType: GoaeFeeType = FEE_TYPES.includes(r.fee_type as GoaeFeeType)
        ? (r.fee_type as GoaeFeeType)
        : guessGoaeFeeType(number);
    const factor = Number(r.factor);
    if (!(factor > 0) || factor > 99) throw new GoaeValidationError(`Nr. ${number}: ungültiger Steigerungssatz`);

    const points = entry?.points ?? (Number(r.points) > 0 ? Number(r.points) : undefined);
    const baseFee = points ? baseFeeFromPoints(points) : round2(Number(r.base_fee));
    if (!(baseFee >= 0)) throw new GoaeValidationError(`Nr. ${number}: Einfachsatz fehlt`);

    const serviceDate = String(r.service_date ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) throw new GoaeValidationError(`Nr. ${number}: Leistungsdatum fehlt`);

    const justification = typeof r.justification === "string" ? r.justification.trim().slice(0, 1000) : "";
    if (feeType === "surcharge" && factor !== 1 && !(number === "D" && factor === 0.5)) {
        throw new GoaeValidationError(`${number}: Zuschläge nur mit einfachem Satz`);
    }
    if (needsJustification(feeType, factor) && !justification) {
        throw new GoaeValidationError(`Nr. ${number}: Begründung für Faktor über ${GOAE_FEE_FRAMES[feeType].threshold} erforderlich (§ 12 Abs. 3 GOÄ)`);
    }
    const feeAgreement = r.fee_agreement === true;
    if (exceedsMaximum(feeType, factor) && !feeAgreement) {
        throw new GoaeValidationError(`Nr. ${number}: Faktor über Höchstsatz nur mit Vereinbarung nach § 2 GOÄ`);
    }

    return {
        data: {
            number,
            factor,
            base_fee: baseFee,
            ...(points ? { points } : {}),
            fee_type: feeType,
            service_date: serviceDate,
            ...(justification ? { justification } : {}),
            ...(feeAgreement ? { fee_agreement: true } : {}),
        },
        unitPrice: goaeUnitAmount(factor, { points, baseFee }),
    };
}

export function parseGoaeLineData(value: unknown): GoaeLineData | undefined {
    if (!value) return undefined;
    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        if (parsed && typeof parsed === "object" && typeof (parsed as GoaeLineData).number === "string") {
            return parsed as GoaeLineData;
        }
    } catch {
        /* ignore malformed legacy data */
    }
    return undefined;
}
