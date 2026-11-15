"use client";

import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getRepoUrl } from "@/lib/env";
import s from "./auth.module.css";

const repoUrl = getRepoUrl();

export default function AuthShell({
    mode,
    title,
    subtitle,
    children,
    footer,
}: {
    mode: "login" | "register" | "reset";
    title: string;
    subtitle: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    const { language } = useLanguage();
    const l = (de: string, en: string) => (language === "de" ? de : en);

    const points =
        language === "de"
            ? [
                  "Rechnungen, Angebote & E-Rechnungen (XRechnung, ZUGFeRD)",
                  "Kunden, Projekte, Zeiterfassung & Terminbuchung inklusive",
                  "Dauerhaft kostenlos — kein Abo, keine Rechnungs-Limits",
                  "Open Source (AGPL-3.0): Code prüfen oder selbst hosten",
              ]
            : [
                  "Invoices, quotes & e-invoices (XRechnung, ZUGFeRD)",
                  "Clients, projects, time tracking & booking included",
                  "Free forever — no subscription, no invoice limits",
                  "Open source (AGPL-3.0): audit the code or self-host",
              ];

    return (
        <div className={s.root}>
            <aside className={s.panel} aria-hidden={mode === "reset" ? undefined : true}>
                <Link href="/" className={s.brand} tabIndex={-1}>
                    <Image src="/logo.png" alt="" width={34} height={34} priority />
                    <span>
                        Rechly<span className={s.dot}>.</span>
                    </span>
                </Link>

                <div className={s.panelCopy}>
                    <p className={s.panelKicker}>
                        {l("Kostenlose Rechnungssoftware", "Free invoicing software")}
                    </p>
                    <p className={s.panelHeadline}>
                        {l(
                            "Rechnungen schreiben, ohne dafür zu bezahlen.",
                            "Create invoices without paying for it.",
                        )}
                    </p>
                    <ul className={s.points}>
                        {points.map((point) => (
                            <li key={point}>
                                <span className={s.check}>
                                    <Check size={13} strokeWidth={3} />
                                </span>
                                {point}
                            </li>
                        ))}
                    </ul>
                </div>

                <figure className={s.preview} aria-hidden="true">
                    <div className={s.previewBar}>
                        <span className={s.previewMark}>R</span>
                        <strong>Rechly</strong>
                        <span className={s.previewBadge}>{l("Entwurf", "Draft")}</span>
                    </div>
                    <div className={s.previewBody}>
                        <div className={s.previewTitle}>
                            {l("Rechnung", "Invoice")} <span>0042</span>
                        </div>
                        <div className={s.previewLine}>
                            <span>{l("Webdesign", "Web design")}</span>
                            <strong>1.200,00 €</strong>
                        </div>
                        <div className={s.previewLine}>
                            <span>{l("Beratung", "Consulting")}</span>
                            <strong>480,00 €</strong>
                        </div>
                        <div className={s.previewTotal}>
                            <span>{l("Gesamtbetrag", "Total")}</span>
                            <strong>1.999,20 €</strong>
                        </div>
                        <div className={s.previewFormats}>
                            <span>PDF</span>
                            <span>XRechnung</span>
                            <span>ZUGFeRD</span>
                            <span>DATEV</span>
                        </div>
                    </div>
                </figure>

                <p className={s.panelFoot}>
                    {l("Statt 8–33 €/Monat bei anderen Anbietern: ", "Instead of €8–33/month elsewhere: ")}
                    <strong>{l("bei Rechly 0 € — für immer.", "Rechly is €0 — forever.")}</strong>{" "}
                    <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                        GitHub
                    </a>
                </p>
            </aside>

            <main className={s.main}>
                <div className={s.mobileBrand}>
                    <Link href="/" className={s.brandDark}>
                        <Image src="/logo.png" alt="" width={30} height={30} priority />
                        <span>
                            Rechly<span className={s.dot}>.</span>
                        </span>
                    </Link>
                    <nav className={s.mobileNav} aria-label="Auth">
                        {mode !== "login" && <Link href="/login">{l("Anmelden", "Log in")}</Link>}
                        {mode !== "register" && (
                            <Link href="/register">{l("Kostenlos starten", "Start free")}</Link>
                        )}
                    </nav>
                </div>

                <div className={s.card}>
                    <h1 className={s.title}>{title}</h1>
                    <p className={s.subtitle}>{subtitle}</p>
                    {children}
                    {footer}
                </div>

                <p className={s.legal}>
                    {l(
                        "Kostenlos · Keine Kreditkarte · Daten in der EU · Jederzeit exportierbar",
                        "Free · No credit card · EU data · Export anytime",
                    )}
                </p>
            </main>
        </div>
    );
}
