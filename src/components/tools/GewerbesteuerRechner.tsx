"use client";

import React, { useState, useMemo } from "react";
import { InputNumber, Select, Card, Typography } from "antd";
import {
    } from "@ant-design/icons";
import { TOP_MUNICIPALITIES, calculateGewerbesteuer, GewerbesteuerResult } from "@/lib/tools/taxRates";

const { Text } = Typography;

export default function GewerbesteuerRechner() {
    const [profit, setProfit] = useState<number>(65000);
    const [entityType, setEntityType] = useState<"freiberufler" | "einzelunternehmen" | "kapitalgesellschaft">(
        "einzelunternehmen"
    );
    const [selectedCity, setSelectedCity] = useState<string>("Berlin");
    const [customHebesatz, setCustomHebesatz] = useState<number>(410);

    const handleCityChange = (cityName: string) => {
        setSelectedCity(cityName);
        const muni = TOP_MUNICIPALITIES.find((m) => m.city === cityName);
        if (muni) {
            setCustomHebesatz(muni.hebesatz);
        }
    };

    const result: GewerbesteuerResult = useMemo(() => {
        return calculateGewerbesteuer(profit, entityType, customHebesatz);
    }, [profit, entityType, customHebesatz]);

    return (
        <div>
            {/* Input Grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 20,
                    marginBottom: 28 }}
            >
                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#334155" }}>
                        Unternehmensform *
                    </label>
                    <Select
                        value={entityType}
                        onChange={setEntityType}
                        style={{ width: "100%" }}
                        size="large"
                        options={[
                            { value: "einzelunternehmen", label: "Einzelunternehmen / GbR (mit Freibetrag)" },
                            { value: "freiberufler", label: "Freiberufler (§ 18 EStG – steuerbefreit)" },
                            { value: "kapitalgesellschaft", label: "GmbH / UG (kein Freibetrag)" },
                        ]}
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#334155" }}>
                        Gewerbeertrag / Jahresgewinn *
                    </label>
                    <InputNumber
                        min={0}
                        max={100000000}
                        step={5000}
                        value={profit}
                        onChange={(val) => setProfit(val || 0)}
                        style={{ width: "100%" }}
                        size="large"
                        addonAfter="€"
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#334155" }}>
                        Gemeinde / Stadt auswählen:
                    </label>
                    <Select
                        value={selectedCity}
                        onChange={handleCityChange}
                        style={{ width: "100%" }}
                        size="large"
                        showSearch
                        options={TOP_MUNICIPALITIES.map((m) => ({
                            value: m.city,
                            label: `${m.city} (${m.hebesatz} %)` }))}
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#334155" }}>
                        Hebesatz der Gemeinde (%):
                    </label>
                    <InputNumber
                        min={200}
                        max={900}
                        value={customHebesatz}
                        onChange={(val) => setCustomHebesatz(val || 400)}
                        style={{ width: "100%" }}
                        size="large"
                        addonAfter="%"
                    />
                </div>
            </div>

            {/* Results KPI Cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 16,
                    marginBottom: 28 }}
            >
                <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                        Freibetrag (§ 11 GewStG)
                    </Text>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#059669", marginTop: 4 }}>
                        {result.allowance.toLocaleString("de-DE")} €
                    </div>
                </Card>

                <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                        Steuermessbetrag (3,5%)
                    </Text>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", marginTop: 4 }}>
                        {result.steuermessbetrag.toFixed(2)} €
                    </div>
                </Card>

                <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                        Gewerbesteuer
                    </Text>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#dc2626", marginTop: 4 }}>
                        {result.gewerbesteuer.toFixed(2)} €
                    </div>
                </Card>

                <Card
                    size="small"
                    style={{
                        borderRadius: 10,
                        border: "2px solid #2563eb",
                        background: "#eff6ff" }}
                >
                    <Text style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 800, color: "#1e40af" }}>
                        Effektive Steuerbelastung
                    </Text>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#1d4ed8", marginTop: 4 }}>
                        {result.effectiveBurden.toFixed(2)} €
                    </div>
                    <div style={{ fontSize: 11, color: "#2563eb", marginTop: 2 }}>
                        Nach § 35 EStG Anrechnung
                    </div>
                </Card>
            </div>

            {/* Explanatory Cards */}
            <Card
                title="Erläuterung & Steueranrechnung nach § 35 EStG"
                style={{ borderRadius: 12, border: "1px solid #cbd5e1" }}
            >
                <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", fontSize: 14, lineHeight: 1.7 }}>
                    {result.notes.map((note, idx) => (
                        <li key={idx} style={{ marginBottom: 6 }}>
                            {note}
                        </li>
                    ))}
                    {entityType === "einzelunternehmen" && result.estAnrechnungMax > 0 && (
                        <li>
                            <strong>Einkommensteuer-Ermäßigung:</strong> Bis zu{" "}
                            <strong>{result.estAnrechnungMax.toFixed(2)} €</strong> können auf deine persönliche
                            Einkommensteuer angerechnet werden.
                        </li>
                    )}
                </ul>
            </Card>
        </div>
    );
}
