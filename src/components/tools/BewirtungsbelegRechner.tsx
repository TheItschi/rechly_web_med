"use client";

import React, { useState, useMemo } from "react";
import { Input, InputNumber, Radio, Button, Card, Typography, DatePicker } from "antd";
import {
    PrinterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Text } = Typography;

export default function BewirtungsbelegRechner() {
    const [billDate, setBillDate] = useState<string>(dayjs().format("YYYY-MM-DD"));
    const [restaurantName, setRestaurantName] = useState<string>("Restaurant Zur Post");
    const [participants, setParticipants] = useState<string>("Max Mustermann (Gastgeber), Thomas Becker (Kunde Becker GmbH)");
    const [businessPurpose, setBusinessPurpose] = useState<string>("Besprechung Projektumfang Q3 / Verhandlung Rahmenvertrag 2026");
    const [foodGross, setFoodGross] = useState<number>(148.50);
    const [tipAmount, setTipAmount] = useState<number>(15.00);
    const [vatRate, setVatRate] = useState<number>(19);

    const calc = useMemo(() => {
        const netFood = foodGross / (1 + vatRate / 100);
        const vatFood = foodGross - netFood;

        // § 4 Abs. 5 Nr. 2 EStG: 70% operational / 30% private
        // Tip has 0% VAT
        const totalNetExpenses = netFood + tipAmount;
        const deductibleExpenses70 = Math.round(totalNetExpenses * 0.70 * 100) / 100;
        const nonDeductibleExpenses30 = Math.round(totalNetExpenses * 0.30 * 100) / 100;

        // 100% full VAT deduction if entitled to Vorsteuerabzug!
        const fullVatDeduction = Math.round(vatFood * 100) / 100;
        const totalTaxRelief = deductibleExpenses70 + fullVatDeduction;
        const totalPaid = foodGross + tipAmount;

        return {
            netFood: Math.round(netFood * 100) / 100,
            vatFood: fullVatDeduction,
            totalPaid: Math.round(totalPaid * 100) / 100,
            deductibleExpenses70,
            nonDeductibleExpenses30,
            fullVatDeduction,
            totalTaxRelief: Math.round(totalTaxRelief * 100) / 100 };
    }, [foodGross, tipAmount, vatRate]);

    const handlePrint = () => {
        if (typeof window !== "undefined") {
            window.print();
        }
    };

    return (
        <div>
            {/* Input & Form Area */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 20,
                    marginBottom: 28 }}
            >
                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Bewirtungsdatum *
                    </label>
                    <DatePicker
                        value={dayjs(billDate)}
                        onChange={(d) => setBillDate(d ? d.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"))}
                        format="DD.MM.YYYY"
                        size="large"
                        style={{ width: "100%" }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Gaststätte / Restaurant & Ort *
                    </label>
                    <Input
                        value={restaurantName}
                        onChange={(e) => setRestaurantName(e.target.value)}
                        size="large"
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Rechnungsbetrag laut Beleg (brutto) *
                    </label>
                    <InputNumber
                        min={1}
                        max={50000}
                        step={10}
                        value={foodGross}
                        onChange={(val) => setFoodGross(val || 0)}
                        style={{ width: "100%" }}
                        size="large"
                        addonAfter="€"
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Freiwilliges Trinkgeld (0% USt)
                    </label>
                    <InputNumber
                        min={0}
                        max={1000}
                        step={2}
                        value={tipAmount}
                        onChange={(val) => setTipAmount(val || 0)}
                        style={{ width: "100%" }}
                        size="large"
                        addonAfter="€"
                    />
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20, marginBottom: 28 }}>
                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Steuersatz der Speisen/Getränke:
                    </label>
                    <Radio.Group
                        value={vatRate}
                        onChange={(e) => setVatRate(e.target.value)}
                        size="large"
                        buttonStyle="solid"
                        style={{ display: "flex", width: "100%" }}
                    >
                        <Radio.Button value={19} style={{ flex: 1, textAlign: "center" }}>19 %</Radio.Button>
                        <Radio.Button value={7} style={{ flex: 1, textAlign: "center" }}>7 %</Radio.Button>
                    </Radio.Group>
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Bewirtete Personen (Name & Firma aller Teilnehmer) *
                    </label>
                    <Input
                        value={participants}
                        onChange={(e) => setParticipants(e.target.value)}
                        size="large"
                        placeholder="z. B. Max Mustermann (Gastgeber), Anna Schmidt (Kunde XY GmbH)"
                    />
                </div>
            </div>

            <div style={{ marginBottom: 28 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                    Konkreter geschäftlicher Anlass (Finanzamt-Pflichtangabe!) *
                </label>
                <Input.TextArea
                    rows={2}
                    value={businessPurpose}
                    onChange={(e) => setBusinessPurpose(e.target.value)}
                    placeholder="Wichtig: Allgemeine Angaben wie 'Arbeitsessen' genügen nicht. Nenne Thema & Projekt."
                />
            </div>

            {/* Calculations Grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 16,
                    marginBottom: 32 }}
            >
                <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                        Gesamtzahlung (inkl. Trinkgeld)
                    </Text>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", marginTop: 4 }}>
                        {calc.totalPaid.toFixed(2)} €
                    </div>
                </Card>

                <Card
                    size="small"
                    style={{
                        borderRadius: 10,
                        border: "2px solid #16a34a",
                        background: "#f0fdf4" }}
                >
                    <Text style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 800, color: "#166534" }}>
                        70 % Betriebsausgabe (§ 4 EStG)
                    </Text>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#15803d", marginTop: 4 }}>
                        {calc.deductibleExpenses70.toFixed(2)} €
                    </div>
                    <div style={{ fontSize: 12, color: "#166534", marginTop: 2 }}>
                        Steuerlich voll abzugsfähig
                    </div>
                </Card>

                <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                        30 % Nicht abziehbar
                    </Text>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#dc2626", marginTop: 4 }}>
                        {calc.nonDeductibleExpenses30.toFixed(2)} €
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        Privatanteil nach EStG
                    </div>
                </Card>

                <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                        100 % Vorsteuerabzug
                    </Text>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#2563eb", marginTop: 4 }}>
                        {calc.fullVatDeduction.toFixed(2)} €
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        Voll vom Finanzamt erstattet
                    </div>
                </Card>
            </div>

            {/* Printable Form Preview */}
            <Card
                title="Druckfertiger Bewirtungsbeleg nach BMF-Vorgaben"
                extra={
                    <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint} style={{ background: "#2563eb" }}>
                        Drucken / Als PDF speichern
                    </Button>
                }
                style={{ borderRadius: 12, border: "1px solid #cbd5e1" }}
            >
                <div
                    style={{
                        border: "2px dashed #94a3b8",
                        padding: 24,
                        borderRadius: 8,
                        background: "#ffffff",
                        color: "#0f172a" }}
                >
                    <h3 style={{ margin: "0 0 16px 0", fontSize: 18, borderBottom: "1px solid #cbd5e1", paddingBottom: 8 }}>
                        BEWIRTUNGSBELEG (Eigenbeleg zum Gaststättenbeleg nach § 4 Abs. 5 Nr. 2 EStG)
                    </h3>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 14, marginBottom: 16 }}>
                        <div>
                            <strong>Tag der Bewirtung:</strong> {dayjs(billDate).format("DD.MM.YYYY")}
                        </div>
                        <div>
                            <strong>Ort der Bewirtung:</strong> {restaurantName}
                        </div>
                    </div>

                    <div style={{ fontSize: 14, marginBottom: 12 }}>
                        <strong>Bewirtete Personen:</strong> {participants}
                    </div>

                    <div style={{ fontSize: 14, marginBottom: 16 }}>
                        <strong>Konkreter geschäftlicher Anlass:</strong> {businessPurpose}
                    </div>

                    <div
                        style={{
                            background: "#f8fafc",
                            padding: 12,
                            borderRadius: 6,
                            border: "1px solid #e2e8f0",
                            fontSize: 14,
                            marginBottom: 20 }}
                    >
                        <div>Rechnungsbetrag Speisen/Getränke: {foodGross.toFixed(2)} € (inkl. {vatRate}% USt)</div>
                        <div>Trinkgeld (gesondert quittiert): {tipAmount.toFixed(2)} €</div>
                        <div style={{ fontWeight: 800, marginTop: 4 }}>
                            Gesamtbetrag: {calc.totalPaid.toFixed(2)} € | 70% abzugsfähig: {calc.deductibleExpenses70.toFixed(2)} € | 100% Vorsteuer: {calc.fullVatDeduction.toFixed(2)} €
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginTop: 32 }}>
                        <div>
                            <div style={{ borderBottom: "1px solid #000000", height: 32 }}></div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Ort, Datum</div>
                        </div>
                        <div>
                            <div style={{ borderBottom: "1px solid #000000", height: 32 }}></div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Unterschrift des Bewirtenden / Steuerpflichtigen</div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
