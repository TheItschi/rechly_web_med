/**
 * Server-side allocation of sequential invoice numbers.
 * Ported from upstream Rechly (myaxyo/rechly_web, feat(invoice): sequential numbering).
 */
import { Query, type Databases } from "node-appwrite";
import { COLLECTIONS, DATABASE_ID } from "@/lib/appwrite-server";
import {
    DEFAULT_NUMBER_PATTERN,
    DEFAULT_NUMBER_PREFIX,
    formatInvoiceNumber,
    suggestNextSequence,
    validateNumberPattern,
} from "@/lib/invoiceNumbering";

export const NUMBER_TAKEN_MESSAGE =
    "Rechnungsnummer bereits vergeben. Bitte eine andere Nummer wählen oder leer lassen für automatische Vergabe.";

/** Resolve effective pattern/prefix from a company doc with safe defaults. */
export function resolveNumberFormat(company: unknown, dateISO: string, seq: number): string {
    const c = (company ?? {}) as Record<string, unknown>;
    const rawPattern = typeof c.invoiceNumberPattern === "string" ? c.invoiceNumberPattern : undefined;
    const pattern = rawPattern && validateNumberPattern(rawPattern) === null ? rawPattern : DEFAULT_NUMBER_PATTERN;
    const prefix =
        typeof c.invoiceNumberPrefix === "string" && c.invoiceNumberPrefix.trim()
            ? c.invoiceNumberPrefix.trim().slice(0, 32)
            : DEFAULT_NUMBER_PREFIX;
    return formatInvoiceNumber({ pattern, prefix, dateISO, seq });
}

/**
 * Allocate the next free invoice number. Check-then-create with bounded
 * retries; a post-create duplicate check repairs the rare concurrent race.
 */
export async function allocateInvoiceNumber(
    databases: Databases,
    userId: string,
    company: unknown,
    issueDate: string,
): Promise<{ number: string; seq: number }> {
    const c = (company ?? {}) as Record<string, unknown>;
    let seq =
        typeof c.nextInvoiceNumber === "number" && Number.isInteger(c.nextInvoiceNumber) && (c.nextInvoiceNumber as number) > 0
            ? (c.nextInvoiceNumber as number)
            : 1;
    for (let attempt = 0; attempt < 50; attempt++) {
        const candidate = resolveNumberFormat(company, issueDate, seq);
        const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICES, [
            Query.equal("userId", userId),
            Query.equal("invoiceNumber", candidate),
            Query.limit(1),
        ]);
        if (existing.total === 0) return { number: candidate, seq };
        seq += 1;
    }
    throw Object.assign(new Error("Keine freie Rechnungsnummer gefunden. Bitte Prefix oder Startnummer anpassen."), { code: 409 });
}

/** True when another invoice of the user already carries this number. */
export async function numberExists(databases: Databases, userId: string, invoiceNumber: string, excludeId?: string): Promise<boolean> {
    const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICES, [
        Query.equal("userId", userId),
        Query.equal("invoiceNumber", invoiceNumber),
        Query.limit(10),
    ]);
    return res.documents.some((d: { $id: string }) => d.$id !== excludeId);
}

/** Advance the company counter past an allocated sequence number (best effort). */
export async function advanceNumberCounter(databases: Databases, userId: string, allocatedSeq: number): Promise<void> {
    try {
        const companyDocs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.COMPANY_INFO, [
            Query.equal("userId", userId),
            Query.limit(1),
        ]);
        const current = companyDocs.documents[0];
        if (current && (typeof current.nextInvoiceNumber !== "number" || current.nextInvoiceNumber <= allocatedSeq)) {
            await databases.updateDocument(DATABASE_ID, COLLECTIONS.COMPANY_INFO, current.$id, {
                nextInvoiceNumber: allocatedSeq + 1,
            });
        }
    } catch {
        // Best effort only: the pre-create uniqueness check keeps numbering
        // correct even if the counter update is lost (e.g. unmigrated schema).
    }
}

/**
 * Self-healing duplicate detection: if a concurrent request created the same
 * number first, renumber this invoice instead of leaving a duplicate.
 */
export async function repairDuplicateNumber(
    databases: Databases,
    userId: string,
    invoiceId: string,
    invoiceNumber: string,
    company: unknown,
    issueDate: string,
): Promise<string> {
    try {
        const sameNumber = await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICES, [
            Query.equal("userId", userId),
            Query.equal("invoiceNumber", invoiceNumber),
            Query.limit(10),
        ]);
        const conflicts = sameNumber.documents.filter((d) => d.$id !== invoiceId);
        if (conflicts.length > 0) {
            const numbers = conflicts.map((d) => String((d as unknown as { invoiceNumber?: unknown }).invoiceNumber ?? ""));
            const seq = suggestNextSequence([...numbers, invoiceNumber]);
            const repaired = resolveNumberFormat(company, issueDate, seq);
            if (!(await numberExists(databases, userId, repaired, invoiceId))) {
                await databases.updateDocument(DATABASE_ID, COLLECTIONS.INVOICES, invoiceId, { invoiceNumber: repaired });
                return repaired;
            }
        }
    } catch {
        // Verification is best effort; the number was unique at creation time.
    }
    return invoiceNumber;
}
