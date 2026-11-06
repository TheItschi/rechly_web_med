/**
 * Girocode (EPC QR code) payload — EPC069-12 quick-response code for
 * SEPA credit transfers. Scanning it in any German/EU banking app
 * prefills the transfer with IBAN, amount and reference.
 *
 * Kept in sync with the mobile implementation (lib/girocode.ts).
 */

export interface GirocodeInput {
    /** Account holder / company name (max 70 chars) */
    name: string;
    iban: string;
    /** Optional BIC — not required for EEA transfers since version 002 */
    bic?: string;
    /** Amount in EUR; must be 0.01 … 999999999.99 */
    amount: number;
    /** Unstructured remittance info, e.g. "Rechnung RE-2026-001" (max 140) */
    reference: string;
}

/**
 * Build the EPC069-12 payload string, or null when the input cannot
 * produce a valid payload (missing IBAN/name, non-positive amount).
 */
export const buildGirocodePayload = (input: GirocodeInput): string | null => {
    const name = input.name?.trim();
    const iban = input.iban?.replace(/\s/g, "").toUpperCase();
    if (!name || !iban || iban.length < 15 || iban.length > 34) return null;

    const amount = typeof input.amount === "string" ? parseFloat(input.amount) : input.amount;
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0 || amount > 999999999.99) return null;

    const reference = (input.reference || "").trim().slice(0, 140);
    const bic = input.bic ? input.bic.replace(/\s/g, "").toUpperCase().slice(0, 11) : "";

    const lines = [
        "BCD", // Service tag
        "002", // Version 2 (BIC optional within EEA)
        "1", // UTF-8
        "SCT", // SEPA credit transfer
        bic,
        name.slice(0, 70),
        iban,
        `EUR${amount.toFixed(2)}`,
        "", // Purpose code (unused)
        "", // Structured reference (unused — we use unstructured text)
        reference,
    ];

    return lines.join("\n");
};
