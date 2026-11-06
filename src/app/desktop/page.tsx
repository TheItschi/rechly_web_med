import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
    Monitor,
    Download,
    ShieldCheck,
    HardDrive,
    FileCode2,
    CheckCircle2,
    XCircle,
    ArrowRight,
    Sparkles,
    Lock,
    Cpu,
    FileSpreadsheet,
    QrCode,
    HelpCircle,
    ChevronRight,
    Layers,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import DownloadSection from "@/components/landing/sections/DownloadSection";
import { createPageMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/env";

const siteUrl = getSiteUrl();
const path = "/desktop";

export const metadata: Metadata = createPageMetadata({
    title: "Rechnungsprogramm kostenlos Download: Vollversion (Win & Mac)",
    description:
        "Rechly Desktop kostenlos herunterladen: 100 % Offline-Rechnungsprogramm als echte Vollversion ohne Abo & ohne Cloud-Zwang. Mit XRechnung 3.0, ZUGFeRD, GiroCode & DATEV für Windows 10/11 & macOS.",
    path,
    category: "Desktop-Rechnungssoftware",
    keywords: [
        "Rechnungsprogramm kostenlos Download",
        "Rechnungsprogramm kostenlos Vollversion",
        "Gratis Rechnungsprogramm Vollversion",
        "Rechnungssoftware kostenlos Download",
        "Rechnungssoftware kostenlos Vollversion",
        "Open Source Rechnungsprogramm",
        "Offline Rechnungsprogramm ohne Abo",
        "Fakturierungsprogramm kostenlos Vollversion",
        "Rechnungsprogramm Freeware Deutsch Windows 11 Mac",
        "Lokales ZUGFeRD und XRechnung Tool",
    ],
});

const DESKTOP_FAQS = [
    {
        question:
            "Ist Rechly Desktop wirklich eine kostenlose Vollversion ohne Zeitlimit?",
        answer: "Ja. Rechly Desktop steht unter der Open-Source-Lizenz AGPL-3.0 und ist eine uneingeschränkte Vollversion (Freeware / Open Source). Es gibt kein Rechnungs-Limit, kein Kunden-Limit, keine Wasserzeichen, kein verstecktes Monatsabo und kein Ablaufdatum.",
    },
    {
        question:
            "Funktionieren alle Funktionen 100 % offline ohne Internet und ohne Cloud-Login?",
        answer: "Ja. Rechly Desktop speichert sämtliche Rechnungen, Angebote, Kundendaten, Artikel und Einstellungen lokal in einer schnellen SQLite-Datenbank direkt auf Ihrer Festplatte. Sie benötigen weder ein Benutzerkonto noch eine Internetverbindung.",
    },
    {
        question:
            "Unterstützt die Desktop-App die E-Rechnungspflicht (XRechnung 3.0 & ZUGFeRD)?",
        answer: "Ja. Rechly Desktop fungiert als vollwertiges lokales ZUGFeRD- und XRechnung-Tool. Sie können EN-16931-konforme XRechnungen (3.0 XML inkl. Leitweg-ID und Verkäufer-E-Mail BT-34) sowie hybride ZUGFeRD-PDFs direkt lokal erzeugen und eingehende E-Rechnungen öffnen.",
    },
    {
        question:
            "Auf welchen Betriebssystemen läuft Rechly Desktop?",
        answer: "Es stehen native Installationspakete für Windows 10 und Windows 11 (64-Bit .exe Installer) sowie für macOS ab Version 12 Monterey bereit – sowohl nativ für Apple Silicon (M1, M2, M3, M4 als arm64 .dmg) als auch für Intel-Macs (x64 .dmg).",
    },
    {
        question:
            "Ist das Rechnungsprogramm für Kleinunternehmer (§ 19 UStG), Handwerker und GmbHs geeignet?",
        answer: "Absolut. Sie können im Setup zwischen Regelbesteuerung (19 % / 7 % USt.), Kleinunternehmerregelung nach § 19 UStG und Reverse-Charge (§ 13b UStG) wählen. Auch Handwerkerrechnungen mit ausgewiesenem Lohnanteil nach § 35a EStG sowie Abschlags- und Schlussrechnungen werden unterstützt.",
    },
    {
        question:
            "Wie sichere ich meine Daten (Backup) bei der lokalen Installation?",
        answer: "Da alle Daten lokal auf Ihrem PC oder Mac liegen, können Sie jederzeit mit einem Klick in den Einstellungen ein vollständiges Datenbank-Backup exportieren oder den lokalen Datenordner über Time Machine, Windows-Sicherung oder ein eigenes NAS sichern.",
    },
    {
        question:
            "Warum zeigt Windows SmartScreen oder macOS Gatekeeper beim ersten Start einen Hinweis?",
        answer: "Da Rechly ein unabhängiges, kostenloses Open-Source-Projekt ohne kommerzielles Abo-Modell ist, wird der Installer direkt über GitHub Releases ausgeliefert. Unter Windows klicken Sie bei SmartScreen auf ‚Weitere Informationen‘ → ‚Trotzdem ausführen‘. Unter macOS öffnen Sie die App beim ersten Mal per Rechtsklick → ‚Öffnen‘.",
    },
    {
        question:
            "Kann ich sowohl Angebote als auch Mahnungen und DATEV-Exporte lokal erstellen?",
        answer: "Ja. Neben Rechnungen und Gutschriften bietet Rechly Desktop ein komplettes Angebotswesen (1-Klick-Umwandlung von Angebot zu Rechnung), ein mehrstufiges Mahnwesen, eine Ausgabenverwaltung sowie den CSV-/DATEV-Export für Ihren Steuerberater.",
    },
];

export default function DesktopSeoPage() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "SoftwareApplication",
                "@id": `${siteUrl}${path}#software`,
                name: "Rechly Desktop – Kostenloses Offline-Rechnungsprogramm (Vollversion)",
                operatingSystem: "Windows 10, Windows 11, macOS 12+",
                applicationCategory: "BusinessApplication",
                applicationSubCategory: "Invoicing & Accounting Software",
                inLanguage: "de-DE",
                url: `${siteUrl}${path}`,
                downloadUrl:
                    "https://github.com/myaxyo/rechly_desktop/releases/latest/download/Rechly-Desktop-Setup-win-x64.exe",
                installUrl: `${siteUrl}${path}#download`,
                softwareVersion: "2.4.0",
                license: "https://www.gnu.org/licenses/agpl-3.0.html",
                isAccessibleForFree: true,
                offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "EUR",
                    availability: "https://schema.org/InStock",
                    url: `${siteUrl}${path}#download`,
                },
                featureList: [
                    "100 % Offline-Betrieb mit lokaler Datenbank ohne Cloud-Zwang",
                    "Uneingeschränkte Vollversion ohne Abo und ohne Rechnungslimit",
                    "E-Rechnung Generator & Viewer (XRechnung 3.0 XML & ZUGFeRD 2.3 PDF/A-3)",
                    "Angebote, Rechnungen, Abschlagsrechnungen, Gutschriften & Mahnungen",
                    "GiroCode (EPC-QR-Code) für fehlerfreie SEPA-Überweisungen",
                    "Kleinunternehmerregelung (§ 19 UStG), § 13b UStG & § 35a EStG Handwerkerbonus",
                    "DATEV-Export, EÜR-Auswertung und Kunden-/Artikelverwaltung",
                ],
                publisher: {
                    "@type": "Organization",
                    name: "Rechly",
                    url: siteUrl,
                },
            },
            {
                "@type": "HowTo",
                "@id": `${siteUrl}${path}#howto`,
                name: "Rechly Desktop kostenlos herunterladen und einrichten (Windows & Mac)",
                description:
                    "So installieren Sie die kostenlose Rechly Desktop-Vollversion in 3 Minuten lokal auf Ihrem Computer.",
                inLanguage: "de-DE",
                totalTime: "PT3M",
                step: [
                    {
                        "@type": "HowToStep",
                        position: 1,
                        name: "Passenden Installer für Windows oder macOS herunterladen",
                        text: "Wählen Sie den direkten Download für Windows 10/11 (.exe) oder macOS (Apple Silicon M1–M4 bzw. Intel .dmg). Es ist keine Registrierung und keine E-Mail-Eingabe erforderlich.",
                    },
                    {
                        "@type": "HowToStep",
                        position: 2,
                        name: "Programm lokal installieren und starten",
                        text: "Führen Sie die Setup-Datei unter Windows aus oder ziehen Sie Rechly unter macOS in den Programme-Ordner. Die lokale SQLite-Datenbank wird automatisch auf Ihrer Festplatte angelegt.",
                    },
                    {
                        "@type": "HowToStep",
                        position: 3,
                        name: "Firmendaten eintragen und erste PDF- oder E-Rechnung erstellen",
                        text: "Hinterlegen Sie einmalig Ihre Adresse, Steuernummer/USt-IdNr., IBAN und Ihr Logo. Danach erstellen Sie sofort unbegrenzt viele Angebote, DIN-5008-Rechnungen, XRechnungen und ZUGFeRD-Dokumente.",
                    },
                ],
            },
            {
                "@type": "FAQPage",
                "@id": `${siteUrl}${path}#faq`,
                mainEntity: DESKTOP_FAQS.map((f) => ({
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
                        name: "Rechly Desktop (Download Vollversion)",
                        item: `${siteUrl}${path}`,
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

            {/* Hero Header */}
            <header className="pt-28 pb-12 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white border-b border-slate-800">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
                    {/* Breadcrumb */}
                    <nav
                        aria-label="Breadcrumb"
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-400"
                    >
                        <Link href="/" className="hover:text-white transition-colors">
                            Startseite
                        </Link>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-emerald-400 font-semibold">
                            Rechly Desktop – Kostenlose Vollversion
                        </span>
                    </nav>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                            <Monitor className="w-3.5 h-3.5" />
                            100 % Offline Vollversion · Kein Abo
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
                            Windows 10/11 & macOS (M1–M4 / Intel)
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs font-semibold">
                            XRechnung 3.0 & ZUGFeRD 2.3 integriert
                        </span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight max-w-4xl">
                        Rechnungsprogramm kostenlos herunterladen: Echte Offline-Vollversion für Windows & Mac
                    </h1>

                    <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-3xl">
                        Schluss mit teuren Cloud-Abos, künstlichen Rechnungslimits und unflexiblen Word-Vorlagen: Mit{" "}
                        <strong className="text-white">Rechly Desktop</strong> installieren Sie ein vollwertiges, deutsches{" "}
                        <strong className="text-white">Open-Source-Fakturierungsprogramm</strong> direkt auf Ihrem PC oder Mac. Alle Kundendaten, Angebote und Rechnungen bleiben zu 100 % lokal auf Ihrer Festplatte – ohne Registrierung, ohne Cloud-Zwang und dauerhaft kostenlos.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <a
                            href="#download"
                            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm sm:text-base shadow-lg transition-all"
                        >
                            <Download className="w-4 h-4" />
                            Direkt zum kostenlosen Download (Win & Mac)
                        </a>
                        <Link
                            href="/tools/rechnungsgenerator"
                            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-sm transition-colors"
                        >
                            <Sparkles className="w-4 h-4 text-emerald-300" />
                            Oder direkt im Browser testen (ohne Installation)
                        </Link>
                    </div>

                    {/* Key metrics bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800 text-left">
                        <div className="bg-slate-800/70 rounded-xl p-3.5 border border-slate-700/70">
                            <p className="text-xs text-slate-400 uppercase font-semibold">Lizenz & Preis</p>
                            <p className="text-base sm:text-lg font-extrabold text-emerald-400 mt-0.5">
                                0 € Vollversion
                            </p>
                            <p className="text-[11px] text-slate-400">Open Source (AGPL-3.0)</p>
                        </div>
                        <div className="bg-slate-800/70 rounded-xl p-3.5 border border-slate-700/70">
                            <p className="text-xs text-slate-400 uppercase font-semibold">Datenhaltung</p>
                            <p className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                                100 % Lokal (SQLite)
                            </p>
                            <p className="text-[11px] text-slate-400">Kein Account, keine Cloud</p>
                        </div>
                        <div className="bg-slate-800/70 rounded-xl p-3.5 border border-slate-700/70">
                            <p className="text-xs text-slate-400 uppercase font-semibold">E-Rechnung 2025–2028</p>
                            <p className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                                XRechnung & ZUGFeRD
                            </p>
                            <p className="text-[11px] text-slate-400">EN 16931 & PEPPOL-konform</p>
                        </div>
                        <div className="bg-slate-800/70 rounded-xl p-3.5 border border-slate-700/70">
                            <p className="text-xs text-slate-400 uppercase font-semibold">Systeme</p>
                            <p className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                                Windows & macOS
                            </p>
                            <p className="text-[11px] text-slate-400">.exe Setup & .dmg Installer</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Interactive OS-Aware Download Section */}
            <DownloadSection />

            {/* Main SEO Content */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-14 space-y-16 flex-1">
                {/* 8 Core Features Grid */}
                <section className="space-y-6">
                    <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                            Funktionsumfang der Desktop-Vollversion
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                            Warum Selbstständige, Handwerker & KMU auf Rechly Desktop wechseln
                        </h2>
                        <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
                            Viele vermeintlich „kostenlose Rechnungsprogramme“ entpuppen sich nach 14 Tagen als teure Abo-Falle oder erlauben nur 3 Rechnungen pro Monat. Rechly Desktop bietet Ihnen alle professionellen Fakturierungs-Funktionen dauerhaft frei auf Ihrem eigenen Rechner:
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2.5 shadow-xs">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <HardDrive className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-extrabold text-slate-900">
                                1. 100 % Offline & Lokale SQLite-Datenbank
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Ihre sensiblen Finanz- und Kundendaten verlassen niemals Ihren Computer. Kein Cloud-Zwang, kein Login, volle DSGVO-Datensouveränität und blitzschnelle Reaktionszeiten – selbst im Funkloch oder auf der Baustelle.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2.5 shadow-xs">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <FileCode2 className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-extrabold text-slate-900">
                                2. Lokales ZUGFeRD- & XRechnung-Tool (EN 16931)
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Erfüllen Sie die gesetzliche B2B-E-Rechnungspflicht ohne Zusatzkosten: Erstellen Sie per Klick valide XRechnung 3.0 XML-Dateien (inkl. Leitweg-ID & BT-34) sowie hybride ZUGFeRD 2.3 PDF/A-3 Dokumente und prüfen Sie eingehende E-Rechnungen.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2.5 shadow-xs">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <Layers className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-extrabold text-slate-900">
                                3. Angebote, Rechnungen, Abschläge & Mahnungen
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Schreiben Sie professionelle Angebote und Kostenvoranschläge und wandeln Sie diese mit einem Klick in eine fertige Rechnung um. Inklusive Stornorechnungen, Zahlungserinnerungen und 3-stufigem Mahnwesen.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2.5 shadow-xs">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <QrCode className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-extrabold text-slate-900">
                                4. GiroCode (EPC-QR) & Alle Steuerregeln (§ 19, § 13b, § 35a)
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Jede PDF-Rechnung enthält auf Wunsch einen scannbaren SEPA-GiroCode für sofortige Banking-App-Überweisungen. Unterstützt Regelbesteuerung (19 %/7 %), Kleinunternehmer (§ 19 UStG), Bauleistungen (§ 13b) und Handwerkerrechnungen (§ 35a EStG).
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2.5 shadow-xs">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                <FileSpreadsheet className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-extrabold text-slate-900">
                                5. Ausgaben, EÜR-Übersicht & DATEV-Export
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Erfassen Sie Eingangsrechnungen und Betriebsausgaben, behalten Sie Ihre Umsatzsteuer-Zahllast im Blick und exportieren Sie Buchungsdaten sauber als DATEV- oder CSV-Datei für Ihren Steuerberater.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2.5 shadow-xs">
                            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                                <Cpu className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-extrabold text-slate-900">
                                6. Optionale lokale KI (Ollama & Bring-Your-Own-Key)
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Nutzen Sie auf Wunsch lokale Sprachmodelle über Ollama (100 % offline auf Ihrer eigenen Hardware) oder Ihren eigenen API-Schlüssel für automatische Belegerkennung (OCR) und Formulierungshilfen.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Comparison Table: Rechly Desktop vs Cloud SaaS vs Word/Excel */}
                <section className="space-y-6">
                    <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                            Direkter Systemvergleich
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                            Rechly Desktop vs. Cloud-Abo-Software vs. Word & Excel
                        </h2>
                        <p className="text-sm sm:text-base text-slate-600 max-w-3xl">
                            Warum ein lokales Open-Source-Rechnungsprogramm für viele Freiberufler, Handwerker, Vereine und kleine Betriebe die wirtschaftlich und rechtlich überlegene Lösung ist:
                        </p>
                    </div>

                    <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-xs">
                        <table className="w-full text-left border-collapse text-xs sm:text-sm">
                            <thead>
                                <tr className="bg-slate-900 text-white">
                                    <th className="py-4 px-4 font-bold">Kriterium</th>
                                    <th className="py-4 px-4 font-extrabold text-emerald-300 bg-slate-800">
                                        Rechly Desktop (Vollversion)
                                    </th>
                                    <th className="py-4 px-4 font-semibold text-slate-300">
                                        Klassische Cloud-Abos (SaaS)
                                    </th>
                                    <th className="py-4 px-4 font-semibold text-slate-300">
                                        Word / Excel Vorlagen
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                <tr>
                                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                                        Laufende Kosten (3 Jahre)
                                    </td>
                                    <td className="py-3.5 px-4 font-bold text-emerald-700 bg-emerald-50/40">
                                        0 € (dauerhaft kostenlos)
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600">
                                        ca. 540 € bis 1.440 €
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600">
                                        0 € bis 297 € (Office-Abo)
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                                        Offline-Nutzung ohne Internet
                                    </td>
                                    <td className="py-3.5 px-4 font-bold text-emerald-700 bg-emerald-50/40">
                                        <span className="inline-flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            100 % lokal & offline
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600">
                                        <span className="inline-flex items-center gap-1.5">
                                            <XCircle className="w-4 h-4 text-rose-500" />
                                            Nein (ständige Cloud-Verbindung)
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600">
                                        Ja (aber ohne Datenbank)
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                                        E-Rechnung (XRechnung 3.0 & ZUGFeRD)
                                    </td>
                                    <td className="py-3.5 px-4 font-bold text-emerald-700 bg-emerald-50/40">
                                        <span className="inline-flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            Voll integriert (Generator & Viewer)
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600">
                                        Oft erst ab mittlerem Abo-Tarif
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600">
                                        <span className="inline-flex items-center gap-1.5">
                                            <XCircle className="w-4 h-4 text-rose-500" />
                                            Nicht EN-16931-konform
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                                        Rechnungs- & Kundenlimit
                                    </td>
                                    <td className="py-3.5 px-4 font-bold text-emerald-700 bg-emerald-50/40">
                                        Unbegrenzt
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600">
                                        Im Basistarif oft stark limitiert
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600">
                                        Manuelle Einzeldateien
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                                        Automatische Fortlauf-Nummern & Kundenstamm
                                    </td>
                                    <td className="py-3.5 px-4 font-bold text-emerald-700 bg-emerald-50/40">
                                        <span className="inline-flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            Automatisch & fehlerfrei
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600">
                                        Ja
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600">
                                        Hohes Risiko für Tipp- & Duplikatfehler
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                                        Quellcode-Transparenz & Vendor-Lock-in
                                    </td>
                                    <td className="py-3.5 px-4 font-bold text-emerald-700 bg-emerald-50/40">
                                        Open Source (AGPL-3.0) · Offene SQLite-DB
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600">
                                        Proprietäre Cloud (Preiserhöhungs-Risiko)
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600">
                                        Lokale Dateien ohne Auswertung
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Step-by-Step Installation & Setup Guide */}
                <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 space-y-6">
                    <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                            Schnellstart-Anleitung
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                            In 3 Minuten installiert: So starten Sie mit Rechly Desktop
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-extrabold text-sm">
                                1
                            </span>
                            <h3 className="text-base font-extrabold text-slate-900">
                                Installer für Windows oder Mac laden
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                Laden Sie oben die{" "}
                                <code className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                                    Rechly-Desktop-Setup-win-x64.exe
                                </code>{" "}
                                für Windows 10/11 oder die{" "}
                                <code className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                                    .dmg
                                </code>{" "}
                                für macOS direkt von unseren offiziellen GitHub-Releases herunter.
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-extrabold text-sm">
                                2
                            </span>
                            <h3 className="text-base font-extrabold text-slate-900">
                                Ohne Registrierung lokal starten
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                Nach dem ersten Start legt Rechly automatisch Ihre lokale Datenbank an. Sie müssen kein Passwort in einer fremden Cloud vergeben und keine Zahlungsdaten hinterlegen.
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-extrabold text-sm">
                                3
                            </span>
                            <h3 className="text-base font-extrabold text-slate-900">
                                Briefkopf anpassen & loslegen
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                Tragen Sie Ihre Firmendaten, Steuernummer/USt-IdNr., Bankverbindung und Ihr Firmenlogo ein. Sofort erstellen Sie Angebote, DIN-5008-Rechnungen und XRechnungen.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Technical Specs & System Requirements */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            Technische Daten & Systemvoraussetzungen
                        </h2>
                        <dl className="divide-y divide-slate-100 text-xs sm:text-sm">
                            <div className="py-2.5 flex justify-between gap-4">
                                <dt className="text-slate-500 font-medium">Windows-Version:</dt>
                                <dd className="font-semibold text-slate-900 text-right">
                                    Windows 10 & Windows 11 (64-Bit x64)
                                </dd>
                            </div>
                            <div className="py-2.5 flex justify-between gap-4">
                                <dt className="text-slate-500 font-medium">macOS-Version:</dt>
                                <dd className="font-semibold text-slate-900 text-right">
                                    macOS 12+ (Apple Silicon M1–M4 & Intel)
                                </dd>
                            </div>
                            <div className="py-2.5 flex justify-between gap-4">
                                <dt className="text-slate-500 font-medium">Lokale Datenbank:</dt>
                                <dd className="font-semibold text-slate-900 text-right">
                                    SQLite (lokales Dateisystem, 1-Klick-Backup)
                                </dd>
                            </div>
                            <div className="py-2.5 flex justify-between gap-4">
                                <dt className="text-slate-500 font-medium">Unterstützte Formate:</dt>
                                <dd className="font-semibold text-slate-900 text-right">
                                    PDF (DIN 5008), XRechnung 3.0 XML, ZUGFeRD 2.3, CSV/DATEV
                                </dd>
                            </div>
                            <div className="py-2.5 flex justify-between gap-4">
                                <dt className="text-slate-500 font-medium">Lizenzmodell:</dt>
                                <dd className="font-semibold text-emerald-700 text-right">
                                    Kostenlose Vollversion · Open Source (AGPL-3.0)
                                </dd>
                            </div>
                        </dl>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-indigo-600" />
                            Für wen eignet sich das Offline-Fakturierungsprogramm?
                        </h2>
                        <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700">
                            <li className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>
                                    <strong>Kleinunternehmer (§ 19 UStG) & Nebengewerbe:</strong> Keine monatlichen Fixkosten für Rechnungssoftware, automatischer §-19-Pflichthinweis.
                                </span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>
                                    <strong>Handwerker, Bau & Dienstleister:</strong> Angebote, Abschlagsrechnungen, § 13b Reverse Charge und § 35a EStG Lohnanteil-Ausweis.
                                </span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>
                                    <strong>Freiberufler, IT-Consultants & Agenturen:</strong> Schnelle Projektabrechnung, Stundensätze, B2B-/B2G-XRechnung mit Leitweg-ID.
                                </span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>
                                    <strong>Datenschutzbewusste Teams:</strong> 100 % lokale Speicherung ohne Weitergabe von Kundendaten an externe Cloud-Server.
                                </span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* FAQs */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                        <HelpCircle className="w-6 h-6 text-indigo-600" />
                        Häufige Fragen zum kostenlosen Rechnungsprogramm (Desktop-Vollversion)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {DESKTOP_FAQS.map((faq) => (
                            <article
                                key={faq.question}
                                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2"
                            >
                                <h3 className="text-base font-bold text-slate-900">
                                    {faq.question}
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    {faq.answer}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>

                {/* Internal Cluster Links */}
                <section className="pt-6 border-t border-slate-200 space-y-4">
                    <h2 className="text-lg font-extrabold text-slate-900">
                        Weitere kostenlose Rechly-Werkzeuge & Ratgeber
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Link
                            href="/tools/rechnungsgenerator"
                            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition-colors space-y-1"
                        >
                            <p className="text-sm font-bold text-slate-900 flex items-center justify-between">
                                Online-Rechnungsgenerator
                                <ArrowRight className="w-4 h-4 text-indigo-600" />
                            </p>
                            <p className="text-xs text-slate-500">
                                Direkt im Browser PDF-Rechnungen & XRechnungen ohne Download erstellen.
                            </p>
                        </Link>
                        <Link
                            href="/tools/angebotsgenerator"
                            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition-colors space-y-1"
                        >
                            <p className="text-sm font-bold text-slate-900 flex items-center justify-between">
                                Kostenloser Angebotsgenerator
                                <ArrowRight className="w-4 h-4 text-indigo-600" />
                            </p>
                            <p className="text-xs text-slate-500">
                                Angebote & Kostenvoranschläge nach DIN 5008 online schreiben & als PDF speichern.
                            </p>
                        </Link>
                        <Link
                            href="/tools/e-rechnung-viewer"
                            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition-colors space-y-1"
                        >
                            <p className="text-sm font-bold text-slate-900 flex items-center justify-between">
                                XRechnung & ZUGFeRD Viewer
                                <ArrowRight className="w-4 h-4 text-indigo-600" />
                            </p>
                            <p className="text-xs text-slate-500">
                                XML- und ZUGFeRD-Rechnungen kostenlos im Browser öffnen, prüfen & lesbar anzeigen.
                            </p>
                        </Link>
                        <Link
                            href="/vorlagen"
                            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition-colors space-y-1"
                        >
                            <p className="text-sm font-bold text-slate-900 flex items-center justify-between">
                                14 Branchen-Rechnungsvorlagen
                                <ArrowRight className="w-4 h-4 text-indigo-600" />
                            </p>
                            <p className="text-xs text-slate-500">
                                Muster für Handwerker, Gebäudereinigung, Kleinunternehmer, Bau (§ 13b) & Privat.
                            </p>
                        </Link>
                        <Link
                            href="/rechnungsprogramm-kostenlos"
                            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition-colors space-y-1"
                        >
                            <p className="text-sm font-bold text-slate-900 flex items-center justify-between">
                                Ratgeber: Rechnungsprogramm kostenlos
                                <ArrowRight className="w-4 h-4 text-indigo-600" />
                            </p>
                            <p className="text-xs text-slate-500">
                                Worauf Sie bei kostenloser Fakturierungssoftware in Deutschland achten müssen.
                            </p>
                        </Link>
                        <Link
                            href="/open-source"
                            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition-colors space-y-1"
                        >
                            <p className="text-sm font-bold text-slate-900 flex items-center justify-between">
                                Open-Source-Architektur & Self-Hosting
                                <ArrowRight className="w-4 h-4 text-indigo-600" />
                            </p>
                            <p className="text-xs text-slate-500">
                                Quellcode, Docker-Setup und technische Hintergründe zu Rechly.
                            </p>
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
