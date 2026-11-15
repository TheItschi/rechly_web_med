"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import {
    CheckCircleOutlined,
    SafetyCertificateOutlined,
    ArrowRightOutlined,
    AppstoreOutlined,
    PrinterOutlined,
    ShareAltOutlined,
} from "@ant-design/icons";
import { getSiteUrl } from "@/lib/env";
import s from "./tool.module.css";

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
    const [copied, setCopied] = React.useState(false);
    const handleShare = () => {
        if (typeof window !== "undefined" && navigator.clipboard) {
            void navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
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
        <div className={s.page}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
            />
            <Navbar />

            <section className={s.hero}>
                <div className={s.wrap}>
                    <div className={s.crumbs}>
                        <Link href="/tools">
                            <AppstoreOutlined /> Alle Tools & Rechner
                        </Link>
                        <span aria-hidden="true">/</span>
                        <span className={s.cat}>{category}</span>
                    </div>
                    <h1>{title}</h1>
                    <p className={s.lede}>{description}</p>
                    <div className={s.trust}>
                        <span><CheckCircleOutlined /> 100 % kostenlos</span>
                        <span><SafetyCertificateOutlined /> Ohne Registrierung</span>
                        <span><CheckCircleOutlined /> Direkt im Browser</span>
                        <div className={s.heroActions}>
                            <button type="button" className={s.toolBtn} onClick={handlePrint} title="Drucken / Als PDF speichern">
                                <PrinterOutlined /> Drucken
                            </button>
                            <button type="button" className={s.toolBtn} onClick={handleShare} title="Link kopieren">
                                <ShareAltOutlined /> {copied ? "Link kopiert" : "Teilen"}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <main className={s.main}>
                <div className={s.surface}>{children}</div>

                <div className={s.cta}>
                    <div>
                        <span className={s.ctaKicker}>Rechly — kostenlos &amp; Open Source</span>
                        <h2>{rechlyCtaTitle}</h2>
                        <p>{rechlyCtaDescription}</p>
                    </div>
                    <Link href={rechlyCtaHref} className={s.ctaBtn}>
                        {rechlyCtaButtonText} <ArrowRightOutlined />
                    </Link>
                </div>

                {guideSections.length > 0 && (
                    <section>
                        <div className={s.sectionHead}>
                            <h2>Praxis-Ratgeber &amp; gesetzliche Grundlagen</h2>
                            <p>Wichtige Vorschriften, Berechnungsbeispiele und Best Practices für deutsche Unternehmen.</p>
                        </div>
                        <div className={s.guides}>
                            {guideSections.map((sec, idx) => (
                                <article key={idx} className={s.guide}>
                                    <h3>{sec.title}</h3>
                                    {sec.content.map((para, pIdx) => (
                                        <p key={pIdx}>{para}</p>
                                    ))}
                                    {sec.bullets && (
                                        <ul>
                                            {sec.bullets.map((b, bIdx) => (
                                                <li key={bIdx}>{b}</li>
                                            ))}
                                        </ul>
                                    )}
                                    {sec.links && (
                                        <ul>
                                            {sec.links.map((link) => (
                                                <li key={link.href}>
                                                    <a href={link.href}>{link.label}</a>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </article>
                            ))}
                        </div>
                    </section>
                )}

                {faqs.length > 0 && (
                    <section>
                        <div className={s.sectionHead}>
                            <h2>Häufig gestellte Fragen</h2>
                        </div>
                        <div className={s.faqs}>
                            {faqs.map((faq, idx) => (
                                <details key={idx} className={s.faq}>
                                    <summary>{faq.question}</summary>
                                    <p>{faq.answer}</p>
                                </details>
                            ))}
                        </div>
                    </section>
                )}

                {relatedTools.length > 0 && (
                    <section>
                        <div className={s.sectionHead}>
                            <h2>Weitere Werkzeuge für dein Business</h2>
                        </div>
                        <div className={s.related}>
                            {relatedTools.map((tool, idx) => (
                                <Link key={idx} href={tool.href} className={s.relatedCard}>
                                    {tool.badge && <span className={s.relatedBadge}>{tool.badge}</span>}
                                    <h3>{tool.title}</h3>
                                    <p>{tool.description}</p>
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
