/**
 * Duplicate detection for bank imports.
 *
 * Entries with a bank reference (CAMT AcctSvcrRef) are identified by it, so
 * overlapping re-imports are skipped while two genuinely identical payments
 * (same day, amount and text) are both kept. Rows without a reference — CSV
 * imports — fall back to booking date + amount + the first 50 characters of
 * the text; a CAMT entry is also skipped when it matches a CSV row imported
 * earlier that way.
 */

export interface ImportCandidate {
    bookingDate: string;
    amount: number;
    description?: string;
    bankReference?: string;
}

export interface ExistingBankRow {
    bookingDate?: string | null;
    /** Field name used by older imports */
    transactionDate?: string | null;
    amount?: number | null;
    description?: string | null;
    bankReference?: string | null;
}

const legacyKey = (
    date: string | null | undefined,
    amount: number | null | undefined,
    description: string | null | undefined,
) =>
    `${String(date ?? "").slice(0, 10)}|${Number(amount ?? 0).toFixed(2)}|${(description ?? "").slice(0, 50)}`;

export function planBankImport<T extends ImportCandidate>(
    existing: ExistingBankRow[],
    candidates: T[],
) {
    const references = new Set<string>();
    const keysWithoutReference = new Set<string>();
    for (const row of existing) {
        if (row.bankReference) references.add(row.bankReference);
        else
            keysWithoutReference.add(
                legacyKey(
                    row.bookingDate ?? row.transactionDate,
                    row.amount,
                    row.description,
                ),
            );
    }

    const toCreate: T[] = [];
    let duplicates = 0;
    for (const candidate of candidates) {
        const key = legacyKey(
            candidate.bookingDate,
            candidate.amount,
            candidate.description,
        );
        const duplicate = candidate.bankReference
            ? references.has(candidate.bankReference) ||
              keysWithoutReference.has(key)
            : keysWithoutReference.has(key);
        if (duplicate) {
            duplicates++;
            continue;
        }
        toCreate.push(candidate);
        if (candidate.bankReference) references.add(candidate.bankReference);
        else keysWithoutReference.add(key);
    }
    return { toCreate, duplicates };
}
