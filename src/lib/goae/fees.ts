/**
 * GOÄ fee arithmetic (Gebührenordnung für Ärzte, Fassung 1996, § 5).
 *
 *   Einfachsatz = Punktzahl × Punktwert (5,82873 Cent)
 *   Gebühr      = Einfachsatz × Steigerungsfaktor
 *
 * The Gebührenrahmen depends on the kind of service:
 *   - persönlich-ärztliche Leistungen: Schwelle 2,3 / Höchstsatz 3,5
 *   - medizinisch-technische Leistungen (Abschnitte A, E, O): 1,8 / 2,5
 *   - Laborleistungen (Abschnitt M): 1,15 / 1,3
 *   - Zuschläge: nur einfacher Satz, nicht steigerungsfähig
 * Above the Schwellenwert a written, patient-understandable reason is
 * mandatory on the invoice (§ 12 Abs. 3); above the Höchstsatz only with a
 * prior fee agreement (§ 2).
 */

export const GOAE_PUNKTWERT_EUR = 0.0582873;

export type GoaeFeeType = "personal" | "technical" | "lab" | "surcharge";

export interface GoaeFeeFrame {
    /** Default factor and Begründungsschwelle */
    threshold: number;
    /** Höchstsatz without § 2 agreement */
    max: number;
    min: number;
    label: string;
}

export const GOAE_FEE_FRAMES: Record<GoaeFeeType, GoaeFeeFrame> = {
    personal: { threshold: 2.3, max: 3.5, min: 1, label: "Persönliche Leistung" },
    technical: { threshold: 1.8, max: 2.5, min: 1, label: "Technische Leistung" },
    lab: { threshold: 1.15, max: 1.3, min: 1, label: "Laborleistung" },
    // Zuschlag D on Saturdays within consulting hours is billed at half rate.
    surcharge: { threshold: 1, max: 1, min: 0.5, label: "Zuschlag" },
};

export const GOAE_FEE_TYPE_LABELS: Record<GoaeFeeType, string> = Object.fromEntries(
    Object.entries(GOAE_FEE_FRAMES).map(([k, v]) => [k, v.label]),
) as Record<GoaeFeeType, string>;

export const round2 = (value: number): number =>
    Math.round((value + Number.EPSILON) * 100) / 100;

/** Einfachsatz in EUR for a Punktzahl. */
export const baseFeeFromPoints = (points: number): number =>
    round2(points * GOAE_PUNKTWERT_EUR);

/**
 * Unit amount for one service at the given factor. Uses the Punktzahl when
 * known so rounding happens once on the final amount.
 */
export const goaeUnitAmount = (
    factor: number,
    opts: { points?: number; baseFee?: number },
): number => {
    if (opts.points && opts.points > 0) {
        return round2(opts.points * GOAE_PUNKTWERT_EUR * factor);
    }
    return round2((opts.baseFee ?? 0) * factor);
};

export const defaultFactor = (feeType: GoaeFeeType): number =>
    GOAE_FEE_FRAMES[feeType].threshold;

export const needsJustification = (feeType: GoaeFeeType, factor: number): boolean =>
    factor > GOAE_FEE_FRAMES[feeType].threshold + 1e-9;

export const exceedsMaximum = (feeType: GoaeFeeType, factor: number): boolean =>
    factor > GOAE_FEE_FRAMES[feeType].max + 1e-9;

/** Formats a factor the way it appears on German invoices: "2,3" / "1,15". */
export const formatFactor = (factor: number): string =>
    factor.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
