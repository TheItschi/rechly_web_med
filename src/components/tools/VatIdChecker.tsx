"use client";

import React, { useState } from "react";
import { Input, Button, Card, Typography, Alert, Tag, Divider } from "antd";
import {
    SearchOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    PrinterOutlined,
    FileProtectOutlined,
    UserAddOutlined } from "@ant-design/icons";
import Link from "next/link";

const { Text } = Typography;

interface VatValidationResponse {
    valid: boolean;
    countryCode?: string;
    vatNumber?: string;
    name?: string;
    address?: string;
    requestDate?: string;
    consultationNumber?: string;
    error?: string;
    message?: string;
}

export default function VatIdChecker() {
    const [vatIdInput, setVatIdInput] = useState<string>("DE301548123");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<VatValidationResponse | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleCheck = async () => {
        const clean = vatIdInput.trim().toUpperCase().replace(/[\s\.\-]/g, "");
        if (!clean) {
            setErrorMsg("Bitte eine Umsatzsteuer-Identifikationsnummer eingeben.");
            return;
        }

        setLoading(true);
        setErrorMsg(null);
        setResult(null);

        try {
            const res = await fetch("/api/public/validate-vat-id", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vat_id: clean }) });

            const data: VatValidationResponse = await res.json();
            if (!res.ok) {
                setErrorMsg(data.message || "Fehler bei der Abfrage. Bitte später erneut versuchen.");
            } else {
                setResult(data);
                if (!data.valid && data.message) {
                    setErrorMsg(data.message);
                }
            }
        } catch {
            setErrorMsg("Netzwerkfehler. Bitte Internetverbindung prüfen.");
        } finally {
            setLoading(false);
        }
    };

    const handlePrintCertificate = () => {
        if (typeof window !== "undefined") {
            window.print();
        }
    };

    return (
        <div>
            {/* Input & Search Section */}
            <div style={{ maxWidth: 640, marginBottom: 28 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#334155" }}>
                    EU-Umsatzsteuer-Identifikationsnummer (USt-IdNr. / UID)
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                    <Input
                        placeholder="z. B. DE123456789, ATU12345678, FR12345678901"
                        value={vatIdInput}
                        onChange={(e) => setVatIdInput(e.target.value.toUpperCase())}
                        size="large"
                        onPressEnter={handleCheck}
                        style={{ fontFamily: "monospace", fontSize: 16 }}
                    />
                    <Button
                        type="primary"
                        icon={<SearchOutlined />}
                        size="large"
                        onClick={handleCheck}
                        loading={loading}
                        style={{ background: "#2563eb", padding: "0 24px" }}
                    >
                        Prüfen
                    </Button>
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                    Live-Abfrage über das offizielle Mehrwertsteuer-Informationsaustauschsystem (VIES / MIAS) der EU-Kommission.
                </div>
            </div>

            {errorMsg && (
                <Alert
                    type="warning"
                    showIcon
                    message="Hinweis zur USt-IdNr.-Prüfung"
                    description={errorMsg}
                    style={{ marginBottom: 24, borderRadius: 8 }}
                />
            )}

            {/* Validation Result Certificate */}
            {result && (
                <div style={{ display: "grid", gap: 24 }}>
                    <Card
                        style={{
                            borderRadius: 12,
                            border: result.valid ? "2px solid #10b981" : "2px solid #ef4444",
                            background: result.valid ? "#f0fdf4" : "#fef2f2",
                            boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
                    >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                {result.valid ? (
                                    <CheckCircleOutlined style={{ fontSize: 36, color: "#059669" }} />
                                ) : (
                                    <CloseCircleOutlined style={{ fontSize: 36, color: "#dc2626" }} />
                                )}
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#0f172a" }}>
                                            {result.countryCode} {result.vatNumber}
                                        </h3>
                                        <Tag color={result.valid ? "success" : "error"} style={{ fontWeight: 700, fontSize: 13, padding: "2px 8px" }}>
                                            {result.valid ? "GÜLTIG (VALID)" : "UNGÜLTIG (INVALID)"}
                                        </Tag>
                                    </div>
                                    <p style={{ margin: "4px 0 0 0", color: "#475569", fontSize: 14 }}>
                                        {result.valid
                                            ? "Die USt-IdNr. ist im VIES-System der Europäischen Kommission aktiv registriert."
                                            : "Diese USt-IdNr. existiert nicht oder ist für den innergemeinschaftlichen Waren-/Dienstleistungsverkehr gesperrt."}
                                    </p>
                                </div>
                            </div>

                            {result.valid && (
                                <Button
                                    icon={<PrinterOutlined />}
                                    onClick={handlePrintCertificate}
                                    style={{ background: "#ffffff" }}
                                >
                                    Amtlichen Beleg drucken
                                </Button>
                            )}
                        </div>

                        {result.valid && (
                            <>
                                <Divider style={{ margin: "20px 0" }} />

                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                                            Amtlicher Unternehmensname
                                        </Text>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
                                            {result.name || "Vom Mitgliedstaat nicht offengelegt (Standard in DE)"}
                                        </div>
                                    </div>

                                    <div>
                                        <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                                            Registrierte Adresse
                                        </Text>
                                        <div style={{ fontSize: 15, color: "#334155", marginTop: 4, whiteSpace: "pre-line" }}>
                                            {result.address || "Nicht übermittelt"}
                                        </div>
                                    </div>

                                    <div>
                                        <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                                            Abfragezeitpunkt (Audit Timestamp)
                                        </Text>
                                        <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 600, marginTop: 4 }}>
                                            {result.requestDate ? new Date(result.requestDate).toLocaleString("de-DE") : "–"}
                                        </div>
                                        {result.consultationNumber && (
                                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                                                Konsultations-ID: {result.consultationNumber}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div
                                    style={{
                                        marginTop: 20,
                                        background: "#ffffff",
                                        borderRadius: 8,
                                        padding: "12px 16px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: 13,
                                        color: "#334155",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10 }}
                                >
                                    <FileProtectOutlined style={{ fontSize: 20, color: "#2563eb" }} />
                                    <span>
                                        <strong>Aufbewahrungsnachweis für das Finanzamt:</strong> Drucke diesen Beleg aus oder
                                        speichere ihn als PDF. Gemäß § 14b UStG musst du den Nachweis für steuerfreie
                                        Auslandslieferungen (§ 6a UStG / § 13b UStG) 10 Jahre archivieren.
                                    </span>
                                </div>
                            </>
                        )}
                    </Card>

                    {/* Cross-Tool Chaining Action */}
                    {result.valid && (
                        <div
                            style={{
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                padding: "20px 24px",
                                borderRadius: 10,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 12 }}
                        >
                            <div>
                                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                                    Kunden mit USt-IdNr. direkt in Rechly abrechnen?
                                </h4>
                                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                                    Rechly erstellt automatisch konforme Rechnungen mit steuerfreiem Reverse-Charge-Hinweis nach § 13b UStG.
                                </p>
                            </div>
                            <Link href="/register">
                                <Button type="primary" icon={<UserAddOutlined />} style={{ background: "#2563eb" }}>
                                    Kunde in Rechly anlegen
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
