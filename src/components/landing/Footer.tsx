"use client";

import { GithubOutlined } from "@ant-design/icons";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { getRepoUrl } from "@/lib/env";
import s from "./footer.module.css";

const repoUrl = getRepoUrl();

export default function Footer() {
    const { language, t } = useLanguage();
    const l = (de: string, en: string) => (language === "de" ? de : en);

    const columns: Array<{ heading: string; links: Array<{ href: string; label: string; external?: boolean }> }> = [
        {
            heading: t("footer.product"),
            links: [
                { href: "/features", label: t("nav.features") },
                { href: "/rechnung-schreiben", label: l("Rechnung schreiben", "Create invoice") },
                { href: "/e-rechnung-software", label: l("E-Rechnung", "E-invoicing") },
                { href: "/desktop", label: "Desktop (offline)" },
                { href: "/login", label: l("Anmelden", "Log in") },
            ],
        },
        {
            heading: l("Ressourcen", "Resources"),
            links: [
                { href: "/tools", label: l("Kostenlose Tools", "Free tools") },
                { href: "/vorlagen", label: l("Rechnungsvorlagen", "Invoice templates") },
                { href: "/lexikon", label: l("Steuer-Lexikon", "Business glossary") },
                { href: "/lexoffice-alternative", label: l("lexoffice Alternative", "lexoffice alternative") },
                { href: "/sevdesk-alternative", label: l("sevdesk Alternative", "sevdesk alternative") },
            ],
        },
        {
            heading: t("footer.legal"),
            links: [
                { href: "/impressum", label: t("footer.impressum") },
                { href: "/datenschutz", label: t("footer.privacy") },
                { href: "/agb", label: t("footer.terms") },
                { href: "/cookies", label: t("footer.cookies") },
                { href: "/open-source", label: "Open Source" },
            ],
        },
    ];

    return (
        <footer className={s.footer}>
            <div className={s.inner}>
                <div className={s.top}>
                    <div className={s.brandCol}>
                        <Link href="/" aria-label="Rechly Startseite" className={s.brand}>
                            <Image src="/logo.png" alt="" width={28} height={28} />
                            <span>
                                Rechly<span className={s.dot}>.</span>
                            </span>
                        </Link>
                        <p className={s.tagline}>{t("footer.tagline")}</p>
                        <p className={s.claim}>
                            {l(
                                "Dauerhaft kostenlos: Rechnungen, E-Rechnungen, Angebote & Terminbuchung — ohne Abo und ohne Limits.",
                                "Free forever: invoices, e-invoices, quotes & booking — no subscription and no limits.",
                            )}
                        </p>
                        <Link href="/register" className={s.cta}>
                            {l("Kostenlos starten", "Start free")}
                        </Link>
                    </div>

                    {columns.map((col) => (
                        <nav key={col.heading} aria-label={col.heading} className={s.col}>
                            <h3>{col.heading}</h3>
                            {col.links.map((link) => (
                                <Link key={link.href + link.label} href={link.href}>
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                    ))}

                    <div className={s.col}>
                        <h3>{t("footer.contact")}</h3>
                        <p className={s.contactHint}>{t("footer.contactHint")}</p>
                        <a href="mailto:admin@rechly.de" className={s.mail}>
                            admin@rechly.de
                        </a>
                        <a href={repoUrl} target="_blank" rel="noopener noreferrer" className={s.github}>
                            <GithubOutlined aria-hidden="true" /> GitHub
                            <span className={s.srOnly}>{l(" (neuer Tab)", " (new tab)")}</span>
                        </a>
                    </div>
                </div>

                <div className={s.bottom}>
                    <span>© {new Date().getFullYear()} Rechly</span>
                    <span>{l("Open Source unter AGPL-3.0 · Selbst hostbar · Daten jederzeit exportierbar", "Open source under AGPL-3.0 · Self-hostable · Export your data anytime")}</span>
                </div>
            </div>
        </footer>
    );
}
