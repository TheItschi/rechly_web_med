import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
    Scale,
    CheckCircle2,
    ChevronRight,
    HelpCircle,
    ArrowRight,
    Calculator,
    FileText,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { createPageMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/env";
import {
    LEXIKON_CATALOG,
    getLexikonBySlug,
} from "@/lib/tools/lexikonCatalog";
import { getToolBySlug } from "@/lib/tools/catalog";
import { getVorlageBySlug } from "@/lib/tools/vorlagenCatalog";

const siteUrl = getSiteUrl();

interface LexikonDetailProps {
    params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
    return LEXIKON_CATALOG.map((entry) => ({
        slug: entry.slug,
    }));
}

export async function generateMetadata({
    params,
}: LexikonDetailProps): Promise<Metadata> {
    const { slug } = await params;
    const entry = getLexikonBySlug(slug);
    if (!entry) return {};

    return createPageMetadata({
        title: entry.metaTitle,
        description: entry.metaDescription,
        path: `/lexikon/${entry.slug}`,
        type: "article",
        keywords: entry.keywords,
        category: entry.legalReference,
    });
}

export default async function LexikonDetailPage({
    params,
}: LexikonDetailProps) {
    const { slug } = await params;
    const entry = getLexikonBySlug(slug);
    if (!entry) notFound();

    const relatedTools = entry.relatedToolSlugs
        .map((s) => getToolBySlug(s))
        .filter((t): t is NonNullable<typeof t> => Boolean(t));

    const relatedVorlagen = entry.relatedVorlagenSlugs
        .map((s) => getVorlageBySlug(s))
        .filter((v): v is NonNullable<typeof v> => Boolean(v));

    const otherEntries = LEXIKON_CATALOG.filter(
        (e) => e.slug !== entry.slug,
    ).slice(0, 6);

    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "DefinedTerm",
                "@id": `${siteUrl}/lexikon/${entry.slug}#term`,
                name: entry.term,
                description: entry.shortDefinition,
                inDefinedTermSet: `${siteUrl}/lexikon`,
            },
            {
                "@type": "Article",
                "@id": `${siteUrl}/lexikon/${entry.slug}#article`,
                headline: entry.title,
                description: entry.metaDescription,
                inLanguage: "de-DE",
                author: {
                    "@type": "Organization",
                    name: "Rechly Steuer- & Rechnungsredaktion",
                    url: siteUrl,
                },
                publisher: {
                    "@type": "Organization",
                    name: "Rechly",
                    url: siteUrl,
                },
                mainEntityOfPage: `${siteUrl}/lexikon/${entry.slug}`,
            },
            {
                "@type": "FAQPage",
                "@id": `${siteUrl}/lexikon/${entry.slug}#faq`,
                mainEntity: entry.faqs.map((f) => ({
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
                        name: "Lexikon",
                        item: `${siteUrl}/lexikon`,
                    },
                    {
                        "@type": "ListItem",
                        position: 3,
                        name: entry.term,
                        item: `${siteUrl}/lexikon/${entry.slug}`,
                    },
                ],
            },
        ],
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
            />
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-20 space-y-10 flex-1">
                {/* Breadcrumb */}
                <nav
                    aria-label="Breadcrumb"
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-500"
                >
                    <Link href="/" className="hover:text-slate-900">
                        Startseite
                    </Link>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <Link href="/lexikon" className="hover:text-slate-900">
                        Rechnungs- & Steuer-Lexikon
                    </Link>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-900 font-semibold">
                        {entry.term}
                    </span>
                </nav>

                {/* Header */}
                <header className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-slate-200/80 text-slate-800 text-xs font-bold uppercase tracking-wider">
                            {entry.category}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eef3fd] border border-[#c9d8f5] text-[#1e43b3] text-xs font-mono font-bold">
                            <Scale className="w-3.5 h-3.5" />
                            Rechtsgrundlage: {entry.legalReference}
                        </span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                        {entry.title}
                    </h1>
                </header>

                {/* Definition Box (Featured Snippet Target) */}
                <section className="bg-[#152438] text-white rounded-[10px] p-6 sm:p-8 space-y-4 shadow-md">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#9db8f5]">
                        Kurzdefinition: {entry.term}
                    </div>
                    <p className="text-base sm:text-lg text-slate-100 leading-relaxed font-medium">
                        {entry.shortDefinition}
                    </p>
                    <div className="pt-3 border-t border-white/15 space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                            Das Wichtigste in Kürze (Stand 2026):
                        </p>
                        <ul className="space-y-1.5 text-xs sm:text-sm text-slate-200">
                            {entry.keyTakeaways.map((item) => (
                                <li key={item} className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* Main Article Sections */}
                <article className="bg-white rounded-[10px] border border-slate-200 p-6 sm:p-8 space-y-8">
                    {entry.sections.map((sec) => (
                        <div key={sec.heading} className="space-y-3">
                            <h2 className="text-xl font-extrabold text-slate-900">
                                {sec.heading}
                            </h2>
                            {sec.paragraphs.map((p, idx) => (
                                <p
                                    key={idx}
                                    className="text-sm sm:text-base text-slate-600 leading-relaxed"
                                >
                                    {p}
                                </p>
                            ))}
                            {sec.bullets && (
                                <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-slate-700 pt-1">
                                    {sec.bullets.map((b) => (
                                        <li key={b} className="leading-relaxed">
                                            {b}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </article>

                {/* Interactive Tools & Templates Bridge */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-[10px] border border-slate-200 p-6 space-y-4">
                        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-[#2855d9]" />
                            Passende kostenlose Online-Rechner & Tools
                        </h2>
                        <div className="space-y-2.5">
                            {relatedTools.map((tool) => (
                                <Link
                                    key={tool.slug}
                                    href={tool.path}
                                    className="block p-3.5 rounded-xl bg-slate-50 hover:bg-[#eef3fd] border border-slate-200 hover:border-[#9db8f5] transition-colors"
                                >
                                    <p className="text-sm font-bold text-slate-900 flex items-center justify-between">
                                        <span>{tool.shortTitle}</span>
                                        <ArrowRight className="w-4 h-4 text-[#2855d9]" />
                                    </p>
                                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                        {tool.description}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-[10px] border border-slate-200 p-6 space-y-4">
                        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-emerald-600" />
                            Passende Rechnungsvorlagen (DIN 5008)
                        </h2>
                        <div className="space-y-2.5">
                            {relatedVorlagen.map((v) => (
                                <Link
                                    key={v.slug}
                                    href={`/vorlagen/${v.slug}`}
                                    className="block p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 transition-colors"
                                >
                                    <p className="text-sm font-bold text-slate-900 flex items-center justify-between">
                                        <span>{v.shortTitle}</span>
                                        <ArrowRight className="w-4 h-4 text-emerald-600" />
                                    </p>
                                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                        {v.description}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQs */}
                <section className="space-y-4">
                    <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-[#2855d9]" />
                        Häufige Fragen zu {entry.term}
                    </h2>
                    <div className="space-y-3">
                        {entry.faqs.map((f) => (
                            <div
                                key={f.question}
                                className="bg-white rounded-[10px] border border-slate-200 p-5 space-y-1.5"
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

                {/* Other Lexikon Entries */}
                <section className="pt-6 border-t border-slate-200 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Weitere Themen im Rechly Steuer- & Rechnungs-Lexikon
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {otherEntries.map((other) => (
                            <Link
                                key={other.slug}
                                href={`/lexikon/${other.slug}`}
                                className="p-3 rounded-xl bg-white border border-slate-200 hover:border-[#9db8f5] text-xs font-bold text-slate-800 hover:text-[#2855d9] transition-colors"
                            >
                                {other.term} →
                            </Link>
                        ))}
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
