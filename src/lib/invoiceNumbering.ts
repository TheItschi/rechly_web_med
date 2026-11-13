/**
 * Sequential invoice numbering with a configurable pattern.
 *
 * Supported tokens (case-sensitive):
 *   {PREFIX}  company prefix, e.g. "RE"
 *   {YYYY}    4-digit year, e.g. 2026
 *   {YY}      2-digit year, e.g. 26
 *   {MM}      2-digit month, e.g. 03
 *   {NUM}     running sequence number, unpadded
 *   {NUM:n}   running sequence number, zero-padded to n digits (n = 1..8)
 *
 * Everything else in the pattern must be plain text from a safe alphabet
 * (letters, digits, space and - _ . / ( ) ). Unknown tokens and unsafe
 * characters are rejected so generated numbers can never break invoices,
 * file names, DATEV exports or the XRechnung XML.
 */

export const DEFAULT_NUMBER_PREFIX = "RE";
export const DEFAULT_NUMBER_PATTERN = "{PREFIX}-{YYYY}-{NUM:4}";

const ALLOWED_LITERAL = /^[A-Za-z0-9 \-_.\/()]+$/;
const TOKEN_SOURCE = "\\{([A-Z]+)(?::(\\d+))?\\}";
const KNOWN_TOKENS = new Set(["PREFIX", "YYYY", "YY", "MM", "NUM"]);

export interface NumberFormatOptions {
    pattern: string;
    prefix: string;
    /** ISO date used for YYYY/YY/MM tokens. Defaults to today. */
    dateISO?: string;
    seq: number;
}

/** Returns an error message key (translation key suffix) or null when valid. */
export function validateNumberPattern(pattern: unknown): string | null {
    if (typeof pattern !== "string" || !pattern.trim()) {
        return "empty";
    }
    if (pattern.length > 64) {
        return "tooLong";
    }
    // Reset scanner per token occurrence
    const re = new RegExp(TOKEN_SOURCE, "g");
    let match: RegExpExecArray | null;
    let hasNumber = false;
    let lastIndex = 0;
    re.lastIndex = 0;
    while ((match = re.exec(pattern)) !== null) {
        const literal = pattern.slice(lastIndex, match.index);
        if (literal && !ALLOWED_LITERAL.test(literal)) {
            return "invalidChars";
        }
        lastIndex = match.index + match[0].length;
        const [, token, width] = match;
        if (!KNOWN_TOKENS.has(token)) {
            return "unknownToken";
        }
        if (token === "NUM") {
            hasNumber = true;
            if (width !== undefined) {
                const n = Number(width);
                if (!Number.isInteger(n) || n < 1 || n > 8) {
                    return "invalidWidth";
                }
            }
        } else if (width !== undefined) {
            return "widthOnlyOnNum";
        }
    }
    const tail = pattern.slice(lastIndex);
    if (tail && !ALLOWED_LITERAL.test(tail)) {
        return "invalidChars";
    }
    if (!hasNumber) {
        return "missingNumber";
    }
    return null;
}

export function formatInvoiceNumber(options: NumberFormatOptions): string {
    const { pattern, prefix } = options;
    const seq = Math.max(0, Math.floor(options.seq));
    const date = (options.dateISO ?? new Date().toISOString()).slice(0, 10);
    const [yyyy, mm] = date.split("-");
    const out = pattern.replace(new RegExp(TOKEN_SOURCE, "g"), (_full, token: string, width?: string) => {
        switch (token) {
            case "PREFIX":
                return prefix;
            case "YYYY":
                return yyyy;
            case "YY":
                return yyyy.slice(2);
            case "MM":
                return mm;
            case "NUM":
                return width ? String(seq).padStart(Number(width), "0") : String(seq);
            default:
                return _full;
        }
    });
    return out;
}

/**
 * Suggest the next sequence number from already-used invoice numbers.
 * Looks for trailing digit runs ("RE-2025-0042" -> 42) and returns max+1.
 * Used once when a business configures numbering for the first time so the
 * counter continues existing history instead of restarting at 1.
 */
export function suggestNextSequence(existingNumbers: string[]): number {
    let max = 0;
    for (const name of existingNumbers) {
        const match = /(\d+)\s*$/.exec(name.trim());
        if (match) {
            const n = Number.parseInt(match[1], 10);
            if (Number.isSafeInteger(n) && n > max) {
                max = n;
            }
        }
    }
    return max + 1;
}
