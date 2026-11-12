import Link from "next/link";
import { IMPRINT_URL, PRIVACY_URL, sourceLink, TERMS_URL } from "@/lib/legal";

/** Minimal header for login/registration (replaces the Rechly marketing navbar). */
export function AuthHeader() {
    return (
        <header style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0" }}>
            <span style={{ fontWeight: 700, fontSize: 20, color: "#1976d2" }}>Rechly-Med</span>
        </header>
    );
}

/** Minimal footer: licence/source plus the operator's own legal pages, if configured. */
export function AuthFooter() {
    const links = [
        IMPRINT_URL && { href: IMPRINT_URL, label: "Impressum" },
        PRIVACY_URL && { href: PRIVACY_URL, label: "Datenschutz" },
        TERMS_URL && { href: TERMS_URL, label: "Nutzungsbedingungen" },
    ].filter(Boolean) as { href: string; label: string }[];
    return (
        <footer style={{ padding: "24px", textAlign: "center", fontSize: 13, color: "#64748b" }}>
            {links.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", marginRight: 16 }}>
                    {l.label}
                </a>
            ))}
            <Link href="/about" style={{ color: "inherit", marginRight: 16 }}>Über / Lizenz</Link>
            <a href={sourceLink()} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
                Quellcode (AGPL-3.0)
            </a>
        </footer>
    );
}
