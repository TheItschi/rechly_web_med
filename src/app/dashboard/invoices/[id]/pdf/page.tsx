"use client";
import { identifierSummary } from "@/lib/eRechnung/identifierSummary";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button, Space, message, Spin, Card, Alert, Segmented } from "antd";
import {
    ArrowLeftOutlined,
    DownloadOutlined,
    PrinterOutlined,
    GlobalOutlined,
    FileTextOutlined,
} from "@ant-design/icons";
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    PDFViewer,
    PDFDownloadLink,
    Image,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import { buildGirocodePayload } from "@/lib/girocode";
import { getInvoiceById } from "@/lib/invoiceService";
import { getCompanyInfo } from "@/lib/companyService";
import { formatCurrency } from "@/lib/currencyUtils";
import { formatDateGerman } from "@/lib/dateUtils";
import { isPdfSafeLogo } from "@/lib/companyLogo";
import { useLanguage, getTranslation, Language } from "@/contexts/LanguageContext";
import type { InvoiceWithDetails, UserCompany, InvoiceItem } from "@/types";

const styles = StyleSheet.create({
    page: {
        padding: 40,
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
    language?: Language;
}

const InvoicePDF = ({
    invoice,
    company,
    t,
    girocodeUrl,
    language = "de",
}: InvoicePDFProps) => {
    const clientAddress = invoice.client
        ? `${invoice.client.address_line1}\n${invoice.client.postal_code} ${invoice.client.city}`
        : "";

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.companyInfo}>
                        <Text style={styles.companyName}>
                            {company?.name || t("invoicePdf.company")}
                        </Text>
                        <Text style={styles.addressText}>
                            {company?.address_line1}
                            {company?.address_line2 &&
                                `\n${company.address_line2}`}
                        </Text>
                        <Text style={styles.addressText}>
                            {company?.postal_code} {company?.city}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.invoiceTitle}>{t("invoicePdf.invoiceTitle")}</Text>
                        <Text style={styles.invoiceNumber}>
                            {invoice.invoice_number}
                        </Text>
                    </View>
                </View>

                {/* React PDF's Image is a PDF primitive and has no HTML alt attribute. */}
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                {isPdfSafeLogo(company?.logo_base64) && <Image src={company!.logo_base64} style={{ width: 100, maxHeight: 60, objectFit: "contain", marginBottom: 12 }} />}
                {identifierSummary(invoice.e_invoice) && <View style={{ marginBottom: 16 }}><Text>{identifierSummary(invoice.e_invoice)}</Text></View>}
                {/* Addresses */}
                <View style={styles.addresses}>
                    <View style={styles.addressBlock}>
                        <Text style={styles.addressLabel}>
                            {t("invoicePdf.recipient")}
                        </Text>
                        <Text style={styles.addressName}>
                            {invoice.client?.name || t("invoicePdf.unknown")}
                        </Text>
                        <Text style={styles.addressText}>{clientAddress}</Text>
                        {invoice.client?.email && (
                            <Text style={styles.addressText}>
                                {invoice.client.email}
                            </Text>
                        )}
                    </View>
                    <View style={styles.addressBlock}>
                        <Text style={styles.addressLabel}>
                            {t("invoicePdf.sender")}
                        </Text>
                        <Text style={styles.addressName}>{company?.name}</Text>
                        <Text style={styles.addressText}>
                            {company?.address_line1}
                            {"\n"}
                            {company?.postal_code} {company?.city}
                        </Text>
                        {company?.email && (
                            <Text style={styles.addressText}>
                                {company.email}
                            </Text>
                        )}
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

                {/* Table */}
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

                {/* Totals */}
                <View style={styles.totals}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>{t("invoicePdf.subtotal")}</Text>
                        <Text style={styles.totalValue}>
                            {formatCurrency(invoice.subtotal)}
                        </Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>{t("invoicePdf.vatTotal")}</Text>
                        <Text style={styles.totalValue}>
                            {formatCurrency(invoice.total_vat)}
                        </Text>
                    </View>
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
                            {language === "en"
                                ? "No VAT is charged according to § 19 UStG (small business regulation)."
                                : "Gemäß §19 UStG wird keine Umsatzsteuer berechnet."}
                        </Text>
                    </View>
                )}

                {/* Payment Terms */}
                {company?.payment_terms_default && (
                    <View style={styles.paymentTerms}>
                        <Text>{company.payment_terms_default}</Text>
                    </View>
                )}

                {/* Girocode: scan-to-pay QR (EPC069-12) */}
                {girocodeUrl && (
                    <View
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
                                {language === "en"
                                    ? "Convenient payment with GiroCode"
                                    : "Bequem bezahlen mit Girocode"}
                            </Text>
                            <Text style={{ fontSize: 7, color: "#555555" }}>
                                {language === "en"
                                    ? "Scan QR code with your banking app – recipient, amount and reference are transferred automatically."
                                    : "QR-Code mit Ihrer Banking-App scannen – Empfänger, Betrag und Verwendungszweck werden automatisch übernommen."}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
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

export default function InvoicePDFPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const invoiceId = params.id as string;
    const shouldPrint = searchParams.get("print") === "true";
    const { language: currentLang } = useLanguage();
    const [pdfLanguage, setPdfLanguage] = useState<Language>(
        (currentLang as Language) || "de",
    );
    const t = useCallback(
        (key: string) => getTranslation(pdfLanguage, key),
        [pdfLanguage],
    );

    const [loading, setLoading] = useState(true);
    const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
    const [company, setCompany] = useState<UserCompany | null>(null);
    const [girocodeUrl, setGirocodeUrl] = useState<string | null>(null);

    useEffect(() => {
        if (invoiceId) {
            loadData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invoiceId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [invoiceData, companyData] = await Promise.all([
                getInvoiceById(invoiceId),
                getCompanyInfo(),
            ]);
            setInvoice(invoiceData);
            setCompany(companyData);
        } catch (error) {
            console.error("Error loading data:", error);
            message.error(t("invoicePdf.loadError"));
            router.push("/dashboard/invoices");
        } finally {
            setLoading(false);
        }
    };

    // Regenerate GiroCode when invoice, company, or PDF language changes
    useEffect(() => {
        if (
            !invoice ||
            !company?.bank_iban ||
            invoice.correction_type ||
            invoice.total_gross <= 0
        ) {
            setGirocodeUrl(null);
            return;
        }

        const refPrefix = pdfLanguage === "en" ? "Invoice" : "Rechnung";
        const payload = buildGirocodePayload({
            name: company.name,
            iban: company.bank_iban,
            bic: company.bank_bic,
            amount: invoice.total_gross,
            reference: `${refPrefix} ${invoice.invoice_number}`,
        });

        if (payload) {
            QRCode.toDataURL(payload, {
                errorCorrectionLevel: "M",
                margin: 1,
                width: 256,
            })
                .then((url) => setGirocodeUrl(url))
                .catch((err) => {
                    console.error("QR Code generation error:", err);
                    setGirocodeUrl(null);
                });
        } else {
            setGirocodeUrl(null);
        }
    }, [invoice, company, pdfLanguage]);

    const handlePrint = useCallback(() => {
        window.print();
    }, []);

    useEffect(() => {
        if (!loading && invoice && shouldPrint) {
            // Delay to ensure PDF is rendered
            setTimeout(handlePrint, 1000);
        }
    }, [loading, invoice, shouldPrint, handlePrint]);

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: 50 }}>
                <Spin size="large" />
                <p>{t("invoicePdf.loading")}</p>
            </div>
        );
    }

    if (!invoice) {
        return null;
    }

    const downloadFileName = `${
        pdfLanguage === "en" ? "Invoice" : "Rechnung"
    }_${invoice.invoice_number}.pdf`;

    return (
        <div>
            {/* Informative notice if IBAN is missing for GiroCode */}
            {!company?.bank_iban && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    className="no-print"
                    message={
                        pdfLanguage === "en"
                            ? "GiroCode not included on this invoice"
                            : "Kein GiroCode auf dieser Rechnung"
                    }
                    description={
                        <span>
                            {pdfLanguage === "en"
                                ? "A GiroCode (SEPA QR payment code) could not be generated because no IBAN is configured in your company settings. Add your IBAN under Settings > Bank Details to automatically include a GiroCode on your invoices."
                                : "Auf dieser Rechnung wird kein GiroCode (SEPA-QR-Code) angezeigt, da in den Unternehmenseinstellungen noch keine IBAN hinterlegt ist. Hinterlegen Sie Ihre IBAN in den Einstellungen unter Bankverbindung, um den GiroCode automatisch einzubinden."}
                        </span>
                    }
                    action={
                        <Button
                            size="small"
                            type="primary"
                            onClick={() => router.push("/dashboard/settings")}
                        >
                            {pdfLanguage === "en"
                                ? "Configure IBAN"
                                : "IBAN hinterlegen"}
                        </Button>
                    }
                />
            )}

            {/* Toolbar - hidden when printing */}
            <Card
                style={{ marginBottom: 16 }}
                className="no-print"
                styles={{ body: { padding: "12px 24px" } }}
            >
                <Space
                    style={{ width: "100%", justifyContent: "space-between" }}
                    wrap
                >
                    <Space wrap>
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={() =>
                                router.push(`/dashboard/invoices/${invoiceId}`)
                            }
                        >
                            {t("invoicePdf.back")}
                        </Button>
                        <span style={{ fontWeight: 500 }}>
                            PDF: {invoice.invoice_number}
                        </span>
                    </Space>

                    <Space wrap>
                        {/* Language Switcher for Invoice */}
                        <Space size={6}>
                            <GlobalOutlined style={{ color: "#666" }} />
                            <span style={{ fontSize: 13, color: "#666" }}>
                                {pdfLanguage === "en" ? "Language:" : "Sprache:"}
                            </span>
                            <Segmented<Language>
                                value={pdfLanguage}
                                onChange={(val) => setPdfLanguage(val)}
                                options={[
                                    { label: "Deutsch", value: "de" },
                                    { label: "English", value: "en" },
                                ]}
                            />
                        </Space>

                        <Button
                            icon={<PrinterOutlined />}
                            onClick={handlePrint}
                        >
                            {t("invoicePdf.print")}
                        </Button>
                        <Button
                            icon={<FileTextOutlined />}
                            onClick={() =>
                                window.open(
                                    `/api/invoices/${invoiceId}/xrechnung`,
                                    "_blank",
                                )
                            }
                            title="XRechnung 3.0 XML herunterladen"
                        >
                            XRechnung (XML)
                        </Button>
                        <PDFDownloadLink
                            document={
                                <InvoicePDF
                                    invoice={invoice}
                                    company={company}
                                    t={t}
                                    girocodeUrl={girocodeUrl}
                                    language={pdfLanguage}
                                />
                            }
                            fileName={downloadFileName}
                        >
                            {({ loading: pdfLoading }) => (
                                <Button
                                    type="primary"
                                    icon={<DownloadOutlined />}
                                    loading={pdfLoading}
                                >
                                    {t("invoicePdf.download")}
                                </Button>
                            )}
                        </PDFDownloadLink>
                    </Space>
                </Space>
            </Card>

            {/* PDF Viewer */}
            <div style={{ height: "calc(100vh - 200px)", minHeight: 600 }}>
                <PDFViewer width="100%" height="100%" showToolbar={false}>
                    <InvoicePDF
                        invoice={invoice}
                        company={company}
                        t={t}
                        girocodeUrl={girocodeUrl}
                        language={pdfLanguage}
                    />
                </PDFViewer>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    .ant-layout-sider,
                    .ant-layout-header {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
