"use client";

import React, { useState, useMemo } from "react";
import { Input, InputNumber, Radio, Card, Button, Switch, message } from "antd";
import {
    CopyOutlined,
    PrinterOutlined,
    CheckOutlined } from "@ant-design/icons";
import { calculateDunning, DunningLevel, DunningInput } from "@/lib/tools/dunning";
import Link from "next/link";


export default function MahnungGenerator() {

    //  states
    const [creditorName, setCreditorName] = useState<string>("Max Mustermann IT-Services");
    const [creditorAddress, setCreditorAddress] = useState<string>("Musterstraße 12\n10115 Berlin");
    const [creditorIban, setCreditorIban] = useState<string>("DE89 3704 0044 0532 0130 00");
    const [creditorBic, setCreditorBic] = useState<string>("COBADEFFXXX");
    const [creditorBankName] = useState<string>("Commerzbank");

    const [debtorName, setDebtorName] = useState<string>("Beispiel GmbH & Co. KG");
    const [debtorAddress, setDebtorAddress] = useState<string>("Industriestraße 45\n80331 München");

    const [invoiceNumber, setInvoiceNumber] = useState<string>("RE-2026-089");
    const [invoiceDate, setInvoiceDate] = useState<string>("2026-01-15");
    const [dueDate, setDueDate] = useState<string>("2026-01-30");
    const [amount, setAmount] = useState<number>(2450.0);

    const [dunningLevel, setDunningLevel] = useState<DunningLevel>(2);
    const [isB2B, setIsB2B] = useState<boolean>(true);
    const [customMahngebuehr, setCustomMahngebuehr] = useState<number>(2.5);
    const [customGraceDays, setCustomGraceDays] = useState<number>(7);

    const [copied, setCopied] = useState<boolean>(false);

    const calculation = useMemo(() => {
        const input: DunningInput = {
            creditorName,
            creditorAddress,
            creditorIban,
            creditorBic,
            creditorBankName,
            debtorName,
            debtorAddress,
            invoiceNumber,
            invoiceDate,
            dueDate,
            amount: amount || 0,
            dunningLevel,
            isB2B,
            customMahngebuehr,
            customGraceDays };
        return calculateDunning(input);
    }, [
        creditorName,
        creditorAddress,
        creditorIban,
        creditorBic,
        creditorBankName,
        debtorName,
        debtorAddress,
        invoiceNumber,
        invoiceDate,
        dueDate,
        amount,
        dunningLevel,
        isB2B,
        customMahngebuehr,
        customGraceDays,
    ]);

    const printLetter = () => {
        window.print();
    };

    const copyText = () => {
        const text = `${creditorName}
${creditorAddress}

An:
${debtorName}
${debtorAddress}

Datum: ${new Date().toLocaleDateString("de-DE")}

Betreff: ${calculation.letterSubject}

Sehr geehrte Damen und Herren,

${calculation.introParagraph}

Aufstellung der offenen Forderung:
- Ursprünglicher Rechnungsbetrag: ${amount.toFixed(2)} €
${calculation.interestAmount > 0 ? `- Verzugszinsen (${calculation.daysOverdue} Tage, ${calculation.interestRatePercent.toFixed(2)} % p.a.): ${calculation.interestAmount.toFixed(2)} €\n` : ""}${calculation.statutoryLumpSum > 0 ? `- Gesetzliche Verzugspauschale (§ 288 Abs. 5 BGB): ${calculation.statutoryLumpSum.toFixed(2)} €\n` : ""}${calculation.mahngebuehr > 0 ? `- Mahngebühren / Auslagen: ${calculation.mahngebuehr.toFixed(2)} €\n` : ""}- Fälliger Gesamtbetrag: ${calculation.totalDue.toFixed(2)} €

${calculation.legalNote}

Bankverbindung:
IBAN: ${creditorIban}
BIC: ${creditorBic}
Bank: ${creditorBankName}

${calculation.closingParagraph}

Mit freundlichen Grüßen
${creditorName}`;

        navigator.clipboard.writeText(text);
        setCopied(true);
        message.success("Mahntext erfolgreich in die Zwischenablage kopiert!");
        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "16px 8px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
                {/*  Controls Column */}
                <div>
                    <Card
                        title="1. Mahndaten & Verzugsstatus"
                        style={{ borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 16 }}
                    >
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontWeight: 600, marginBottom: 6, color: "#334155" }}>
                                Mahnstufe auswählen:
                            </div>
                            <Radio.Group
                                value={dunningLevel}
                                onChange={(e) => setDunningLevel(e.target.value)}
                                buttonStyle="solid"
                                style={{ width: "100%" }}
                            >
                                <Radio.Button value={1} style={{ width: "33%", textAlign: "center" }}>
                                    Zahlungserinnerung
                                </Radio.Button>
                                <Radio.Button value={2} style={{ width: "33%", textAlign: "center" }}>
                                    1. Mahnung
                                </Radio.Button>
                                <Radio.Button value={3} style={{ width: "34%", textAlign: "center" }}>
                                    Letzte Mahnung
                                </Radio.Button>
                            </Radio.Group>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, padding: "8px 12px", background: "#f8fafc", borderRadius: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>Schuldner ist Unternehmer (B2B)</span>
                            <Switch checked={isB2B} onChange={setIsB2B} />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                                    Rechnungsnummer
                                </label>
                                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                                    Offener Betrag (€)
                                </label>
                                <InputNumber
                                    value={amount}
                                    onChange={(v) => setAmount(v || 0)}
                                    style={{ width: "100%" }}
                                    precision={2}
                                />
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                                    Rechnungsdatum
                                </label>
                                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                                    Urspr. Fälligkeitsdatum
                                </label>
                                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                                    Mahnfrist (Tage)
                                </label>
                                <InputNumber
                                    value={customGraceDays}
                                    onChange={(v) => setCustomGraceDays(v || 7)}
                                    style={{ width: "100%" }}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                                    Mahngebühr (€)
                                </label>
                                <InputNumber
                                    value={customMahngebuehr}
                                    onChange={(v) => setCustomMahngebuehr(v || 0)}
                                    style={{ width: "100%" }}
                                    precision={2}
                                />
                            </div>
                        </div>
                    </Card>

                    <Card
                        title="2. Beteiligte Parteien & Bankdaten"
                        style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                    >
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                                Gläubiger (Ihr Name / Firma)
                            </label>
                            <Input value={creditorName} onChange={(e) => setCreditorName(e.target.value)} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                                Ihre Anschrift
                            </label>
                            <Input.TextArea
                                rows={2}
                                value={creditorAddress}
                                onChange={(e) => setCreditorAddress(e.target.value)}
                            />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                                Schuldner (Kundenname / Firma)
                            </label>
                            <Input value={debtorName} onChange={(e) => setDebtorName(e.target.value)} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                                Kundenanschrift
                            </label>
                            <Input.TextArea
                                rows={2}
                                value={debtorAddress}
                                onChange={(e) => setDebtorAddress(e.target.value)}
                            />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12 }}>
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                                    IBAN
                                </label>
                                <Input value={creditorIban} onChange={(e) => setCreditorIban(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                                    BIC
                                </label>
                                <Input value={creditorBic} onChange={(e) => setCreditorBic(e.target.value)} />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Live DIN 5008 Preview Column */}
                <div>
                    {/* Summary Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                        <Card size="small" style={{ borderRadius: 8, background: "#f8fafc" }}>
                            <div style={{ fontSize: 11, color: "#64748b" }}>Tage im Verzug</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>
                                {calculation.daysOverdue} Tage
                            </div>
                        </Card>
                        <Card size="small" style={{ borderRadius: 8, background: "#f8fafc" }}>
                            <div style={{ fontSize: 11, color: "#64748b" }}>Zinsen & Gebühren</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
                                {(calculation.interestAmount + calculation.statutoryLumpSum + calculation.mahngebuehr).toFixed(2)} €
                            </div>
                        </Card>
                        <Card size="small" style={{ borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                            <div style={{ fontSize: 11, color: "#166534" }}>Gesamtforderung</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "#15803d" }}>
                                {calculation.totalDue.toFixed(2)} €
                            </div>
                        </Card>
                    </div>

                    {/* Action Bar */}
                    <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                        <Button
                            type="primary"
                            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                            onClick={copyText}
                            style={{ flex: 1, background: "#2563eb", borderColor: "#2563eb" }}
                        >
                            {copied ? "Kopiert!" : " kopieren"}
                        </Button>
                        <Button icon={<PrinterOutlined />} onClick={printLetter}>
                            Drucken / PDF
                        </Button>
                    </div>

                    {/* Letter Container */}
                    <div
                        id="printable-dunning-letter"
                        style={{
                            background: "#ffffff",
                            padding: 32,
                            borderRadius: 12,
                            border: "1px solid #cbd5e1",
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                            fontFamily: "Arial, sans-serif",
                            fontSize: 13,
                            lineHeight: 1.6,
                            color: "#1e293b" }}
                    >
                        {/* Sender Return Address Line */}
                        <div style={{ fontSize: 10, color: "#64748b", borderBottom: "1px solid #e2e8f0", paddingBottom: 4, marginBottom: 20 }}>
                            {creditorName} • {creditorAddress.replace(/\n/g, ", ")}
                        </div>

                        {/* Recipient Address */}
                        <div style={{ marginBottom: 30, whiteSpace: "pre-line", minHeight: 70 }}>
                            <strong>{debtorName}</strong>
                            {"\n"}
                            {debtorAddress}
                        </div>

                        {/* Date & Location */}
                        <div style={{ textAlign: "right", marginBottom: 20, color: "#64748b" }}>
                            {new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </div>

                        {/* Subject */}
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
                            {calculation.letterSubject}
                        </div>

                        {/* Body Paragraphs */}
                        <p>Sehr geehrte Damen und Herren,</p>

                        <p>{calculation.introParagraph}</p>

                        <div style={{ background: "#f8fafc", padding: 16, borderRadius: 8, margin: "16px 0", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontWeight: 600, marginBottom: 8 }}>Aufstellung der fälligen Forderung:</div>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                <tbody>
                                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                                        <td style={{ padding: "4px 0" }}>Ursprünglicher Rechnungsbetrag:</td>
                                        <td style={{ textAlign: "right", fontWeight: 600 }}>{amount.toFixed(2)} €</td>
                                    </tr>
                                    {calculation.interestAmount > 0 && (
                                        <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                                            <td style={{ padding: "4px 0" }}>
                                                Verzugszinsen ({calculation.daysOverdue} Tage Verzug, {calculation.interestRatePercent.toFixed(2)} % p.a.):
                                            </td>
                                            <td style={{ textAlign: "right", fontWeight: 600 }}>{calculation.interestAmount.toFixed(2)} €</td>
                                        </tr>
                                    )}
                                    {calculation.statutoryLumpSum > 0 && (
                                        <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                                            <td style={{ padding: "4px 0" }}>Gesetzliche Verzugspauschale (§ 288 Abs. 5 BGB):</td>
                                            <td style={{ textAlign: "right", fontWeight: 600 }}>{calculation.statutoryLumpSum.toFixed(2)} €</td>
                                        </tr>
                                    )}
                                    {calculation.mahngebuehr > 0 && (
                                        <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                                            <td style={{ padding: "4px 0" }}>Mahngebühren / Bearbeitungsaufwand:</td>
                                            <td style={{ textAlign: "right", fontWeight: 600 }}>{calculation.mahngebuehr.toFixed(2)} €</td>
                                        </tr>
                                    )}
                                    <tr>
                                        <td style={{ padding: "8px 0 0", fontWeight: 700, fontSize: 14 }}>Zu zahlender Gesamtbetrag:</td>
                                        <td style={{ textAlign: "right", fontWeight: 700, fontSize: 14, color: "#2563eb", padding: "8px 0 0" }}>
                                            {calculation.totalDue.toFixed(2)} €
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <p>{calculation.legalNote}</p>

                        <div style={{ background: "#eff6ff", padding: 12, borderRadius: 6, margin: "16px 0", borderLeft: "4px solid #2563eb" }}>
                            <strong>Bankverbindung:</strong>
                            <div>Empfänger: {creditorName}</div>
                            <div>IBAN: {creditorIban}</div>
                            {creditorBic && <div>BIC: {creditorBic} • Bank: {creditorBankName}</div>}
                        </div>

                        <p>{calculation.closingParagraph}</p>

                        <div style={{ marginTop: 30 }}>
                            <p>Mit freundlichen Grüßen</p>
                            <p style={{ fontWeight: 600, marginTop: 24 }}>{creditorName}</p>
                        </div>
                    </div>

                    {/* Rechly Upsell Widget */}
                    <div style={{ marginTop: 20, textAlign: "center" }}>
                        <Link href="/register" style={{ fontSize: 13, color: "#2563eb", fontWeight: 600 }}>
                            Mahnläufe automatisieren & Zahlungen tracken mit Rechly →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
