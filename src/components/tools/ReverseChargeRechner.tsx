"use client";

import React, { useState, useMemo } from "react";
import { Radio, Card, Button, Tag, Alert, message } from "antd";
import {
    CopyOutlined,
    CheckOutlined } from "@ant-design/icons";
import {
    evaluateReverseCharge,
    RecipientLocation,
    RecipientType,
    ServiceType } from "@/lib/tools/reverseCharge";
import Link from "next/link";


export default function ReverseChargeRechner() {
    const [recipientLocation, setRecipientLocation] = useState<RecipientLocation>("eu");
    const [recipientType, setRecipientType] = useState<RecipientType>("b2b");
    const [serviceType, setServiceType] = useState<ServiceType>("digital_consulting");
    const [countryName] = useState<string>("Frankreich");
    const [copiedDe, setCopiedDe] = useState<boolean>(false);
    const [copiedEn, setCopiedEn] = useState<boolean>(false);

    const evaluation = useMemo(() => {
        return evaluateReverseCharge({
            recipientLocation,
            recipientType,
            serviceType,
            countryName });
    }, [recipientLocation, recipientType, serviceType, countryName]);

    const copyDe = () => {
        navigator.clipboard.writeText(evaluation.mandatoryInvoiceNoteDe);
        setCopiedDe(true);
        message.success("Deutscher Pflichttext kopiert!");
        setTimeout(() => setCopiedDe(false), 3000);
    };

    const copyEn = () => {
        navigator.clipboard.writeText(evaluation.mandatoryInvoiceNoteEn);
        setCopiedEn(true);
        message.success("Englischer Pflichttext kopiert!");
        setTimeout(() => setCopiedEn(false), 3000);
    };

    return (
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "16px 8px" }}>
            {/* Step Configuration Wizard */}
            <Card style={{ marginBottom: 24, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                    {/* Step 1: Location */}
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: 8, color: "#334155" }}>
                            1. Wo sitzt Ihr Auftraggeber?
                        </div>
                        <Radio.Group
                            value={recipientLocation}
                            onChange={(e) => setRecipientLocation(e.target.value)}
                            buttonStyle="solid"
                            style={{ display: "flex", flexDirection: "column", gap: 8 }}
                        >
                            <Radio.Button value="germany">Deutschland (Inland)</Radio.Button>
                            <Radio.Button value="eu">EU-Ausland (z. B. Frankreich, Österreich, Spanien)</Radio.Button>
                            <Radio.Button value="third_country">Drittland (z. B. Schweiz, USA, UK)</Radio.Button>
                        </Radio.Group>
                    </div>

                    {/* Step 2: Customer Type */}
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: 8, color: "#334155" }}>
                            2. Handelt es sich um B2B oder B2C?
                        </div>
                        <Radio.Group
                            value={recipientType}
                            onChange={(e) => setRecipientType(e.target.value)}
                            buttonStyle="solid"
                            style={{ display: "flex", flexDirection: "column", gap: 8 }}
                        >
                            <Radio.Button value="b2b">
                                Unternehmen / B2B (mit gültiger USt-IdNr.)
                            </Radio.Button>
                            <Radio.Button value="b2c">
                                Endverbraucher / Privatkunde (B2C)
                            </Radio.Button>
                        </Radio.Group>
                    </div>

                    {/* Step 3: Service Type */}
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: 8, color: "#334155" }}>
                            3. Art der erbrachten Leistung:
                        </div>
                        <Radio.Group
                            value={serviceType}
                            onChange={(e) => setServiceType(e.target.value)}
                            buttonStyle="solid"
                            style={{ display: "flex", flexDirection: "column", gap: 8 }}
                        >
                            <Radio.Button value="digital_consulting">
                                IT, Beratung, Design, Software (Sonstige Leistung)
                            </Radio.Button>
                            <Radio.Button value="construction">
                                Bauleistung / Handwerk an Grundstück (§ 13b)
                            </Radio.Button>
                            <Radio.Button value="goods">
                                Physische Warenlieferung
                            </Radio.Button>
                        </Radio.Group>
                    </div>
                </div>
            </Card>

            {/* Evaluation Results Card */}
            <Card
                style={{
                    borderRadius: 12,
                    border: evaluation.vatRatePercent === 0 ? "1px solid #bbf7d0" : "1px solid #bfdbfe",
                    background: evaluation.vatRatePercent === 0 ? "#f0fdf4" : "#eff6ff",
                    marginBottom: 24 }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                    <div>
                        <Tag
                            color={evaluation.vatRatePercent === 0 ? "green" : "blue"}
                            style={{ fontSize: 13, padding: "4px 10px", fontWeight: 700 }}
                        >
                            {evaluation.vatRatePercent === 0
                                ? "REVERSE CHARGE / NETTO (0 % USt)"
                                : "REGULÄRE UMSATZSTEUER (19 %)"}
                        </Tag>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "12px 0 6px" }}>
                            {evaluation.vatRatePercent === 0
                                ? "Keine deutsche Umsatzsteuer ausweisen"
                                : "Deutsche Umsatzsteuer mit 19 % berechnen"}
                        </h2>
                        <div style={{ fontSize: 14, color: "#334155", maxWidth: 700 }}>
                            {evaluation.explanation}
                        </div>
                    </div>

                    <div style={{ background: "#ffffff", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0", minWidth: 220 }}>
                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>ELSTER-Kennziffer</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#2563eb", marginTop: 2 }}>
                            {evaluation.elsterKennziffer}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>Meldepflicht</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: evaluation.reportingZmRequired ? "#dc2626" : "#059669" }}>
                            {evaluation.reportingZmRequired ? "Zusammenfassende Meldung (ZM)" : "Keine ZM-Meldung"}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Mandatory Invoice Clauses Box */}
            <Card
                title="Gesetzliche Pflichtangaben für Ihre Rechnung"
                style={{ borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 24 }}
            >
                {evaluation.requiredVatIdDebtor && (
                    <Alert
                        type="warning"
                        showIcon
                        message="Qualifizierte Prüfung der USt-IdNr. zwingend erforderlich!"
                        description={
                            <div>
                                Im EU-B2B-Verkehr müssen Sie die ausländische Umsatzsteuer-Identifikationsnummer Ihres
                                Kunden vor der Rechnungsstellung zwingend im VIES-System prüfen und den Nachweis 10 Jahre aufbewahren.
                                <div style={{ marginTop: 8 }}>
                                    <Link href="/tools/ust-idnr-pruefen" style={{ fontWeight: 600, color: "#2563eb" }}>
                                        Jetzt USt-IdNr. kostenlos im Rechly VIES-Prüfer verifizieren →
                                    </Link>
                                </div>
                            </div>
                        }
                        style={{ marginBottom: 16 }}
                    />
                )}

                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, color: "#334155", fontSize: 13 }}>
                            Rechnungstext auf Deutsch (Pflichtangabe nach § 14 Abs. 4 i.V.m. § 14a UStG):
                        </span>
                        <Button
                            size="small"
                            icon={copiedDe ? <CheckOutlined /> : <CopyOutlined />}
                            onClick={copyDe}
                        >
                            {copiedDe ? "Kopiert" : "Kopieren"}
                        </Button>
                    </div>
                    <div style={{ background: "#f8fafc", padding: 12, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, fontFamily: "monospace", color: "#0f172a" }}>
                        {evaluation.mandatoryInvoiceNoteDe}
                    </div>
                </div>

                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, color: "#334155", fontSize: 13 }}>
                            Rechnungstext auf Englisch (für internationale Kunden):
                        </span>
                        <Button
                            size="small"
                            icon={copiedEn ? <CheckOutlined /> : <CopyOutlined />}
                            onClick={copyEn}
                        >
                            {copiedEn ? "Kopiert" : "Kopieren"}
                        </Button>
                    </div>
                    <div style={{ background: "#f8fafc", padding: 12, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, fontFamily: "monospace", color: "#0f172a" }}>
                        {evaluation.mandatoryInvoiceNoteEn}
                    </div>
                </div>
            </Card>

            {/* Quick Chaining Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div>
                    <strong style={{ display: "block", color: "#0f172a" }}>Internationale Rechnungen mit Rechly erstellen?</strong>
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                        Rechly unterstützt automatisch Reverse Charge Klauseln, ZUGFeRD und XRechnung.
                    </span>
                </div>
                <Link href="/register">
                    <Button type="primary" style={{ background: "#2563eb", borderColor: "#2563eb" }}>
                        Kostenlos starten
                    </Button>
                </Link>
            </div>
        </div>
    );
}
