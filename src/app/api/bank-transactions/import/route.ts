import { NextRequest, NextResponse } from "next/server";
import { Query, ID, Permission, Role } from "node-appwrite";
import Papa from "papaparse";
import { CamtParseError, parseCamt } from "@/lib/bank/camt";
import {
    createSessionClient,
    createAdminClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";

interface NormalizedTransaction {
    transactionDate: string;
    amount: number;
    currency: string;
    description: string;
    reference?: string;
    counterpartName?: string;
    counterpartIban?: string;
    /** CAMT: bank's unique entry reference, stored in rawData for duplicate checks */
    bankReference?: string;
    rawData?: string;
}

const camtRef = (rawData: unknown): string | undefined => {
    if (typeof rawData !== "string" || !rawData.startsWith("{")) return undefined;
    try {
        const ref = (JSON.parse(rawData) as { camtRef?: unknown }).camtRef;
        return typeof ref === "string" ? ref : undefined;
    } catch {
        return undefined;
    }
};

function parseDKB(rows: Record<string, string>[]): NormalizedTransaction[] {
    return rows
        .filter((r) => r["Buchungsdatum"] || r["Valutadatum"])
        .map((r) => ({
            transactionDate: (r["Buchungsdatum"] || r["Valutadatum"])
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
                transactionDate: isoDate,
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
                transactionDate: dateKey
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
        .filter((t) => t.transactionDate && !isNaN(t.amount));
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

        const { csvText, format, xmlFiles } = body as { csvText?: string; format: string; xmlFiles?: string[] };

        // ISO 20022 CAMT (XML), one or more files (e.g. extracted from a ZIP)
        let camtTransactions: NormalizedTransaction[] | null = null;
        let skippedPending = 0;
        if (format === "camt") {
            if (!Array.isArray(xmlFiles) || !xmlFiles.length) {
                return NextResponse.json({ error: "Keine XML-Datei übergeben" }, { status: 400 });
            }
            camtTransactions = [];
            for (const xml of xmlFiles) {
                try {
                    const parsed = parseCamt(String(xml));
                    skippedPending += parsed.skippedPending;
                    for (const tx of parsed.transactions) {
                        camtTransactions.push({
                            ...tx,
                            rawData: JSON.stringify({
                                source: "camt",
                                ...(tx.bankReference ? { camtRef: tx.bankReference } : {}),
                                ...(tx.valueDate ? { valueDate: tx.valueDate } : {}),
                                ...(tx.bookingText ? { bookingText: tx.bookingText.slice(0, 200) } : {}),
                            }),
                        });
                    }
                } catch (error) {
                    if (error instanceof CamtParseError) {
                        return NextResponse.json({ error: error.message }, { status: 400 });
                    }
                    throw error;
                }
            }
        }

        if (!camtTransactions && !csvText) {
            return NextResponse.json(
                { error: "csvText required" },
                { status: 400 },
            );
        }

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

        const { data: rows } = Papa.parse<Record<string, string>>(csvToParse, {
            header: true,
            delimiter: format === "dkb" ? ";" : ",",
            skipEmptyLines: true,
        });

        let normalized: NormalizedTransaction[] = [];
        if (camtTransactions) normalized = camtTransactions;
        else if (format === "dkb") normalized = parseDKB(rows);
        else if (format === "ing") normalized = parseING(rows);
        else normalized = parseGeneric(rows);

        // Fetch existing to check for duplicates
        const existing = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.BANK_TRANSACTIONS,
            [Query.equal("userId", user.$id), Query.limit(5000)],
        );
        const legacyKey = (d: { transactionDate?: string; amount?: number; description?: string }) =>
            `${String(d.transactionDate ?? "").slice(0, 10)}|${d.amount}|${d.description?.slice(0, 50)}`;
        const existingKeys = new Set(
            existing.documents.map(
                (d) =>
                    `${d.transactionDate}|${d.amount}|${d.description?.slice(0, 50)}`,
            ),
        );
        // CAMT entries are recognised by the bank reference; against rows
        // imported earlier from CSV, date + amount + text decide.
        const existingCamtRefs = new Set(existing.documents.map((d) => camtRef(d.rawData)).filter(Boolean));
        const existingCsvKeys = new Set(
            existing.documents
                .filter((d) => !camtRef(d.rawData))
                .map((d) => legacyKey({ transactionDate: d.transactionDate, amount: d.amount, description: d.description })),
        );

        const permissions = [
            Permission.read(Role.user(user.$id)),
            Permission.update(Role.user(user.$id)),
            Permission.delete(Role.user(user.$id)),
        ];

        let imported = 0;
        let duplicates = 0;

        for (const tx of normalized) {
            const key = `${tx.transactionDate}|${tx.amount}|${tx.description?.slice(0, 50)}`;
            const isDuplicate = tx.bankReference
                ? existingCamtRefs.has(tx.bankReference) || existingCsvKeys.has(legacyKey(tx))
                : existingKeys.has(key);
            if (isDuplicate) {
                duplicates++;
                continue;
            }

            await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.BANK_TRANSACTIONS,
                ID.unique(),
                {
                    userId: user.$id,
                    transactionDate: tx.transactionDate,
                    amount: tx.amount,
                    currency: tx.currency || "EUR",
                    description: tx.description || "",
                    reference: tx.reference || null,
                    counterpartName: tx.counterpartName || null,
                    counterpartIban: tx.counterpartIban || null,
                    status: "unmatched",
                    matchedInvoiceId: null,
                    rawData: tx.rawData ?? null,
                },
                permissions,
            );
            imported++;
            existingKeys.add(key);
            if (tx.bankReference) existingCamtRefs.add(tx.bankReference);
        }

        return NextResponse.json({ imported, duplicates, ...(skippedPending ? { skippedPending } : {}) });
    } catch (error) {
        console.error("Bank import error:", error);
        return NextResponse.json(
            { error: "Failed to import bank transactions" },
            { status: 500 },
        );
    }
}
