"use client";

import React, { useState, useMemo } from "react";
import { Select, InputNumber, Table, Card, Typography, Tag, Button } from "antd";
import {
    DownloadOutlined } from "@ant-design/icons";
import { GERMAN_STATES, calculateStateWorkdays, YearWorkdayStats, MonthWorkdayStats } from "@/lib/tools/holidays";

const { Text } = Typography;

export default function ArbeitstageRechner() {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState<number>(currentYear >= 2026 ? currentYear : 2026);
    const [stateCode, setStateCode] = useState<string>("BY"); // Bayern default (most holidays)
    const [hourlyRate, setHourlyRate] = useState<number>(90);
    const [hoursPerDay, setHoursPerDay] = useState<number>(8);

    const stats: YearWorkdayStats = useMemo(() => {
        return calculateStateWorkdays(year, stateCode);
    }, [year, stateCode]);

    const potentialRevenueYearly = stats.workdays * hoursPerDay * hourlyRate;

    const exportCsv = () => {
        const headers = ["Monat", "Kalendertage", "Wochenendtage", "Feiertage", "Arbeitstage", "Feiertagsnamen"];
        const rows = stats.months.map((m) => [
            `"${m.monthName}"`,
            m.totalDays,
            m.weekendDays,
            m.holidayDays,
            m.workdays,
            `"${m.holidays.join(", ")}"`,
        ]);
        const csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.map((r) => r.join(";")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Arbeitstage_${year}_${stateCode}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const columns = [
        {
            title: "Monat",
            dataIndex: "monthName",
            key: "monthName",
            render: (text: string) => <strong>{text}</strong> },
        {
            title: "Tage gesamt",
            dataIndex: "totalDays",
            key: "totalDays" },
        {
            title: "Wochenende",
            dataIndex: "weekendDays",
            key: "weekendDays",
            render: (val: number) => <span style={{ color: "#64748b" }}>{val}</span> },
        {
            title: "Feiertage (Mo-Fr)",
            dataIndex: "holidayDays",
            key: "holidayDays",
            render: (val: number, record: MonthWorkdayStats) =>
                val > 0 ? (
                    <div>
                        <Tag color="red" style={{ fontWeight: 700 }}>
                            {val}
                        </Tag>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                            {record.holidays.join(", ")}
                        </div>
                    </div>
                ) : (
                    <span>0</span>
                ) },
        {
            title: "Arbeitstage",
            dataIndex: "workdays",
            key: "workdays",
            render: (val: number) => (
                <span style={{ fontSize: 16, fontWeight: 800, color: "#2563eb" }}>{val}</span>
            ) },
        {
            title: "Umsatzpotenzial",
            key: "revenue",
            render: (_: unknown, record: MonthWorkdayStats) => {
                const monthRevenue = record.workdays * hoursPerDay * hourlyRate;
                return (
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>
                        {monthRevenue.toLocaleString("de-DE")} €
                    </span>
                );
            } },
    ];

    return (
        <div>
            {/* Filter Bar */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 16,
                    marginBottom: 28,
                    background: "#f8fafc",
                    padding: 20,
                    borderRadius: 12,
                    border: "1px solid #e2e8f0" }}
            >
                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Jahr auswählen:
                    </label>
                    <Select
                        value={year}
                        onChange={setYear}
                        style={{ width: "100%" }}
                        size="large"
                        options={[
                            { value: 2025, label: "2025" },
                            { value: 2026, label: "2026" },
                            { value: 2027, label: "2027" },
                        ]}
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Bundesland:
                    </label>
                    <Select
                        value={stateCode}
                        onChange={setStateCode}
                        style={{ width: "100%" }}
                        size="large"
                        options={GERMAN_STATES.map((s) => ({ value: s.code, label: `${s.name} (${s.code})` }))}
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Stundensatz (Netto):
                    </label>
                    <InputNumber
                        min={10}
                        max={1000}
                        value={hourlyRate}
                        onChange={(val) => setHourlyRate(val || 0)}
                        style={{ width: "100%" }}
                        size="large"
                        addonAfter="€/Std."
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                        Arbeitsstunden / Tag:
                    </label>
                    <InputNumber
                        min={1}
                        max={14}
                        value={hoursPerDay}
                        onChange={(val) => setHoursPerDay(val || 8)}
                        style={{ width: "100%" }}
                        size="large"
                        addonAfter="Std."
                    />
                </div>
            </div>

            {/* Results KPI Grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 16,
                    marginBottom: 28 }}
            >
                <Card
                    size="small"
                    style={{
                        borderRadius: 10,
                        border: "2px solid #2563eb",
                        background: "#eff6ff" }}
                >
                    <Text style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 800, color: "#1e40af" }}>
                        Arbeitstage in {stats.stateName}
                    </Text>
                    <div style={{ fontSize: 32, fontWeight: 900, color: "#1d4ed8", marginTop: 4 }}>
                        {stats.workdays}
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#64748b" }}> Tage</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#2563eb", marginTop: 4 }}>
                        {year} ({stats.totalDays} Kalendertage)
                    </div>
                </Card>

                <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                        Gesetzliche Feiertage (Werktags)
                    </Text>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#dc2626", marginTop: 4 }}>
                        {stats.holidayDays}
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}> Feiertage</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        Fallen auf Mo–Fr
                    </div>
                </Card>

                <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                        Wochenendtage
                    </Text>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", marginTop: 4 }}>
                        {stats.weekendDays}
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}> Tage</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        Samstage & Sonntage
                    </div>
                </Card>

                <Card size="small" style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                        Maximales Umsatzpotenzial
                    </Text>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#059669", marginTop: 4 }}>
                        {potentialRevenueYearly.toLocaleString("de-DE")} €
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        Bei 100% Auslastung ({hoursPerDay}h à {hourlyRate}€)
                    </div>
                </Card>
            </div>

            {/* Monthly Table View */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#0f172a" }}>
                    Monatliche Übersicht ({year} – {stats.stateName})
                </h3>
                <Button icon={<DownloadOutlined />} onClick={exportCsv} size="small">
                    Tabelle als CSV
                </Button>
            </div>

            <Table
                dataSource={stats.months.map((m) => ({ ...m, key: m.monthIndex }))}
                columns={columns}
                pagination={false}
                size="middle"
                style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}
            />
        </div>
    );
}
