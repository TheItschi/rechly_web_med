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
import s from "./desktop.module.css";

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
        <div className={s.root}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Navbar />

            {/* Hero Header */}
            <section className={s.hero}>
                <div className={s.container}>
                    {/* Breadcrumb */}
                    <nav aria-label="Breadcrumb" className={s.crumbs}>
                        <Link href="/">Startseite</Link>
                        <ChevronRight size={14} aria-hidden="true" />
                        <span className={s.crumbsCurrent} aria-current="page">
                            Rechly Desktop – Kostenlose Vollversion
                        </span>
                    </nav>

                    <p className={s.kicker}>100 % Offline Vollversion · Kein Abo</p>

                    <h1>
                        Rechnungsprogramm kostenlos herunterladen: Echte Offline-Vollversion für Windows & Mac
                    </h1>

                    <p className={s.heroText}>
                        Schluss mit teuren Cloud-Abos, künstlichen Rechnungslimits und unflexiblen Word-Vorlagen: Mit{" "}
                        <strong>Rechly Desktop</strong> installieren Sie ein vollwertiges, deutsches{" "}
                        <strong>Open-Source-Fakturierungsprogramm</strong> direkt auf Ihrem PC oder Mac. Alle Kundendaten, Angebote und Rechnungen bleiben zu 100 % lokal auf Ihrer Festplatte – ohne Registrierung, ohne Cloud-Zwang und dauerhaft kostenlos.
                    </p>

                    <div className={s.heroMeta}>
                        <span>
                            <Monitor size={15} aria-hidden="true" />
                            100 % Offline Vollversion · Kein Abo
                        </span>
                        <span>Windows 10/11 & macOS (M1–M4 / Intel)</span>
                        <span>XRechnung 3.0 & ZUGFeRD 2.3 integriert</span>
                    </div>

                    <div className={s.actions}>
                        <a href="#download" className={s.button}>
                            <Download size={17} aria-hidden="true" />
                            Direkt zum kostenlosen Download (Win & Mac)
                        </a>
                        <Link href="/tools/rechnungsgenerator" className={s.buttonSecondary}>
                            <Sparkles size={17} aria-hidden="true" />
                            Oder direkt im Browser testen (ohne Installation)
                        </Link>
                    </div>

                    {/* Key metrics bar */}
                    <div className={s.facts}>
                        <div>
                            <p className={s.factLabel}>Lizenz & Preis</p>
                            <p className={s.factValue}>0 € Vollversion</p>
                            <p className={s.factSub}>Open Source (AGPL-3.0)</p>
                        </div>
                        <div>
                            <p className={s.factLabel}>Datenhaltung</p>
                            <p className={s.factValue}>100 % Lokal (SQLite)</p>
                            <p className={s.factSub}>Kein Account, keine Cloud</p>
                        </div>
                        <div>
                            <p className={s.factLabel}>E-Rechnung 2025–2028</p>
                            <p className={s.factValue}>XRechnung & ZUGFeRD</p>
                            <p className={s.factSub}>EN 16931 & PEPPOL-konform</p>
                        </div>
                        <div>
                            <p className={s.factLabel}>Systeme</p>
                            <p className={s.factValue}>Windows & macOS</p>
                            <p className={s.factSub}>.exe Setup & .dmg Installer</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Interactive OS-Aware Download Section */}
            <DownloadSection />

            {/* Main SEO Content */}
            <main className={[s.container, s.main].join(" ")}>
                {/* 8 Core Features Grid */}
                <section className={s.section}>
                    <div className={s.sectionHead}>
                        <span className={s.kicker}>
                            Funktionsumfang der Desktop-Vollversion
                        </span>
                        <h2>
                            Warum Selbstständige, Handwerker & KMU auf Rechly Desktop wechseln
                        </h2>
                        <p className={s.lead}>
                            Viele vermeintlich „kostenlose Rechnungsprogramme“ entpuppen sich nach 14 Tagen als teure Abo-Falle oder erlauben nur 3 Rechnungen pro Monat. Rechly Desktop bietet Ihnen alle professionellen Fakturierungs-Funktionen dauerhaft frei auf Ihrem eigenen Rechner:
                        </p>
                    </div>

                    <div className={s.featureGrid}>
                        <div className={s.card}>
                            <span className={s.cardIcon}>
                                <HardDrive size={22} aria-hidden="true" />
                            </span>
                            <h3>1. 100 % Offline & Lokale SQLite-Datenbank</h3>
                            <p>
                                Ihre sensiblen Finanz- und Kundendaten verlassen niemals Ihren Computer. Kein Cloud-Zwang, kein Login, volle DSGVO-Datensouveränität und blitzschnelle Reaktionszeiten – selbst im Funkloch oder auf der Baustelle.
                            </p>
                        </div>

                        <div className={s.card}>
                            <span className={s.cardIcon}>
                                <FileCode2 size={22} aria-hidden="true" />
                            </span>
                            <h3>2. Lokales ZUGFeRD- & XRechnung-Tool (EN 16931)</h3>
                            <p>
                                Erfüllen Sie die gesetzliche B2B-E-Rechnungspflicht ohne Zusatzkosten: Erstellen Sie per Klick valide XRechnung 3.0 XML-Dateien (inkl. Leitweg-ID & BT-34) sowie hybride ZUGFeRD 2.3 PDF/A-3 Dokumente und prüfen Sie eingehende E-Rechnungen.
                            </p>
                        </div>

                        <div className={s.card}>
                            <span className={s.cardIcon}>
                                <Layers size={22} aria-hidden="true" />
                            </span>
                            <h3>3. Angebote, Rechnungen, Abschläge & Mahnungen</h3>
                            <p>
                                Schreiben Sie professionelle Angebote und Kostenvoranschläge und wandeln Sie diese mit einem Klick in eine fertige Rechnung um. Inklusive Stornorechnungen, Zahlungserinnerungen und 3-stufigem Mahnwesen.
                            </p>
                        </div>

                        <div className={s.card}>
                            <span className={s.cardIcon}>
                                <QrCode size={22} aria-hidden="true" />
                            </span>
                            <h3>4. GiroCode (EPC-QR) & Alle Steuerregeln (§ 19, § 13b, § 35a)</h3>
                            <p>
                                Jede PDF-Rechnung enthält auf Wunsch einen scannbaren SEPA-GiroCode für sofortige Banking-App-Überweisungen. Unterstützt Regelbesteuerung (19 %/7 %), Kleinunternehmer (§ 19 UStG), Bauleistungen (§ 13b) und Handwerkerrechnungen (§ 35a EStG).
                            </p>
                        </div>

                        <div className={s.card}>
                            <span className={s.cardIcon}>
                                <FileSpreadsheet size={22} aria-hidden="true" />
                            </span>
                            <h3>5. Ausgaben, EÜR-Übersicht & DATEV-Export</h3>
                            <p>
                                Erfassen Sie Eingangsrechnungen und Betriebsausgaben, behalten Sie Ihre Umsatzsteuer-Zahllast im Blick und exportieren Sie Buchungsdaten sauber als DATEV- oder CSV-Datei für Ihren Steuerberater.
                            </p>
                        </div>

                        <div className={s.card}>
                            <span className={s.cardIcon}>
                                <Cpu size={22} aria-hidden="true" />
                            </span>
                            <h3>6. Optionale lokale KI (Ollama & Bring-Your-Own-Key)</h3>
                            <p>
                                Nutzen Sie auf Wunsch lokale Sprachmodelle über Ollama (100 % offline auf Ihrer eigenen Hardware) oder Ihren eigenen API-Schlüssel für automatische Belegerkennung (OCR) und Formulierungshilfen.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Comparison Table: Rechly Desktop vs Cloud SaaS vs Word/Excel */}
                <section className={s.section}>
                    <div className={s.sectionHead}>
                        <span className={s.kicker}>
                            Direkter Systemvergleich
                        </span>
                        <h2>
                            Rechly Desktop vs. Cloud-Abo-Software vs. Word & Excel
                        </h2>
                        <p className={s.lead}>
                            Warum ein lokales Open-Source-Rechnungsprogramm für viele Freiberufler, Handwerker, Vereine und kleine Betriebe die wirtschaftlich und rechtlich überlegene Lösung ist:
                        </p>
                    </div>

                    <div className={s.tableWrap}>
                        <table className={s.table}>
                            <thead>
                                <tr>
                                    <th scope="col">Kriterium</th>
                                    <th scope="col" className={s.rechlyCol}>
                                        Rechly Desktop (Vollversion)
                                    </th>
                                    <th scope="col">
                                        Klassische Cloud-Abos (SaaS)
                                    </th>
                                    <th scope="col">
                                        Word / Excel Vorlagen
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <th scope="row">Laufende Kosten (3 Jahre)</th>
                                    <td className={s.rechlyCol}>0 € (dauerhaft kostenlos)</td>
                                    <td>ca. 540 € bis 1.440 €</td>
                                    <td>0 € bis 297 € (Office-Abo)</td>
                                </tr>
                                <tr>
                                    <th scope="row">Offline-Nutzung ohne Internet</th>
                                    <td className={s.rechlyCol}>
                                        <span className={s.yes}>
                                            <CheckCircle2 size={16} aria-hidden="true" />
                                            100 % lokal & offline
                                        </span>
                                    </td>
                                    <td>
                                        <span className={s.no}>
                                            <XCircle size={16} aria-hidden="true" />
                                            Nein (ständige Cloud-Verbindung)
                                        </span>
                                    </td>
                                    <td>Ja (aber ohne Datenbank)</td>
                                </tr>
                                <tr>
                                    <th scope="row">E-Rechnung (XRechnung 3.0 & ZUGFeRD)</th>
                                    <td className={s.rechlyCol}>
                                        <span className={s.yes}>
                                            <CheckCircle2 size={16} aria-hidden="true" />
                                            Voll integriert (Generator & Viewer)
                                        </span>
                                    </td>
                                    <td>Oft erst ab mittlerem Abo-Tarif</td>
                                    <td>
                                        <span className={s.no}>
                                            <XCircle size={16} aria-hidden="true" />
                                            Nicht EN-16931-konform
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row">Rechnungs- & Kundenlimit</th>
                                    <td className={s.rechlyCol}>Unbegrenzt</td>
                                    <td>Im Basistarif oft stark limitiert</td>
                                    <td>Manuelle Einzeldateien</td>
                                </tr>
                                <tr>
                                    <th scope="row">Automatische Fortlauf-Nummern & Kundenstamm</th>
                                    <td className={s.rechlyCol}>
                                        <span className={s.yes}>
                                            <CheckCircle2 size={16} aria-hidden="true" />
                                            Automatisch & fehlerfrei
                                        </span>
                                    </td>
                                    <td>Ja</td>
                                    <td>Hohes Risiko für Tipp- & Duplikatfehler</td>
                                </tr>
                                <tr>
                                    <th scope="row">Quellcode-Transparenz & Vendor-Lock-in</th>
                                    <td className={s.rechlyCol}>Open Source (AGPL-3.0) · Offene SQLite-DB</td>
                                    <td>Proprietäre Cloud (Preiserhöhungs-Risiko)</td>
                                    <td>Lokale Dateien ohne Auswertung</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Step-by-Step Installation & Setup Guide */}
                <section className={s.section}>
                    <div className={s.stepsCard}>
                        <div className={s.sectionHead}>
                            <span className={s.kicker}>
                                Schnellstart-Anleitung
                            </span>
                            <h2>
                                In 3 Minuten installiert: So starten Sie mit Rechly Desktop
                            </h2>
                        </div>

                        <div className={s.stepsGrid}>
                            <div className={s.step}>
                                <span className={s.stepNum}>1</span>
                                <h3>Installer für Windows oder Mac laden</h3>
                                <p>
                                    Laden Sie oben die{" "}
                                    <code>Rechly-Desktop-Setup-win-x64.exe</code>{" "}
                                    für Windows 10/11 oder die{" "}
                                    <code>.dmg</code>{" "}
                                    für macOS direkt von unseren offiziellen GitHub-Releases herunter.
                                </p>
                            </div>

                            <div className={s.step}>
                                <span className={s.stepNum}>2</span>
                                <h3>Ohne Registrierung lokal starten</h3>
                                <p>
                                    Nach dem ersten Start legt Rechly automatisch Ihre lokale Datenbank an. Sie müssen kein Passwort in einer fremden Cloud vergeben und keine Zahlungsdaten hinterlegen.
                                </p>
                            </div>

                            <div className={s.step}>
                                <span className={s.stepNum}>3</span>
                                <h3>Briefkopf anpassen & loslegen</h3>
                                <p>
                                    Tragen Sie Ihre Firmendaten, Steuernummer/USt-IdNr., Bankverbindung und Ihr Firmenlogo ein. Sofort erstellen Sie Angebote, DIN-5008-Rechnungen und XRechnungen.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Technical Specs & System Requirements */}
                <section className={s.section}>
                    <div className={s.splitGrid}>
                        <div className={s.panel}>
                            <h2 className={s.panelTitle}>
                                <ShieldCheck size={20} aria-hidden="true" />
                                Technische Daten & Systemvoraussetzungen
                            </h2>
                            <dl className={s.specList}>
                                <div className={s.specRow}>
                                    <dt>Windows-Version:</dt>
                                    <dd>Windows 10 & Windows 11 (64-Bit x64)</dd>
                                </div>
                                <div className={s.specRow}>
                                    <dt>macOS-Version:</dt>
                                    <dd>macOS 12+ (Apple Silicon M1–M4 & Intel)</dd>
                                </div>
                                <div className={s.specRow}>
                                    <dt>Lokale Datenbank:</dt>
                                    <dd>SQLite (lokales Dateisystem, 1-Klick-Backup)</dd>
                                </div>
                                <div className={s.specRow}>
                                    <dt>Unterstützte Formate:</dt>
                                    <dd>PDF (DIN 5008), XRechnung 3.0 XML, ZUGFeRD 2.3, CSV/DATEV</dd>
                                </div>
                                <div className={s.specRow}>
                                    <dt>Lizenzmodell:</dt>
                                    <dd>Kostenlose Vollversion · Open Source (AGPL-3.0)</dd>
                                </div>
                            </dl>
                        </div>

                        <div className={s.panel}>
                            <h2 className={s.panelTitle}>
                                <Lock size={20} aria-hidden="true" />
                                Für wen eignet sich das Offline-Fakturierungsprogramm?
                            </h2>
                            <ul className={s.checkList}>
                                <li>
                                    <CheckCircle2 size={16} aria-hidden="true" />
                                    <span>
                                        <strong>Kleinunternehmer (§ 19 UStG) & Nebengewerbe:</strong> Keine monatlichen Fixkosten für Rechnungssoftware, automatischer §-19-Pflichthinweis.
                                    </span>
                                </li>
                                <li>
                                    <CheckCircle2 size={16} aria-hidden="true" />
                                    <span>
                                        <strong>Handwerker, Bau & Dienstleister:</strong> Angebote, Abschlagsrechnungen, § 13b Reverse Charge und § 35a EStG Lohnanteil-Ausweis.
                                    </span>
                                </li>
                                <li>
                                    <CheckCircle2 size={16} aria-hidden="true" />
                                    <span>
                                        <strong>Freiberufler, IT-Consultants & Agenturen:</strong> Schnelle Projektabrechnung, Stundensätze, B2B-/B2G-XRechnung mit Leitweg-ID.
                                    </span>
                                </li>
                                <li>
                                    <CheckCircle2 size={16} aria-hidden="true" />
                                    <span>
                                        <strong>Datenschutzbewusste Teams:</strong> 100 % lokale Speicherung ohne Weitergabe von Kundendaten an externe Cloud-Server.
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* FAQs */}
                <section className={s.section}>
                    <div className={s.sectionHead}>
                        <span className={s.kicker}>
                            <HelpCircle size={14} aria-hidden="true" /> Häufige Fragen
                        </span>
                        <h2>
                            Häufige Fragen zum kostenlosen Rechnungsprogramm (Desktop-Vollversion)
                        </h2>
                    </div>
                    <div className={s.faqGrid}>
                        {DESKTOP_FAQS.map((faq) => (
                            <article key={faq.question}>
                                <h3>{faq.question}</h3>
                                <p>{faq.answer}</p>
                            </article>
                        ))}
                    </div>
                </section>

                {/* Internal Cluster Links */}
                <section className={[s.section, s.cluster].join(" ")}>
                    <h2>Weitere kostenlose Rechly-Werkzeuge & Ratgeber</h2>
                    <div className={s.clusterGrid}>
                        <Link href="/tools/rechnungsgenerator" className={s.clusterLink}>
                            <p className={s.clusterLinkTitle}>
                                Online-Rechnungsgenerator
                                <ArrowRight size={16} aria-hidden="true" />
                            </p>
                            <p>Direkt im Browser PDF-Rechnungen & XRechnungen ohne Download erstellen.</p>
                        </Link>
                        <Link href="/tools/angebotsgenerator" className={s.clusterLink}>
                            <p className={s.clusterLinkTitle}>
                                Kostenloser Angebotsgenerator
                                <ArrowRight size={16} aria-hidden="true" />
                            </p>
                            <p>Angebote & Kostenvoranschläge nach DIN 5008 online schreiben & als PDF speichern.</p>
                        </Link>
                        <Link href="/tools/e-rechnung-viewer" className={s.clusterLink}>
                            <p className={s.clusterLinkTitle}>
                                XRechnung & ZUGFeRD Viewer
                                <ArrowRight size={16} aria-hidden="true" />
                            </p>
                            <p>XML- und ZUGFeRD-Rechnungen kostenlos im Browser öffnen, prüfen & lesbar anzeigen.</p>
                        </Link>
                        <Link href="/vorlagen" className={s.clusterLink}>
                            <p className={s.clusterLinkTitle}>
                                14 Branchen-Rechnungsvorlagen
                                <ArrowRight size={16} aria-hidden="true" />
                            </p>
                            <p>Muster für Handwerker, Gebäudereinigung, Kleinunternehmer, Bau (§ 13b) & Privat.</p>
                        </Link>
                        <Link href="/rechnungsprogramm-kostenlos" className={s.clusterLink}>
                            <p className={s.clusterLinkTitle}>
                                Ratgeber: Rechnungsprogramm kostenlos
                                <ArrowRight size={16} aria-hidden="true" />
                            </p>
                            <p>Worauf Sie bei kostenloser Fakturierungssoftware in Deutschland achten müssen.</p>
                        </Link>
                        <Link href="/open-source" className={s.clusterLink}>
                            <p className={s.clusterLinkTitle}>
                                Open-Source-Architektur & Self-Hosting
                                <ArrowRight size={16} aria-hidden="true" />
                            </p>
                            <p>Quellcode, Docker-Setup und technische Hintergründe zu Rechly.</p>
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
