/* eslint-disable @typescript-eslint/no-explicit-any */
import { XMLParser } from "fast-xml-parser";
import type { ParsedEInvoice } from "@/lib/eInvoiceParser";

export { type ParsedEInvoice } from "@/lib/eInvoiceParser";

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

const parseUbl = (doc: Record<string, any>): ParsedEInvoice => {
    const invoice = doc.Invoice ?? doc.CreditNote;
    const supplier = invoice?.AccountingSupplierParty?.Party ?? {};
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
        description: toText(first(exchanged?.IncludedNote)?.Content),
    };
};

export const parseEInvoiceXml = (xml: string): ParsedEInvoice => {
    const doc = parser.parse(xml);
    if (doc.CrossIndustryInvoice) return parseCii(doc);
    if (doc.Invoice || doc.CreditNote) return parseUbl(doc);
    throw new Error("Nicht unterstütztes E-Rechnungsformat (weder XRechnung UBL noch ZUGFeRD CII).");
};

function sliceEmbeddedInvoiceXml(text: string): string | null {
    if (
        !text.includes("CrossIndustryInvoice") &&
        !text.includes("Invoice") &&
        !text.includes("CreditNote")
    ) {
        return null;
    }

    // Match optional XML prolog + root element (with or without namespace prefix, e.g. rsm:CrossIndustryInvoice)
    const rootPatterns: Array<[RegExp, RegExp]> = [
        [
            /<(?:[A-Za-z0-9_-]+:)?CrossIndustryInvoice\b/,
            /<\/(?:[A-Za-z0-9_-]+:)?CrossIndustryInvoice\s*>/,
        ],
        [
            /<(?:[A-Za-z0-9_-]+:)?Invoice\b[^>]*urn:oasis/,
            /<\/(?:[A-Za-z0-9_-]+:)?Invoice\s*>/,
        ],
        [
            /<(?:[A-Za-z0-9_-]+:)?CreditNote\b[^>]*urn:oasis/,
            /<\/(?:[A-Za-z0-9_-]+:)?CreditNote\s*>/,
        ],
    ];

    for (const [openRe, closeRe] of rootPatterns) {
        const openMatch = openRe.exec(text);
        if (!openMatch) continue;
        const tail = text.slice(openMatch.index);
        const closeMatch = closeRe.exec(tail);
        if (!closeMatch) continue;
        const endIdx = openMatch.index + closeMatch.index + closeMatch[0].length;
        const prologIdx = text.lastIndexOf("<?xml", openMatch.index);
        const startIdx =
            prologIdx !== -1 && openMatch.index - prologIdx < 256
                ? prologIdx
                : openMatch.index;
        return text.slice(startIdx, endIdx).trim();
    }

    return null;
}

/**
 * Synchronous client-side scan for uncompressed XML embedded inside PDF bytes.
 */
export const extractZugferdXmlFromPdfBytes = (bytes: Uint8Array): string | null => {
    const textDecoder = new TextDecoder("utf-8", { fatal: false });
    const fullText = textDecoder.decode(bytes);
    return sliceEmbeddedInvoiceXml(fullText);
};

async function inflateBytes(
    chunk: Uint8Array,
    format: CompressionFormat,
    maxBytes = 10 * 1024 * 1024,
): Promise<string | null> {
    if (typeof DecompressionStream === "undefined") return null;
    try {
        const ds = new DecompressionStream(format);
        const writer = ds.writable.getWriter();
        const reader = ds.readable.getReader();
        const safeCopy = new Uint8Array(chunk.byteLength);
        safeCopy.set(chunk);
        void writer.write(safeCopy).then(() => writer.close()).catch(() => undefined);

        const parts: Uint8Array[] = [];
        let total = 0;
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
                total += value.byteLength;
                if (total > maxBytes) {
                    await reader.cancel().catch(() => undefined);
                    return null;
                }
                parts.push(value);
            }
        }
        const merged = new Uint8Array(total);
        let pos = 0;
        for (const p of parts) {
            merged.set(p, pos);
            pos += p.byteLength;
        }
        return new TextDecoder("utf-8", { fatal: false }).decode(merged);
    } catch {
        return null;
    }
}

function findAscii(haystack: Uint8Array, needle: number[], fromIndex: number): number {
    const limit = haystack.length - needle.length;
    outer: for (let i = fromIndex; i <= limit; i++) {
        for (let j = 0; j < needle.length; j++) {
            if (haystack[i + j] !== needle[j]) continue outer;
        }
        return i;
    }
    return -1;
}

/**
 * Full client-side ZUGFeRD/Factur-X XML extraction from PDF bytes:
 * handles both uncompressed XML streams and FlateDecode-compressed PDF/A-3 attachments.
 */
export const extractZugferdXmlFromPdfBytesAsync = async (
    bytes: Uint8Array,
): Promise<string | null> => {
    const uncompressed = extractZugferdXmlFromPdfBytes(bytes);
    if (uncompressed) return uncompressed;

    const STREAM = [0x73, 0x74, 0x72, 0x65, 0x61, 0x6d]; // "stream"
    const ENDSTREAM = [0x65, 0x6e, 0x64, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d]; // "endstream"
    let offset = 0;

    while (offset < bytes.length) {
        const streamStart = findAscii(bytes, STREAM, offset);
        if (streamStart === -1) break;

        const nextByte = bytes[streamStart + STREAM.length];
        const isEndstream =
            streamStart >= 3 &&
            bytes[streamStart - 3] === 0x65 &&
            bytes[streamStart - 2] === 0x6e &&
            bytes[streamStart - 1] === 0x64;
        if (isEndstream || (nextByte !== 0x0a && nextByte !== 0x0d)) {
            offset = streamStart + STREAM.length;
            continue;
        }

        let contentStart = streamStart + STREAM.length;
        if (bytes[contentStart] === 0x0d) contentStart++;
        if (bytes[contentStart] === 0x0a) contentStart++;

        const streamEnd = findAscii(bytes, ENDSTREAM, contentStart);
        if (streamEnd === -1) break;

        let dataEnd = streamEnd;
        if (dataEnd > contentStart && bytes[dataEnd - 1] === 0x0a) dataEnd--;
        if (dataEnd > contentStart && bytes[dataEnd - 1] === 0x0d) dataEnd--;

        const raw = bytes.subarray(contentStart, dataEnd);
        if (raw.byteLength > 0 && raw.byteLength <= 5 * 1024 * 1024) {
            const inflated =
                (await inflateBytes(raw, "deflate")) ??
                (await inflateBytes(raw, "deflate-raw"));
            if (inflated) {
                const xml = sliceEmbeddedInvoiceXml(inflated);
                if (xml) return xml;
            }
        }

        offset = streamEnd + ENDSTREAM.length;
    }

    return null;
};
