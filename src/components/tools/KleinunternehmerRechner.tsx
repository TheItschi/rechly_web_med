"use client";

import React, { useState, useMemo } from "react";
import { InputNumber, Slider, Card, Tag, Button } from "antd";
import {
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    CopyOutlined,
    CheckOutlined,
    InfoCircleOutlined } from "@ant-design/icons";
import Link from "next/link";


export default function KleinunternehmerRechner() {
    const [priorYearRevenue, setPriorYearRevenue] = useState<number>(18500);
    const [currentYearRevenue, setCurrentYearRevenue] = useState<number>(45000);
    const [b2cSharePercent, setB2cSharePercent] = useState<number>(80); // 80% private customers
    const [annualExpensesNet, setAnnualExpensesNet] = useState<number>(7500); // 7.500 € net expenses
    const [copiedClause, setCopiedClause] = useState(false);

    // Statutory thresholds since 01.01.2025 (§ 19 UStG / Wachstumschancengesetz)
    const PRIOR_YEAR_LIMIT = 25000;
    const CURRENT_YEAR_LIMIT = 100000;

    const calc = useMemo(() => {
        const isPriorYearExceeded = priorYearRevenue > PRIOR_YEAR_LIMIT;
        const isCurrentYearExceeded = currentYearRevenue > CURRENT_YEAR_LIMIT;
        const isEligible = !isPriorYearExceeded && !isCurrentYearExceeded;

        // VAT from expenses that could be refunded under Regelbesteuerung (assumed average 19%)
        const potentialVatRefund = Math.round(annualExpensesNet * 0.19 * 100) / 100;

        // B2C price impact:
        // If Regelbesteuerung, either your revenue decreases or B2C prices increase by 19%
        const b2cRevenue = currentYearRevenue * (b2cSharePercent / 100);
        const b2bRevenue = currentYearRevenue * ((100 - b2cSharePercent) / 100);

        let recommendation = "";
        let recommendationType: "success" | "warning" | "info" = "info";

        if (!isEligible) {
            recommendation =
                "Du überschreitest die gesetzlichen Grenzwerte nach § 19 UStG. Du musst zur Regelbesteuerung wechseln und Umsatzsteuer auf Rechnungen ausweisen.";
            recommendationType = "warning";
        } else if (b2cSharePercent >= 70 && potentialVatRefund < 1500) {
            recommendation =
                "Die Kleinunternehmerregelung lohnt sich sehr für dich: Da du überwiegend Privatkunden (B2C) bedienst, kannst du 19% günstiger anbieten oder diesen Betrag als zusätzlichen Gewinn einbehalten.";
            recommendationType = "success";
        } else if (b2cSharePercent <= 30 && potentialVatRefund > 2000) {
            recommendation =
                "Ein freiwilliger Verzicht auf die Kleinunternehmerregelung (§ 19 Abs. 2 UStG Regelbesteuerung) ist wahrscheinlich vorteilhafter: Deine B2B-Kunden können Vorsteuer ziehen, und du bekommst die Vorsteuer aus deinen Einkäufen erstattet.";
            recommendationType = "info";
        } else {
            recommendation =
                "Beide Modelle sind nah beieinander. Wenn du hohe Investitionen (Kfz, Maschinen, teure Hard-/Software) planst, ist die Regelbesteuerung oft besser. Wenn du minimale Ausgaben hast, spart Kleinunternehmer Zeit.";
            recommendationType = "info";
        }

        return {
            isPriorYearExceeded,
            isCurrentYearExceeded,
            isEligible,
            potentialVatRefund,
            b2cRevenue,
            b2bRevenue,
            recommendation,
            recommendationType };
    }, [priorYearRevenue, currentYearRevenue, b2cSharePercent, annualExpensesNet]);

    const statutoryClause =
        "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).";

    const copyClause = () => {
        if (typeof window !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(statutoryClause);
            setCopiedClause(true);
            setTimeout(() => setCopiedClause(false), 2500);
        }
    };

    return (
        <div>
            {/* Threshold Notification Banner */}
            <div
                style={{
                    background: "#f0fdf4",
                    border: "1px solid #86efac",
                    padding: "16px 20px",
                    borderRadius: 10,
                    marginBottom: 24,
                    display: "flex",
                    alignItems: "center",
                    gap: 12 }}
            >
                <InfoCircleOutlined style={{ fontSize: 22, color: "#16a34a" }} />
                <div style={{ fontSize: 14, color: "#166534", lineHeight: 1.5 }}>
                    <strong>Gesetzesreform ab 2025/2026:</strong> Die Grenzen nach § 19 UStG wurden durch das
                    Wachstumschancengesetz deutlich angehoben auf <strong>25.000 € Vorjahresumsatz</strong> (zuvor 22.000 €)
                    und <strong>100.000 € laufendes Kalenderjahr</strong> (zuvor 50.000 €).
                </div>
            </div>

            {/* Inputs Grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 20,
                    marginBottom: 28 }}
            >
                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#334155" }}>
                        Tatsächlicher Umsatz im Vorjahr *
                    </label>
                    <InputNumber
                        min={0}
                        max={500000}
                        step={500}
                        value={priorYearRevenue}
                        onChange={(val) => setPriorYearRevenue(val || 0)}
                        style={{ width: "100%" }}
                        size="large"
                        addonAfter="€"
                    />
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        Grenze: max. 25.000 €
                    </div>
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#334155" }}>
                        Erwarteter Umsatz im laufenden Jahr *
                    </label>
                    <InputNumber
                        min={0}
                        max={500000}
                        step={1000}
                        value={currentYearRevenue}
                        onChange={(val) => setCurrentYearRevenue(val || 0)}
                        style={{ width: "100%" }}
                        size="large"
                        addonAfter="€"
                    />
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        Grenze: max. 100.000 €
                    </div>
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#334155" }}>
                        Jährliche Ausgaben netto (mit 19% USt)
                    </label>
                    <InputNumber
                        min={0}
                        max={200000}
                        step={500}
                        value={annualExpensesNet}
                        onChange={(val) => setAnnualExpensesNet(val || 0)}
                        style={{ width: "100%" }}
                        size="large"
                        addonAfter="€ / Jahr"
                    />
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        Mögliche Vorsteuererstattung: ca. {calc.potentialVatRefund.toFixed(2)} €
                    </div>
                </div>

                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                        <span>Anteil Privatkunden (B2C):</span>
                        <span style={{ color: "#2563eb" }}>{b2cSharePercent} %</span>
                    </div>
                    <Slider
                        min={0}
                        max={100}
                        value={b2cSharePercent}
                        onChange={setB2cSharePercent}
                    />
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                        {100 - b2cSharePercent} % Geschäftskunden (B2B)
                    </div>
                </div>
            </div>

            {/* Status & Recommendation Card */}
            <Card
                style={{
                    borderRadius: 12,
                    border: calc.isEligible ? "2px solid #10b981" : "2px solid #ef4444",
                    background: calc.isEligible ? "#f0fdf4" : "#fef2f2",
                    marginBottom: 28 }}
            >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    {calc.isEligible ? (
                        <CheckCircleOutlined style={{ fontSize: 32, color: "#059669" }} />
                    ) : (
                        <ExclamationCircleOutlined style={{ fontSize: 32, color: "#dc2626" }} />
                    )}
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#0f172a" }}>
                                {calc.isEligible
                                    ? "Kleinunternehmerregelung (§ 19 UStG) anwendbar"
                                    : "Grenzüberschreitung: Regelbesteuerung erforderlich"}
                            </h3>
                            <Tag color={calc.isEligible ? "success" : "error"} style={{ fontWeight: 700 }}>
                                {calc.isEligible ? "GRENZEN EINGEHALTEN" : "PFLICHT ZUR REGELBESTEUERUNG"}
                            </Tag>
                        </div>
                        <p style={{ margin: "8px 0 0 0", color: "#334155", fontSize: 15, lineHeight: 1.6 }}>
                            {calc.recommendation}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Comparison Metrics Grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 20,
                    marginBottom: 32 }}
            >
                <Card
                    title="Als Kleinunternehmer (§ 19 UStG)"
                    size="small"
                    style={{ borderRadius: 10, border: "1px solid #cbd5e1" }}
                >
                    <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", fontSize: 14, lineHeight: 1.7 }}>
                        <li>
                            <strong>0 % Umsatzsteuer</strong> auf deinen Rechnungen
                        </li>
                        <li>
                            <strong>Wettbewerbsvorteil bei B2C:</strong> Privatkunden zahlen keinen 19% Aufschlag
                        </li>
                        <li>
                            <strong>Keine USt-Voranmeldungen</strong> beim Finanzamt
                        </li>
                        <li style={{ color: "#dc2626" }}>
                            <strong>Kein Vorsteuerabzug:</strong> Du verlierst ca. {calc.potentialVatRefund.toFixed(2)} €
                            Vorsteuer aus Betriebsausgaben
                        </li>
                    </ul>
                </Card>

                <Card
                    title="Mit Regelbesteuerung (19% USt)"
                    size="small"
                    style={{ borderRadius: 10, border: "1px solid #cbd5e1" }}
                >
                    <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", fontSize: 14, lineHeight: 1.7 }}>
                        <li>
                            <strong>Vorsteuer-Rückerstattung:</strong> Du erhältst ca.{" "}
                            <strong>+{calc.potentialVatRefund.toFixed(2)} €</strong> vom Finanzamt zurück
                        </li>
                        <li>
                            <strong>USt-neutral bei B2B:</strong> Geschäftskunden zieht die Vorsteuer ab
                        </li>
                        <li style={{ color: "#d97706" }}>
                            Regelmäßige <strong>Umsatzsteuervoranmeldungen</strong> (monatlich/quartalsweise)
                        </li>
                        <li style={{ color: "#d97706" }}>
                            5 Jahre Bindung bei freiwilligem Verzicht (§ 19 Abs. 2 UStG)
                        </li>
                    </ul>
                </Card>
            </div>

            {/* Statutory Invoice Clause Copy Box */}
            <div
                style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    padding: "20px 24px",
                    borderRadius: 10 }}
            >
                <h4 style={{ margin: "0 0 6px 0", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                    Gesetzlicher Pflicht-Hinweistext für deine Rechnungen:
                </h4>
                <div
                    style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        padding: "12px 16px",
                        borderRadius: 6,
                        fontFamily: "monospace",
                        fontSize: 14,
                        color: "#0f172a",
                        marginBottom: 12 }}
                >
                    {statutoryClause}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Button
                        icon={copiedClause ? <CheckOutlined /> : <CopyOutlined />}
                        onClick={copyClause}
                        type="primary"
                        style={{ background: "#2563eb" }}
                    >
                        {copiedClause ? " kopiert!" : "Hinweistext kopieren"}
                    </Button>
                    <Link href="/kleinunternehmer-rechnung">
                        <Button>Kleinunternehmer-Rechnung in Rechly erstellen</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
