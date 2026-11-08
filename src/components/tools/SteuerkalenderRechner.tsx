"use client";

import React, { useState, useMemo } from "react";
import { Radio, Card, Tag, Button, Switch, Space, Table } from "antd";
import {
    DownloadOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    InfoCircleOutlined } from "@ant-design/icons";
import { getTaxDeadlines2026, generateIcsCalendar, TaxDeadline } from "@/lib/tools/taxDeadlines";


export default function SteuerkalenderRechner() {
    const [ustInterval, setUstInterval] = useState<"month" | "quarter" | "none">("quarter");
    const [hasDauerfristverlaengerung, setHasDauerfristverlaengerung] = useState<boolean>(true);
    const [isEmployer, setIsEmployer] = useState<boolean>(false);
    const [isGmbH, setIsGmbH] = useState<boolean>(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

    const deadlines = useMemo(() => {
        return getTaxDeadlines2026({
            ustInterval,
            hasDauerfristverlaengerung,
            isEmployer,
            isGmbH });
    }, [ustInterval, hasDauerfristverlaengerung, isEmployer, isGmbH]);

    const filteredDeadlines = useMemo(() => {
        if (selectedCategory === "ALL") return deadlines;
        return deadlines.filter((d) => d.category === selectedCategory);
    }, [deadlines, selectedCategory]);

    const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

    const downloadIcs = () => {
        const icsContent = generateIcsCalendar(filteredDeadlines);
        const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "Rechly_Steuerkalender_2026.ics";
        link.click();
        URL.revokeObjectURL(url);
    };

    const formatDate = (iso: string) => {
        const [y, m, d] = iso.split("-");
        return `${d}.${m}.${y}`;
    };

    const getStatusTag = (dueDate: string) => {
        if (dueDate < todayStr) {
            return <Tag color="default">Vergangen</Tag>;
        }
        const diffDays = Math.floor(
            (new Date(dueDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays <= 7) {
            return <Tag color="red" icon={<ExclamationCircleOutlined />}>In {diffDays} Tagen fällig</Tag>;
        }
        if (diffDays <= 30) {
            return <Tag color="orange" icon={<ClockCircleOutlined />}>Diesen Monat</Tag>;
        }
        return <Tag color="green" icon={<CheckCircleOutlined />}>Geplant</Tag>;
    };

    const getCategoryBadge = (cat: TaxDeadline["category"]) => {
        switch (cat) {
            case "USt":
                return <Tag color="blue">Umsatzsteuer</Tag>;
            case "ESt":
                return <Tag color="purple">Einkommensteuer</Tag>;
            case "GewSt":
                return <Tag color="gold">Gewerbesteuer</Tag>;
            case "LSt":
                return <Tag color="cyan">Lohnsteuer</Tag>;
            default:
                return <Tag color="magenta">Erklärung</Tag>;
        }
    };

    const columns = [
        {
            title: "Fälligkeit (Zahlung)",
            dataIndex: "dueDate",
            key: "dueDate",
            width: 170,
            render: (dueDate: string, record: TaxDeadline) => (
                <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
                        {formatDate(dueDate)}
                    </div>
                    {record.nominalDate !== dueDate && (
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                            Verschoben von {formatDate(record.nominalDate)} (§ 108 AO)
                        </div>
                    )}
                </div>
            ) },
        {
            title: "Steuerart & Bezeichnung",
            key: "title",
            render: (_: unknown, record: TaxDeadline) => (
                <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        {getCategoryBadge(record.category)}
                        <strong style={{ fontSize: 14, color: "#0f172a" }}>{record.title}</strong>
                    </div>
                    <div style={{ fontSize: 13, color: "#475569" }}>{record.description}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                        Rechtsgrundlage: {record.legalBasis}
                    </div>
                </div>
            ) },
        {
            title: "Schonfrist (§ 240 AO)",
            dataIndex: "schonfristDate",
            key: "schonfristDate",
            width: 160,
            render: (schonfristDate: string) => (
                <div>
                    <div style={{ fontWeight: 600, color: "#059669" }}>
                        bis {formatDate(schonfristDate)}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Überweisungsgutschrift</div>
                </div>
            ) },
        {
            title: "Status",
            dataIndex: "dueDate",
            key: "status",
            width: 140,
            render: (dueDate: string) => getStatusTag(dueDate) },
    ];

    return (
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "16px 8px" }}>
            {/* Filter Configuration Card */}
            <Card style={{ marginBottom: 24, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: 8, color: "#334155" }}>
                            USt-Voranmeldung Intervall:
                        </div>
                        <Radio.Group
                            value={ustInterval}
                            onChange={(e) => setUstInterval(e.target.value)}
                            buttonStyle="solid"
                        >
                            <Radio.Button value="quarter">Vierteljährlich</Radio.Button>
                            <Radio.Button value="month">Monatlich</Radio.Button>
                            <Radio.Button value="none">Kleinunternehmer (Keine)</Radio.Button>
                        </Radio.Group>
                    </div>

                    <div>
                        <div style={{ fontWeight: 600, marginBottom: 8, color: "#334155" }}>
                            Rechtsform / Unternehmenstyp:
                        </div>
                        <Radio.Group
                            value={isGmbH ? "gmbh" : "freelancer"}
                            onChange={(e) => setIsGmbH(e.target.value === "gmbh")}
                            buttonStyle="solid"
                        >
                            <Radio.Button value="freelancer">Freiberufler / Einzelunternehmer</Radio.Button>
                            <Radio.Button value="gmbh">GmbH / UG (haftungsbeschränkt)</Radio.Button>
                        </Radio.Group>
                    </div>

                    <div>
                        <div style={{ fontWeight: 600, marginBottom: 8, color: "#334155" }}>
                            Sonderregelungen & Optionen:
                        </div>
                        <Space direction="vertical">
                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                                <Switch
                                    size="small"
                                    checked={hasDauerfristverlaengerung}
                                    onChange={setHasDauerfristverlaengerung}
                                />
                                <span>Dauerfristverlängerung (§ 46 UStDV, +1 Monat)</span>
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                                <Switch
                                    size="small"
                                    checked={isEmployer}
                                    onChange={setIsEmployer}
                                />
                                <span>Arbeitgeber (Lohnsteuer-Anmeldung)</span>
                            </label>
                        </Space>
                    </div>
                </div>
            </Card>

            {/* Quick Actions & Category Filter */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 16 }}
            >
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Button
                        type={selectedCategory === "ALL" ? "primary" : "default"}
                        size="small"
                        onClick={() => setSelectedCategory("ALL")}
                    >
                        Alle ({deadlines.length})
                    </Button>
                    <Button
                        type={selectedCategory === "USt" ? "primary" : "default"}
                        size="small"
                        onClick={() => setSelectedCategory("USt")}
                    >
                        Umsatzsteuer
                    </Button>
                    <Button
                        type={selectedCategory === "ESt" ? "primary" : "default"}
                        size="small"
                        onClick={() => setSelectedCategory("ESt")}
                    >
                        Einkommensteuer
                    </Button>
                    <Button
                        type={selectedCategory === "GewSt" ? "primary" : "default"}
                        size="small"
                        onClick={() => setSelectedCategory("GewSt")}
                    >
                        Gewerbesteuer
                    </Button>
                    {isEmployer && (
                        <Button
                            type={selectedCategory === "LSt" ? "primary" : "default"}
                            size="small"
                            onClick={() => setSelectedCategory("LSt")}
                        >
                            Lohnsteuer
                        </Button>
                    )}
                </div>

                <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={downloadIcs}
                    style={{ background: "#2563eb", borderColor: "#2563eb", fontWeight: 600 }}
                >
                    Kalenderdatei (.ics) herunterladen
                </Button>
            </div>

            {/* Table of Deadlines */}
            <Card style={{ borderRadius: 12, border: "1px solid #e2e8f0", overflowX: "auto" }}>
                <Table
                    columns={columns}
                    dataSource={filteredDeadlines.map((d) => ({ ...d, key: d.id }))}
                    pagination={false}
                    size="middle"
                />
            </Card>

            {/* Statutory Legal Tip Box */}
            <div
                style={{
                    marginTop: 20,
                    padding: 16,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 8,
                    fontSize: 13,
                    color: "#166534",
                    display: "flex",
                    gap: 12 }}
            >
                <InfoCircleOutlined style={{ fontSize: 18, color: "#16a34a", marginTop: 2 }} />
                <div>
                    <strong>Tipp zur 3-Tage-Schonfrist nach § 240 Abs. 3 AO:</strong> Bei Banküberweisungen gilt
                    die Zahlung erst dann als säumig, wenn sie nicht innerhalb von drei Tagen nach Ablauf des
                    Fälligkeitstags eingeht. Fällt der letzte Tag der Schonfrist auf ein Wochenende oder einen
                    Feiertag, verlängert sich der Zahlungszeitraum bis zum nächsten Werktag.
                </div>
            </div>
        </div>
    );
}
