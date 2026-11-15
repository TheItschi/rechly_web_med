"use client";

import Link from "next/link";
import {
    ArrowRight,
    Building2,
    CalendarDays,
    Check,
    Clock3,
    FileText,
    FolderKanban,
    Import,
    Landmark,
    Monitor,
    Receipt,
    ShieldCheck,
    Sparkles,
    Tags,
    X,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import s from "./features.module.css";

type Row = { label: [string, string]; rechly: boolean | string; lex: boolean | string; sev: boolean | string };

export default function FeaturesClient() {
    const { language } = useLanguage();
    const l = (de: string, en: string) => (language === "de" ? de : en);

    const groups: Array<{
        title: [string, string];
        desc: [string, string];
        items: Array<{ icon: React.ElementType; title: [string, string]; text: [string, string] }>;
    }> = [
        {
            title: ["Rechnungen & Angebote", "Invoices & quotes"],
            desc: ["Vom Angebot bis zur bezahlten Rechnung — ohne Medienbruch.", "From quote to paid invoice — no broken workflow."],
            items: [
                { icon: FileText, title: ["Rechnungen & E-Rechnungen", "Invoices & e-invoices"], text: ["PDF, XRechnung 3.0 und ZUGFeRD 2.3 (EN 16931). Auch als Kleinunternehmer nach § 19 UStG.", "PDF, XRechnung 3.0 and ZUGFeRD 2.3 (EN 16931). Including § 19 UStG small-business rules."] },
                { icon: Tags, title: ["Angebote, die zu Rechnungen werden", "Quotes that become invoices"], text: ["Angebot erstellen, vom Kunden bestätigen lassen und mit einem Klick abrechnen.", "Create a quote, get it approved and bill it in one click."] },
                { icon: Receipt, title: ["Wiederkehrende Rechnungen & Mahnungen", "Recurring invoices & reminders"], text: ["Abos automatisch abrechnen, Zahlungserinnerungen und Mahnschreiben direkt aus der Rechnung.", "Bill subscriptions automatically; payment reminders and dunning letters straight from the invoice."] },
            ],
        },
        {
            title: ["Geld & Steuer im Griff", "Money & tax under control"],
            desc: ["Was sonst Extra-Module kostet, ist bei Rechly inklusive.", "What costs extra elsewhere is included at Rechly."],
            items: [
                { icon: Landmark, title: ["Ausgaben, Bankabgleich & DATEV", "Expenses, bank matching & DATEV"], text: ["Bankumsätze per Datei importieren, Zahlungen abgleichen und per DATEV-Export an den Steuerberater geben.", "Import bank transactions by file, reconcile payments and hand everything to your tax advisor via DATEV."] },
                { icon: Building2, title: ["Kunden & Produkte", "Clients & products"], text: ["Stammdaten einmal pflegen und überall wiederverwenden — inklusive Import aus CSV und Rechnungsdateien.", "Maintain master data once and reuse it everywhere — including CSV and invoice-file import."] },
                { icon: ShieldCheck, title: ["Berichte & Kontrolle", "Reports & control"], text: ["Umsatz, offene Beträge und Projektkosten auf einen Blick. Keine Blackbox, jederzeit exportierbar.", "Revenue, open amounts and project costs at a glance. No black box, exportable anytime."] },
            ],
        },
        {
            title: ["Arbeit organisieren", "Organise the work"],
            desc: ["Mehr als ein Rechnungsprogramm: dein ganzes Büro.", "More than invoicing: your whole office."],
            items: [
                { icon: CalendarDays, title: ["Online-Terminbuchung", "Online appointment booking"], text: ["Eigene Buchungsseite mit Arbeitszeiten und Puffern. Kunden buchen, verschieben und stornieren selbst.", "Your own booking page with working hours and buffers. Clients book, reschedule and cancel themselves."] },
                { icon: FolderKanban, title: ["Projekte & Aufgaben", "Projects & tasks"], text: ["Projekte planen, Aufgaben verteilen und Projektkosten gegen das Budget stellen.", "Plan projects, assign tasks and track project costs against budget."] },
                { icon: Clock3, title: ["Zeiterfassung, die abrechnet", "Time tracking that bills"], text: ["Zeiten per Timer erfassen und ungeabrechnete Leistungen direkt in eine Rechnung übernehmen.", "Track time with a timer and turn unbilled work into an invoice."] },
            ],
        },
        {
            title: ["Deine Regeln, deine Daten", "Your rules, your data"],
            desc: ["Der Grund, warum Rechly Open Source ist.", "The reason Rechly is open source."],
            items: [
                { icon: Monitor, title: ["Web, Desktop & selbst gehostet", "Web, desktop & self-hosted"], text: ["Im Browser starten, offline am Desktop arbeiten (Windows & Mac) oder die Web-App selbst betreiben.", "Start in the browser, work offline on desktop (Windows & Mac) or run the web app yourself."] },
                { icon: Sparkles, title: ["Optionale KI — mit deinem Schlüssel", "Optional AI — with your key"], text: ["Rechnungsdaten aus Text vorbereiten: mit eigenem Anbieter oder lokal über Ollama. Kein KI-Zwang.", "Prepare invoice data from text: with your own provider or locally via Ollama. No forced AI."] },
                { icon: Import, title: ["Wechsel ohne Datenverlust", "Switch without losing data"], text: ["Kunden, Produkte und Belege aus unterstützten Formaten übernehmen und vor dem Speichern prüfen.", "Bring clients, products and documents from supported formats and review before saving."] },
            ],
        },
    ];

    const rows: Row[] = [
        { label: ["Preis", "Price"], rechly: l("0 € — dauerhaft kostenlos", "€0 — free forever"), lex: "7,90–32,90 €/Monat", sev: "8,90–25,90 €/Monat" },
        { label: ["Rechnungs-Limit im Gratistarif", "Invoice limit on free tier"], rechly: l("Kein Limit", "No limit"), lex: "—", sev: l("3 / Monat", "3 / month") },
        { label: ["E-Rechnung (XRechnung & ZUGFeRD)", "E-invoicing (XRechnung & ZUGFeRD)"], rechly: true, lex: l("Nur im Top-Tarif", "Top tier only"), sev: true },
        { label: ["Terminbuchung inklusive", "Appointment booking included"], rechly: true, lex: false, sev: false },
        { label: ["Rechnung per Link teilen (GiroCode-Zahlung)", "Share invoice by link (GiroCode payment)"], rechly: true, lex: l("Kundenportal", "Customer portal"), sev: l("Kundenportal", "Customer portal") },
        { label: ["Desktop-App, 100 % offline", "Desktop app, 100% offline"], rechly: true, lex: false, sev: false },
        { label: ["Open Source & selbst hostbar", "Open source & self-hostable"], rechly: true, lex: false, sev: false },
        { label: ["DATEV-Export", "DATEV export"], rechly: true, lex: true, sev: true },
    ];

    const cell = (value: boolean | string) =>
        value === true ? (
            <span className={s.yes}><Check size={16} strokeWidth={3} />{l("Ja", "Yes")}</span>
        ) : value === false ? (
            <span className={s.no}><X size={15} />{l("Nein", "No")}</span>
        ) : (
            value
        );

    return (
        <div className={s.root}>
            <Navbar />
            <main>
                <section className={s.hero}>
                    <p className={s.kicker}>{l("Funktionen", "Features")}</p>
                    <h1>{l("Alles für deine Rechnungen. Für 0 €.", "Everything for your invoices. For €0.")}</h1>
                    <p className={s.heroText}>
                        {l(
                            "Andere Anbieter verteilen diese Funktionen auf teure Tarife. Rechly gibt sie dir komplett — kostenlos, ohne Limits und mit offenem Quellcode.",
                            "Other providers spread these features across expensive tiers. Rechly gives you all of it — free, without limits and with open source code.",
                        )}
                    </p>
                    <div className={s.actions}>
                        <Link href="/register" className={s.button}>
                            {l("Kostenlos starten", "Start free")} <ArrowRight size={17} />
                        </Link>
                        <Link href="/rechnung-schreiben" className={s.buttonSecondary}>
                            {l("Erst Rechnung ohne Konto erstellen", "Create an invoice without an account first")}
                        </Link>
                    </div>
                    <p className={s.note}>{l("Keine Kreditkarte · In 2 Minuten zur ersten Rechnung", "No credit card · First invoice in 2 minutes")}</p>
                </section>

                {groups.map((group) => (
                    <section key={group.title[0]} className={s.section} aria-labelledby={`g-${group.title[0]}`}>
                        <div className={s.sectionHead}>
                            <h2 id={`g-${group.title[0]}`}>{l(...group.title)}</h2>
                            <p>{l(...group.desc)}</p>
                        </div>
                        <div className={s.grid}>
                            {group.items.map((item) => (
                                <article key={item.title[0]} className={s.card}>
                                    <span className={s.icon}><item.icon size={21} /></span>
                                    <h3>{l(...item.title)}</h3>
                                    <p>{l(...item.text)}</p>
                                </article>
                            ))}
                        </div>
                    </section>
                ))}

                <section className={s.compareSection} aria-labelledby="compare-title">
                    <div className={s.sectionHead}>
                        <h2 id="compare-title">{l("Warum wechseln? Der ehrliche Vergleich.", "Why switch? The honest comparison.")}</h2>
                        <p>{l("Preise der Mitbewerber: Stand 2026, netto, laut deren Preislisten. Prüfe gern selbst nach.", "Competitor prices: as of 2026, net, from their published price lists. Feel free to verify.")}</p>
                    </div>
                    <div className={s.tableWrap}>
                        <table className={s.table}>
                            <thead>
                                <tr>
                                    <th scope="col"><span className={s.srOnly}>{l("Merkmal", "Feature")}</span></th>
                                    <th scope="col" className={s.rechlyCol}>Rechly</th>
                                    <th scope="col">Lexware Office</th>
                                    <th scope="col">sevDesk</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.label[0]}>
                                        <th scope="row">{l(...row.label)}</th>
                                        <td className={s.rechlyCol}>{cell(row.rechly)}</td>
                                        <td>{cell(row.lex)}</td>
                                        <td>{cell(row.sev)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className={s.compareNote}>
                        {l(
                            "Fairerweise: Für vollständige Buchhaltung mit ELSTER-Abgabe direkt aus dem Programm sind die kostenpflichtigen Suiten weiter. Rechly deckt Rechnungen, Angebote, Ausgaben, DATEV-Übergabe und Terminbuchung ab — und kostet dafür nichts.",
                            "To be fair: for full bookkeeping with ELSTER filing directly in the app, the paid suites go further. Rechly covers invoices, quotes, expenses, DATEV handover and booking — and charges nothing for it.",
                        )}
                    </p>
                    <div className={s.actions}>
                        <Link href="/register" className={s.button}>
                            {l("Jetzt kostenlos wechseln", "Switch for free now")} <ArrowRight size={17} />
                        </Link>
                        <Link href="/lexoffice-alternative" className={s.textLink}>
                            {l("Details: lexoffice Alternative", "Details: lexoffice alternative")} <ArrowRight size={15} />
                        </Link>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
