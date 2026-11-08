"use client";

import React, { useState, useMemo } from "react";
import { InputNumber, Radio, DatePicker, Button, Table, Card, Typography, Tabs } from "antd";
import {
    CopyOutlined,
    CheckOutlined,
    FileTextOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { calculateVerzugszinsen, BUNDESBANK_BASE_RATES } from "@/lib/tools/verzugszinsen";
import Link from "next/link";

const { Text } = Typography;

export default function VerzugszinsenRechner() {
    const todayStr = dayjs().format("YYYY-MM-DD");
    const defaultDueStr = dayjs().subtract(45, "day").format("YYYY-MM-DD");

    const [principal, setPrincipal] = useState<number>(2500);
    const [dueDate, setDueDate] = useState<string>(defaultDueStr);
    const [calcDate, setCalcDate] = useState<string>(todayStr);
    const [isB2B, setIsB2B] = useState<boolean>(true);
    const [invoiceNo, setInvoiceNo] = useState<string>("RE-2026-0042");
    const [debtorName, setDebtorName] = useState<string>("Musterkunde GmbH");
    const [copiedText, setCopiedText] = useState(false);

    const result = useMemo(() => {
        return calculateVerzugszinsen(principal, dueDate, calcDate, isB2B);
    }, [principal, dueDate, calcDate, isB2B]);

    // Dunning Letter Template Text (§ 286 / § 288 BGB)
    const dunningLetterText = useMemo(() => {
        const lines = [
            `Mahnung zu Rechnung ${invoiceNo}`,
            `Datum: ${dayjs(calcDate).format("DD.MM.YYYY")}`,
            ``,
            `Sehr geehrte Damen und Herren,`,
            `sehr geehrte(r) Ansprechpartner(in) der ${debtorName},`,
            ``,
            `trotz Fälligkeit zum ${dayjs(dueDate).format("DD.MM.YYYY")} konnten wir für die Rechnung ${invoiceNo} bis heute keinen Zahlungseingang feststellen.`,
            ``,
            `Gemäß §§ 286, 288 BGB befinden Sie sich seit dem ${dayjs(dueDate).add(1, "day").format("DD.MM.YYYY")} im Zahlungsverzug. Wir stellen Ihnen hiermit die gesetzlichen Verzugszinsen sowie ggf. Verzugspauschalen in Rechnung:`,
            ``,
            `1. Hauptforderung (Rechnungsbetrag): ${result.principalAmount.toFixed(2)} €`,
            `2. Gesetzliche Verzugszinsen (${result.totalDays} Tage): ${result.interestAmount.toFixed(2)} €`,
            ...(result.isB2B
                ? [
                      `3. Gesetzliche Verzugspauschale (§ 288 Abs. 5 BGB): ${result.lumpSum40Eur.toFixed(2)} €`,
                  ]
                : []),
            `----------------------------------------------------`,
            `Gesamtforderung: ${result.totalAmountDue.toFixed(2)} €`,
            ``,
            `Wir bitten Sie höflich, den offenen Gesamtbetrag bis zum ${dayjs(calcDate).add(7, "day").format("DD.MM.YYYY")} auf unser Bankkonto zu überweisen.`,
            ``,
            `Sollte sich Ihre Zahlung mit diesem Schreiben überschnitten haben, betrachten Sie diesen Hinweis bitte als gegenstandslos.`,
            ``,
            `Mit freundlichen Grüßen`,
        ];
        return lines.join("\n");
    }, [invoiceNo, debtorName, dueDate, calcDate, result]);

    const copyDunning = () => {
        if (typeof window !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(dunningLetterText);
            setCopiedText(true);
            setTimeout(() => setCopiedText(false), 2500);
        }
    };

    const columns = [
        {
            title: "Zeitraum",
            dataIndex: "periodLabel",
            key: "periodLabel" },
        {
            title: "Basiszinssatz",
            dataIndex: "baseRate",
            key: "baseRate",
            render: (val: number) => `${val.toFixed(2)} %` },
        {
            title: "Zinssatz p.a.",
            dataIndex: "applicableRate",
            key: "applicableRate",
            render: (val: number) => (
                <span style={{ fontWeight: 700, color: "#2563eb" }}>{val.toFixed(2)} %</span>
            ) },
        {
            title: "Tage",
            dataIndex: "days",
            key: "days" },
        {
            title: "Zinsbetrag",
            dataIndex: "periodInterest",
            key: "periodInterest",
            render: (val: number) => <strong>{val.toFixed(2)} €</strong> },
    ];

    return (
        <div>
            {/* Input Form & Parameters */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 20,
                    marginBottom: 28 }}
            >
                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#334155" }}>
                        Fälliger Rechnungsbetrag (EUR) *
                    </label>
                    <InputNumber
                        min={0.01}
                        max={10000000}
                        step={100}
                        value={principal}
                        onChange={(val) => setPrincipal(val || 0)}
                        style={{ width: "100%" }}
                        size="large"
                        addonAfter="€"
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#334155" }}>
                        Schuldner / Kundentyp (§ 288 BGB) *
                    </label>
                    <Radio.Group
                        value={isB2B}
                        onChange={(e) => setIsB2B(e.target.value)}
                        size="large"
                        buttonStyle="solid"
                        style={{ width: "100%", display: "flex" }}
                    >
                        <Radio.Button value={true} style={{ flex: 1, textAlign: "center" }}>
                            B2B (Geschäftskunde)
                        </Radio.Button>
                        <Radio.Button value={false} style={{ flex: 1, textAlign: "center" }}>
                            B2C (Verbraucher)
                        </Radio.Button>
                    </Radio.Group>
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#334155" }}>
                        Ursprüngliches Zahlungsziel (Fälligkeit) *
                    </label>
                    <DatePicker
                        value={dayjs(dueDate)}
                        onChange={(d) => setDueDate(d ? d.format("YYYY-MM-DD") : todayStr)}
                        format="DD.MM.YYYY"
                        size="large"
                        style={{ width: "100%" }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#334155" }}>
                        Berechnungs-Stichtag (Heute)
                    </label>
                    <DatePicker
                        value={dayjs(calcDate)}
                        onChange={(d) => setCalcDate(d ? d.format("YYYY-MM-DD") : todayStr)}
                        format="DD.MM.YYYY"
                        size="large"
                        style={{ width: "100%" }}
                    />
                </div>
            </div>

            {/* Results Overview Grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 16,
                    marginBottom: 32 }}
            >
                <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                        Verzugstage
                    </Text>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", marginTop: 4 }}>
                        {result.totalDays} Tage
                    </div>
                </Card>

                <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                        Verzugszinsen (§ 288 BGB)
                    </Text>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#dc2626", marginTop: 4 }}>
                        + {result.interestAmount.toFixed(2)} €
                    </div>
                </Card>

                {isB2B && (
                    <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                        <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                            Mahnpauschale (§ 288 Abs. 5)
                        </Text>
                        <div style={{ fontSize: 24, fontWeight: 900, color: "#059669", marginTop: 4 }}>
                            + 40,00 €
                        </div>
                    </Card>
                )}

                <Card
                    size="small"
                    style={{
                        borderRadius: 10,
                        border: "2px solid #2563eb",
                        background: "#eff6ff" }}
                >
                    <Text style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 800, color: "#1e40af" }}>
                        Gesamtforderung
                    </Text>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#1d4ed8", marginTop: 4 }}>
                        {result.totalAmountDue.toFixed(2)} €
                    </div>
                </Card>
            </div>

            {/* Detailed Tabs: Zinsstaffel vs. Mahnschreiben Generator */}
            <Tabs
                defaultActiveKey="breakdown"
                items={[
                    {
                        key: "breakdown",
                        label: "Detaillierte Zinsstaffel (Tagesgenau)",
                        children: (
                            <div>
                                <Table
                                    dataSource={result.periodBreakdown.map((row, i) => ({ ...row, key: i }))}
                                    columns={columns}
                                    pagination={false}
                                    size="middle"
                                    style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}
                                />
                                <div style={{ fontSize: 13, color: "#64748b", marginTop: 12 }}>
                                    Zinsformel nach BGB: Hauptforderung × (Basiszinssatz + {isB2B ? "9%" : "5%"}) × (Tage / 365).
                                    Der aktuelle Bundesbank-Basiszinssatz beträgt {BUNDESBANK_BASE_RATES[0].rate.toFixed(2)} %.
                                </div>
                            </div>
                        ) },
                    {
                        key: "dunning",
                        label: "Fertiges Mahnschreiben (Vorlage)",
                        children: (
                            <div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                                            Rechnungsnummer
                                        </label>
                                        <input
                                            type="text"
                                            value={invoiceNo}
                                            onChange={(e) => setInvoiceNo(e.target.value)}
                                            style={{
                                                width: "100%",
                                                padding: "6px 12px",
                                                borderRadius: 6,
                                                border: "1px solid #cbd5e1" }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                                            Kundenname / Firma
                                        </label>
                                        <input
                                            type="text"
                                            value={debtorName}
                                            onChange={(e) => setDebtorName(e.target.value)}
                                            style={{
                                                width: "100%",
                                                padding: "6px 12px",
                                                borderRadius: 6,
                                                border: "1px solid #cbd5e1" }}
                                        />
                                    </div>
                                </div>

                                <pre
                                    style={{
                                        background: "#f8fafc",
                                        border: "1px solid #e2e8f0",
                                        padding: 20,
                                        borderRadius: 8,
                                        fontSize: 13,
                                        lineHeight: 1.6,
                                        color: "#1e293b",
                                        whiteSpace: "pre-wrap" }}
                                >
                                    {dunningLetterText}
                                </pre>

                                <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                                    <Button
                                        type="primary"
                                        icon={copiedText ? <CheckOutlined /> : <CopyOutlined />}
                                        onClick={copyDunning}
                                        style={{ background: "#2563eb" }}
                                    >
                                        {copiedText ? "Mahntext kopiert!" : "Mahntext in Zwischenablage kopieren"}
                                    </Button>
                                    <Link href="/zahlungserinnerung-schreiben">
                                        <Button icon={<FileTextOutlined />}>
                                            Mahnung in Rechly generieren
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ) },
                ]}
            />
        </div>
    );
}
