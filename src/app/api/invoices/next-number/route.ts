import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import {
    createSessionClient,
    createAdminClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";
import {
    DEFAULT_NUMBER_PATTERN,
    DEFAULT_NUMBER_PREFIX,
    formatInvoiceNumber,
    suggestNextSequence,
    validateNumberPattern,
} from "@/lib/invoiceNumbering";

function resolveNumbering(companyDoc: Record<string, unknown> | null) {
    const rawPattern = typeof companyDoc?.invoiceNumberPattern === "string" ? companyDoc.invoiceNumberPattern : undefined;
    const pattern = rawPattern && validateNumberPattern(rawPattern) === null ? rawPattern : DEFAULT_NUMBER_PATTERN;
    const prefix =
        typeof companyDoc?.invoiceNumberPrefix === "string" && companyDoc.invoiceNumberPrefix.trim()
            ? companyDoc.invoiceNumberPrefix.trim().slice(0, 32)
            : DEFAULT_NUMBER_PREFIX;
    const next =
        typeof companyDoc?.nextInvoiceNumber === "number" && Number.isInteger(companyDoc.nextInvoiceNumber) && companyDoc.nextInvoiceNumber > 0
            ? companyDoc.nextInvoiceNumber
            : 1;
    return { pattern, prefix, next };
}

/**
 * GET /api/invoices/next-number[?suggest=1]
 * Returns the next invoice number preview WITHOUT reserving it.
 * With ?suggest=1, derives the counter from existing invoice numbers
 * (useful when first configuring numbering for existing history).
 */
export async function GET(request: NextRequest) {
    try {
        let account;
        try {
            const sessionClient = await createSessionClient();
            account = sessionClient.account;
        } catch {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { databases } = await createAdminClient();
        const user = await account.get();
        if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

        const companies = await databases.listDocuments(DATABASE_ID, COLLECTIONS.COMPANY_INFO, [
            Query.equal("userId", user.$id),
            Query.limit(1),
        ]);
        const company = (companies.documents[0] ?? null) as unknown as Record<string, unknown> | null;
        const numbering = resolveNumbering(company);

        let seq = numbering.next;
        if (new URL(request.url).searchParams.get("suggest") === "1") {
            const invoices = await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICES, [
                Query.equal("userId", user.$id),
                Query.limit(1000),
            ]);
            const numbers = invoices.documents.map((d) => String((d as unknown as { invoiceNumber?: unknown }).invoiceNumber ?? ""));
            seq = Math.max(seq, suggestNextSequence(numbers));
        }

        return NextResponse.json({
            number: formatInvoiceNumber({ pattern: numbering.pattern, prefix: numbering.prefix, seq }),
            pattern: numbering.pattern,
            prefix: numbering.prefix,
            next: seq,
        });
    } catch (error) {
        console.error("Error computing next invoice number:", error);
        return NextResponse.json({ error: "Failed to compute invoice number" }, { status: 500 });
    }
}
