"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowRight,
    CalendarDays,
    Check,
    ChevronDown,
    Clock3,
    Code2,
    FileText,
    FolderKanban,
    Globe2,
    Import,
    Menu,
    Monitor,
    Receipt,
    Sparkles,
    Users,
    X,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getRepoUrl } from "@/lib/env";
import { homeFaqsDe, homeFaqsEn } from "@/lib/home-faq";
import s from "./home.module.css";

const repoUrl = getRepoUrl();

export default function HomeLanding() {
    const { language, setLanguage } = useLanguage();
    const l = (de: string, en: string) => (language === "de" ? de : en);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuButton = useRef<HTMLButtonElement>(null);
    const faqs = language === "de" ? homeFaqsDe : homeFaqsEn;
    const features = [
        {
            icon: FileText,
            title: l("Rechnungen & E-Rechnungen", "Invoices & e-invoices"),
            text: l(
                "Rechnungen erstellen, als PDF ausgeben oder als XRechnung und ZUGFeRD exportieren. Auch für Kleinunternehmer.",
                "Create invoices, export PDFs, XRechnung and ZUGFeRD. With support for German small-business invoicing.",
            ),
            href: "/e-rechnung-software",
            link: l("Mehr zu E-Rechnungen", "Explore e-invoicing"),
        },
        {
            icon: Users,
            title: l("Angebote & Kunden", "Quotes & clients"),
            text: l(
                "Kundendaten einmal erfassen, Angebote schreiben und daraus Rechnungen erstellen. Alles gehört zusammen.",
                "Save client details once, prepare quotes and turn them into invoices. Keep the whole process together.",
            ),
            href: "/angebot-schreiben",
            link: l("Angebote entdecken", "Explore quotes"),
        },
        {
            icon: FolderKanban,
            title: l("Projekte & Zeiterfassung", "Projects & time tracking"),
            text: l(
                "Aufgaben planen, Arbeitszeiten erfassen und Projektleistungen für die Abrechnung vorbereiten.",
                "Plan tasks, track working hours and prepare project work for invoicing.",
            ),
            badge: l("Erweitert", "Expanded"),
        },
        {
            icon: Receipt,
            title: l("Ausgaben & Überblick", "Expenses & oversight"),
            text: l(
                "Belege und Ausgaben organisieren, Bankumsätze per Datei importieren und Zahlungen abgleichen. Mit DATEV-Export.",
                "Organise receipts and expenses, import bank transactions from files and reconcile payments. With DATEV export.",
            ),
        },
        {
            icon: Import,
            title: l("Vorhandene Daten mitnehmen", "Bring your existing data"),
            text: l(
                "Kunden, Produkte und Belege aus unterstützten CSV- und Rechnungsdateien übernehmen. Import vor dem Speichern prüfen.",
                "Import clients, products and documents from supported CSV and invoice files. Review the import before saving.",
            ),
            badge: l("Neu dabei", "New"),
        },
        {
            icon: Sparkles,
            title: l("KI, wenn du sie brauchst", "AI when you want it"),
            text: l(
                "Rechnungsdaten aus Text vorbereiten. Optional mit eigenem KI-Anbieter oder lokal über Ollama.",
                "Prepare invoice details from text. Optionally use your own AI provider or run a model locally with Ollama.",
            ),
            badge: l("Optional", "Optional"),
        },
    ];
    const closeMenu = () => setMenuOpen(false);
    return (
        <div className={s.root} lang={language}>
            <a href="#inhalt" className={s.skip}>
                {l("Zum Inhalt", "Skip to content")}
            </a>
            <header
                className={s.header}
                onKeyDown={(event) => {
                    if (event.key === "Escape" && menuOpen) {
                        closeMenu();
                        menuButton.current?.focus();
                    }
                }}
            >
                <div className={s.headerInner}>
                    <Link
                        prefetch={false}
                        href="/"
                        className={s.brand}
                        aria-label={l("Rechly Startseite", "Rechly home")}
                    >
                        <Image src="/logo.png" width={34} height={34} alt="" priority />
                        <span>
                            Rechly<span className={s.brandDot}>.</span>
                        </span>
                    </Link>
                    <button
                        ref={menuButton}
                        type="button"
                        className={s.menuToggle}
                        aria-expanded={menuOpen}
                        aria-controls="home-navigation"
                        aria-label={l(
                            menuOpen ? "Menü schließen" : "Menü öffnen",
                            menuOpen ? "Close menu" : "Open menu",
                        )}
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
                    </button>
                    <nav
                        id="home-navigation"
                        className={[s.navigation, menuOpen ? s.navigationOpen : ""].join(" ")}
                        aria-label={l("Hauptnavigation", "Main navigation")}
                    >
                        <div className={s.navLinks}>
                            <Link prefetch={false} href="#funktionen" onClick={closeMenu}>
                                {l("Funktionen", "Features")}
                            </Link>
                            <Link prefetch={false} href="#termine" onClick={closeMenu}>
                                {l("Terminbuchung", "Booking")}
                            </Link>
                            <Link prefetch={false} href="/desktop" onClick={closeMenu}>
                                Desktop
                            </Link>
                            <Link prefetch={false} href="/open-source" onClick={closeMenu}>
                                Open Source
                            </Link>
                        </div>
                        <div className={s.navActions}>
                            <label className={s.language}>
                                <span className={s.srOnly}>{l("Sprache", "Language")}</span>
                                <select
                                    value={language}
                                    onChange={(event) => setLanguage(event.target.value as "de" | "en")}
                                    aria-label={l("Sprache", "Language")}
                                >
                                    <option value="de">DE</option>
                                    <option value="en">EN</option>
                                </select>
                            </label>
                            <Link prefetch={false} href="/login" className={s.login}>
                                {l("Anmelden", "Log in")}
                            </Link>
                            <Link prefetch={false} href="/register" className={s.buttonSmall}>
                                {l("Kostenlos starten", "Get started free")}
                            </Link>
                        </div>
                    </nav>
                </div>
            </header>

            <main id="inhalt" tabIndex={-1}>
                <section className={[s.container, s.hero].join(" ")} aria-labelledby="home-title">
                    <div className={s.heroCopy}>
                        <p className={s.eyebrow}>
                            <span className={s.statusDot} />
                            {l("Dein Büro. Open Source.", "Your workspace. Open source.")}
                        </p>
                        <h1 id="home-title">
                            {l("Rechnungen schreiben.", "Invoicing sorted.")}
                            <br />
                            <span>{l("Mehr Zeit fürs Geschäft.", "More time for your work.")}</span>
                        </h1>
                        <p className={s.heroText}>
                            {l(
                                "Die kostenlose Rechnungssoftware für Selbstständige und kleine Unternehmen. Rechnungen, Kunden, Projekte und Termine – an einem Ort.",
                                "Free invoicing software for freelancers and small businesses. Invoices, clients, projects and appointments, all in one place.",
                            )}
                        </p>
                        <div className={s.actions}>
                            <Link prefetch={false} href="/register" className={s.button}>
                                {l("Kostenlos starten", "Get started free")}
                                <ArrowRight size={18} aria-hidden="true" />
                            </Link>
                            <Link prefetch={false} href="#funktionen" className={s.buttonSecondary}>
                                {l("Funktionen entdecken", "Explore features")}
                            </Link>
                        </div>
                        <p className={s.heroNote}>
                            {l(
                                "Ohne Abo. Ohne Kreditkarte. In deinem Tempo.",
                                "No subscription. No credit card. At your own pace.",
                            )}
                        </p>
                    </div>
                    <figure className={s.preview}>
                        <div className={s.appFrame} aria-hidden="true">
                            <div className={s.appBar}>
                                <span className={s.appMark}>R</span>
                                <strong>Rechly</strong>
                                <span className={s.appWorkspace}>{l("Mein Büro", "My workspace")}</span>
                                <span className={s.avatar}>JD</span>
                            </div>
                            <div className={s.appBody}>
                                <div className={s.appRail}>
                                    <FileText />
                                    <Users />
                                    <CalendarDays />
                                    <Clock3 />
                                </div>
                                <div className={s.invoice}>
                                    <div className={s.invoiceHeading}>
                                        <span className={s.eyebrow}>
                                            {l("Alles an seinem Platz", "Everything in its place")}
                                        </span>
                                        <span className={s.draft}>{l("Entwurf", "Draft")}</span>
                                    </div>
                                    <div className={s.invoiceTitle}>
                                        {l("Rechnung", "Invoice")} <span>0042</span>
                                    </div>
                                    <div className={s.invoiceParties}>
                                        <div>
                                            <small>{l("VON", "FROM")}</small>
                                            <strong>Jana Design</strong>
                                        </div>
                                        <div>
                                            <small>{l("FÜR", "TO")}</small>
                                            <strong>Studio Nord</strong>
                                        </div>
                                    </div>
                                    <div className={s.invoiceLine}>
                                        <span>{l("Markenentwicklung", "Brand design")}</span>
                                        <strong>480,00 €</strong>
                                    </div>
                                    <div className={s.invoiceLine}>
                                        <span>{l("Webdesign", "Web design")}</span>
                                        <strong>1.200,00 €</strong>
                                    </div>
                                    <div className={s.invoiceTax}>
                                        <span>{l("Umsatzsteuer", "VAT")} · 19 %</span>
                                        <span>319,20 €</span>
                                    </div>
                                    <div className={s.invoiceTotal}>
                                        <span>{l("Gesamtbetrag", "Total")}</span>
                                        <strong>1.999,20 €</strong>
                                    </div>
                                    <div className={s.formatRow}>
                                        <span>PDF</span>
                                        <span>XRechnung</span>
                                        <span>ZUGFeRD</span>
                                    </div>
                                </div>
                            </div>
                            <div className={s.appAppointment}>
                                <span className={s.appAppointmentIcon}>
                                    <CalendarDays size={20} />
                                </span>
                                <div>
                                    <strong>
                                        {l("Erstgespräch · Studio Nord", "Consultation · Studio Nord")}
                                    </strong>
                                    <span>{l("14:30 Uhr · 30 Minuten", "14:30 · 30 minutes")}</span>
                                </div>
                                <span className={s.confirmed}>
                                    <Check size={13} />
                                    {l("Bestätigt", "Confirmed")}
                                </span>
                            </div>
                        </div>
                        <figcaption>
                            {l("Beispielansicht mit fiktiven Daten", "Illustrative view with sample data")}
                        </figcaption>
                    </figure>
                </section>

                <div
                    className={[s.container, s.trustRow].join(" ")}
                    aria-label={l("Rechly auf einen Blick", "Rechly at a glance")}
                >
                    <span>
                        <Check size={18} aria-hidden="true" />
                        {l("Kostenlos nutzbar", "Free to use")}
                    </span>
                    <span>
                        <Code2 size={18} aria-hidden="true" />
                        Open Source · AGPL-3.0
                    </span>
                    <span>
                        <Monitor size={18} aria-hidden="true" />
                        Web & Desktop
                    </span>
                    <span>
                        <Globe2 size={18} aria-hidden="true" />
                        {l("Für den deutschen Geschäftsalltag", "Built for business in Germany")}
                    </span>
                </div>

                <section
                    id="funktionen"
                    className={[s.container, s.section].join(" ")}
                    aria-labelledby="features-title"
                >
                    <div className={s.sectionHeader}>
                        <div>
                            <p className={s.eyebrow}>{l("Weniger Verwaltungsaufwand", "Less admin")}</p>
                            <h2 id="features-title">
                                {l("Dein Alltag. Gut organisiert.", "Your workday, well organised.")}
                            </h2>
                        </div>
                        <p>
                            {l(
                                "Starte mit deiner ersten Rechnung. Nutze weitere Funktionen, wenn dein Geschäft sie braucht.",
                                "Start with your first invoice. Add more features when your business needs them.",
                            )}
                        </p>
                    </div>
                    <div className={s.featureGrid}>
                        {features.map((feature) => (
                            <article className={s.feature} key={feature.title}>
                                <div className={s.featureTop}>
                                    <span className={s.featureIcon}>
                                        <feature.icon size={23} aria-hidden="true" />
                                    </span>
                                    {feature.badge && <span className={s.badge}>{feature.badge}</span>}
                                </div>
                                <h3>{feature.title}</h3>
                                <p>{feature.text}</p>
                                {feature.href && (
                                    <Link prefetch={false} className={s.textLink} href={feature.href}>
                                        {feature.link}
                                        <ArrowRight size={15} aria-hidden="true" />
                                    </Link>
                                )}
                            </article>
                        ))}
                    </div>
                    <Link prefetch={false} href="/features" className={s.textLink} style={{ marginTop: 22 }}>
                        {l("Alle Funktionen im Überblick", "See all features")}
                        <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                </section>

                <section id="termine" className={s.bookingSection} aria-labelledby="booking-title">
                    <div className={[s.container, s.bookingGrid].join(" ")}>
                        <div className={s.bookingCopy}>
                            <p className={s.eyebrow}>
                                <span className={s.newPill}>{l("Neu", "New")}</span>
                                {l("Online-Terminbuchung", "Online appointment booking")}
                            </p>
                            <h2 id="booking-title">
                                {l("Freie Zeiten teilen.", "Share your availability.")}
                                <br />
                                {l("Weniger hin und her.", "Skip the back-and-forth.")}
                            </h2>
                            <p>
                                {l(
                                    "Deine Kunden wählen selbst einen freien Termin auf deiner Buchungsseite. Du behältst deinen Kalender und deine Regeln im Griff.",
                                    "Clients choose an available time on your booking page. You stay in control of your calendar and booking rules.",
                                )}
                            </p>
                            <ul className={s.checkList}>
                                <li>
                                    <Check size={18} aria-hidden="true" />
                                    {l(
                                        "Eigene Buchungsseite – ohne Kundenkonto",
                                        "Your own booking page, no client account required",
                                    )}
                                </li>
                                <li>
                                    <Check size={18} aria-hidden="true" />
                                    {l(
                                        "Arbeitszeiten, Puffer und Buchungsfristen festlegen",
                                        "Set working hours, buffers and booking windows",
                                    )}
                                </li>
                                <li>
                                    <Check size={18} aria-hidden="true" />
                                    {l(
                                        "Bestätigen, verschieben und online stornieren",
                                        "Confirm, reschedule and cancel online",
                                    )}
                                </li>
                            </ul>
                            <Link prefetch={false} href="/register" className={s.textLink}>
                                {l("Mit Rechly Termine organisieren", "Organise appointments with Rechly")}
                                <ArrowRight size={17} aria-hidden="true" />
                            </Link>
                        </div>
                        <figure className={s.bookingPreview}>
                            <div className={s.bookingCard} aria-hidden="true">
                                <div className={s.bookingCardHeader}>
                                    <span className={s.bookingLogo}>SN</span>
                                    <div>
                                        <strong>Studio Nord</strong>
                                        <span>{l("Persönliche Beratung", "Personal consultation")}</span>
                                    </div>
                                    <span className={s.duration}>
                                        <Clock3 size={14} />
                                        30 min
                                    </span>
                                </div>
                                <div className={s.bookingCardBody}>
                                    <div className={s.bookingCardTitle}>
                                        <strong>{l("Wann passt es dir?", "What works for you?")}</strong>
                                        <CalendarDays size={18} />
                                    </div>
                                    <div className={s.weekStrip}>
                                        {[
                                            l("Mo", "Mon"),
                                            l("Di", "Tue"),
                                            l("Mi", "Wed"),
                                            l("Do", "Thu"),
                                            l("Fr", "Fri"),
                                        ].map((day, index) => (
                                            <div key={day} className={index === 2 ? s.selectedDay : ""}>
                                                <span>{day}</span>
                                                <strong>{9 + index}</strong>
                                                <span className={s.dayDot} />
                                            </div>
                                        ))}
                                    </div>
                                    <p className={s.slotLabel}>
                                        {l("Verfügbare Uhrzeiten", "Available times")}
                                        <span>Europe/Berlin</span>
                                    </p>
                                    <div className={s.slotGrid}>
                                        {["09:00", "10:30", "11:00", "14:30", "15:00", "16:30"].map(
                                            (time) => (
                                                <span
                                                    key={time}
                                                    className={time === "14:30" ? s.selectedSlot : ""}
                                                >
                                                    {time}
                                                    {time === "14:30" && <Check size={14} />}
                                                </span>
                                            ),
                                        )}
                                    </div>
                                    <div className={s.bookingNext}>
                                        {l("Weiter zu deinen Angaben", "Continue to your details")}
                                        <ArrowRight size={16} />
                                    </div>
                                    <p className={s.bookingHint}>
                                        {l(
                                            "Du brauchst kein Rechly-Konto.",
                                            "You don't need a Rechly account.",
                                        )}
                                    </p>
                                </div>
                            </div>
                            <figcaption>
                                {l("Beispiel einer Buchungsseite", "Illustrative booking page")}
                            </figcaption>
                        </figure>
                    </div>
                </section>

                <section className={[s.container, s.section].join(" ")} aria-labelledby="choice-title">
                    <div className={s.sectionHeader}>
                        <div>
                            <p className={s.eyebrow}>{l("So, wie du arbeitest", "Work your way")}</p>
                            <h2 id="choice-title">
                                {l(
                                    "Im Browser. Oder auf deinem Rechner.",
                                    "In your browser. Or on your computer.",
                                )}
                            </h2>
                        </div>
                        <p>
                            {l(
                                "Du entscheidest, wo du arbeitest und wo deine Daten liegen.",
                                "You choose where you work and where your data lives.",
                            )}
                        </p>
                    </div>
                    <div className={s.choiceGrid}>
                        <article className={s.choiceCard}>
                            <Globe2 size={26} aria-hidden="true" />
                            <h3>Rechly Web</h3>
                            <p>
                                {l(
                                    "Direkt loslegen, ohne Installation. Rechnungen verwalten und deine Online-Buchungsseite mit Kunden teilen.",
                                    "Get started without installing anything. Manage invoices and share your online booking page with clients.",
                                )}
                            </p>
                            <Link prefetch={false} href="/register" className={s.textLink}>
                                {l("Im Browser starten", "Start in your browser")}
                                <ArrowRight size={17} aria-hidden="true" />
                            </Link>
                        </article>
                        <article className={s.choiceCard}>
                            <Monitor size={26} aria-hidden="true" />
                            <h3>Rechly Desktop</h3>
                            <p>
                                {l(
                                    "Rechnungen lokal und offline bearbeiten. Deine Daten bleiben auf deinem Gerät. Für Windows und macOS.",
                                    "Work on invoices locally and offline. Your data stays on your device. Available for Windows and macOS.",
                                )}
                            </p>
                            <Link prefetch={false} href="/desktop" className={s.textLink}>
                                {l("Desktop-App ansehen", "Explore the desktop app")}
                                <ArrowRight size={17} aria-hidden="true" />
                            </Link>
                        </article>
                    </div>
                    <div className={s.openSourceNote}>
                        <Code2 size={22} aria-hidden="true" />
                        <p>
                            {l(
                                "Offener Quellcode. Auch selbst hostbar.",
                                "Open code. Self-hosting available.",
                            )}
                            <span>
                                {l(
                                    "Rechly wird unter AGPL-3.0 entwickelt. Du kannst mitlesen, beitragen und die Web-App selbst betreiben.",
                                    "Rechly is developed under AGPL-3.0. Explore the code, contribute or host the web app yourself.",
                                )}
                            </span>
                        </p>
                        <Link prefetch={false} href="/open-source" className={s.textLink}>
                            {l("Mehr erfahren", "Learn more")}
                            <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                    </div>
                </section>

                <section className={s.resourcesSection} aria-labelledby="resources-title">
                    <div className={s.container}>
                        <div className={s.sectionHeader}>
                            <div>
                                <p className={s.eyebrow}>{l("Für zwischendurch", "A little extra help")}</p>
                                <h2 id="resources-title">
                                    {l(
                                        "Eine schnelle Antwort. Ein nützliches Werkzeug.",
                                        "A quick answer. A useful tool.",
                                    )}
                                </h2>
                            </div>
                        </div>
                        <div className={s.resourceGrid}>
                            {[
                                {
                                    href: "/tools",
                                    title: l("Kostenlose Tools", "Free tools"),
                                    text: l(
                                        "Rechnungsgenerator, Steuerrechner und mehr – ohne Anmeldung.",
                                        "Invoice generators, tax calculators and more, without signing up.",
                                    ),
                                },
                                {
                                    href: "/vorlagen",
                                    title: l("Rechnungsvorlagen", "Invoice templates"),
                                    text: l(
                                        "Passende Vorlagen für dein Handwerk, deine Branche und deine Leistung.",
                                        "Find templates for your trade, industry and services.",
                                    ),
                                },
                                {
                                    href: "/lexikon",
                                    title: l("Wissen fürs Geschäft", "Business knowledge"),
                                    text: l(
                                        "Rechnungsangaben, Kleinunternehmerregelung und E-Rechnungen erklärt.",
                                        "Invoice requirements, German small-business rules and e-invoicing explained.",
                                    ),
                                },
                            ].map((item) => (
                                <Link
                                    prefetch={false}
                                    href={item.href}
                                    className={s.resourceCard}
                                    key={item.href}
                                >
                                    <div>
                                        <h3>{item.title}</h3>
                                        <p>{item.text}</p>
                                    </div>
                                    <ArrowRight size={20} aria-hidden="true" />
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                <section className={[s.container, s.faqSection].join(" ")} aria-labelledby="faq-title">
                    <div>
                        <p className={s.eyebrow}>{l("Gut zu wissen", "Good to know")}</p>
                        <h2 id="faq-title">{l("Noch Fragen?", "Any questions?")}</h2>
                        <p className={s.faqIntro}>
                            {l(
                                "Die wichtigsten Antworten, bevor du loslegst.",
                                "A few helpful answers before you get started.",
                            )}
                        </p>
                    </div>
                    <div className={s.faqList}>
                        {faqs.map((faq) => (
                            <details key={faq.question} className={s.faqItem}>
                                <summary>
                                    {faq.question}
                                    <ChevronDown size={19} aria-hidden="true" />
                                </summary>
                                <p>{faq.answer}</p>
                            </details>
                        ))}
                    </div>
                </section>

                <section className={[s.container, s.cta].join(" ")} aria-labelledby="start-title">
                    <div>
                        <p className={s.eyebrow}>{l("Bereit, wenn du es bist", "Ready when you are")}</p>
                        <h2 id="start-title">
                            {l("Weniger Büro. Mehr Geschäft.", "Less admin. More business.")}
                        </h2>
                        <p>
                            {l(
                                "Starte kostenlos. Entdecke den Rest in deinem Tempo.",
                                "Start for free. Discover the rest at your own pace.",
                            )}
                        </p>
                    </div>
                    <Link prefetch={false} href="/register" className={s.button}>
                        {l("Jetzt kostenlos starten", "Get started for free")}
                        <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                </section>
            </main>

            <footer className={s.footer}>
                <div className={s.container}>
                    <div className={s.footerGrid}>
                        <div className={s.footerBrand}>
                            <Link prefetch={false} href="/" className={s.brand}>
                                <Image src="/logo.png" width={30} height={30} alt="" />
                                <span>
                                    Rechly<span className={s.brandDot}>.</span>
                                </span>
                            </Link>
                            <p>
                                {l(
                                    "Dein Geschäft, gut organisiert. Kostenlos und Open Source.",
                                    "Your business, well organised. Free and open source.",
                                )}
                            </p>
                            <a
                                href={repoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={s.textLink}
                            >
                                GitHub
                                <ArrowRight size={15} aria-hidden="true" />
                            </a>
                        </div>
                        <nav aria-label={l("Produkt", "Product")}>
                            <h3>{l("Produkt", "Product")}</h3>
                            <Link prefetch={false} href="#funktionen">
                                {l("Funktionen", "Features")}
                            </Link>
                            <Link prefetch={false} href="#termine">
                                {l("Terminbuchung", "Booking")}
                            </Link>
                            <Link prefetch={false} href="/desktop">
                                Desktop
                            </Link>
                            <Link prefetch={false} href="/open-source">
                                Open Source
                            </Link>
                        </nav>
                        <nav aria-label={l("Ressourcen", "Resources")}>
                            <h3>{l("Ressourcen", "Resources")}</h3>
                            <Link prefetch={false} href="/tools">
                                {l("Tools & Rechner", "Tools & calculators")}
                            </Link>
                            <Link prefetch={false} href="/vorlagen">
                                {l("Vorlagen", "Templates")}
                            </Link>
                            <Link prefetch={false} href="/lexikon">
                                {l("Lexikon", "Knowledge base")}
                            </Link>
                            <Link prefetch={false} href="/rechnung-schreiben">
                                {l("Rechnung schreiben", "Invoicing guide")}
                            </Link>
                        </nav>
                        <nav aria-label={l("Rechtliches", "Legal")}>
                            <h3>{l("Rechtliches", "Legal")}</h3>
                            <Link prefetch={false} href="/impressum">
                                {l("Impressum", "Legal notice")}
                            </Link>
                            <Link prefetch={false} href="/datenschutz">
                                {l("Datenschutz", "Privacy")}
                            </Link>
                            <Link prefetch={false} href="/agb">
                                {l("Nutzungsbedingungen", "Terms")}
                            </Link>
                            <Link prefetch={false} href="/cookies">
                                {l("Cookie-Einstellungen", "Cookie settings")}
                            </Link>
                        </nav>
                    </div>
                    <div className={s.footerBottom}>
                        <span>© {new Date().getFullYear()} Rechly</span>
                        <span>
                            {l(
                                "Für Selbstständige und kleine Unternehmen.",
                                "For freelancers and small businesses.",
                            )}
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
