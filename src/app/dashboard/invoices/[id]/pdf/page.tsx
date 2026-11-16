"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button, Space, message, Spin, Card } from "antd";
import {
    ArrowLeftOutlined,
    DownloadOutlined,
    PrinterOutlined,
} from "@ant-design/icons";
import { PDFViewer, PDFDownloadLink, pdf } from "@react-pdf/renderer";
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
    const [printing, setPrinting] = useState(false);
    const printFrameRef = useRef<HTMLIFrameElement | null>(null);
    const autoPrintedRef = useRef(false);

    // Remove the hidden print frame and its blob URL when leaving the page.
    useEffect(() => () => {
        const frame = printFrameRef.current;
        if (frame) {
            URL.revokeObjectURL(frame.src);
            frame.remove();
        }
    }, []);

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

    // Print the generated PDF itself, not the HTML page around the viewer:
    // window.print() would only print the embedded viewer as a cropped image.
    const handlePrint = useCallback(async () => {
        if (!invoice) return;
        setPrinting(true);
        try {
            const blob = await pdf(<InvoicePDF invoice={invoice} company={company} t={t} girocodeUrl={girocodeUrl} />).toBlob();
            const url = URL.createObjectURL(blob);
            const old = printFrameRef.current;
            if (old) {
                URL.revokeObjectURL(old.src);
                old.remove();
            }
            const frame = document.createElement("iframe");
            frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
            frame.onload = () => {
                try {
                    frame.contentWindow?.focus();
                    frame.contentWindow?.print();
                } catch {
                    // Browser does not allow printing the embedded PDF: open it instead.
                    window.open(url, "_blank");
                }
                setPrinting(false);
            };
            frame.src = url;
            document.body.appendChild(frame);
            printFrameRef.current = frame;
        } catch (error) {
            console.error("Error printing PDF:", error);
            message.error(t("invoicePdf.loadError"));
            setPrinting(false);
        }
    }, [invoice, company, t, girocodeUrl]);

    useEffect(() => {
        if (!loading && invoice && shouldPrint && !autoPrintedRef.current) {
            autoPrintedRef.current = true;
            void handlePrint();
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
                            loading={printing}
                            onClick={() => void handlePrint()}
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
