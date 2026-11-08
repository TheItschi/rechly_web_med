"use client";

import React, { useState, useMemo } from "react";
import { Select, InputNumber, Card, Button, Tag, Table } from "antd";
import {
    DownloadOutlined,
    InfoCircleOutlined } from "@ant-design/icons";
import { calculateAfa, BMF_ASSET_PRESETS } from "@/lib/tools/afa";


export default function AfaRechner() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [selectedPreset, setSelectedPreset] = useState<string>("laptop_pc");
    const [netCost, setNetCost] = useState<number>(1450);
    const [purchaseMonth, setPurchaseMonth] = useState<number>(currentMonth);
    const [purchaseYear, setPurchaseYear] = useState<number>(currentYear >= 2026 ? currentYear : 2026);
    const [usefulLifeYears, setUsefulLifeYears] = useState<number>(1);
    const [marginalTaxRate] = useState<number>(35);

    const handlePresetChange = (presetId: string) => {
        setSelectedPreset(presetId);
        const p = BMF_ASSET_PRESETS.find((x) => x.id === presetId);
        if (p) {
            setUsefulLifeYears(p.usefulLifeYears);
        }
    };

    const calculation = useMemo(() => {
        return calculateAfa({
            netCost: netCost || 0,
            purchaseMonth,
            purchaseYear,
            usefulLifeYears: usefulLifeYears || 1,
            marginalTaxRatePercent: marginalTaxRate || 35 });
    }, [netCost, purchaseMonth, purchaseYear, usefulLifeYears, marginalTaxRate]);

    const exportCsv = () => {
        const headers = ["Jahr", "Buchwert Beginn (€)", "AfA Betrag (€)", "Restbuchwert 31.12. (€)", "Monate"];
        const rows = calculation.schedule.map((r) => [
            r.year,
            r.openingBookValue.toFixed(2),
            r.depreciationAmount.toFixed(2),
            r.closingBookValue.toFixed(2),
            r.monthsDepreciated,
        ]);

        const csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.map((r) => r.join(";")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `AfA_Abschreibungsplan_${purchaseYear}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const columns = [
        {
            title: "Wirtschaftsjahr",
            dataIndex: "year",
            key: "year",
            render: (year: number) => <strong>{year}</strong> },
        {
            title: "Buchwert Beginn",
            dataIndex: "openingBookValue",
            key: "openingBookValue",
            render: (val: number) => `${val.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €` },
        {
            title: "AfA-Betrag",
            dataIndex: "depreciationAmount",
            key: "depreciationAmount",
            render: (val: number) => (
                <span style={{ fontWeight: 700, color: "#2563eb" }}>
                    {val.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </span>
            ) },
        {
            title: "Restbuchwert zum 31.12.",
            dataIndex: "closingBookValue",
            key: "closingBookValue",
            render: (val: number) => (
                <span style={{ color: val === 0 ? "#16a34a" : "#0f172a" }}>
                    {val.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </span>
            ) },
        {
            title: "Monate",
            dataIndex: "monthsDepreciated",
            key: "monthsDepreciated",
            render: (val: number) => <Tag color={val === 12 ? "blue" : "orange"}>{val} / 12</Tag> },
    ];

    const monthOptions = [
        { label: "Januar", value: 1 },
        { label: "Februar", value: 2 },
        { label: "März", value: 3 },
        { label: "April", value: 4 },
        { label: "Mai", value: 5 },
        { label: "Juni", value: 6 },
        { label: "Juli", value: 7 },
        { label: "August", value: 8 },
        { label: "September", value: 9 },
        { label: "Oktober", value: 10 },
        { label: "November", value: 11 },
        { label: "Dezember", value: 12 },
    ];

    return (
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "16px 8px" }}>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
                <Card style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>AfA im 1. Jahr ({purchaseYear})</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#2563eb", marginTop: 4 }}>
                        {calculation.firstYearAfa.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                        Pro-rata temporis ({13 - purchaseMonth} Monate)
                    </div>
                </Card>

                <Card style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Jährliche Regel-AfA</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
                        {calculation.annualLinearAfaFullYear.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                        AfA-Satz: {calculation.annualAfaRatePercent} % p.a.
                    </div>
                </Card>

                <Card style={{ borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                    <div style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>Steuerersparnis (ca.)</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#15803d", marginTop: 4 }}>
                        {calculation.estimatedTaxSavings.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                    </div>
                    <div style={{ fontSize: 11, color: "#166534", marginTop: 4 }}>
                        Bei {marginalTaxRate} % Grenzsteuersatz
                    </div>
                </Card>

                <Card style={{ borderRadius: 12, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                    <div style={{ fontSize: 12, color: "#1e40af", fontWeight: 600 }}>Einstufung</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e40af", marginTop: 8 }}>
                        {calculation.isGwg ? "GWG Sofortabschreibung" : "Reguläre AfA"}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                        Grenze: 800,00 € netto
                    </div>
                </Card>
            </div>

            {/* Input Config Card */}
            <Card
                title="Wirtschaftsgut & Anschaffungsdaten"
                style={{ borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 24 }}
            >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                    <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                            Wirtschaftsgut-Vorlage (Amtliche BMF AfA-Tabelle)
                        </label>
                        <Select
                            value={selectedPreset}
                            onChange={handlePresetChange}
                            style={{ width: "100%" }}
                            options={[
                                ...BMF_ASSET_PRESETS.map((p) => ({
                                    label: `${p.name} (${p.usefulLifeYears} ${p.usefulLifeYears === 1 ? "Jahr" : "Jahre"})`,
                                    value: p.id })),
                                { label: "Individuelle Nutzungsdauer eingeben", value: "custom" },
                            ]}
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                            Anschaffungskosten Netto (€)
                        </label>
                        <InputNumber
                            value={netCost}
                            onChange={(v) => setNetCost(v || 0)}
                            style={{ width: "100%" }}
                            precision={2}
                            prefix="€"
                        />
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                            Brutto (inkl. 19% USt): {calculation.grossCost.toFixed(2)} €
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                            Kaufmonat & Kaufjahr
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 8 }}>
                            <Select
                                value={purchaseMonth}
                                onChange={setPurchaseMonth}
                                options={monthOptions}
                            />
                            <InputNumber
                                value={purchaseYear}
                                onChange={(v) => setPurchaseYear(v || currentYear)}
                                style={{ width: "100%" }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                            Nutzungsdauer (Jahre)
                        </label>
                        <InputNumber
                            value={usefulLifeYears}
                            onChange={(v) => setUsefulLifeYears(v || 1)}
                            style={{ width: "100%" }}
                            min={1}
                            max={50}
                        />
                    </div>
                </div>

                {/* Tax Note Alert */}
                <div style={{ marginTop: 16, padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#334155" }}>
                    <InfoCircleOutlined style={{ color: "#2563eb", marginRight: 8 }} />
                    {calculation.recommendation}
                </div>
            </Card>

            {/* Amortization Schedule Table */}
            <Card
                title="Vollständiger Abschreibungsplan nach § 7 EStG"
                style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                extra={
                    <Button icon={<DownloadOutlined />} onClick={exportCsv} size="small">
                        Plan als CSV exportieren
                    </Button>
                }
            >
                <Table
                    columns={columns}
                    dataSource={calculation.schedule.map((s) => ({ ...s, key: s.year }))}
                    pagination={false}
                    size="middle"
                />
            </Card>
        </div>
    );
}
