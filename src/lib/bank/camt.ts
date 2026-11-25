/**
 * ISO 20022 CAMT bank statements: camt.052 (account report), camt.053
 * (statement) and camt.054 (debit/credit notification), any schema
 * version — e.g. Sparkasse "XML (CAMT V2/V8 – gebuchte Umsätze)".
 *
 * - Only booked entries (Sts BOOK) are returned; pending ones are counted.
 * - The sign comes from CdtDbtInd, which always states the direction of the
 *   booking itself. RvslInd only marks a reversal (e.g. Rücklastschrift):
 *   CRDT + RvslInd means an earlier debit was reversed.
 * - A batch entry (Sammelbuchung) is split into its TxDtls when every detail
 *   carries its own amount; a detail may carry its own CdtDbtInd.
 * - No entity expansion: documents with a DOCTYPE are rejected, and only the
 *   five predefined XML entities and numeric character references are decoded.
 */
import { XMLParser } from "fast-xml-parser";

export interface CamtTransaction {
    /** Booking date (BookgDt), YYYY-MM-DD */
    bookingDate: string;
    /** Value date (ValDt), YYYY-MM-DD */
    valueDate?: string;
    /** Signed amount: negative for debits */
    amount: number;
    currency: string;
    description: string;
    reference?: string;
    counterpartName?: string;
    counterpartIban?: string;
    /** Unique bank reference of the entry (AcctSvcrRef, "#n" per batch part) */
    bankReference?: string;
    /** The entry reverses an earlier booking (RvslInd) */
    reversal: boolean;
}

export interface CamtResult {
    accountIban?: string;
    transactions: CamtTransaction[];
    /** Entries not yet booked (PDNG, INFO), left out */
    skippedPending: number;
}

export class CamtParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CamtParseError";
    }
}

const ARRAY_TAGS = new Set([
    "Rpt",
    "Stmt",
    "Ntfctn",
    "Ntry",
    "NtryDtls",
    "TxDtls",
    "Ustrd",
    "Strd",
    "AddtlTxInf",
]);

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    removeNSPrefix: true,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    // Never expand entities (no DTD processing at all).
    processEntities: false,
    htmlEntities: false,
    isArray: (name) => ARRAY_TAGS.has(name),
});

const PREDEFINED: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
};

/** Single pass over predefined entities and numeric character references. */
const decodeEntities = (value: string): string =>
    value.replace(
        /&(#x[0-9a-fA-F]{1,6}|#[0-9]{1,7}|amp|lt|gt|quot|apos);/g,
        (match, name: string) => {
            if (name[0] !== "#") return PREDEFINED[name];
            const code =
                name[1] === "x"
                    ? Number.parseInt(name.slice(2), 16)
                    : Number.parseInt(name.slice(1), 10);
            return code > 0 && code <= 0x10ffff
                ? String.fromCodePoint(code)
                : match;
        },
    );

type XmlNode = Record<string, unknown>;
const asNode = (value: unknown): XmlNode | undefined =>
    value !== null && typeof value === "object" && !Array.isArray(value)
        ? (value as XmlNode)
        : undefined;
const list = (value: unknown): unknown[] =>
    Array.isArray(value)
        ? value
        : value === undefined || value === null
          ? []
          : [value];
const at = (node: unknown, ...path: string[]): unknown =>
    path.reduce<unknown>((current, key) => asNode(current)?.[key], node);
const text = (value: unknown): string | undefined => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "object") return text(asNode(value)?.["#text"]);
    const result = decodeEntities(String(value)).replace(/\s+/g, " ").trim();
    return result || undefined;
};

/** <Dt> or <DtTm> below the given element → YYYY-MM-DD */
const dateOf = (node: unknown): string | undefined => {
    const value = text(at(node, "Dt")) ?? text(at(node, "DtTm"));
    return value && /^\d{4}-\d{2}-\d{2}/.test(value)
        ? value.slice(0, 10)
        : undefined;
};

const amountOf = (
    node: unknown,
): { value: number; currency?: string } | undefined => {
    const raw = text(node);
    if (!raw || !/^\d+(\.\d+)?$/.test(raw)) return undefined;
    const currency = asNode(node)?.["@Ccy"];
    return {
        value: Number.parseFloat(raw),
        currency: typeof currency === "string" ? currency : undefined,
    };
};

const direction = (node: unknown): "CRDT" | "DBIT" | undefined => {
    const value = text(at(node, "CdtDbtInd"));
    return value === "CRDT" || value === "DBIT" ? value : undefined;
};

/** Name directly below the party (V2) or below <Pty> (V8). */
const partyName = (party: unknown): string | undefined =>
    text(at(party, "Nm")) ?? text(at(party, "Pty", "Nm"));
const ibanOf = (account: unknown): string | undefined =>
    text(at(account, "Id", "IBAN"))
        ?.replace(/\s+/g, "")
        .toUpperCase();

