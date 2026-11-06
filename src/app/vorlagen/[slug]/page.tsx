import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
    CheckCircle2,
    ArrowRight,
    Sparkles,
    ShieldCheck,
    FileText,
    ChevronRight,
    HelpCircle,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { createPageMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/env";
import {
    VORLAGEN_CATALOG,
    getVorlageBySlug,
} from "@/lib/tools/vorlagenCatalog";
import { getToolBySlug } from "@/lib/tools/catalog";

const siteUrl = getSiteUrl();

interface VorlagePageProps {
    params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
    return VORLAGEN_CATALOG.map((v) => ({
        slug: v.slug,
    }));
}

export async function generateMetadata({
    params,
}: VorlagePageProps): Promise<Metadata> {
    const { slug } = await params;
    const vorlage = getVorlageBySlug(slug);
    if (!vorlage) return {};

    return createPageMetadata({
        title: vorlage.metaTitle,
        description: vorlage.metaDescription,
        path: `/vorlagen/${vorlage.slug}`,
        type: "article",
        keywords: vorlage.keywords,
        category: `${vorlage.category} Vorlage`,
    });
}

const formatEUR = (val: number) =>
    new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
    }).format(val);

export default async function VorlageDetailPage({ params }: VorlagePageProps) {
    const { slug } = await params;
    const vorlage = getVorlageBySlug(slug);
    if (!vorlage) notFound();

    const p = vorlage.presetData;
    const sampleTotals = p.items.reduce(
        (acc, item) => {
            const net = item.quantity * item.price;
            const rate = p.taxMode === "standard" ? item.vatRate : 0;
            const vat = net * (rate / 100);
            acc.net += net;
            acc.vat += vat;
            acc.gross += net + vat;
            if (item.isLabor35a) {
                acc.laborNet += net;
                acc.laborGross += net + vat;
            }
            return acc;
        },
        { net: 0, vat: 0, gross: 0, laborNet: 0, laborGross: 0 },
    );

    const relatedTools = vorlage.relatedToolSlugs
        .map((s) => getToolBySlug(s))
        .filter((t): t is NonNullable<typeof t> => Boolean(t));

    const otherVorlagen = VORLAGEN_CATALOG.filter(
        (v) => v.slug !== vorlage.slug,
    ).slice(0, 6);

    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Article",
                "@id": `${siteUrl}/vorlagen/${vorlage.slug}#article`,
                headline: vorlage.title,
                description: vorlage.metaDescription,
                inLanguage: "de-DE",
                author: {
                    "@type": "Organization",
                    name: "Rechly",
                    url: siteUrl,
                },
                publisher: {
                    "@type": "Organization",
                    name: "Rechly",
                    url: siteUrl,
                },
                mainEntityOfPage: `${siteUrl}/vorlagen/${vorlage.slug}`,
            },
            {
                "@type": "FAQPage",
                "@id": `${siteUrl}/vorlagen/${vorlage.slug}#faq`,
                mainEntity: vorlage.faqs.map((f) => ({
                    "@type": "Question",
                    name: f.question,
                    acceptedAnswer: {
                        "@type": "Answer",
                        text: f.answer,
                    },
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
                    {
                        "@type": "ListItem",
                        position: 3,
                        name: vorlage.shortTitle,
                        item: `${siteUrl}/vorlagen/${vorlage.slug}`,
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

            <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-28 pb-20 space-y-12 flex-1">
                {/* Breadcrumbs */}
                <nav
                    aria-label="Breadcrumb"
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-500"
                >
                    <Link href="/" className="hover:text-slate-900">
                        Startseite
                    </Link>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <Link href="/vorlagen" className="hover:text-slate-900">
                        Rechnungsvorlagen
                    </Link>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-900 font-semibold">
                        {vorlage.shortTitle}
                    </span>
                </nav>

                {/* Hero Header */}
                <header className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                            {vorlage.eyebrow}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                            {vorlage.badge}
                        </span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                        {vorlage.title}
                    </h1>

                    <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl">
                        {vorlage.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Link
                            href={`/tools/rechnungsgenerator?template=${vorlage.slug}`}
                            rel="nofollow"
                            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-colors"
                        >
                            <Sparkles className="w-4 h-4" />
                            Diese Vorlage jetzt online ausfüllen & als PDF speichern
                        </Link>
                        <Link
                            href="/vorlagen"
                            className="inline-flex items-center gap-2 px-4 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm transition-colors"
                        >
                            Alle 14 Branchen-Vorlagen
                        </Link>
                    </div>
                </header>

                {/* Live Realistic Sample Invoice Preview */}
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-600" />
                            Muster-Vorschau: {vorlage.shortTitle} (DIN 5008)
                        </h2>
                        <Link
                            href={`/tools/rechnungsgenerator?template=${vorlage.slug}`}
                            rel="nofollow"
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                        >
                            Positionen & Texte im Generator anpassen →
                        </Link>
                    </div>

                    <div className="bg-white border border-slate-300 shadow-md rounded-2xl p-6 sm:p-10 space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-5">
                            <div>
                                <p className="text-lg font-extrabold text-slate-900">
                                    {p.senderName}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {p.senderAddress}
                                </p>
                            </div>
                            <div className="text-left sm:text-right text-xs text-slate-600">
                                <p className="font-semibold text-slate-900">{p.senderName}</p>
                                <p>St.-Nr. / USt-IdNr.: {p.senderTaxId}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6">
                            <div className="sm:col-span-7 text-sm">
                                <p className="text-[10px] underline text-slate-400 mb-1.5">
                                    {p.senderName} · {p.senderAddress}
                                </p>
                                <p className="font-bold text-slate-900">{p.recipientName}</p>
                                <p className="text-slate-700">{p.recipientAddress}</p>
                            </div>
                            <div className="sm:col-span-5 bg-slate-50 rounded-xl p-3.5 text-xs space-y-1 border border-slate-200">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Dokument:</span>
                                    <span className="font-bold">{p.invoiceTitle}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Steuerregel:</span>
                                    <span className="font-semibold text-indigo-700">
                                        {vorlage.badge}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-extrabold text-slate-900 mb-1">
                                {p.invoiceTitle}
                            </h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs sm:text-sm">
                                <thead>
                                    <tr className="border-b-2 border-slate-900 text-[11px] font-bold uppercase text-slate-600">
                                        <th className="py-2 pr-2 w-10">Pos.</th>
                                        <th className="py-2 px-2">Leistungsbeschreibung</th>
                                        <th className="py-2 px-2 text-right w-24">Menge</th>
                                        <th className="py-2 px-2 text-right w-28">Einzelpreis</th>
                                        <th className="py-2 pl-2 text-right w-28">Gesamt</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {p.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="py-2.5 pr-2 text-slate-500">{idx + 1}</td>
                                            <td className="py-2.5 px-2 font-medium text-slate-900">
                                                {item.description}
                                                {p.show35aHighlight && item.isLabor35a && (
                                                    <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                                                        § 35a EStG Lohnanteil
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-2 text-right">
                                                {item.quantity} {item.unit}
                                            </td>
                                            <td className="py-2.5 px-2 text-right font-mono">
                                                {formatEUR(item.price)}
                                            </td>
                                            <td className="py-2.5 pl-2 text-right font-mono font-bold">
                                                {formatEUR(item.quantity * item.price)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t-2 border-slate-900 pt-4">
                            <div className="text-xs text-slate-600 space-y-1.5 max-w-md">
                                <p className="font-medium text-slate-800">{p.legalNote}</p>
                                {p.show35aHighlight && sampleTotals.laborGross > 0 && (
                                    <p className="text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-lg">
                                        <strong>§ 35a EStG Ausweis:</strong> Enthaltene Arbeits- und Fahrtkosten:{" "}
                                        {formatEUR(sampleTotals.laborNet)} Netto ({formatEUR(sampleTotals.laborGross)} Brutto).
                                    </p>
                                )}
                            </div>
                            <div className="w-full sm:w-64 space-y-1 text-sm">
                                <div className="flex justify-between text-slate-600">
                                    <span>Summe Netto:</span>
                                    <span className="font-mono">{formatEUR(sampleTotals.net)}</span>
                                </div>
                                {p.taxMode === "standard" && (
                                    <div className="flex justify-between text-slate-600">
                                        <span>zzgl. Umsatzsteuer:</span>
                                        <span className="font-mono">{formatEUR(sampleTotals.vat)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-extrabold text-slate-900 border-t border-slate-300 pt-1.5">
                                    <span>Rechnungsbetrag:</span>
                                    <span className="font-mono">{formatEUR(sampleTotals.gross)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Legal Checklist & Mandatory Notice */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            Checkliste: Pflichtangaben ({vorlage.category})
                        </h2>
                        <ul className="space-y-2.5 text-sm text-slate-700">
                            {vorlage.legalChecklist.map((item) => (
                                <li key={item} className="flex items-start gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                        <h2 className="text-base font-extrabold text-slate-900">
                            Wichtiger Pflichthinweis auf der Rechnung
                        </h2>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                            „{p.legalNote}“
                        </div>
                        <Link
                            href={`/tools/rechnungsgenerator?template=${vorlage.slug}`}
                            rel="nofollow"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 pt-1"
                        >
                            Im Rechnungsgenerator automatisch einfügen lassen
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </section>

                {/* Guide Sections */}
                <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
                    {vorlage.guideSections.map((sec) => (
                        <div key={sec.title} className="space-y-3">
                            <h2 className="text-xl font-extrabold text-slate-900">
                                {sec.title}
                            </h2>
                            {sec.body.map((pText, idx) => (
                                <p
                                    key={idx}
                                    className="text-sm sm:text-base text-slate-600 leading-relaxed"
                                >
                                    {pText}
                                </p>
                            ))}
                            {sec.bullets && (
                                <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700">
                                    {sec.bullets.map((b) => (
                                        <li key={b}>{b}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </section>

                {/* FAQs */}
                <section className="space-y-4">
                    <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-indigo-600" />
                        Häufige Fragen zur {vorlage.shortTitle}
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                        {vorlage.faqs.map((f) => (
                            <div
                                key={f.question}
                                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2"
                            >
                                <h3 className="text-base font-bold text-slate-900">
                                    {f.question}
                                </h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    {f.answer}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Related Tools & Other Templates */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                            Passende kostenlose Rechner & Generatoren
                        </h3>
                        <div className="space-y-2">
                            {relatedTools.map((tool) => (
                                <Link
                                    key={tool.slug}
                                    href={tool.path}
                                    className="block p-3.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 transition-colors"
                                >
                                    <p className="text-sm font-bold text-slate-900">
                                        {tool.shortTitle} →
                                    </p>
                                    <p className="text-xs text-slate-500 line-clamp-1">
                                        {tool.description}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                            Weitere Branchen-Vorlagen
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {otherVorlagen.map((other) => (
                                <Link
                                    key={other.slug}
                                    href={`/vorlagen/${other.slug}`}
                                    className="p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 text-xs font-bold text-slate-800 hover:text-indigo-600 transition-colors"
                                >
                                    {other.shortTitle} →
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
