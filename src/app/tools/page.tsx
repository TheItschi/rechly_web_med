"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Input, Tag } from "antd";
import {
    SearchOutlined,
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
import s from "@/components/tools/tool.module.css";
import hub from "./tools.module.css";
import { getSiteUrl } from "@/lib/env";

const siteUrl = getSiteUrl();

const ICON_MAP: Record<string, React.ReactNode> = {
    FileSearchOutlined: <FileSearchOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    QrcodeOutlined: <QrcodeOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    DollarOutlined: <DollarOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    SafetyCertificateOutlined: <SafetyCertificateOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    PercentageOutlined: <PercentageOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    CalculatorOutlined: <CalculatorOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    ShopOutlined: <ShopOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    FileProtectOutlined: <FileProtectOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    CoffeeOutlined: <CoffeeOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    CalendarOutlined: <CalendarOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    AuditOutlined: <AuditOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    BankOutlined: <BankOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    CompassOutlined: <CompassOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    SolutionOutlined: <SolutionOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    ToolOutlined: <ToolOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    FileTextOutlined: <FileTextOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    SnippetsOutlined: <SnippetsOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    CarOutlined: <CarOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    RollbackOutlined: <RollbackOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    ClockCircleOutlined: <ClockCircleOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
    LineChartOutlined: <LineChartOutlined style={{ fontSize: 24, color: "#2855d9" }} /> };

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
        <div className={s.page}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Navbar />

            <section className={s.hero}>
                <div className={hub.hubWrap}>
                    <p className={hub.kicker}>Kostenlose Tools — ohne Registrierung</p>
                    <h1 className={hub.hubH1}>Rechner & Werkzeuge für deinen Geschäftsalltag</h1>
                    <p className={s.lede}>
                        Vom Rechnungsgenerator bis zum Verzugszinsen-Rechner: alle Tools kostenlos,
                        ohne Login und direkt im Browser. Und wenn du mehr brauchst, wächst Rechly mit —
                        Rechnungen, Kunden und Termine in einem Konto für 0 €.
                    </p>
                    <div className={hub.search}>
                        <Input
                            placeholder="Tool suchen — z. B. Skonto, GiroCode, USt-IdNr …"
                            prefix={<SearchOutlined />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            size="large"
                            allowClear
                        />
                    </div>
                    <div className={hub.chips} role="group" aria-label="Kategorie filtern">
                        {CATEGORIES.map((cat) => {
                            const active = selectedCategory === cat;
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={active ? hub.chipActive : hub.chip}
                                    aria-pressed={active}
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            <main className={hub.hubMain}>
                <div className={hub.metaRow}>
                    <span>
                        {filteredTools.length} {filteredTools.length === 1 ? "Werkzeug" : "Werkzeuge"}
                    </span>
                    <span className={hub.metaTrust}>
                        <span><CheckCircleOutlined /> Ohne Login nutzbar</span>
                        <span><SafetyCertificateOutlined /> Berechnung nur in deinem Browser</span>
                    </span>
                </div>

                {filteredTools.length === 0 ? (
                    <div className={hub.empty}>
                        <p>Kein Tool gefunden. Versuch ein anderes Stichwort — oder leg direkt los:</p>
                        <Link href="/register" className={s.ctaBtn}>
                            Kostenlos mit Rechly starten <ArrowRightOutlined />
                        </Link>
                    </div>
                ) : (
                    <div className={hub.grid}>
                        {filteredTools.map((tool) => (
                            <Link key={tool.id} href={tool.path} className={hub.card}>
                                <div>
                                    <div className={hub.cardTop}>
                                        <span className={hub.cardIcon}>
                                            {ICON_MAP[tool.icon] || <CalculatorOutlined style={{ fontSize: 22, color: "#2855d9" }} />}
                                        </span>
                                        {tool.badge && <Tag color="blue">{tool.badge}</Tag>}
                                    </div>
                                    <h2 className={hub.cardTitle}>{tool.shortTitle}</h2>
                                    <p className={hub.cardText}>{tool.description}</p>
                                </div>
                                <div className={hub.cardFoot}>
                                    <span>{tool.category}</span>
                                    <span className={hub.open}>
                                        Tool öffnen <ArrowRightOutlined style={{ fontSize: 11 }} />
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                <div className={s.cta}>
                    <div>
                        <span className={s.ctaKicker}>Mehr als Einzel-Tools</span>
                        <h2>Vom kostenlosen Tool zum kompletten Büro</h2>
                        <p>
                            Rechnungen, E-Rechnungen (XRechnung & ZUGFeRD), Angebote, Kunden,
                            Mahnungen, Ausgaben und Terminbuchung — in einer kostenlosen,
                            offenen Plattform statt in fünf Bezahl-Abos.
                        </p>
                    </div>
                    <Link href="/register" className={s.ctaBtn}>
                        Kostenlos registrieren <ArrowRightOutlined />
                    </Link>
                </div>
            </main>

            <Footer />
        </div>
    );
}
