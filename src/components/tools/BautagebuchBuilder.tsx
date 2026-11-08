"use client";

import React, { useState } from "react";
import { Input, InputNumber, Button, Card, DatePicker } from "antd";
import {
    PrinterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";


export default function BautagebuchBuilder() {
    const [project, setProject] = useState<string>("Sanierung Bürogebäude Alexanderplatz 12");
    const [reportDate, setReportDate] = useState<string>(dayjs().format("YYYY-MM-DD"));
    const [weather, setWeather] = useState<string>("Sonnig, trocken");
    const [temperature, setTemperature] = useState<number>(18);
    const [workersOwn, setWorkersOwn] = useState<number>(4);
    const [subcontractors, setSubcontractors] = useState<string>("Elektro Meier (2 Pers.), Sanitär Krause (3 Pers.)");
    const [workPerformed, setWorkPerformed] = useState<string>(
        "Trockenbauwände im 2. OG montiert, Spachtelarbeiten Q3 begonnen, Rohinstallation Sanitärleitungen WC-Bereich."
    );
    const [obstructions, setObstructions] = useState<string>(
        "Keine Behinderungen. Vorarbeiten der Vorunternehmer fristgerecht übergeben."
    );
    const [materials, setMaterials] = useState<string>("Lieferung 120 Gipskartonplatten, 50 Bund Ständerprofile C50.");

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
                    marginBottom: 24 }}
            >
                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Bauvorhaben / Projektname *
                    </label>
                    <Input
                        value={project}
                        onChange={(e) => setProject(e.target.value)}
                        size="large"
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Berichtstag *
                    </label>
                    <DatePicker
                        value={dayjs(reportDate)}
                        onChange={(d) => setReportDate(d ? d.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"))}
                        format="DD.MM.YYYY"
                        size="large"
                        style={{ width: "100%" }}
                    />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                            Witterung
                        </label>
                        <Input
                            value={weather}
                            onChange={(e) => setWeather(e.target.value)}
                            size="large"
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                            Temp. (°C)
                        </label>
                        <InputNumber
                            value={temperature}
                            onChange={(val) => setTemperature(val || 0)}
                            size="large"
                            style={{ width: "100%" }}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Eigene Handwerker / Mitarbeiter (Anzahl)
                    </label>
                    <InputNumber
                        min={0}
                        max={100}
                        value={workersOwn}
                        onChange={(val) => setWorkersOwn(val || 0)}
                        size="large"
                        style={{ width: "100%" }}
                    />
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Anwesende Subunternehmer / Fremdgewerke
                    </label>
                    <Input
                        value={subcontractors}
                        onChange={(e) => setSubcontractors(e.target.value)}
                        size="large"
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Ausgeführte Arbeiten am Berichtstag *
                    </label>
                    <Input.TextArea
                        rows={3}
                        value={workPerformed}
                        onChange={(e) => setWorkPerformed(e.target.value)}
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Behinderungen, Bedenken & Leistungsänderungen (§ 6 VOB/B) *
                    </label>
                    <Input.TextArea
                        rows={2}
                        value={obstructions}
                        onChange={(e) => setObstructions(e.target.value)}
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Materiallieferungen & Geräteeinsatz
                    </label>
                    <Input
                        value={materials}
                        onChange={(e) => setMaterials(e.target.value)}
                        size="large"
                    />
                </div>
            </div>

            {/* Printable Report Preview */}
            <Card
                title="Druckfertiger Bautagesbericht nach VOB/B"
                extra={
                    <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint} style={{ background: "#2563eb" }}>
                        Bautagesbericht drucken / PDF
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
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #0f172a", paddingBottom: 10, marginBottom: 16 }}>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                            BAUTAGESBERICHT / BAUTAGEBUCH
                        </h2>
                        <span style={{ fontSize: 13, color: "#64748b" }}>
                            Nach § 2 Abs. 2 & § 6 VOB/B
                        </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, fontSize: 14, marginBottom: 16 }}>
                        <div><strong>Bauvorhaben:</strong> {project}</div>
                        <div><strong>Datum:</strong> {dayjs(reportDate).format("DD.MM.YYYY")}</div>
                        <div><strong>Witterung & Temperatur:</strong> {weather}, {temperature} °C</div>
                        <div><strong>Eigene Arbeitskräfte:</strong> {workersOwn} Personen</div>
                    </div>

                    <div style={{ fontSize: 14, marginBottom: 12 }}>
                        <strong>Fremdfirmen / Nachunternehmer:</strong> {subcontractors}
                    </div>

                    <div style={{ fontSize: 14, marginBottom: 12 }}>
                        <strong>Ausgeführte Leistungen:</strong>
                        <div style={{ background: "#f8fafc", padding: 10, borderRadius: 6, marginTop: 4, border: "1px solid #e2e8f0" }}>
                            {workPerformed}
                        </div>
                    </div>

                    <div style={{ fontSize: 14, marginBottom: 12 }}>
                        <strong>Behinderungen / Bedenken (§ 6 VOB/B):</strong>
                        <div style={{ background: "#f8fafc", padding: 10, borderRadius: 6, marginTop: 4, border: "1px solid #e2e8f0" }}>
                            {obstructions}
                        </div>
                    </div>

                    <div style={{ fontSize: 14, marginBottom: 24 }}>
                        <strong>Materiallieferungen:</strong> {materials}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 32 }}>
                        <div>
                            <div style={{ borderBottom: "1px solid #000000", height: 36 }}></div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                                Bauleiter / Polier Auftragnehmer
                            </div>
                        </div>
                        <div>
                            <div style={{ borderBottom: "1px solid #000000", height: 36 }}></div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                                Kenntnisnahme Bauleitung / Auftraggeber
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
