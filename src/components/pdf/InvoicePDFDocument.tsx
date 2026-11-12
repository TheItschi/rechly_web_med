/**
 * Invoice PDF document (react-pdf). Shared by the PDF page and the e-mail
 * draft export, so both always produce the identical file.
 */
import { Document, Page, Text, View, StyleSheet, Image, pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { identifierSummary } from "@/lib/eRechnung/identifierSummary";
import { buildGirocodePayload } from "@/lib/girocode";
import { formatFactor } from "@/lib/goae/fees";
import { formatDiagnosis } from "@/lib/icd10";
import { formatCurrency } from "@/lib/currencyUtils";
import { formatDateGerman } from "@/lib/dateUtils";
import type { InvoiceWithDetails, UserCompany, InvoiceItem } from "@/types";

const styles = StyleSheet.create({
    page: {
        padding: 40,
        paddingBottom: 100,
        fontSize: 10,
        fontFamily: "Helvetica",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 40,
    },
    companyInfo: {
        maxWidth: "50%",
    },
    companyName: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 4,
    },
    invoiceTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#1976d2",
        marginBottom: 4,
    },
    invoiceNumber: {
        fontSize: 12,
        color: "#666",
    },
    addresses: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 30,
    },
    addressBlock: {
        width: "45%",
    },
    addressLabel: {
        fontSize: 8,
        color: "#666",
        marginBottom: 4,
        textTransform: "uppercase",
    },
    addressName: {
        fontSize: 12,
        fontWeight: "bold",
        marginBottom: 2,
    },
    addressText: {
        fontSize: 10,
        lineHeight: 1.4,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    infoItem: {
        width: "30%",
    },
    infoLabel: {
        fontSize: 8,
        color: "#666",
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 11,
        fontWeight: "bold",
    },
    table: {
        marginTop: 20,
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#f5f5f5",
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    colDescription: {
        flex: 3,
    },
    colQuantity: {
        flex: 1,
        textAlign: "right",
    },
    colUnit: {
        flex: 1,
        paddingLeft: 8,
    },
    colPrice: {
        flex: 1,
        textAlign: "right",
    },
    colTax: {
        flex: 0.8,
        textAlign: "right",
    },
    colTotal: {
        flex: 1.2,
        textAlign: "right",
    },
    letterhead: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 28,
    },
    letterheadImage: { height: 84, marginRight: 14 },
    letterheadName: { flex: 1, paddingTop: 4 },
    practiceName: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 12 },
    practiceTitle: { fontSize: 13 },
    letterheadContact: { width: 170, fontSize: 9, lineHeight: 1.35, paddingTop: 4 },
    senderLine: { fontSize: 7, color: "#666", textDecoration: "underline", marginBottom: 8 },
    closing: { marginTop: 24, fontSize: 10 },
    signature: { height: 46, marginTop: 6, marginBottom: 2, objectFit: "contain", alignSelf: "flex-start" },
    signatureName: { fontSize: 9, color: "#444" },
    colDate: { width: 56 },
    colGoae: { width: 34 },
    colFactor: { width: 34, textAlign: "right" },
    colQtySmall: { width: 26, textAlign: "right" },
    justification: { fontSize: 8, color: "#555", fontStyle: "italic", marginTop: 2 },
    diagnoses: { marginBottom: 12 },
    headerText: {
        fontWeight: "bold",
        fontSize: 9,
        color: "#666",
    },
    totals: {
        marginTop: 20,
        alignItems: "flex-end",
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        width: 200,
        marginBottom: 4,
    },
    totalLabel: {
        flex: 1,
        textAlign: "right",
        paddingRight: 10,
    },
    totalValue: {
        width: 80,
        textAlign: "right",
    },
    totalFinal: {
        flexDirection: "row",
        justifyContent: "flex-end",
        width: 200,
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 2,
        borderTopColor: "#1976d2",
    },
    totalFinalLabel: {
        flex: 1,
        textAlign: "right",
        paddingRight: 10,
        fontWeight: "bold",
        fontSize: 12,
    },
    totalFinalValue: {
        width: 80,
        textAlign: "right",
        fontWeight: "bold",
        fontSize: 12,
        color: "#1976d2",
    },
    footer: {
        position: "absolute",
        bottom: 30,
        left: 40,
        right: 40,
    },
    footerDivider: {
        borderTopWidth: 1,
        borderTopColor: "#ddd",
        paddingTop: 10,
    },
    footerContent: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    footerColumn: {
        width: "30%",
    },
    footerLabel: {
        fontSize: 8,
        color: "#666",
        marginBottom: 2,
    },
    footerText: {
        fontSize: 8,
        lineHeight: 1.3,
    },
    notes: {
        marginTop: 30,
        padding: 10,
        backgroundColor: "#f9f9f9",
        borderRadius: 4,
    },
    notesLabel: {
        fontSize: 9,
        fontWeight: "bold",
        marginBottom: 4,
    },
    notesText: {
        fontSize: 9,
        lineHeight: 1.4,
    },
    paymentTerms: {
        marginTop: 20,
        fontSize: 9,
        color: "#666",
    },
});