const isBooked = (entry: unknown): boolean => {
    // V2: <Sts>BOOK</Sts>, from V8 on: <Sts><Cd>BOOK</Cd></Sts>
    const status = text(at(entry, "Sts", "Cd")) ?? text(at(entry, "Sts"));
    return !status || status === "BOOK";
};

const usableRef = (value: string | undefined) =>
    value && value.toUpperCase() !== "NOTPROVIDED" ? value : undefined;

const round2 = (value: number) => Math.round(value * 100) / 100;

export function parseCamt(xml: string): CamtResult {
    if (/<!DOCTYPE/i.test(xml))
        throw new CamtParseError(
            "XML documents with a DOCTYPE are not accepted.",
        );
    let document: unknown;
    try {
        document = parser.parse(xml);
    } catch {
        throw new CamtParseError("The file is not valid XML.");
    }
    const root = asNode(at(document, "Document"));
    const container =
        asNode(root?.BkToCstmrAcctRpt) ??
        asNode(root?.BkToCstmrStmt) ??
        asNode(root?.BkToCstmrDbtCdtNtfctn);
    if (!container)
        throw new CamtParseError("No CAMT document (camt.052/053/054) found.");

    const reports = [
        ...list(container.Rpt),
        ...list(container.Stmt),
        ...list(container.Ntfctn),
    ];
    const transactions: CamtTransaction[] = [];
    let skippedPending = 0;
    let accountIban: string | undefined;

    for (const report of reports) {
        accountIban ??= ibanOf(at(report, "Acct"));
        for (const entry of list(at(report, "Ntry"))) {
            if (!isBooked(entry)) {
                skippedPending++;
                continue;
            }
            const entryAmount = amountOf(at(entry, "Amt"));
            const entryDirection = direction(entry);
            const bookingDate =
                dateOf(at(entry, "BookgDt")) ?? dateOf(at(entry, "ValDt"));
            if (!entryAmount || !entryDirection || !bookingDate) continue;
            const valueDate = dateOf(at(entry, "ValDt"));
            const reversal = text(at(entry, "RvslInd")) === "true";
            const entryRef = text(at(entry, "AcctSvcrRef"));
            const entryInfo = text(at(entry, "AddtlNtryInf"));

            const details = list(at(entry, "NtryDtls")).flatMap((group) =>
                list(at(group, "TxDtls")),
            );
            const detailAmount = (detail: unknown) =>
                amountOf(at(detail, "AmtDtls", "TxAmt", "Amt")) ??
                amountOf(at(detail, "Amt"));
            const split =
                details.length > 1 &&
                details.every((detail) => detailAmount(detail));
            const parts = split ? details : [details[0]];

            parts.forEach((detail, index) => {
                const amount = split ? detailAmount(detail)! : entryAmount;
                const partDirection =
                    (split && direction(detail)) || entryDirection;
                const debit = partDirection === "DBIT";
                const parties = at(detail, "RltdPties");
                // Counterparty: creditor of an outgoing, debtor of an incoming
                // payment. A reversal keeps the parties of the original
                // payment, so the side follows the original direction.
                const outgoing = reversal ? !debit : debit;
                const counterpartName = outgoing
                    ? (partyName(at(parties, "Cdtr")) ??
                      partyName(at(parties, "UltmtCdtr")))
                    : (partyName(at(parties, "Dbtr")) ??
                      partyName(at(parties, "UltmtDbtr")));
                const counterpartIban = outgoing
                    ? ibanOf(at(parties, "CdtrAcct"))
                    : ibanOf(at(parties, "DbtrAcct"));
                const remittance = at(detail, "RmtInf");
                const unstructured = list(at(remittance, "Ustrd"))
                    .map(text)
                    .filter(Boolean)
                    .join(" ");
                const structuredRef = list(at(remittance, "Strd"))
                    .map((part) => text(at(part, "CdtrRefInf", "Ref")))
                    .find(Boolean);
                const detailInfo = list(at(detail, "AddtlTxInf"))
                    .map(text)
                    .find(Boolean);
                const detailRef = usableRef(
                    text(at(detail, "Refs", "AcctSvcrRef")),
                );

                transactions.push({
                    bookingDate,
                    ...(valueDate ? { valueDate } : {}),
                    amount: round2((debit ? -1 : 1) * amount.value),
                    currency: amount.currency ?? entryAmount.currency ?? "EUR",
                    description: unstructured || detailInfo || entryInfo || "",
                    reference:
                        structuredRef ??
                        usableRef(text(at(detail, "Refs", "EndToEndId"))) ??
                        usableRef(text(at(detail, "Refs", "MndtId"))),
                    ...(counterpartName ? { counterpartName } : {}),
                    ...(counterpartIban ? { counterpartIban } : {}),
                    // Per-detail reference when the bank sends one, else the entry's with the part index.
                    bankReference: split
                        ? (detailRef ??
                          (entryRef ? `${entryRef}#${index + 1}` : undefined))
                        : (usableRef(entryRef) ?? detailRef),
                    reversal,
                });
            });
        }
    }
    return { accountIban, transactions, skippedPending };
}
