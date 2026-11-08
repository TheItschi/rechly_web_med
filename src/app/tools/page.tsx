"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Input, Tag, Card, Typography } from "antd";
import {
    SearchOutlined,
    AppstoreOutlined,
    CheckCircleOutlined,
    SafetyCertificateOutlined,
    ArrowRightOutlined,
    QrcodeOutlined,
    FileSearchOutlined,
    DollarOutlined,
    PercentageOutlined,
    CalculatorOutlined,
    ShopOutlined,
    FileProtectOutlined,
    CoffeeOutlined,
    CalendarOutlined,
    AuditOutlined,
    BankOutlined,
    CompassOutlined,
    SolutionOutlined,
    ToolOutlined,
    FileTextOutlined,
    SnippetsOutlined,
    CarOutlined,
    RollbackOutlined,
    ClockCircleOutlined,
    LineChartOutlined } from "@ant-design/icons";
import { TOOLS_CATALOG } from "@/lib/tools/catalog";
import { getSiteUrl } from "@/lib/env";

const { Text } = Typography;
const siteUrl = getSiteUrl();

const ICON_MAP: Record<string, React.ReactNode> = {
    FileSearchOutlined: <FileSearchOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    QrcodeOutlined: <QrcodeOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    DollarOutlined: <DollarOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    SafetyCertificateOutlined: <SafetyCertificateOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    PercentageOutlined: <PercentageOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    CalculatorOutlined: <CalculatorOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    ShopOutlined: <ShopOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    FileProtectOutlined: <FileProtectOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    CoffeeOutlined: <CoffeeOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    CalendarOutlined: <CalendarOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    AuditOutlined: <AuditOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    BankOutlined: <BankOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    CompassOutlined: <CompassOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    SolutionOutlined: <SolutionOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    ToolOutlined: <ToolOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    FileTextOutlined: <FileTextOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    SnippetsOutlined: <SnippetsOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    CarOutlined: <CarOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    RollbackOutlined: <RollbackOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    ClockCircleOutlined: <ClockCircleOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
    LineChartOutlined: <LineChartOutlined style={{ fontSize: 24, color: "#2563eb" }} /> };

const CATEGORIES = [
    "Alle",
    "Tagesgeschäft & E-Rechnung",
    "Finanzen & Steuern",
    "Kalkulation & HR",
    "Recht & Vorlagen",
] as const;