interface InvoicePDFProps {
    invoice: InvoiceWithDetails;
    company: UserCompany | null;
    t: (key: string) => string;
    girocodeUrl?: string | null;
}

const isPdfImage = (src?: string): src is string => !!src && /^data:image\/(png|jpeg);base64,/.test(src);

/** GOÄ lines first, chronologically by Leistungsdatum; other lines (Auslagen) after. */
const sortForMedicalInvoice = (items: InvoiceItem[]) =>
    items
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
            const da = a.item.goae?.service_date ?? "9999";
            const db = b.item.goae?.service_date ?? "9999";
            return da.localeCompare(db) || a.index - b.index;
        })
        .map(({ item }) => item);

export const InvoicePDF = ({ invoice, company, t, girocodeUrl }: InvoicePDFProps) => {
    const items = invoice.items || [];
    const isMedical = items.some((i) => i.goae);
    const showVat = !isMedical || items.some((i) => i.tax_rate_percent > 0);
    const diagnoses = invoice.medical?.diagnoses ?? [];
    const paymentTerms = invoice.payment_terms || company?.payment_terms_default;
    const logo = isPdfImage(company?.logo_base64) ? company!.logo_base64 : undefined;
    const signature = isPdfImage(company?.signature_base64) ? company!.signature_base64 : undefined;
    const clientAddress = invoice.client
        ? `${invoice.client.address_line1}\n${invoice.client.postal_code} ${invoice.client.city}`
        : "";

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Briefkopf – wiederholt sich auf Folgeseiten */}
                <View style={styles.letterhead} fixed>
                    {/* React PDF's Image is a PDF primitive and has no HTML alt attribute. */}
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    {logo && <Image src={logo} style={styles.letterheadImage} />}
                    <View style={styles.letterheadName}>
                        <Text style={styles.practiceName}>
                            {company?.name || t("invoicePdf.company")}
                        </Text>
                        {company?.professional_title && (
                            <Text style={styles.practiceTitle}>{company.professional_title}</Text>
                        )}
                    </View>
                    <View style={styles.letterheadContact}>
                        <Text>{company?.address_line1}</Text>
                        {company?.address_line2 && <Text>{company.address_line2}</Text>}
                        <Text>
                            {company?.postal_code} {company?.city}
                        </Text>
                        {(company?.phone || company?.email || company?.website) && <Text> </Text>}
                        {company?.phone && <Text>Tel: {company.phone}</Text>}
                        {company?.email && <Text>Mail: {company.email}</Text>}
                        {company?.website && <Text>{company.website}</Text>}
                    </View>
                </View>

                {identifierSummary(invoice.e_invoice) && <View style={{ marginBottom: 16 }}><Text>{identifierSummary(invoice.e_invoice)}</Text></View>}

                {/* Empfänger (Fensterposition) und Rechnungskennung */}
                <View style={styles.addresses}>
                    <View style={styles.addressBlock}>
                        <Text style={styles.senderLine}>
                            {[company?.name, company?.address_line1, [company?.postal_code, company?.city].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}
                        </Text>
                        <Text style={styles.addressName}>
                            {invoice.client?.name || t("invoicePdf.unknown")}
                        </Text>
                        <Text style={styles.addressText}>{clientAddress}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.invoiceTitle}>{t("invoicePdf.invoiceTitle")}</Text>
                        <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
                    </View>
                </View>

                {/* Invoice Info */}
                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>{t("invoicePdf.invoiceDate")}</Text>
                        <Text style={styles.infoValue}>
                            {formatDateGerman(invoice.issue_date)}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>{t("invoicePdf.dueDate")}</Text>
                        <Text style={styles.infoValue}>
                            {invoice.due_date
                                ? formatDateGerman(invoice.due_date)
                                : "-"}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>{t("invoicePdf.currency")}</Text>
                        <Text style={styles.infoValue}>EUR</Text>
                    </View>
                </View>

                {/* Diagnosen (ICD-10-GM) */}
                {diagnoses.length > 0 && (
                    <View style={styles.diagnoses}>
                        <Text style={styles.infoLabel}>{diagnoses.length > 1 ? "DIAGNOSEN" : "DIAGNOSE"}</Text>
                        {diagnoses.map((d, i) => (
                            <Text key={i} style={styles.addressText}>
                                {formatDiagnosis(d, invoice.medical?.diagnosis_display ?? "both")}
                            </Text>
                        ))}
                    </View>
                )}

                {/* Leistungsaufstellung nach § 12 GOÄ */}
                {isMedical && (
                    <View style={styles.table}>
                        <View style={styles.tableHeader} fixed>
                            <Text style={[styles.colDate, styles.headerText]}>Datum</Text>
                            <Text style={[styles.colGoae, styles.headerText]}>GOÄ</Text>
                            <Text style={[styles.colDescription, styles.headerText]}>Leistung</Text>
                            <Text style={[styles.colFactor, styles.headerText]}>Faktor</Text>
                            <Text style={[styles.colQtySmall, styles.headerText]}>Anz.</Text>
                            {showVat && <Text style={[styles.colTax, styles.headerText]}>{t("invoicePdf.vat")}</Text>}
                            <Text style={[styles.colTotal, styles.headerText]}>Betrag</Text>
                        </View>
                        {sortForMedicalInvoice(items).map((item, index) => (
                            <View key={item.id || index} style={styles.tableRow} wrap={false}>
                                <Text style={styles.colDate}>
                                    {item.goae ? formatDateGerman(item.goae.service_date) : ""}
                                </Text>
                                <Text style={styles.colGoae}>{item.goae?.number ?? ""}</Text>
                                <View style={styles.colDescription}>
                                    <Text>{item.description}</Text>
                                    {item.goae?.justification && (
                                        <Text style={styles.justification}>Begründung: {item.goae.justification}</Text>
                                    )}
                                    {item.goae?.fee_agreement && (
                                        <Text style={styles.justification}>Gemäß Vereinbarung nach § 2 GOÄ</Text>
                                    )}
                                </View>
                                <Text style={styles.colFactor}>{item.goae ? formatFactor(item.goae.factor) : ""}</Text>
                                <Text style={styles.colQtySmall}>{item.quantity}</Text>
                                {showVat && <Text style={styles.colTax}>{item.tax_rate_percent}%</Text>}
                                <Text style={styles.colTotal}>{formatCurrency(item.total)}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Table */}
                {!isMedical && (
                <View style={styles.table}>
                    {/* Header */}
                    <View style={styles.tableHeader}>
                        <Text
                            style={[styles.colDescription, styles.headerText]}
                        >
                            {t("invoicePdf.description")}
                        </Text>
                        <Text style={[styles.colQuantity, styles.headerText]}>
                            {t("invoicePdf.quantity")}
                        </Text>
                        <Text style={[styles.colUnit, styles.headerText]}>
                            {t("invoicePdf.unit")}
                        </Text>
                        <Text style={[styles.colPrice, styles.headerText]}>
                            {t("invoicePdf.price")}
                        </Text>
                        <Text style={[styles.colTax, styles.headerText]}>
                            {t("invoicePdf.vat")}
                        </Text>
                        <Text style={[styles.colTotal, styles.headerText]}>
                            {t("invoicePdf.total")}
                        </Text>
                    </View>

                    {/* Rows */}
                    {(invoice.items || []).map(
                        (item: InvoiceItem, index: number) => (
                            <View
                                key={item.id || index}
                                style={styles.tableRow}
                            >
                                <Text style={styles.colDescription}>
                                    {item.description}{item.gtin ? `\nGTIN: ${item.gtin}` : ""}
                                </Text>
                                <Text style={styles.colQuantity}>
                                    {item.quantity}
                                </Text>
                                <Text style={styles.colUnit}>
                                    {item.unit_of_measure}
                                </Text>
                                <Text style={styles.colPrice}>
                                    {formatCurrency(item.price)}
                                </Text>
                                <Text style={styles.colTax}>
                                    {item.tax_rate_percent}%
                                </Text>
                                <Text style={styles.colTotal}>
                                    {formatCurrency(item.total)}
                                </Text>
                            </View>
                        )
                    )}
                </View>
                )}

                {/* Totals */}
                <View style={styles.totals}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>{t("invoicePdf.subtotal")}</Text>
                        <Text style={styles.totalValue}>
                            {formatCurrency(invoice.subtotal)}
                        </Text>
                    </View>
                    {showVat && <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>{t("invoicePdf.vatTotal")}</Text>
                        <Text style={styles.totalValue}>
                            {formatCurrency(invoice.total_vat)}
                        </Text>
                    </View>}
                    <View style={styles.totalFinal}>
                        <Text style={styles.totalFinalLabel}>
                            {t("invoicePdf.grandTotal")}
                        </Text>
                        <Text style={styles.totalFinalValue}>
                            {formatCurrency(invoice.total_gross)}
                        </Text>
                    </View>
                </View>

                {/* Notes */}
                {invoice.notes && (
                    <View style={styles.notes}>
                        <Text style={styles.notesLabel}>{t("invoicePdf.notes")}</Text>
                        <Text style={styles.notesText}>{invoice.notes}</Text>
                    </View>
                )}

                {/* Kleinunternehmer note (§19 UStG) */}
                {company?.is_small_business && (
                    <View style={styles.paymentTerms}>
                        <Text>
                            Gemäß §19 UStG wird keine Umsatzsteuer berechnet.
                        </Text>
                    </View>
                )}

                {/* Heilbehandlung: umsatzsteuerfrei */}
                {isMedical && !showVat && !company?.is_small_business && (
                    <View style={styles.paymentTerms}>
                        <Text>Ärztliche Heilbehandlung – umsatzsteuerfrei gemäß § 4 Nr. 14 UStG.</Text>
                    </View>
                )}

                {/* Payment Terms */}
                {paymentTerms && (
                    <View style={styles.paymentTerms}>
                        <Text>{paymentTerms}</Text>
                    </View>
                )}

                {/* Girocode: scan-to-pay QR (EPC069-12) */}
                {girocodeUrl && (
                    <View
                        wrap={false}
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            marginTop: 14,
                        }}
                    >
                        {/* eslint-disable-next-line jsx-a11y/alt-text */}
                        <Image
                            src={girocodeUrl}
                            style={{ width: 64, height: 64 }}
                        />
                        <View style={{ maxWidth: 240 }}>
                            <Text style={{ fontSize: 8, fontWeight: 700 }}>
                                Bequem bezahlen mit Girocode
                            </Text>
                            <Text style={{ fontSize: 7, color: "#555555" }}>
                                QR-Code mit Ihrer Banking-App scannen –
                                Empfänger, Betrag und Verwendungszweck werden
                                automatisch übernommen.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Grußformel mit Faksimile */}
                <View style={styles.closing} wrap={false}>
                    <Text>Mit freundlichen Grüßen</Text>
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    {signature ? <Image src={signature} style={styles.signature} /> : <View style={{ height: 36 }} />}
                    <Text style={styles.signatureName}>{company?.name}</Text>
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <View style={styles.footerDivider}>
                        <View style={styles.footerContent}>
                            <View style={styles.footerColumn}>
                                <Text style={styles.footerLabel}>{t("invoicePdf.contact")}</Text>
                                <Text style={styles.footerText}>
                                    {company?.email}
                                    {company?.phone && `\n${company.phone}`}
                                    {company?.website && `\n${company.website}`}
                                </Text>
                            </View>
                            <View style={styles.footerColumn}>
                                <Text style={styles.footerLabel}>
                                    {t("invoicePdf.bankDetails")}
                                </Text>
                                <Text style={styles.footerText}>
                                    {company?.bank_name}
                                    {company?.bank_iban &&
                                        `\nIBAN: ${company.bank_iban}`}
                                    {company?.bank_bic &&
                                        `\nBIC: ${company.bank_bic}`}
                                </Text>
                            </View>
                            <View style={styles.footerColumn}>
                                <Text style={styles.footerLabel}>{t("invoicePdf.tax")}</Text>
                                <Text style={styles.footerText}>
                                    {company?.vat_id &&
                                        `USt-IdNr.: ${company.vat_id}`}
                                    {company?.tax_number &&
                                        `\nSt.-Nr.: ${company.tax_number}`}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Page>
        </Document>
    );
};

/** Girocode (EPC-QR) as data URL – only for regular invoices with bank details. */
export async function buildGirocodeDataUrl(invoice: InvoiceWithDetails, company: UserCompany | null): Promise<string | null> {
    if (!company?.bank_iban || invoice.correction_type) return null;
    const payload = buildGirocodePayload({
        name: company.name,
        iban: company.bank_iban,
        bic: company.bank_bic,
        amount: invoice.total_gross,
        reference: `Rechnung ${invoice.invoice_number}`,
    });
    return payload ? QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, width: 256 }) : null;
}

