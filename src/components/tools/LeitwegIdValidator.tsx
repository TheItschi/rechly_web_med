"use client";

import React, { useState, useMemo } from "react";
import { Input, Button, Card, Typography, Tag } from "antd";
import {
    CheckCircleOutlined,
    CloseCircleOutlined } from "@ant-design/icons";
import { validateLeitwegId, LeitwegIdValidationResult } from "@/lib/tools/leitwegId";
import Link from "next/link";

const { Text } = Typography;

export default function LeitwegIdValidator() {
    const [inputVal, setInputVal] = useState<string>("04011000-12345-67");

    const result: LeitwegIdValidationResult = useMemo(() => {
        return validateLeitwegId(inputVal);
    }, [inputVal]);

    return (
        <div>
            {/* Input Section */}
            <div style={{ maxWidth: 640, marginBottom: 28 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#334155" }}>
                    B2G Leitweg-ID eingeben (KoSIT Standard für XRechnung) *
                </label>
                <Input
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder="z. B. 04011000-12345-67 oder 991-12345-67"
                    size="large"
                    style={{ fontFamily: "monospace", fontSize: 16 }}
                />
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                    Prüft Struktur nach KoSIT-Standard und berechnet die mathematische ISO 7064 Mod 97-10 Prüfziffer.
                </div>
            </div>

            {/* Validation Outcome Card */}
            <Card
                style={{
                    borderRadius: 12,
                    border: result.isValid ? "2px solid #10b981" : "2px solid #f59e0b",
                    background: result.isValid ? "#f0fdf4" : "#fffbeb",
                    marginBottom: 28 }}
            >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    {result.isValid ? (
                        <CheckCircleOutlined style={{ fontSize: 32, color: "#059669" }} />
                    ) : (
                        <CloseCircleOutlined style={{ fontSize: 32, color: "#d97706" }} />
                    )}
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#0f172a" }}>
                                {result.isValid
                                    ? "Leitweg-ID ist formell & rechnerisch gültig"
                                    : "Validierungsfehler in der Leitweg-ID"}
                            </h3>
                            <Tag color={result.isValid ? "success" : "warning"} style={{ fontWeight: 700 }}>
                                {result.isValid ? "MOD-97 VALID" : "UNGÜLTIG"}
                            </Tag>
                        </div>

                        {result.errors.length > 0 ? (
                            <ul style={{ margin: "8px 0 0 0", paddingLeft: 18, color: "#b45309", fontSize: 14 }}>
                                {result.errors.map((err, idx) => (
                                    <li key={idx}>{err}</li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ margin: "6px 0 0 0", color: "#166534", fontSize: 14 }}>
                                Die Prüfziffer ({result.checksum}) entspricht exakt der mathematischen Berechnung nach
                                ISO 7064 Mod 97-10. Das zuständige Portal (ZRE / OZG-RE) wird diese ID akzeptieren.
                            </p>
                        )}
                    </div>
                </div>
            </Card>

            {/* Anatomy Breakdown */}
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#0f172a" }}>
                Aufbau & Bestandteile deiner Leitweg-ID
            </h3>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 16,
                    marginBottom: 28 }}
            >
                <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                        Zuständige Behörde / Ebene
                    </Text>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                        {result.federalState || "–"}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        Ermittelt aus den ersten 2 Ziffern
                    </div>
                </Card>

                <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                        Grobadressierung
                    </Text>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                        {result.coarseAddress || "–"}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        Kennung der übergeordneten Körperschaft
                    </div>
                </Card>

                <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                        Feinadressierung
                    </Text>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                        {result.fineAddress || "–"}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        Konkrete Fachabteilung / Dienststelle
                    </div>
                </Card>

                <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                        Prüfziffer (Mod 97-10)
                    </Text>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#2563eb", marginTop: 4 }}>
                        {result.checksum || "–"}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        Soll-Prüfziffer: {result.calculatedChecksum || "–"}
                    </div>
                </Card>
            </div>

            {/* Cross-Tool Chaining Action */}
            <div
                style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "20px 24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 16 }}
            >
                <div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                        XRechnung für Bundes- oder Landesbehörden erstellen?
                    </h4>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                        Rechly unterstützt den vollständigen XRechnung 3.0 Standard inklusive Leitweg-ID und Buyer Reference.
                    </p>
                </div>

                <Link href="/e-rechnung-software">
                    <Button type="primary" style={{ background: "#2563eb" }}>
                        XRechnung in Rechly erstellen
                    </Button>
                </Link>
            </div>
        </div>
    );
}
