/* eslint-disable @typescript-eslint/no-explicit-any */
import { XMLParser } from "fast-xml-parser";
import { inflateSync } from "zlib";

/**
 * Incoming e-invoice parsing (EN 16931): XRechnung in UBL or CII syntax,
 * plus best-effort extraction of the embedded XML from ZUGFeRD/Factur-X
 * PDFs. Produces the fields needed to prefill an expense — receiving
 * e-invoices has been mandatory for German businesses since 2025.
 */

export interface ParsedEInvoice {
    vendor_name?: string;
    date?: string; // YYYY-MM-DD
    invoice_number?: string;
    amount_net?: number;
    vat_amount?: number;
    amount_gross?: number;
    vat_rate_percent?: number;
    description?: string;
}

const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    parseTagValue: false,
});

const toNumber = (value: unknown): number | undefined => {
    if (value === undefined || value === null) return undefined;
    const num =
        typeof value === "object" && value !== null && "#text" in value
            ? parseFloat(String((value as { "#text": string })["#text"]))
            : parseFloat(String(value));
    return isNaN(num) ? undefined : num;
};

const toText = (value: unknown): string | undefined => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "object" && "#text" in (value as object)) {
        return String((value as { "#text": string })["#text"]);
    }
    return String(value);
};

/** CII dates come as {"#text":"20260715","@_format":"102"} */
const parseCiiDate = (value: unknown): string | undefined => {
    const raw = toText(
        typeof value === "object" && value !== null && "DateTimeString" in value
            ? (value as { DateTimeString: unknown }).DateTimeString
            : value
    );
    if (!raw) return undefined;
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 8) {
        return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
    }
    return raw.length === 10 ? raw : undefined;
};

const first = <T>(value: T | T[] | undefined): T | undefined =>
    Array.isArray(value) ? value[0] : value;

/** Parse a UBL 2.1 invoice (XRechnung UBL syntax) */
const parseUbl = (doc: Record<string, any>): ParsedEInvoice => {
    const invoice = doc.Invoice ?? doc.CreditNote;
    const supplier =
        invoice?.AccountingSupplierParty?.Party ?? {};
    const vendorName =
        toText(supplier?.PartyLegalEntity?.RegistrationName) ??
        toText(first(supplier?.PartyName)?.Name);

    const monetary = invoice?.LegalMonetaryTotal ?? {};
    const taxTotal = first(invoice?.TaxTotal);
    const subtotal = first(taxTotal?.TaxSubtotal);

    return {
        vendor_name: vendorName,
        date: toText(invoice?.IssueDate),
        invoice_number: toText(invoice?.ID),
        amount_net: toNumber(monetary?.TaxExclusiveAmount),
        vat_amount: toNumber(taxTotal?.TaxAmount),
        amount_gross:
            toNumber(monetary?.TaxInclusiveAmount) ??
            toNumber(monetary?.PayableAmount),
        vat_rate_percent: toNumber(subtotal?.TaxCategory?.Percent),
        description: toText(first(invoice?.Note)),
    };
};

/** Parse a UN/CEFACT CII invoice (ZUGFeRD / XRechnung CII syntax) */
const parseCii = (doc: Record<string, any>): ParsedEInvoice => {
    const root = doc.CrossIndustryInvoice;
    const exchanged = root?.ExchangedDocument;
    const transaction = root?.SupplyChainTradeTransaction;
    const agreement = transaction?.ApplicableHeaderTradeAgreement;
    const settlement = transaction?.ApplicableHeaderTradeSettlement;
    const summation =
        settlement?.SpecifiedTradeSettlementHeaderMonetarySummation;
    const tax = first(settlement?.ApplicableTradeTax);

    return {
        vendor_name: toText(agreement?.SellerTradeParty?.Name),
        date: parseCiiDate(exchanged?.IssueDateTime),
        invoice_number: toText(exchanged?.ID),
        amount_net: toNumber(summation?.TaxBasisTotalAmount),
        vat_amount: toNumber(first(summation?.TaxTotalAmount)),
        amount_gross: toNumber(summation?.GrandTotalAmount),
        vat_rate_percent: toNumber(tax?.RateApplicablePercent),
        description: toText(
            first(exchanged?.IncludedNote)?.Content
        ),
    };
};

/**
 * Parse e-invoice XML (UBL or CII). Throws on unrecognized documents.
 */
export const parseEInvoiceXml = (xml: string): ParsedEInvoice => {
    const doc = parser.parse(xml);
    if (doc.CrossIndustryInvoice) return parseCii(doc);
    if (doc.Invoice || doc.CreditNote) return parseUbl(doc);
    throw new Error("unsupported_format");
};

/**
 * Best-effort extraction of the embedded e-invoice XML from a
 * ZUGFeRD/Factur-X PDF: inflate every FlateDecode stream and look for a
 * CII/UBL root element. Returns null when nothing is found.
 */
export const extractXmlFromPdf = (pdf: Buffer): string | null => {
    const marker = Buffer.from("stream");
    let offset = 0;

    while (true) {
        const streamStart = pdf.indexOf(marker, offset);
        if (streamStart === -1) break;

        // Per PDF spec, the `stream` keyword must be followed immediately by \n or \r\n
        // (and not be part of `endstream` or e.g. `octet-stream` in XMP metadata).
        const prevByte = streamStart > 0 ? pdf[streamStart - 1] : 0;
        const nextByte = pdf[streamStart + marker.length];
        const isEndstream =
            prevByte === 0x64 &&
            streamStart >= 3 &&
            pdf.subarray(streamStart - 3, streamStart).equals(Buffer.from("end"));
        if (isEndstream || (nextByte !== 0x0a && nextByte !== 0x0d)) {
            offset = streamStart + marker.length;
            continue;
        }

        // Content starts after "stream" + EOL
        let contentStart = streamStart + marker.length;
        if (pdf[contentStart] === 0x0d) contentStart++;
        if (pdf[contentStart] === 0x0a) contentStart++;
        const streamEnd = pdf.indexOf(Buffer.from("endstream"), contentStart);
        if (streamEnd === -1) break;

        // Trim optional trailing EOL right before `endstream` so zlib doesn't trip
        let dataEnd = streamEnd;
        if (dataEnd > contentStart && pdf[dataEnd - 1] === 0x0a) dataEnd--;
        if (dataEnd > contentStart && pdf[dataEnd - 1] === 0x0d) dataEnd--;

        const raw = pdf.subarray(contentStart, dataEnd);
        let text: string | null = null;
        try {
            // Cap decompression so a crafted PDF stream cannot expand unbounded in memory.
            text = inflateSync(raw, { maxOutputLength: 10 * 1024 * 1024 }).toString("utf8");
        } catch {
            // Stream isn't deflate-compressed — attachments may be stored raw
            text = raw.toString("utf8");
        }
        if (
            text &&
            (text.includes("CrossIndustryInvoice") ||
                (text.includes("Invoice") && text.includes("urn:oasis")) ||
                (text.includes("CreditNote") && text.includes("urn:oasis")))
        ) {
            const xmlStart = text.indexOf("<?xml");
            return xmlStart >= 0 ? text.slice(xmlStart).trim() : text.trim();
        }
        offset = streamEnd + 9;
    }
    return null;
};
