import { NextRequest, NextResponse } from "next/server";
import { Query, ID, Permission, Role } from "node-appwrite";
import Papa from "papaparse";
import {
    createSessionClient,
    createAdminClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";
import { CamtParseError, parseCamt } from "@/lib/bank/camt";
import { CAMT_LIMITS } from "@/lib/bank/camtFile";
import { planBankImport } from "@/lib/bank/importPlan";
import { allDocuments } from "@/lib/server/pagination";

interface NormalizedTransaction {
    /** Canonical booking date (YYYY-MM-DD) */
    bookingDate: string;
    valueDate?: string;
    amount: number;
    currency: string;
    description: string;
    reference?: string;
    counterpartName?: string;
    counterpartIban?: string;
    /** CAMT AcctSvcrRef, used to recognise re-imported entries */
    bankReference?: string;
}

function parseDKB(rows: Record<string, string>[]): NormalizedTransaction[] {
    return rows
        .filter((r) => r["Buchungsdatum"] || r["Valutadatum"])
        .map((r) => ({
            bookingDate: (r["Buchungsdatum"] || r["Valutadatum"])
                .split(".")
                .reverse()
                .join("-"),
            amount: parseFloat(
                (r["Betrag (EUR)"] || r["Betrag"] || "0")
                    .replace(/\./g, "")
                    .replace(",", "."),
            ),
            currency: "EUR",
            description:
                r["Verwendungszweck"] || r["Glaeubigeridentifikation"] || "",
            counterpartName:
                r["Auftraggeber / Beguenstigter"] ||
                r["Beguenstigter/Zahlungspflichtiger"] ||
                undefined,
            counterpartIban: r["Kontonummer"] || r["IBAN"] || undefined,
            reference: r["Mandatsreferenz"] || undefined,
        }));
}

function parseING(rows: Record<string, string>[]): NormalizedTransaction[] {
    return rows
        .filter((r) => r["Buchung"])
        .map((r) => {
            const dateStr = r["Buchung"];
            const parts = dateStr.split(".");
            const isoDate =
                parts.length === 3
                    ? `${parts[2]}-${parts[1]}-${parts[0]}`
                    : dateStr;
            const amountRaw = r["Betrag"] || "0";
            const amount = parseFloat(
                amountRaw.replace(/\./g, "").replace(",", "."),
            );
            return {
                bookingDate: isoDate,
                amount,
                currency: r["Währung"] || "EUR",
                description: r["Verwendungszweck"] || "",
                counterpartName: r["Auftraggeber/Empfänger"] || undefined,
                counterpartIban: r["Kontonummer/IBAN"] || undefined,
            };
        });
}

function parseGeneric(rows: Record<string, string>[]): NormalizedTransaction[] {
    return rows
        .map((r) => {
            const dateKey = Object.keys(r).find(
                (k) =>
                    k.toLowerCase().includes("date") ||
                    k.toLowerCase().includes("datum"),
            );
            const amountKey = Object.keys(r).find(
                (k) =>
                    k.toLowerCase().includes("amount") ||
                    k.toLowerCase().includes("betrag"),
            );
            const descKey = Object.keys(r).find(
                (k) =>
                    k.toLowerCase().includes("desc") ||
                    k.toLowerCase().includes("verwendung") ||
                    k.toLowerCase().includes("purpose"),
            );

            return {
                bookingDate: dateKey
                    ? r[dateKey]
                    : new Date().toISOString().slice(0, 10),
                amount: amountKey
                    ? parseFloat(
                          r[amountKey]
                              .replace(/[^\d.,-]/g, "")
                              .replace(",", "."),
                      )
                    : 0,
                currency: "EUR",
                description: descKey ? r[descKey] : "",
            };
        })
        .filter((t) => t.bookingDate && !isNaN(t.amount));
}

export async function POST(request: NextRequest) {
    try {
        let account;
        try {
            const sessionClient = await createSessionClient();
            account = sessionClient.account;
        } catch {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 },
            );
        }

        const { databases } = await createAdminClient();
        const user = await account.get();
        const body = await request.json();

        const { csvText, format, xmlFiles } = body as {
            csvText?: string;
            format: string;
            xmlFiles?: unknown;
        };

        let normalized: NormalizedTransaction[] = [];
        let skippedPending = 0;

        if (format === "camt") {
            // ISO 20022 CAMT: one or more XML documents (e.g. from a ZIP)
            if (
                !Array.isArray(xmlFiles) ||
                !xmlFiles.length ||
                !xmlFiles.every((x) => typeof x === "string")
            ) {
                return NextResponse.json(
                    { error: "xmlFiles required" },
                    { status: 400 },
                );
            }
            const totalLength = (xmlFiles as string[]).reduce(
                (sum, xml) => sum + xml.length,
                0,
            );
            if (
                xmlFiles.length > CAMT_LIMITS.maxFiles ||
                totalLength > CAMT_LIMITS.maxTotalBytes
            ) {
                return NextResponse.json(
                    { error: "Too many or too large CAMT files" },
                    { status: 413 },
                );
            }
            for (const xml of xmlFiles as string[]) {
                try {
                    const result = parseCamt(xml);
                    skippedPending += result.skippedPending;
                    normalized.push(...result.transactions);
                } catch (error) {
                    if (error instanceof CamtParseError) {
                        return NextResponse.json(
                            { error: error.message },
                            { status: 400 },
                        );
                    }
                    throw error;
                }
            }
        } else if (!csvText) {
            return NextResponse.json(
                { error: "csvText required" },
                { status: 400 },
            );
        }

        if (format !== "camt") {
            // Skip DKB header lines (they start with non-CSV metadata)
            let csvToParse = csvText ?? "";
            if (format === "dkb") {
                const lines = csvToParse.split("\n");
                const headerIndex = lines.findIndex(
                    (l) =>
                        l.startsWith('"Buchungsdatum"') ||
                        l.startsWith("Buchungsdatum"),
                );
                if (headerIndex > -1) {
                    csvToParse = lines.slice(headerIndex).join("\n");
                }
            }

            const { data: rows } = Papa.parse<Record<string, string>>(
                csvToParse,
                {
                    header: true,
                    delimiter: format === "dkb" ? ";" : ",",
                    skipEmptyLines: true,
                },
            );

            if (format === "dkb") normalized = parseDKB(rows);
            else if (format === "ing") normalized = parseING(rows);
            else normalized = parseGeneric(rows);
        }

        // Existing rows of the user, for duplicate detection
        const existing = await allDocuments(
            (queries) =>
                databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.BANK_TRANSACTIONS,
                    queries,
                ),
            [Query.equal("userId", user.$id)],
        );
        const { toCreate, duplicates } = planBankImport(
            existing.map((d) => ({
                bookingDate: d.bookingDate,
                transactionDate: d.transactionDate,
                amount: d.amount,
                description: d.description,
                bankReference: d.bankReference,
            })),
            normalized,
        );
        const importBatchId = ID.unique();

        const permissions = [
            Permission.read(Role.user(user.$id)),
            Permission.update(Role.user(user.$id)),
            Permission.delete(Role.user(user.$id)),
        ];

        let imported = 0;

        for (const tx of toCreate) {
            await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.BANK_TRANSACTIONS,
                ID.unique(),
                {
                    userId: user.$id,
                    bookingDate: tx.bookingDate,
                    ...(tx.valueDate ? { valueDate: tx.valueDate } : {}),
                    amount: tx.amount,
                    currency: tx.currency || "EUR",
                    description: tx.description || "",
                    reference: tx.reference || null,
                    counterpartName: tx.counterpartName || null,
                    counterpartIban: tx.counterpartIban || null,
                    status: "unmatched",
                    matchedInvoiceId: null,
                    importBatchId,
                    ...(tx.bankReference
                        ? { bankReference: tx.bankReference }
                        : {}),
                },
                permissions,
            );
            imported++;
        }

        return NextResponse.json({
            imported,
            duplicates,
            ...(skippedPending ? { skippedPending } : {}),
        });
    } catch (error) {
        console.error("Bank import error:", error);
        return NextResponse.json(
            { error: "Failed to import bank transactions" },
            { status: 500 },
        );
    }
}
