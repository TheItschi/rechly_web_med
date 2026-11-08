"use client";

import React, { useState } from "react";
import { Input, InputNumber, Button, Card, DatePicker, Select } from "antd";
import {
    PrinterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";


export default function KassenbuchEigenbeleg() {
    const [receiptDate, setReceiptDate] = useState<string>(dayjs().format("YYYY-MM-DD"));
    const [recipient, setRecipient] = useState<string>("Parkscheinautomat Hauptbahnhof");
    const [purpose, setPurpose] = useState<string>("Parkgebühren anlässlich Kundentermin Firma Müller");
    const [amount, setAmount] = useState<number>(18.50);
    const [lossReason, setLossReason] = useState<string>("automat_ohne_quittung");
    const [issuerName, setIssuerName] = useState<string>("Max Mustermann");

    const reasonLabels: Record<string, string> = {
        automat_ohne_quittung: "Automat / Parkuhr hat keine Quittung ausgestellt",
        beleg_verloren: "Originalbeleg verloren / verlegt",
        trinkgeld_bar: "Bar gegebenes Trinkgeld ohne gesonderten Ausweis",
        telefon_porto: "Porto / Briefmarken / Telefon ohne Beleg" };

    const handlePrint = () => {
        if (typeof window !== "undefined") {
            window.print();
        }
    };

    return (
        <div>
            {/* Input Form */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 20,
                    marginBottom: 28 }}
            >
                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Datum der Ausgabe *
                    </label>
                    <DatePicker
                        value={dayjs(receiptDate)}
                        onChange={(d) => setReceiptDate(d ? d.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"))}
                        format="DD.MM.YYYY"
                        size="large"
                        style={{ width: "100%" }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Zahlungsempfänger (Geschäftspartner / Stelle) *
                    </label>
                    <Input
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        size="large"
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Gezahlter Gesamtbetrag *
                    </label>
                    <InputNumber
                        min={0.01}
                        max={10000}
                        step={1}
                        value={amount}
                        onChange={(val) => setAmount(val || 0)}
                        style={{ width: "100%" }}
                        size="large"
                        addonAfter="€"
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Grund für die Ausstellung des Eigenbelegs *
                    </label>
                    <Select
                        value={lossReason}
                        onChange={setLossReason}
                        style={{ width: "100%" }}
                        size="large"
                        options={[
                            { value: "automat_ohne_quittung", label: "Automat ohne Quittungsausgabe" },
                            { value: "beleg_verloren", label: "Originalbeleg unauffindbar / verloren" },
                            { value: "trinkgeld_bar", label: "Freiwilliges Trinkgeld (Bar)" },
                            { value: "telefon_porto", label: "Münztelefon / Briefmarken" },
                        ]}
                    />
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 28 }}>
                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Ausführlicher geschäftlicher Anlass / Zweck *
                    </label>
                    <Input
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        size="large"
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Aussteller / Name des Unternehmers *
                    </label>
                    <Input
                        value={issuerName}
                        onChange={(e) => setIssuerName(e.target.value)}
                        size="large"
                    />
                </div>
            </div>

            {/* Printable Eigenbeleg Preview */}
            <Card
                title="Druckfertiger Eigenbeleg nach § 160 Abgabenordnung (AO)"
                extra={
                    <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint} style={{ background: "#2563eb" }}>
                        Eigenbeleg drucken / PDF
                    </Button>
                }
                style={{ borderRadius: 12, border: "1px solid #cbd5e1" }}
            >
                <div
                    style={{
                        border: "2px dashed #94a3b8",
                        padding: 28,
                        borderRadius: 8,
                        background: "#ffffff",
                        color: "#0f172a" }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #0f172a", paddingBottom: 12, marginBottom: 20 }}>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
                            EIGENBELEG / ERSATZBELEG
                        </h2>
                        <span style={{ fontSize: 13, color: "#64748b" }}>
                            Gemäß § 160 AO (Abgabenordnung)
                        </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, fontSize: 14, marginBottom: 20 }}>
                        <div>
                            <strong>Datum der Zahlung:</strong> {dayjs(receiptDate).format("DD.MM.YYYY")}
                        </div>
                        <div>
                            <strong>Zahlungsempfänger:</strong> {recipient}
                        </div>
                    </div>

                    <div style={{ fontSize: 14, marginBottom: 16 }}>
                        <strong>Geschäftlicher Verwendungszweck:</strong> {purpose}
                    </div>

                    <div style={{ fontSize: 14, marginBottom: 20 }}>
                        <strong>Grund für Fehlen des Originalbelegs:</strong> {reasonLabels[lossReason]}
                    </div>

                    <div
                        style={{
                            background: "#f8fafc",
                            padding: "16px 20px",
                            borderRadius: 8,
                            border: "1px solid #e2e8f0",
                            marginBottom: 24,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center" }}
                    >
                        <span style={{ fontSize: 16, fontWeight: 700 }}>Tatsächlich aufgewendeter Betrag:</span>
                        <span style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>
                            {amount.toFixed(2)} €
                        </span>
                    </div>

                    <div style={{ fontSize: 12, color: "#64748b", fontStyle: "italic", marginBottom: 32 }}>
                        Hinweis: Auf Eigenbelege kann kein Vorsteuerabzug geltend gemacht werden (§ 15 UStG). Der
                        Betrag wird in voller Höhe als betrieblicher Aufwand verbucht.
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
                        <div>
                            <div style={{ borderBottom: "1px solid #000000", height: 36 }}></div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Ort, Datum</div>
                        </div>
                        <div>
                            <div style={{ borderBottom: "1px solid #000000", height: 36 }}></div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                                Unterschrift des Ausstellers ({issuerName})
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