export default function ToolsHubPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("Alle");

    const filteredTools = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        return TOOLS_CATALOG.filter((tool) => {
            const matchesCategory =
                selectedCategory === "Alle" || tool.category === selectedCategory;
            const matchesSearch =
                !query ||
                tool.title.toLowerCase().includes(query) ||
                tool.shortTitle.toLowerCase().includes(query) ||
                tool.description.toLowerCase().includes(query) ||
                tool.keywords.some((k) => k.toLowerCase().includes(query));

            return matchesCategory && matchesSearch;
        });
    }, [searchQuery, selectedCategory]);

    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "@id": `${siteUrl}/tools#collection`,
                name: "Kostenlose Business-Tools & Rechner für deutsche Unternehmen | Rechly",
                url: `${siteUrl}/tools`,
                description:
                    "Die deutsche Business-Superapp: Kostenlose Rechner, E-Rechnung Viewer, GiroCode Generator, Verzugszinsen, USt-IdNr.-Prüfer und Vorlagen ohne Registrierung.",
                inLanguage: "de-DE",
                isPartOf: {
                    "@id": `${siteUrl}/#website` },
                hasPart: TOOLS_CATALOG.map((tool) => ({
                    "@type": "SoftwareApplication",
                    name: tool.title,
                    url: `${siteUrl}${tool.path}`,
                    applicationCategory: "BusinessApplication",
                    offers: {
                        "@type": "Offer",
                        price: "0",
                        priceCurrency: "EUR" } })) },
        ] };

    return (
        <div style={{ background: "#f8fafc", minHeight: "100vh", color: "#1e293b" }}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Navbar />

            {/* Hero Section */}
            <header
                style={{
                    paddingTop: 110,
                    paddingBottom: 48,
                    background: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
                    borderBottom: "1px solid #e2e8f0",
                    textAlign: "center" }}
            >
                <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            background: "#e0f2fe",
                            color: "#0369a1",
                            padding: "6px 14px",
                            borderRadius: 20,
                            fontWeight: 700,
                            fontSize: 13,
                            marginBottom: 16 }}
                    >
                        <AppstoreOutlined />
                        RECHLY BUSINESS SUPERAPP
                    </div>

                    <h1
                        style={{
                            fontSize: "clamp(30px, 5vw, 44px)",
                            fontWeight: 900,
                            lineHeight: 1.2,
                            color: "#0f172a",
                            marginBottom: 16,
                            letterSpacing: "-0.025em" }}
                    >
                        Kostenlose Business-Tools & Rechner für dein Unternehmen
                    </h1>

                    <p
                        style={{
                            fontSize: "clamp(16px, 2vw, 19px)",
                            color: "#475569",
                            lineHeight: 1.6,
                            maxWidth: 720,
                            margin: "0 auto 28px auto" }}
                    >
                        Rechtssichere Werkzeuge für Freelancer, Kleinunternehmer, Handwerker und KMUs in Deutschland.
                        100% kostenlos, ohne Registrierung und direkt im Browser berechnet.
                    </p>

                    {/* Search Input Bar */}
                    <div style={{ maxWidth: 640, margin: "0 auto 24px auto" }}>
                        <Input
                            placeholder="Suche nach Tool, Stichwort oder Gesetz (z. B. Skonto, GiroCode, Verzugszinsen, USt-IdNr, Bautagebuch)..."
                            prefix={<SearchOutlined style={{ color: "#94a3b8", fontSize: 18, marginRight: 8 }} />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            size="large"
                            allowClear
                            style={{
                                borderRadius: 12,
                                height: 52,
                                fontSize: 16,
                                boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                                border: "1px solid #cbd5e1" }}
                        />
                    </div>

                    {/* Category Filter Chips */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 8,
                            flexWrap: "wrap" }}
                    >
                        {CATEGORIES.map((cat) => {
                            const active = selectedCategory === cat;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    style={{
                                        border: active ? "1px solid #2563eb" : "1px solid #cbd5e1",
                                        background: active ? "#2563eb" : "#ffffff",
                                        color: active ? "#ffffff" : "#475569",
                                        padding: "8px 16px",
                                        borderRadius: 20,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        transition: "all 0.15s ease" }}
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* Tools Grid Area */}
            <main style={{ maxWidth: 1140, margin: "0 auto", padding: "48px 24px" }}>
                <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text type="secondary" style={{ fontSize: 14 }}>
                        Gefundene Werkzeuge: <strong>{filteredTools.length}</strong>
                    </Text>
                    <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#059669", fontWeight: 600 }}>
                        <span>
                            <CheckCircleOutlined /> Ohne Login sofort nutzbar
                        </span>
                        <span>
                            <SafetyCertificateOutlined /> Keine Cookies für Tools erforderlich
                        </span>
                    </div>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
                        gap: 24,
                        marginBottom: 64 }}
                >
                    {filteredTools.map((tool) => (
                        <Link
                            key={tool.id}
                            href={tool.path}
                            style={{
                                textDecoration: "none",
                                color: "inherit" }}
                        >
                            <Card
                                hoverable
                                style={{
                                    height: "100%",
                                    borderRadius: 14,
                                    border: "1px solid #e2e8f0",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between" }}
                                styles={{ body: { padding: 24, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" } }}
                            >
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                        <div
                                            style={{
                                                background: "#eff6ff",
                                                padding: 10,
                                                borderRadius: 10,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center" }}
                                        >
                                            {ICON_MAP[tool.icon] || <CalculatorOutlined style={{ fontSize: 24, color: "#2563eb" }} />}
                                        </div>

                                        {tool.badge && (
                                            <Tag color="blue" style={{ fontWeight: 700, borderRadius: 10, margin: 0, padding: "2px 8px" }}>
                                                {tool.badge}
                                            </Tag>
                                        )}
                                    </div>

                                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px 0", color: "#0f172a", lineHeight: 1.35 }}>
                                        {tool.shortTitle}
                                    </h3>

                                    <p style={{ fontSize: 14, color: "#64748b", margin: 0, lineHeight: 1.55 }}>
                                        {tool.description}
                                    </p>
                                </div>

                                <div
                                    style={{
                                        marginTop: 20,
                                        paddingTop: 14,
                                        borderTop: "1px solid #f1f5f9",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center" }}
                                >
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>
                                        {tool.category}
                                    </span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "#2563eb", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                        Tool öffnen <ArrowRightOutlined style={{ fontSize: 11 }} />
                                    </span>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>

                {/* Rechly All-in-One Superapp Feature Banner */}
                <div
                    style={{
                        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                        borderRadius: 16,
                        padding: "44px 36px",
                        color: "#ffffff",
                        boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.15)",
                        marginBottom: 48 }}
                >
                    <div style={{ maxWidth: 760 }}>
                        <span
                            style={{
                                background: "rgba(59, 130, 246, 0.2)",
                                color: "#93c5fd",
                                padding: "4px 12px",
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                display: "inline-block",
                                marginBottom: 12 }}
                        >
                            Open Source Rechnungssoftware
                        </span>
                        <h2 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 12px 0", color: "#f8fafc" }}>
                            Von kostenlosen Tools zum lückenlosen Unternehmensablauf
                        </h2>
                        <p style={{ fontSize: 16, color: "#94a3b8", lineHeight: 1.6, margin: "0 0 24px 0" }}>
                            Rechly verbindet Rechnungen, E-Rechnungen (XRechnung & ZUGFeRD), Angebote,
                            Kundenverwaltung, automatische Mahnungen und Ausgaben in einer transparenten, kostenlosen Plattform.
                        </p>
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                            <Link
                                href="/register"
                                style={{
                                    background: "#2563eb",
                                    color: "#ffffff",
                                    padding: "12px 24px",
                                    borderRadius: 8,
                                    fontWeight: 700,
                                    textDecoration: "none",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8 }}
                            >
                                Kostenlos registrieren <ArrowRightOutlined />
                            </Link>
                            <Link
                                href="/features"
                                style={{
                                    background: "rgba(255,255,255,0.1)",
                                    color: "#ffffff",
                                    padding: "12px 24px",
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    textDecoration: "none",
                                    border: "1px solid rgba(255,255,255,0.2)" }}
                            >
                                Alle Funktionen ansehen
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
