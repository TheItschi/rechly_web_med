"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import {
    CheckCircleOutlined,
    SafetyCertificateOutlined,
    ArrowRightOutlined,
    QuestionCircleOutlined,
    AppstoreOutlined,
    PrinterOutlined,
    ShareAltOutlined,
} from "@ant-design/icons";
import { getSiteUrl } from "@/lib/env";

const siteUrl = getSiteUrl();

export interface FaqItem {
    question: string;
    answer: string;
}

export interface RelatedTool {
    title: string;
    description: string;
    href: string;
    badge?: string;
}

export interface ToolLayoutProps {
    path: string;
    title: string;
    eyebrow: string;
    description: string;
    category: string;
    keywords?: string[];
    children: ReactNode;
    guideSections?: Array<{
        title: string;
        content: string[];
        bullets?: string[];
        links?: Array<{ href: string; label: string }>;
    }>;
    faqs?: FaqItem[];
    relatedTools?: RelatedTool[];
    rechlyCtaTitle?: string;
    rechlyCtaDescription?: string;
    rechlyCtaButtonText?: string;
    rechlyCtaHref?: string;
}

export default function ToolLayout({
    path,
    title,
    description,
    category,
    children,
    guideSections = [],
    faqs = [],
    relatedTools = [],
    rechlyCtaTitle = "Rechnungen & E-Rechnungen professionell verwalten",
    rechlyCtaDescription = "Rechly ist die 100% kostenlose Open-Source Rechnungssoftware für Freelancer und kleine Unternehmen in Deutschland. XRechnung, ZUGFeRD, PDF-Export, Kunden- und Mahnwesen – alles in einem System.",
    rechlyCtaButtonText = "Kostenlos mit Rechly starten",
    rechlyCtaHref = "/register",
}: ToolLayoutProps) {
    const handleShare = () => {
        if (typeof window !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            alert("Link in die Zwischenablage kopiert!");
        }
    };

    const handlePrint = () => {
        if (typeof window !== "undefined") {
            window.print();
        }
    };

    // JSON-LD structured data for WebApplication & FAQPage
    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebApplication",
                "@id": `${siteUrl}${path}#app`,
                name: title,
                url: `${siteUrl}${path}`,
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web Browser",
                inLanguage: "de-DE",
                isAccessibleForFree: true,
                offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "EUR",
                },
                description,
            },
            {
                "@type": "BreadcrumbList",
                "@id": `${siteUrl}${path}#breadcrumb`,
                itemListElement: [
                    {
                        "@type": "ListItem",
                        position: 1,
                        name: "Startseite",
                        item: siteUrl,
                    },
                    {
                        "@type": "ListItem",
                        position: 2,
                        name: "Kostenlose Business-Tools",
                        item: `${siteUrl}/tools`,
                    },
                    {
                        "@type": "ListItem",
                        position: 3,
                        name: title,
                        item: `${siteUrl}${path}`,
                    },
                ],
            },
            ...(faqs.length > 0
                ? [
                      {
                          "@type": "FAQPage",
                          "@id": `${siteUrl}${path}#faq`,
                          mainEntity: faqs.map((faq) => ({
                              "@type": "Question",
                              name: faq.question,
                              acceptedAnswer: {
                                  "@type": "Answer",
                                  text: faq.answer,
                              },
                          })),
                      },
                  ]
                : []),
        ],
    };

    return (
        <div style={{ background: "#f8fafc", minHeight: "100vh", color: "#1e293b" }}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
            />
            <Navbar />

            {/* Top Hero Section */}
            <header
                style={{
                    paddingTop: "clamp(80px, 10vw, 110px)",
                    paddingBottom: "clamp(24px, 5vw, 40px)",
                    background: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
                    borderBottom: "1px solid #e2e8f0",
                }}
            >
                <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 clamp(16px, 4vw, 24px)" }}>
                    {/* Breadcrumbs & Category */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            flexWrap: "wrap",
                            marginBottom: 16,
                            fontSize: 13,
                        }}
                    >
                        <Link
                            href="/tools"
                            style={{
                                color: "#2563eb",
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                fontWeight: 500,
                            }}
                        >
                            <AppstoreOutlined />
                            Alle Tools & Rechner
                        </Link>
                        <span style={{ color: "#94a3b8" }}>/</span>
                        <span
                            style={{
                                background: "#e0f2fe",
                                color: "#0369a1",
                                padding: "2px 10px",
                                borderRadius: 12,
                                fontWeight: 600,
                                fontSize: 12,
                            }}
                        >
                            {category}
                        </span>
                    </div>

                    <h1
                        style={{
                            fontSize: "clamp(26px, 4vw, 36px)",
                            fontWeight: 800,
                            lineHeight: 1.25,
                            color: "#0f172a",
                            marginBottom: 16,
                            letterSpacing: "-0.02em",
                        }}
                    >
                        {title}
                    </h1>

                    <p
                        style={{
                            fontSize: "clamp(16px, 2vw, 18px)",
                            color: "#475569",
                            lineHeight: 1.6,
                            maxWidth: 820,
                            marginBottom: 20,
                        }}
                    >
                        {description}
                    </p>

                    {/* Trust Badges */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            flexWrap: "wrap",
                            fontSize: 13,
                            color: "#059669",
                            fontWeight: 600,
                        }}
                    >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <CheckCircleOutlined /> 100% Kostenlos
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <SafetyCertificateOutlined /> Ohne Registrierung
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <CheckCircleOutlined /> Direkt im Browser nutzbar
                        </span>

                        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                            <button
                                onClick={handlePrint}
                                style={{
                                    border: "1px solid #cbd5e1",
                                    background: "#ffffff",
                                    padding: "6px 12px",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    fontSize: 13,
                                    color: "#475569",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                }}
                                title="Drucken / Als PDF speichern"
                            >
                                <PrinterOutlined /> Drucken
                            </button>
                            <button
                                onClick={handleShare}
                                style={{
                                    border: "1px solid #cbd5e1",
                                    background: "#ffffff",
                                    padding: "6px 12px",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    fontSize: 13,
                                    color: "#475569",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                }}
                                title="Link kopieren"
                            >
                                <ShareAltOutlined /> Teilen
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Interactive Tool Main Area */}
            <main style={{ maxWidth: 1040, margin: "0 auto", padding: "clamp(20px, 4vw, 40px) clamp(12px, 3vw, 24px)" }}>
                <div
                    style={{
                        background: "#ffffff",
                        borderRadius: 16,
                        boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)",
                        border: "1px solid #e2e8f0",
                        padding: "clamp(16px, 3.5vw, 32px)",
                        marginBottom: 48,
                    }}
                >
                    {children}
                </div>

                {/* Rechly Cross-Tool Chaining Conversion Card */}
                <div
                    style={{
                        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                        borderRadius: 16,
                        padding: "clamp(20px, 4vw, 36px) clamp(16px, 3.5vw, 32px)",
                        color: "#ffffff",
                        marginBottom: 56,
                        boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.15)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
                        <div style={{ maxWidth: 650 }}>
                            <span
                                style={{
                                    background: "rgba(59, 130, 246, 0.2)",
                                    color: "#93c5fd",
                                    padding: "4px 12px",
                                    borderRadius: 20,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: 0.5,
                                    display: "inline-block",
                                    marginBottom: 10,
                                }}
                            >
                                Das rechly Ökosystem
                            </span>
                            <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px 0", color: "#f8fafc" }}>
                                {rechlyCtaTitle}
                            </h2>
                            <p style={{ fontSize: 15, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>
                                {rechlyCtaDescription}
                            </p>
                        </div>
                        <div style={{ alignSelf: "center" }}>
                            <Link
                                href={rechlyCtaHref}
                                style={{
                                    background: "#2563eb",
                                    color: "#ffffff",
                                    padding: "14px 26px",
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    textDecoration: "none",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 10,
                                    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.4)",
                                    fontSize: 15,
                                }}
                            >
                                {rechlyCtaButtonText}
                                <ArrowRightOutlined />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Practical Guide & Statutory Legal Background */}
                {guideSections.length > 0 && (
                    <section style={{ marginBottom: 56 }}>
                        <div style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: 12, marginBottom: 32 }}>
                            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                                Praxis-Ratgeber & Gesetzliche Grundlagen
                            </h2>
                            <p style={{ color: "#64748b", margin: "6px 0 0 0", fontSize: 15 }}>
                                Wichtige Vorschriften, Berechnungsbeispiele und Best Practices für deutsche Unternehmen.
                            </p>
                        </div>

                        <div style={{ display: "grid", gap: 28 }}>
                            {guideSections.map((sec, idx) => (
                                <article
                                    key={idx}
                                    style={{
                                        background: "#ffffff",
                                        borderRadius: 12,
                                        padding: "24px 28px",
                                        border: "1px solid #e2e8f0",
                                    }}
                                >
                                    <h3 style={{ fontSize: 19, fontWeight: 700, color: "#1e293b", marginTop: 0, marginBottom: 12 }}>
                                        {sec.title}
                                    </h3>
                                    {sec.content.map((p, pIdx) => (
                                        <p key={pIdx} style={{ color: "#475569", lineHeight: 1.7, fontSize: 15, marginBottom: 12 }}>
                                            {p}
                                        </p>
                                    ))}
                                    {sec.bullets && (
                                        <ul style={{ margin: "12px 0 0 0", paddingLeft: 20, color: "#475569" }}>
                                            {sec.bullets.map((b, bIdx) => (
                                                <li key={bIdx} style={{ marginBottom: 6, lineHeight: 1.6, fontSize: 15 }}>
                                                    {b}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {sec.links && (
                                        <ul style={{ margin: "16px 0 0", paddingLeft: 20 }}>
                                            {sec.links.map((link) => (
                                                <li key={link.href} style={{ marginBottom: 8, overflowWrap: "anywhere" }}>
                                                    <a href={link.href} style={{ color: "#1d4ed8", textDecoration: "underline" }}>
                                                        {link.label}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </article>
                            ))}
                        </div>
                    </section>
                )}

                {/* FAQ Section */}
                {faqs.length > 0 && (
                    <section style={{ marginBottom: 56 }}>
                        <div style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: 12, marginBottom: 28 }}>
                            <h2
                                style={{
                                    fontSize: 24,
                                    fontWeight: 800,
                                    color: "#0f172a",
                                    margin: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                }}
                            >
                                <QuestionCircleOutlined style={{ color: "#2563eb" }} />
                                Häufig gestellte Fragen (FAQ)
                            </h2>
                        </div>

                        <div style={{ display: "grid", gap: 16 }}>
                            {faqs.map((faq, idx) => (
                                <details
                                    key={idx}
                                    style={{
                                        background: "#ffffff",
                                        borderRadius: 10,
                                        border: "1px solid #e2e8f0",
                                        padding: "18px 24px",
                                        cursor: "pointer",
                                    }}
                                >
                                    <summary
                                        style={{
                                            fontWeight: 700,
                                            fontSize: 16,
                                            color: "#1e293b",
                                            outline: "none",
                                        }}
                                    >
                                        {faq.question}
                                    </summary>
                                    <p
                                        style={{
                                            margin: "12px 0 0 0",
                                            color: "#475569",
                                            lineHeight: 1.7,
                                            fontSize: 15,
                                        }}
                                    >
                                        {faq.answer}
                                    </p>
                                </details>
                            ))}
                        </div>
                    </section>
                )}

                {/* Related Tools Grid */}
                {relatedTools.length > 0 && (
                    <section style={{ marginBottom: 40 }}>
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 20 }}>
                            Weitere nützliche Werkzeuge für dein Business
                        </h2>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                                gap: 20,
                            }}
                        >
                            {relatedTools.map((tool, idx) => (
                                <Link
                                    key={idx}
                                    href={tool.href}
                                    style={{
                                        background: "#ffffff",
                                        borderRadius: 12,
                                        padding: "20px 24px",
                                        border: "1px solid #e2e8f0",
                                        textDecoration: "none",
                                        color: "inherit",
                                        display: "flex",
                                        flexDirection: "column",
                                        transition: "transform 0.15s ease, box-shadow 0.15s ease",
                                    }}
                                >
                                    {tool.badge && (
                                        <span
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: "#2563eb",
                                                background: "#eff6ff",
                                                padding: "2px 8px",
                                                borderRadius: 10,
                                                alignSelf: "flex-start",
                                                marginBottom: 8,
                                            }}
                                        >
                                            {tool.badge}
                                        </span>
                                    )}
                                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px 0", color: "#1e293b" }}>
                                        {tool.title}
                                    </h3>
                                    <p style={{ fontSize: 14, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                                        {tool.description}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <Footer />
        </div>
    );
}
