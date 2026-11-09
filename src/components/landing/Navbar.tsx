"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getRepoUrl } from "@/lib/env";
import s from "./navbar.module.css";

interface NavbarProps {
    showAuth?: boolean;
    /** Other public pages already reserve space in their hero padding. */
    reserveSpace?: boolean;
}

// Enhance native disclosures after hydration; without JS they still open normally.
function syncExpanded(details: HTMLDetailsElement) {
    details.querySelector("summary")?.setAttribute("aria-expanded", String(details.open));
}

export default function Navbar({ showAuth = true, reserveSpace = false }: NavbarProps) {
    const { language, setLanguage } = useLanguage();
    const pathname = usePathname();
    const l = (de: string, en: string) => language === "de" ? de : en;
    const header = useRef<HTMLElement>(null);
    const mobile = useRef<HTMLDetailsElement>(null);
    const resources = useRef<HTMLDetailsElement>(null);
    const links = [
        { href: "/features", label: l("Funktionen", "Features") },
        { href: "/#termine", label: l("Terminbuchung", "Booking") },
        { href: "/desktop", label: "Desktop" },
        { href: "/open-source", label: "Open Source" },
    ];
    const resourceLinks = [
        { href: "/tools", label: l("Tools & Rechner", "Tools & calculators") },
        { href: "/vorlagen", label: l("Rechnungsvorlagen", "Invoice templates") },
        { href: "/rechnung-schreiben", label: l("Ratgeber", "Invoicing guide") },
        { href: "/lexikon", label: l("Steuer-Lexikon", "Business glossary") },
    ];
    const inResources = resourceLinks.some(({ href }) => pathname === href || pathname.startsWith(href + "/"));

    const closeMenus = () => {
        if (mobile.current) mobile.current.open = false;
        if (resources.current) resources.current.open = false;
    };

    useEffect(() => {
        // Also close on browser history navigation and when changing breakpoints.
        const close = () => {
            for (const details of [mobile.current, resources.current]) {
                if (details) {
                    details.open = false;
                    syncExpanded(details);
                }
            }
        };
        close();
        const outside = (event: PointerEvent) => {
            if (event.target instanceof Node && !header.current?.contains(event.target)) close();
        };
        const breakpoint = window.matchMedia("(min-width: 1100px)");
        document.addEventListener("pointerdown", outside);
        breakpoint.addEventListener("change", close);
        return () => {
            document.removeEventListener("pointerdown", outside);
            breakpoint.removeEventListener("change", close);
        };
    }, [pathname]);

    const navLink = ({ href, label }: { href: string; label: string }) => (
        <Link key={href} href={href} prefetch={false} onClick={closeMenus}
            aria-current={pathname === href ? "page" : undefined}>
            {label}
        </Link>
    );
    const languageSelect = (id: string) => (
        <label className={s.language} htmlFor={id}>
            <span className={s.srOnly}>{l("Sprache", "Language")}</span>
            <select id={id} value={language} onChange={(event) => setLanguage(event.target.value as "de" | "en")}>
                <option value="de">Deutsch</option>
                <option value="en">English</option>
            </select>
        </label>
    );
    const authLinks = () => showAuth && (
        <div className={s.auth}>
            <Link prefetch={false} href="/login" onClick={closeMenus}>{l("Anmelden", "Log in")}</Link>
            <Link prefetch={false} href="/register" onClick={closeMenus} className={s.primary}>
                {l("Kostenlos starten", "Get started free")}
            </Link>
        </div>
    );

    return (
        <>
            <header ref={header} className={s.header} lang={language}
                onBlur={(event) => {
                    if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) closeMenus();
                }}
                onKeyDown={(event) => {
                    if (event.key !== "Escape") return;
                    const opened = mobile.current?.open ? mobile.current : resources.current?.open ? resources.current : null;
                    if (opened) {
                        event.preventDefault();
                        opened.removeAttribute("open");
                        opened.querySelector("summary")?.focus();
                    }
                }}>
                <div className={s.inner}>
                    <Link prefetch={false} href="/" onClick={closeMenus} className={s.brand} aria-label={l("Rechly Startseite", "Rechly home")}>
                        <Image src="/logo.png" alt="" width={32} height={32} priority />
                        <span>Rechly<span className={s.dot}>.</span></span>
                    </Link>
                    <nav className={s.desktop} aria-label={l("Hauptnavigation", "Main navigation")}>
                        <div className={s.links}>
                            {links.slice(0, 3).map(navLink)}
                            <details ref={resources} className={s.resources} onToggle={(event) => syncExpanded(event.currentTarget)} onBlur={(event) => {
                                if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
                            }}>
                                <summary role="button" data-active={inResources || undefined}>
                                    {l("Ressourcen", "Resources")} <ChevronDown size={15} aria-hidden="true" />
                                </summary>
                                <div className={s.resourcePanel}>
                                    {resourceLinks.map(navLink)}
                                    <a href={getRepoUrl()} target="_blank" rel="noopener noreferrer" onClick={closeMenus}>
                                        GitHub <ArrowUpRight size={14} aria-hidden="true" />
                                        <span className={s.srOnly}>{l(" (neuer Tab)", " (new tab)")}</span>
                                    </a>
                                </div>
                            </details>
                            {navLink(links[3])}
                        </div>
                        <div className={s.actions}>{languageSelect("nav-language-desktop")}{authLinks()}</div>
                    </nav>
                    <details ref={mobile} className={s.mobile} onToggle={(event) => syncExpanded(event.currentTarget)}>
                        <summary role="button" className={s.toggle} aria-controls="public-mobile-navigation"
                            aria-label={l("Menü", "Menu")}>
                            <span className={s.openIcon}><Menu size={22} aria-hidden="true" /></span>
                            <span className={s.closeIcon}><X size={22} aria-hidden="true" /></span>
                            <span>{l("Menü", "Menu")}</span>
                        </summary>
                        <nav id="public-mobile-navigation" className={s.mobilePanel} aria-label={l("Hauptnavigation", "Main navigation")}>
                            <div className={s.mobileLinks}>{links.map(navLink)}</div>
                            <div className={s.mobileResources}>
                                <p>{l("Ressourcen", "Resources")}</p>
                                {resourceLinks.map(navLink)}
                                <a href={getRepoUrl()} target="_blank" rel="noopener noreferrer" onClick={closeMenus}>
                                    GitHub <ArrowUpRight size={14} aria-hidden="true" />
                                    <span className={s.srOnly}>{l(" (neuer Tab)", " (new tab)")}</span>
                                </a>
                            </div>
                            <div className={s.mobileActions}>{languageSelect("nav-language-mobile")}{authLinks()}</div>
                        </nav>
                    </details>
                </div>
            </header>
            {reserveSpace && <div className={s.spacer} aria-hidden="true" />}
        </>
    );
}
