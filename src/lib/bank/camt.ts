/**
 * ISO 20022 CAMT bank statements (camt.052 account report, camt.053
 * statement, camt.054 notification) in any version, e.g. Sparkasse
 * "XML (CAMT V2/V8 – gebuchte Umsätze)". Only booked entries are taken.
 *
 * One Ntry can carry several transactions (Sammelbuchung); each TxDtls
 * becomes its own transaction when it has its own amount.
 */
import { XMLParser } from "fast-xml-parser";

export interface CamtTransaction {
    transactionDate: string;
    valueDate?: string;
    amount: number;
    currency: string;
    description: string;
    reference?: string;
    counterpartName?: string;
    counterpartIban?: string;
    /** Bank's unique entry reference (AcctSvcrRef), used against double imports */
    bankReference?: string;
    bookingText?: string;
}

export interface CamtResult {
    accountIban?: string;
    transactions: CamtTransaction[];
    skippedPending: number;
}

export class CamtParseError extends Error {}

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    removeNSPrefix: true,
    parseTagValue: false,
    trimValues: true,
    isArray: (name) => ["Rpt", "Stmt", "Ntfctn", "Ntry", "NtryDtls", "TxDtls", "Ustrd", "Strd", "AddtlTxInf"].includes(name),
});

type Node = Record<string, unknown> | undefined;
const obj = (v: unknown): Node => (v && typeof v === "object" ? (v as Record<string, unknown>) : undefined);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]);
const text = (v: unknown): string | undefined => {
    if (v === undefined || v === null) return undefined;
    if (typeof v === "object") return text((v as Record<string, unknown>)["#text"]);
    const s = String(v).trim();
    return s || undefined;
};
const at = (node: unknown, ...path: string[]): unknown => path.reduce<unknown>((n, key) => obj(n)?.[key], node);

/** Date or DateTime element → YYYY-MM-DD */
const dateOf = (node: unknown): string | undefined => (text(at(node, "Dt")) ?? text(at(node, "DtTm")))?.slice(0, 10);

const amountOf = (node: unknown): { value: number; currency?: string } | undefined => {
    const raw = text(node);
    const value = raw === undefined ? NaN : Number.parseFloat(raw);
    if (!Number.isFinite(value)) return undefined;
    return { value, currency: (obj(node)?.["@Ccy"] as string | undefined) ?? undefined };
};

/** Name of a party: <Nm> directly (V2) or below <Pty> (V8). */
const partyName = (party: unknown): string | undefined => text(at(party, "Nm")) ?? text(at(party, "Pty", "Nm"));
const iban = (acct: unknown): string | undefined => text(at(acct, "Id", "IBAN"))?.replace(/\s+/g, "");

const remittance = (tx: unknown): { text?: string; reference?: string } => {
    const rmt = at(tx, "RmtInf");
    const unstructured = arr(at(rmt, "Ustrd")).map(text).filter(Boolean).join(" ");
    const structuredRef = arr(at(rmt, "Strd")).map((s) => text(at(s, "CdtrRefInf", "Ref"))).find(Boolean);
    return { text: unstructured.replace(/\s+/g, " ").trim() || undefined, reference: structuredRef };
};

const isBooked = (entry: unknown): boolean => {
    const status = text(at(entry, "Sts", "Cd")) ?? text(at(entry, "Sts"));
    return !status || status === "BOOK";
};

export function parseCamt(xml: string): CamtResult {
    let doc: unknown;
    try {
        doc = parser.parse(xml);
    } catch {
        throw new CamtParseError("Die Datei ist kein gültiges XML.");
    }
    const root = obj(at(doc, "Document"));
    const container = root && (obj(root.BkToCstmrAcctRpt) ?? obj(root.BkToCstmrStmt) ?? obj(root.BkToCstmrDbtCdtNtfctn));
    if (!container) throw new CamtParseError("Keine CAMT-Datei (camt.052/053/054) erkannt.");
    const reports = [...arr(container.Rpt), ...arr(container.Stmt), ...arr(container.Ntfctn)];

    const transactions: CamtTransaction[] = [];
    let skippedPending = 0;
    let accountIban: string | undefined;

    for (const report of reports) {
        accountIban ??= iban(at(report, "Acct"));
        for (const entry of arr(at(report, "Ntry"))) {
            if (!isBooked(entry)) {
                skippedPending++;
                continue;
            }
            const entryAmount = amountOf(at(entry, "Amt"));
            if (!entryAmount) continue;
            const debit = text(at(entry, "CdtDbtInd")) === "DBIT";
            const bookingDate = dateOf(at(entry, "BookgDt")) ?? dateOf(at(entry, "ValDt"));
            if (!bookingDate) continue;
            const valueDate = dateOf(at(entry, "ValDt"));
            const bankReference = text(at(entry, "AcctSvcrRef"));
            const bookingText = text(at(entry, "AddtlNtryInf"));

            const details = arr(at(entry, "NtryDtls")).flatMap((d) => arr(at(d, "TxDtls")));
            // Split a batch only if every part carries its own amount.
            const split = details.length > 1 && details.every((tx) => amountOf(at(tx, "AmtDtls", "TxAmt", "Amt")) ?? amountOf(at(tx, "Amt")));
            const parts = split ? details : [details[0]];

            parts.forEach((tx, index) => {
                const partAmount = split ? (amountOf(at(tx, "AmtDtls", "TxAmt", "Amt")) ?? amountOf(at(tx, "Amt")))! : entryAmount;
                const parties = at(tx, "RltdPties");
                // Counterparty: the creditor for outgoing, the debtor for incoming payments.
                const counterpart = debit
                    ? { name: partyName(at(parties, "Cdtr")) ?? partyName(at(parties, "UltmtCdtr")), iban: iban(at(parties, "CdtrAcct")) }
                    : { name: partyName(at(parties, "Dbtr")) ?? partyName(at(parties, "UltmtDbtr")), iban: iban(at(parties, "DbtrAcct")) };
                const rmt = remittance(tx);
                const endToEnd = text(at(tx, "Refs", "EndToEndId"));
                const mandate = text(at(tx, "Refs", "MndtId"));
                const txBookingText = arr(at(tx, "AddtlTxInf")).map(text).find(Boolean) ?? bookingText;
                transactions.push({
                    transactionDate: bookingDate,
                    ...(valueDate ? { valueDate } : {}),
                    amount: Math.round((debit ? -1 : 1) * Math.abs(partAmount.value) * 100) / 100,
                    currency: partAmount.currency ?? entryAmount.currency ?? "EUR",
                    description: rmt.text ?? txBookingText ?? "",
                    reference: rmt.reference ?? (endToEnd && endToEnd !== "NOTPROVIDED" ? endToEnd : undefined) ?? mandate,
                    counterpartName: counterpart.name,
                    counterpartIban: counterpart.iban,
                    bankReference: bankReference ? (split ? `${bankReference}#${index + 1}` : bankReference) : text(at(tx, "Refs", "AcctSvcrRef")),
                    bookingText: txBookingText,
                });
            });
        }
    }
    return { accountIban, transactions, skippedPending };
}
