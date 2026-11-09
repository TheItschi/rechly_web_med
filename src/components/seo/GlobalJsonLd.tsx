import { getSiteUrl, getRepoUrl } from "@/lib/env";

const siteUrl = getSiteUrl();
const repoUrl = getRepoUrl();

/**
 * Global JSON-LD structured data rendered in root layout.
 * Provides Organization and WebSite identities used by page-level structured data.
 */
export default function GlobalJsonLd() {
    const structuredData = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": `${siteUrl}/#organization`,
                name: "Rechly",
                url: siteUrl,
                logo: {
                    "@type": "ImageObject",
                    "@id": `${siteUrl}/#logo`,
                    url: `${siteUrl}/logo.png`,
                    contentUrl: `${siteUrl}/logo.png`,
                    width: 512,
                    height: 512,
                    caption: "Rechly",
                },
                description:
                    "Kostenlose Open-Source-Rechnungssoftware mit Kundenverwaltung, Projekten und Terminbuchung für Selbstständige und kleine Unternehmen.",
                areaServed: {
                    "@type": "Country",
                    name: "Germany",
                },
                knowsAbout: [
                    "Rechnungssoftware",
                    "E-Rechnung (XRechnung & ZUGFeRD)",
                    "Kleinunternehmerregelung (§ 19 UStG)",
                    "Pflichtangaben Rechnung (§ 14 UStG)",
                    "Umsatzsteuer & EÜR (§ 4 Abs. 3 EStG)",
                    "SEPA GiroCode & ISO 20022 XML",
                    "Mahnwesen & Verzugszinsen (§ 288 BGB)",
                ],
                sameAs: [repoUrl, "https://github.com/myaxyo/rechly_desktop"],
            },
            {
                "@type": "WebSite",
                "@id": `${siteUrl}/#website`,
                name: "Rechly",
                url: siteUrl,
                publisher: {
                    "@id": `${siteUrl}/#organization`,
                },
                inLanguage: "de-DE",
            },
        ],
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
            }}
        />
    );
}
