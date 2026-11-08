"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Input, InputNumber, Button, Card, Typography, Alert, Space } from "antd";
import {
    QrcodeOutlined,
    DownloadOutlined,
    CopyOutlined,
    CheckOutlined,
    LinkOutlined } from "@ant-design/icons";
import QRCode from "qrcode";
import { buildGirocodePayload, GirocodeInput } from "@/lib/girocode";
import { useSearchParams } from "next/navigation";

const { Text } = Typography;

export default function GiroCodeGenerator() {
    const searchParams = useSearchParams();
    const [recipient, setRecipient] = useState(searchParams?.get("recipient") || "");
    const [iban, setIban] = useState(searchParams?.get("iban") || "");
    const [bic, setBic] = useState(searchParams?.get("bic") || "");
    const [amount, setAmount] = useState<number>(
        searchParams?.get("amount") ? parseFloat(searchParams.get("amount")!) : 100.0
    );
    const [reference, setReference] = useState(searchParams?.get("reference") || "Rechnung RE-2026-001");
    const [qrDataUrl, setQrDataUrl] = useState<string>("");
    const [copied, setCopied] = useState(false);
    const [errorMsg] = useState<string | null>(null);

    // Format IBAN with spaces
    const formatIban = (val: string) => {
        const clean = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        return clean.replace(/(.{4})/g, "$1 ").trim();
    };

    const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIban(formatIban(e.target.value));
    };

    const validation = useMemo(() => {
        const cleanIban = iban.replace(/\s/g, "");
        if (!cleanIban || !recipient || !amount || amount <= 0) {
            return { payload: null, error: null };
        }

        if (cleanIban.length < 15) {
            return { payload: null, error: "Die IBAN ist noch unvollständig." };
        }

        const input: GirocodeInput = {
            name: recipient,
            iban: cleanIban,
            bic: bic || undefined,
            amount,
            reference };

        const payload = buildGirocodePayload(input);
        if (!payload) {
            return {
                payload: null,
                error: "GiroCode-Payload konnte nicht erzeugt werden. Bitte Angaben prüfen." };
        }

        return { payload, error: null };
    }, [recipient, iban, bic, amount, reference]);

    useEffect(() => {
        let isCurrent = true;

        if (!validation.payload) {
            Promise.resolve().then(() => {
                if (isCurrent) setQrDataUrl("");
            });
            return () => {
                isCurrent = false;
            };
        }

        QRCode.toDataURL(validation.payload, {
            errorCorrectionLevel: "M",
            margin: 2,
            width: 320,
            color: {
                dark: "#0f172a",
                light: "#ffffff" } })
            .then((url) => {
                if (isCurrent) setQrDataUrl(url);
            })
            .catch((err) => {
                console.error("QR Code generation error:", err);
            });

        return () => {
            isCurrent = false;
        };
    }, [validation.payload]);

    const downloadQr = () => {
        if (!qrDataUrl) return;
        const link = document.createElement("a");
        link.href = qrDataUrl;
        link.download = `GiroCode_${recipient.replace(/\s+/g, "_") || "SEPA"}.png`;
        link.click();
    };

    const copyImage = async () => {
        if (!qrDataUrl || typeof window === "undefined" || !navigator.clipboard) return;
        try {
            const res = await fetch(qrDataUrl);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            alert("Kopieren nicht unterstützt. Bitte Bild herunterladen.");
        }
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 32 }}>
            {/*  Column */}
            <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#0f172a" }}>
                    Überweisungsdaten eingeben
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#334155" }}>
                            Zahlungsempfänger (Name / Firma) *
                        </label>
                        <Input
                            placeholder="z. B. Max Mustermann IT Services"
                            value={recipient}
                            maxLength={70}
                            onChange={(e) => setRecipient(e.target.value)}
                            size="large"
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#334155" }}>
                            IBAN des Empfängers *
                        </label>
                        <Input
                            placeholder="z. B. DE89 3704 0044 0532 0130 00"
                            value={iban}
                            onChange={handleIbanChange}
                            maxLength={34}
                            size="large"
                        />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#334155" }}>
                                Betrag (EUR) *
                            </label>
                            <InputNumber
                                min={0.01}
                                max={999999.99}
                                step={0.01}
                                precision={2}
                                value={amount}
                                onChange={(val) => setAmount(val || 0)}
                                style={{ width: "100%" }}
                                size="large"
                                addonAfter="€"
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#334155" }}>
                                BIC (Optional)
                            </label>
                            <Input
                                placeholder="z. B. COBADEFFXXX"
                                value={bic}
                                onChange={(e) => setBic(e.target.value.toUpperCase())}
                                size="large"
                                maxLength={11}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#334155" }}>
                            Verwendungszweck (max. 140 Zeichen)
                        </label>
                        <Input.TextArea
                            rows={2}
                            placeholder="z. B. Rechnungsnummer RE-2026-0042, Kundennummer 104"
                            value={reference}
                            maxLength={140}
                            showCount
                            onChange={(e) => setReference(e.target.value)}
                        />
                    </div>

                    {(validation.error || errorMsg) && (
                        <Alert
                            type="warning"
                            showIcon
                            message={validation.error || errorMsg}
                            style={{ borderRadius: 6 }}
                        />
                    )}
                </div>
            </div>

            {/* Live QR Preview & Payment Slip */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Card
                    style={{
                        width: "100%",
                        maxWidth: 380,
                        textAlign: "center",
                        borderRadius: 14,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
                        background: "#ffffff" }}
                >
                    <div
                        style={{
                            background: "#0f172a",
                            color: "#ffffff",
                            padding: "8px 12px",
                            borderRadius: "8px 8px 0 0",
                            margin: "-24px -24px 20px -24px",
                            fontSize: 13,
                            fontWeight: 700,
                            letterSpacing: 0.5 }}
                    >
                        EPC-QR-CODE (GiroCode)
                    </div>

                    {qrDataUrl ? (
                        <div>
                            {/* next/image can't optimize runtime-generated QR data URLs */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={qrDataUrl}
                                alt="GiroCode für SEPA Überweisung"
                                style={{
                                    width: 220,
                                    height: 220,
                                    margin: "0 auto 16px auto",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 8,
                                    padding: 8,
                                    background: "#ffffff" }}
                            />

                            <div style={{ fontSize: 13, color: "#475569", marginBottom: 16 }}>
                                <div>
                                    <strong>Empfänger:</strong> {recipient}
                                </div>
                                <div style={{ fontSize: 12, color: "#64748b" }}>{iban}</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: "#2563eb", marginTop: 4 }}>
                                    {amount.toFixed(2)} €
                                </div>
                            </div>

                            <Space wrap style={{ justifyContent: "center" }}>
                                <Button
                                    type="primary"
                                    icon={<DownloadOutlined />}
                                    onClick={downloadQr}
                                    style={{ background: "#2563eb" }}
                                >
                                    PNG herunterladen
                                </Button>
                                <Button
                                    icon={copied ? <CheckOutlined style={{ color: "#059669" }} /> : <CopyOutlined />}
                                    onClick={copyImage}
                                >
                                    {copied ? "Kopiert!" : "Bild kopieren"}
                                </Button>
                            </Space>
                        </div>
                    ) : (
                        <div
                            style={{
                                padding: "48px 16px",
                                color: "#94a3b8",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 12 }}
                        >
                            <QrcodeOutlined style={{ fontSize: 64, color: "#cbd5e1" }} />
                            <Text type="secondary">
                                Bitte Empfänger, IBAN und Betrag eingeben, um den GiroCode live zu erstellen.
                            </Text>
                        </div>
                    )}
                </Card>

                <div
                    style={{
                        marginTop: 20,
                        background: "#eff6ff",
                        padding: "12px 16px",
                        borderRadius: 8,
                        fontSize: 13,
                        color: "#1e40af",
                        width: "100%",
                        maxWidth: 380,
                        display: "flex",
                        alignItems: "center",
                        gap: 10 }}
                >
                    <LinkOutlined style={{ fontSize: 18 }} />
                    <span>
                        Kann mit jeder deutschen Banking-App (Sparkasse, Deutsche Bank, ING, DKB, N26, etc.) sofort
                        gescannt werden.
                    </span>
                </div>
            </div>
        </div>
    );
}
