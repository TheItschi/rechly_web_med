/**
 * E-Mail-Entwurf (.eml) mit Rechnungs-PDF im Anhang.
 *
 * mailto: cannot carry attachments, so the app builds a complete RFC 5322
 * message. "X-Unsent: 1" makes Outlook open it as an editable, ready-to-send
 * draft (sent via the user's own account, saved in "Gesendete Elemente").
 */
import { formatCurrency } from "@/lib/currencyUtils";
import { formatDateGerman } from "@/lib/dateUtils";
import type { InvoiceWithDetails, UserCompany } from "@/types";

const CRLF = "\r\n";

const utf8Base64 = (text: string): string => {
    const bytes = new TextEncoder().encode(text);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
};
const wrap76 = (b64: string): string => b64.replace(/.{1,76}/g, (m) => m + CRLF).trimEnd();
/** RFC 2047 encoded-word for non-ASCII header values */
const encodeHeader = (value: string): string =>
    /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${utf8Base64(value)}?=`;
const formatIban = (iban: string) => iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();

export function invoiceEmailSubject(invoice: InvoiceWithDetails, company: UserCompany | null): string {
    return `Rechnung ${invoice.invoice_number}${company?.name ? ` – ${company.name}` : ""}`;
}

/** Standard text with a request for payment. */
export function invoiceEmailBody(invoice: InvoiceWithDetails, company: UserCompany | null): string {
    const name = invoice.client?.name?.trim();
    const lines: string[] = [
        name ? `Guten Tag ${name},` : "Sehr geehrte Damen und Herren,",
        "",
        `anbei erhalten Sie meine Rechnung ${invoice.invoice_number} vom ${formatDateGerman(invoice.issue_date)} über ${formatCurrency(invoice.total_gross)}.`,
        "",
        invoice.due_date
            ? `Bitte überweisen Sie den Rechnungsbetrag bis zum ${formatDateGerman(invoice.due_date)} unter Angabe der Rechnungsnummer auf folgendes Konto:`
            : "Bitte überweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer auf folgendes Konto:",
    ];
    if (company?.bank_iban) {
        lines.push(
            "",
            `Kontoinhaber: ${company.name}`,
            `IBAN: ${formatIban(company.bank_iban)}`,
            ...(company.bank_bic ? [`BIC: ${company.bank_bic}`] : []),
            ...(company.bank_name ? [`Bank: ${company.bank_name}`] : []),
            `Verwendungszweck: Rechnung ${invoice.invoice_number}`,
            "",
            "Alternativ können Sie den Girocode auf der Rechnung mit Ihrer Banking-App scannen.",
        );
    }
    lines.push(
        "",
        "Bei Fragen zur Rechnung stehe ich Ihnen gerne zur Verfügung.",
        "",
        "Mit freundlichen Grüßen",
        "",
        company?.name ?? "",
        ...(company?.professional_title ? [company.professional_title] : []),
        ...[company?.phone && `Tel: ${company.phone}`, company?.email && `Mail: ${company.email}`].filter((x): x is string => !!x),
    );
    return lines.join("\n").trimEnd() + "\n";
}

export interface EmlInput {
    to?: string;
    subject: string;
    body: string;
    attachment: { fileName: string; base64: string; contentType?: string };
}

export function buildEml({ to, subject, body, attachment }: EmlInput): string {
    const boundary = `----=_RechlyMed_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    const fileName = attachment.fileName.replace(/["\\\r\n]/g, "_");
    return [
        "X-Unsent: 1",
        ...(to ? [`To: ${to.replace(/[\r\n]/g, "")}`] : []),
        `Subject: ${encodeHeader(subject.replace(/[\r\n]+/g, " "))}`,
        "MIME-Version: 1.0",
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        "",
        `--${boundary}`,
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
        "",
        wrap76(utf8Base64(body.replace(/\r?\n/g, CRLF))),
        `--${boundary}`,
        `Content-Type: ${attachment.contentType ?? "application/pdf"}; name="${fileName}"`,
        "Content-Transfer-Encoding: base64",
        `Content-Disposition: attachment; filename="${fileName}"`,
        "",
        wrap76(attachment.base64),
        `--${boundary}--`,
        "",
    ].join(CRLF);
}
