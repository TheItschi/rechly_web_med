import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
    BookOpen,
    Scale,
    ArrowRight,
    FileText,
    Calculator,
    CheckCircle2,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { createPageMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/env";
import { LEXIKON_CATALOG } from "@/lib/tools/lexikonCatalog";

const siteUrl = getSiteUrl();

export const metadata: Metadata = createPageMetadata({
    title: "Rechnungs- & Steuer-Lexikon für Selbstständige & KMU",
    description:
        "Das deutsche Fachlexikon für Rechnungsstellung, Umsatzsteuer (§ 14, § 13b, § 19 UStG), E-Rechnungspflicht 2025–2028, GoBD, Aufbewahrungsfristen (8 Jahre) & Handwerkerbonus (§ 35a EStG).",
    path: "/lexikon",
    category: "Steuer- & Rechnungslexikon",
    keywords: [
        "Rechnungslexikon",
        "Steuerlexikon Selbstständige",
        "Pflichtangaben Rechnung § 14 UStG",
        "E-Rechnungspflicht 2025",
        "Kleinunternehmerregelung 2026",
        "Aufbewahrungsfrist Rechnungen 8 Jahre",
        "GoBD einfach erklärt",
    ],
});

export default function LexikonHubPage() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "DefinedTermSet",
                "@id": `${siteUrl}/lexikon#termset`,
                name: "Rechly Rechnungs- & Steuer-Lexikon für deutsche Unternehmen",
                url: `${siteUrl}/lexikon`,
                description:
                    "Praxisnahes Nachschlagewerk zu § 14 UStG, E-Rechnungspflicht (EN 16931), GoBD, § 19 UStG Kleinunternehmerregelung, § 13b Reverse Charge und § 35a EStG.",
                inLanguage: "de-DE",
                hasDefinedTerm: LEXIKON_CATALOG.map((entry) => ({
                    "@type": "DefinedTerm",
                    name: entry.term,
                    description: entry.shortDefinition,
                    url: `${siteUrl}/lexikon/${entry.slug}`,
                })),
            },
            {
                "@type": "BreadcrumbList",
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
                        name: "Lexikon",
                        item: `${siteUrl}/lexikon`,
                    },
                ],
            },
        ],
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Navbar />

            <section className="pt-28 pb-14 bg-gradient-to-b from-white to-slate-100 border-b border-slate-200/80">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-5">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                        <BookOpen className="w-3.5 h-3.5" />
                        Deutsches Steuer- & Rechnungs-Wissen (Stand 2026)
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight">
                        Rechnungs- & Steuer-Lexikon für Unternehmen in Deutschland
                    </h1>

                    <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
                        Verständlich erklärt ohne Juristendeutsch: Alle gesetzlichen Regeln zu § 14 UStG Pflichtangaben, E-Rechnungspflicht 2025–2028, Kleinunternehmerregelung (25.000 € / 100.000 €), GoBD, 8 Jahren Aufbewahrungsfrist (BEG IV) und Reverse Charge (§ 13b UStG).
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <Link
                            href="/tools/rechnungsgenerator"
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors"
                        >
                            <FileText className="w-4 h-4" />
                            Kostenloser Rechnungsgenerator
                        </Link>
                        <Link
                            href="/vorlagen"
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm transition-colors"
                        >
                            14 Branchen-Vorlagen ansehen
                        </Link>
                        <Link
                            href="/tools"
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm transition-colors"
                        >
                            <Calculator className="w-4 h-4 text-indigo-600" />
                            Alle 30 Rechner & Tools
                        </Link>
                    </div>
                </div>
            </section>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-12 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {LEXIKON_CATALOG.map((entry) => (
                        <Link
                            key={entry.slug}
                            href={`/lexikon/${entry.slug}`}
                            className="group bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all p-6 flex flex-col justify-between"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                                        {entry.category}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                                        <Scale className="w-3 h-3" />
                                        {entry.legalReference}
                                    </span>
                                </div>

                                <h2 className="text-xl font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                                    {entry.term}
                                </h2>

                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                                    {entry.shortDefinition}
                                </p>

                                <div className="pt-2 space-y-1">
                                    {entry.keyTakeaways.slice(0, 2).map((takeaway) => (
                                        <div
                                            key={takeaway}
                                            className="flex items-start gap-1.5 text-xs text-slate-600"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                            <span className="line-clamp-1">{takeaway}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                                <span>Fachartikel & Praxisbeispiele lesen</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                        </Link>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
}
