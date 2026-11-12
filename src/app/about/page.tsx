import type { Metadata } from "next";
import Link from "next/link";
import { APP_VERSION, IMPRINT_URL, PRIVACY_URL, SOURCE_BRANCH, SOURCE_COMMIT, SOURCE_URL, sourceLink, TERMS_URL, UPSTREAM_URL } from "@/lib/legal";

export const metadata: Metadata = { title: "Über / Lizenz" };

const box: React.CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "32px 20px", lineHeight: 1.6, color: "#1f2937" };
const h2: React.CSSProperties = { fontSize: 18, marginTop: 28, marginBottom: 8 };

export default function AboutPage() {
    const legal = [
        IMPRINT_URL && { href: IMPRINT_URL, label: "Impressum" },
        PRIVACY_URL && { href: PRIVACY_URL, label: "Datenschutzerklärung" },
        TERMS_URL && { href: TERMS_URL, label: "Nutzungsbedingungen" },
    ].filter(Boolean) as { href: string; label: string }[];

    return (
        <main style={box}>
            <p><Link href="/dashboard">← Zur Anwendung</Link></p>
            <h1 style={{ fontSize: 26, marginBottom: 4 }}>Rechly-Med</h1>
            <p style={{ color: "#64748b", marginTop: 0 }}>Privatliquidation nach GOÄ mit ICD-10-GM-Diagnosen</p>

            <h2 style={h2}>Version und Quellcode</h2>
            <p>
                Version {APP_VERSION || "–"}
                {SOURCE_BRANCH && <> · Branch <code>{SOURCE_BRANCH}</code></>}
                {SOURCE_COMMIT && <> · Commit <code>{SOURCE_COMMIT.slice(0, 7)}</code></>}
                <br />
                Den vollständigen Quellcode dieser Version gibt es unter{" "}
                <a href={sourceLink()} target="_blank" rel="noopener noreferrer">{SOURCE_URL.replace(/^https:\/\//, "")}</a>.
            </p>

            <h2 style={h2}>Lizenz</h2>
            <p>
                Rechly-Med ist ein Fork von <a href={UPSTREAM_URL} target="_blank" rel="noopener noreferrer">Rechly</a>{" "}
                (© Rechly contributors), erweitert ab November 2026 von Yavuz Icsezer um GOÄ-Abrechnung und Prüfmodul,
                ICD-10-GM-Diagnosen, Briefkopf/Faksimile sowie Datensicherung.
            </p>
            <p>
                Dieses Programm ist freie Software: Sie können es unter den Bedingungen der{" "}
                <a href={`${SOURCE_URL}/blob/${SOURCE_COMMIT || SOURCE_BRANCH || "HEAD"}/LICENSE`} target="_blank" rel="noopener noreferrer">
                    GNU Affero General Public License, Version 3
                </a>{" "}
                (AGPL-3.0-only) weitergeben und/oder verändern. Es wird in der Hoffnung bereitgestellt, dass es nützlich ist,
                jedoch <strong>ohne jede Gewährleistung</strong> – auch ohne die implizite Gewährleistung der Marktreife oder der
                Eignung für einen bestimmten Zweck. Einzelheiten stehen in der Lizenz.
            </p>

            <h2 style={h2}>Daten und Kataloge</h2>
            <p>
                Diagnosen nach ICD-10-GM: Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM), sofern ein Katalog
                importiert wurde. Das GOÄ-Prüfmodul ist eine Plausibilitätshilfe auf Basis eines Regelauszugs; maßgeblich
                bleibt der amtliche Text der Gebührenordnung für Ärzte.
            </p>

            {legal.length > 0 && (
                <>
                    <h2 style={h2}>Rechtliches</h2>
                    <p>
                        {legal.map((l, i) => (
                            <span key={l.href}>
                                {i > 0 && " · "}
                                <a href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
                            </span>
                        ))}
                    </p>
                </>
            )}
        </main>
    );
}
