import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
    FileText,
    ArrowRight,
    CheckCircle2,
    Sparkles,
    ShieldCheck,
    BookOpen,
    Calculator,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { createPageMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/env";
import { VORLAGEN_CATALOG } from "@/lib/tools/vorlagenCatalog";

const siteUrl = getSiteUrl();

export const metadata: Metadata = createPageMetadata({
    title: "14 Rechnungsvorlagen kostenlos (PDF, Muster & Generator)",
    description:
        "14 kostenlose, rechtssichere Rechnungsvorlagen & Muster für Handwerker (§ 35a), Bau (§ 13b), Kleinunternehmer (§ 19), Gebäudereinigung & Privat. Online ausfüllen & PDF laden!",
    path: "/vorlagen",
    category: "Rechnungsvorlagen",
    keywords: [
        "Rechnungsvorlage kostenlos",
        "Rechnung Muster PDF",
        "Kleinunternehmer Rechnungsvorlage",
        "Handwerkerrechnung Vorlage",
        "Rechnungsvorlage Freiberufler",
        "Abschlagsrechnung Muster",
        "Schlussrechnung Vorlage",
        "Dauerrechnung Mietvertrag Vorlage",
    ],
});

export default function VorlagenHubPage() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "@id": `${siteUrl}/vorlagen#collection`,
                name: "Kostenlose Rechnungsvorlagen & Muster für alle Branchen | Rechly",
                url: `${siteUrl}/vorlagen`,
                description:
                    "14 geprüfte deutsche Rechnungsvorlagen nach § 14 UStG und DIN 5008 zum kostenlosen Online-Ausfüllen und PDF-/XRechnung-Download.",
                inLanguage: "de-DE",
                hasPart: VORLAGEN_CATALOG.map((v) => ({
                    "@type": "DigitalDocument",
                    name: v.title,
                    url: `${siteUrl}/vorlagen/${v.slug}`,
                    description: v.description,
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
                        name: "Rechnungsvorlagen",
                        item: `${siteUrl}/vorlagen`,
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

            {/* Hero */}
            <section className="pt-28 pb-14 bg-gradient-to-b from-white to-slate-100 border-b border-slate-200/80">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-5">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                        <FileText className="w-3.5 h-3.5" />
                        14 Branchen-Vorlagen · DIN 5008 & § 14 UStG
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight">
                        Kostenlose Rechnungsvorlagen & Muster für jede Branche
                    </h1>

                    <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
                        Schluss mit fehlerhaften Word- und Excel-Tabellen: Wählen Sie Ihre passende Branchen-Vorlage mit allen gesetzlichen Pflichthinweisen (§ 19 UStG, § 13b Reverse Charge, § 35a Handwerkerbonus), passen Sie die Musterdaten online an und laden Sie Ihre Rechnung sofort als PDF oder XRechnung herunter.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <Link
                            href="/tools/rechnungsgenerator"
                            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-colors"
                        >
                            <Sparkles className="w-4 h-4" />
                            Direkt zum Online-Rechnungsgenerator
                        </Link>
                        <Link
                            href="/lexikon"
                            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm transition-colors"
                        >
                            <BookOpen className="w-4 h-4 text-indigo-600" />
                            Rechnungs- & Steuer-Lexikon
                        </Link>
                    </div>
                </div>
            </section>

            {/* Templates Grid */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-14 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {VORLAGEN_CATALOG.map((vorlage) => (
                        <div
                            key={vorlage.slug}
                            className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all p-6 flex flex-col justify-between"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700">
                                        {vorlage.category}
                                    </span>
                                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                                        {vorlage.badge}
                                    </span>
                                </div>

                                <Link
                                    href={`/vorlagen/${vorlage.slug}`}
                                    className="block group"
                                >
                                    <h2 className="text-lg font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                                        {vorlage.shortTitle}
                                    </h2>
                                </Link>

                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    {vorlage.description}
                                </p>

                                <ul className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                                    {vorlage.legalChecklist.slice(0, 2).map((check) => (
                                        <li key={check} className="flex items-start gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                            <span className="line-clamp-1">{check}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between gap-2">
                                <Link
                                    href={`/vorlagen/${vorlage.slug}`}
                                    className="text-xs font-bold text-slate-700 hover:text-indigo-600 inline-flex items-center gap-1"
                                >
                                    Muster & Leitfaden
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                                <Link
                                    href={`/tools/rechnungsgenerator?template=${vorlage.slug}`}
                                    rel="nofollow"
                                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors"
                                >
                                    Online ausfüllen →
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Why Online Generator vs Word/Excel */}
                <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 space-y-6">
                    <div className="max-w-3xl space-y-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-300">
                            <ShieldCheck className="w-4 h-4" />
                            GoBD & E-Rechnungspflicht 2025–2028
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Warum Word- und Excel-Vorlagen ab 2025 zum Steuerrisiko werden
                        </h2>
                        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                            Seit dem 1. Januar 2025 gilt in Deutschland die gesetzliche E-Rechnungspflicht im B2B-Bereich (Wachstumschancengesetz). Reine Word-, Excel- oder einfache PDF-Dateien gelten nach der Übergangsfrist nicht mehr als ordnungsgemäße E-Rechnung nach EN 16931. Mit Rechly nutzen Sie alle Branchen-Vorlagen sofort inklusive echtem XRechnung 3.0 XML- und ZUGFeRD-Export.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/tools/rechnungsgenerator"
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm"
                        >
                            Kostenlos Rechnung im Browser erstellen
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/tools"
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm"
                        >
                            <Calculator className="w-4 h-4" />
                            Alle 30 Business-Tools entdecken
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