/** Renders the invoice PDF in the browser. */
export async function renderInvoicePdfBlob(
    invoice: InvoiceWithDetails,
    company: UserCompany | null,
    t: (key: string) => string,
): Promise<Blob> {
    const girocodeUrl = await buildGirocodeDataUrl(invoice, company);
    return pdf(<InvoicePDF invoice={invoice} company={company} t={t} girocodeUrl={girocodeUrl} />).toBlob();
}

export const invoicePdfFileName = (invoice: InvoiceWithDetails): string =>
    `Rechnung_${invoice.invoice_number.replace(/[^\w.-]+/g, "_")}.pdf`;

const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });

/** Builds and downloads an Outlook-ready e-mail draft with the invoice PDF attached. */
export async function downloadInvoiceEmailDraft(
    invoice: InvoiceWithDetails,
    company: UserCompany | null,
    t: (key: string) => string,
): Promise<void> {
    const { buildEml, invoiceEmailBody, invoiceEmailSubject } = await import("@/lib/invoiceEmail");
    const pdfBlob = await renderInvoicePdfBlob(invoice, company, t);
    const fileName = invoicePdfFileName(invoice);
    const eml = buildEml({
        to: invoice.client?.email || undefined,
        subject: invoiceEmailSubject(invoice, company),
        body: invoiceEmailBody(invoice, company),
        attachment: { fileName, base64: await blobToBase64(pdfBlob) },
    });
    const url = URL.createObjectURL(new Blob([eml], { type: "message/rfc822" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.pdf$/, ".eml");
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
