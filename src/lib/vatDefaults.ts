/**
 * Durchschnittssatz for agricultural businesses under § 24 UStG
 * (7.8 % since 1 January 2025; forestry products carry 5.5 %).
 * The farmer charges this VAT on invoices but does not remit it —
 * it compensates their non-deductible input tax (Vorsteuerpauschale).
 */
export const FLAT_RATE_FARMING_VAT = 7.8;
export const FLAT_RATE_FORESTRY_VAT = 5.5;

/** Selectable VAT rates across invoice, offer, product and expense forms. */
export const VAT_RATE_OPTIONS: Array<{ value: number; label: string }> = [
    { value: 19, label: "19%" },
    { value: 7, label: "7%" },
    { value: FLAT_RATE_FARMING_VAT, label: "7,8% (§ 24 UStG)" },
    { value: FLAT_RATE_FORESTRY_VAT, label: "5,5% (§ 24 UStG)" },
    { value: 0, label: "0%" },
];

/** Rates the AI draft parser may keep; anything else falls back to the default. */
export const KNOWN_VAT_RATES = [0, 5.5, 7, 7.8, 19];

/** A default for new lines only; never rewrite saved documents or user edits. */
export function defaultVatRate(
    smallBusiness: boolean | undefined,
    productRate?: number | null,
    flatRateFarming?: boolean,
): number {
    if (smallBusiness) return 0;
    // An explicit product rate wins (e.g. the 19 % drinks exception under § 24);
    // the regime default only applies to fresh, product-less lines.
    return productRate ?? (flatRateFarming ? FLAT_RATE_FARMING_VAT : 19);
}
