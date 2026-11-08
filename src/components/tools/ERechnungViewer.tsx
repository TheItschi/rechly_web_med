"use client";

import React, { useState } from "react";
import { Upload, Button, Alert, Card, Typography, Modal } from "antd";
import {
    InboxOutlined,
    FileTextOutlined,
    QrcodeOutlined,
    DownloadOutlined,
    CheckCircleOutlined } from "@ant-design/icons";
import { parseEInvoiceXml, extractZugferdXmlFromPdfBytes } from "@/lib/eInvoiceParserClient";
import type { ParsedEInvoice } from "@/lib/eInvoiceParser";
import Link from "next/link";

const { Text } = Typography;
const { Dragger } = Upload;

export default function ERechnungViewer() {
    const [, setLoading] = useState(false);
    const [fileName, setFileName] = useState<string>("");
    const [parsedData, setParsedData] = useState<ParsedEInvoice | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [rawXml, setRawXml] = useState<string>("");
    const [showRawModal, setShowRawModal] = useState(false);

    const handleFile = async (file: File) => {
        setLoading(true);
        setErrorMsg(null);
        setFileName(file.name);

        try {
            const isPdf = file.name.toLowerCase().endsWith(".pdf");
            let xmlContent = "";

            if (isPdf) {
                const arrayBuffer = await file.arrayBuffer();
                const bytes = new Uint8Array(arrayBuffer);
                const extractedXml = extractZugferdXmlFromPdfBytes(bytes);
                if (!extractedXml) {
                    throw new Error(
                        "In dieser PDF-Datei konnte keine eingebettete ZUGFeRD/Factur-X-XML-Datei gefunden werden. Handelt es sich um eine reine Bild-PDF?"
                    );
                }
                xmlContent = extractedXml;
            } else {
                xmlContent = await file.text();
            }

            setRawXml(xmlContent);
            const parsed = parseEInvoiceXml(xmlContent);
            if (!parsed.invoice_number && !parsed.amount_gross && !parsed.vendor_name) {
                throw new Error(
                    "Das XML-Dokument entspricht keinem bekannten Standard nach EN 16931 (weder UBL noch CII XRechnung)."
                );
            }

        } catch (err: unknown) {
            console.error("E-Invoice parsing error:", err);
            const message = err instanceof Error ? err.message : "Fehler beim Lesen der E-Rechnungsdatei.";
            setErrorMsg(message);
            setParsedData(null);
        } finally {
            setLoading(false);
        }
    };

    const exportCsv = () => {
        if (!parsedData) return;
        const headers = ["Rechnungsnummer", "Datum", "Verkäufer", "Netto EUR", "USt EUR", "Brutto EUR", "Steuersatz"];
        const row = [
            `"${parsedData.invoice_number || ""}"`,
            `"${parsedData.date || ""}"`,
            `"${parsedData.vendor_name || ""}"`,
            (parsedData.amount_net ?? "").toString(),
            (parsedData.vat_amount ?? "").toString(),
            (parsedData.amount_gross ?? "").toString(),
            (parsedData.vat_rate_percent ?? "").toString(),
        ];
        const csvContent = "\uFEFF" + headers.join(";") + "\n" + row.join(";");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `E-Rechnung_${parsedData.invoice_number || "export"}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            {/* Upload Area */}
            <Dragger
                accept=".xml,.pdf"
                multiple={false}
                showUploadList={false}
                beforeUpload={(file) => {
                    handleFile(file);
                    return false;
                }}
                style={{
                    padding: "32px 16px",
                    background: "#f8fafc",
                    border: "2px dashed #cbd5e1",
                    borderRadius: 12,
                    marginBottom: 24 }}
            >
                <p className="ant-upload-drag-icon" style={{ marginBottom: 12 }}>
                    <InboxOutlined style={{ fontSize: 44, color: "#2563eb" }} />
                </p>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: "0 0 6px 0" }}>
                    XRechnung (.xml) oder ZUGFeRD (.pdf) hier ablegen oder auswählen
                </p>
                <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
                    100% lokal im Browser: Deine sensiblen Finanzdaten verlassen zu keinem Zeitpunkt dein Gerät.
                </p>
            </Dragger>

            {errorMsg && (
                <Alert
                    type="error"
                    showIcon
                    message="Validierungsfehler"
                    description={errorMsg}
                    style={{ marginBottom: 24, borderRadius: 8 }}
                />
            )}

            {/* Parsed Result View */}
            {parsedData && (
                <div style={{ display: "grid", gap: 24 }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 12,
                            background: "#ecfdf5",
                            padding: "16px 20px",
                            borderRadius: 10,
                            border: "1px solid #a7f3d0" }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <CheckCircleOutlined style={{ color: "#059669", fontSize: 20 }} />
                            <div>
                                <span style={{ fontWeight: 700, color: "#065f46" }}>
                                    E-Rechnung erfolgreich validiert:
                                </span>{" "}
                                <span style={{ color: "#047857" }}>{fileName}</span>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                            <Button icon={<FileTextOutlined />} onClick={() => setShowRawModal(true)}>
                                Roh-XML ansehen
                            </Button>
                            <Button icon={<DownloadOutlined />} onClick={exportCsv}>
                                Als CSV exportieren
                            </Button>
                        </div>
                    </div>

                    {/* Key Metrics Grid */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: 16 }}
                    >
                        <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                            <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                                Rechnungsnummer
                            </Text>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                                {parsedData.invoice_number || "–"}
                            </div>
                        </Card>

                        <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                            <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                                Rechnungsdatum
                            </Text>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                                {parsedData.date || "–"}
                            </div>
                        </Card>

                        <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                            <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                                Nettobetrag
                            </Text>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                                {parsedData.amount_net !== undefined
                                    ? `${parsedData.amount_net.toFixed(2)} €`
                                    : "–"}
                            </div>
                        </Card>

                        <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                            <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                                Gesamtbetrag (Brutto)
                            </Text>
                            <div style={{ fontSize: 20, fontWeight: 900, color: "#2563eb", marginTop: 4 }}>
                                {parsedData.amount_gross !== undefined
                                    ? `${parsedData.amount_gross.toFixed(2)} €`
                                    : "–"}
                            </div>
                        </Card>
                    </div>

                    {/* Details  */}
                    <Card
                        title="Rechnungsdetails & Pflichtangaben (§ 14 UStG / EN 16931)"
                        style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}
                    >
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                            <div>
                                <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: "#64748b" }}>
                                    Rechnungssteller (Verkäufer / Auftragnehmer)
                                </h4>
                                <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                                    {parsedData.vendor_name || "Nicht angegeben"}
                                </div>
                                {parsedData.description && (
                                    <div style={{ marginTop: 8, fontSize: 14, color: "#475569" }}>
                                        <strong>Leistungsbeschreibung:</strong> {parsedData.description}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: "#64748b" }}>
                                    Steuerliche Aufschlüsselung
                                </h4>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>
                                    <div>
                                        <strong>Steuersatz:</strong>{" "}
                                        {parsedData.vat_rate_percent !== undefined
                                            ? `${parsedData.vat_rate_percent}%`
                                            : "0% / nicht angegeben"}
                                    </div>
                                    <div>
                                        <strong>Umsatzsteuer:</strong>{" "}
                                        {parsedData.vat_amount !== undefined
                                            ? `${parsedData.vat_amount.toFixed(2)} €`
                                            : "0,00 €"}
                                    </div>
                                    <div>
                                        <strong>Fälliger Betrag:</strong>{" "}
                                        {parsedData.amount_gross !== undefined
                                            ? `${parsedData.amount_gross.toFixed(2)} €`
                                            : "–"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Girocode Action Trigger */}
                        {parsedData.amount_gross && (
                            <div
                                style={{
                                    marginTop: 24,
                                    paddingTop: 20,
                                    borderTop: "1px solid #e2e8f0",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    flexWrap: "wrap",
                                    gap: 12 }}
                            >
                                <div>
                                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                                        Rechnung sofort bezahlen per Bank-App?
                                    </h4>
                                    <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                                        Erstelle mit einem Klick einen GiroCode (EPC-QR-Code) für diese E-Rechnung.
                                    </p>
                                </div>
                                <Link
                                    href={`/tools/girocode-generator?amount=${parsedData.amount_gross}&recipient=${encodeURIComponent(
                                        parsedData.vendor_name || ""
                                    )}&reference=${encodeURIComponent(parsedData.invoice_number || "")}`}
                                >
                                    <Button type="primary" icon={<QrcodeOutlined />} style={{ background: "#2563eb" }}>
                                        GiroCode generieren
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* Raw XML Modal */}
            <Modal
                title={`Roh-XML: ${fileName}`}
                open={showRawModal}
                onOk={() => setShowRawModal(false)}
                onCancel={() => setShowRawModal(false)}
                width={800}
                footer={[
                    <Button key="close" onClick={() => setShowRawModal(false)}>
                        Schließen
                    </Button>,
                ]}
            >
                <pre
                    style={{
                        background: "#0f172a",
                        color: "#f8fafc",
                        padding: 16,
                        borderRadius: 8,
                        maxHeight: 500,
                        overflow: "auto",
                        fontSize: 12,
                        lineHeight: 1.5 }}
                >
                    {rawXml}
                </pre>
            </Modal>
        </div>
    );
}
