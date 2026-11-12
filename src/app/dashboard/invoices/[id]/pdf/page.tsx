"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button, Space, message, Spin, Card } from "antd";
import {
    ArrowLeftOutlined,
    DownloadOutlined,
    PrinterOutlined,
} from "@ant-design/icons";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { buildGirocodeDataUrl, InvoicePDF, invoicePdfFileName } from "@/components/pdf/InvoicePDFDocument";
import { getInvoiceById } from "@/lib/invoiceService";
import { getCompanyInfo } from "@/lib/companyService";
import { useLanguage } from "@/contexts/LanguageContext";
import type { InvoiceWithDetails, UserCompany } from "@/types";

export default function InvoicePDFPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const invoiceId = params.id as string;
    const shouldPrint = searchParams.get("print") === "true";
    const { t } = useLanguage();

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

            setGirocodeUrl(invoiceData ? await buildGirocodeDataUrl(invoiceData, companyData) : null);
        } catch (error) {
            console.error("Error loading data:", error);
            message.error(t("invoicePdf.loadError"));
            router.push("/dashboard/invoices");
        } finally {
            setLoading(false);
        }
    };

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

    return (
        <div>
            {/* Toolbar - hidden when printing */}
            <Card
                style={{ marginBottom: 16 }}
                className="no-print"
                styles={{ body: { padding: "12px 24px" } }}
            >
                <Space
                    style={{ width: "100%", justifyContent: "space-between" }}
                >
                    <Space>
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
                    <Space>
                        <Button
                            icon={<PrinterOutlined />}
                            onClick={handlePrint}
                        >
                            {t("invoicePdf.print")}
                        </Button>
                        <PDFDownloadLink
                            document={
                                <InvoicePDF
                                    invoice={invoice}
                                    company={company}
                                    t={t}
                                    girocodeUrl={girocodeUrl}
                                />
                            }
                            fileName={invoicePdfFileName(invoice)}
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
                    <InvoicePDF invoice={invoice} company={company} t={t} girocodeUrl={girocodeUrl} />
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
