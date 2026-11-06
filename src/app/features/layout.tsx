import { createPageMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/env";

const siteUrl = getSiteUrl();

export const metadata = createPageMetadata({
    title: "Rechnungssoftware Funktionen: E-Rechnung, GiroCode & DATEV",
    description:
        "Alle Funktionen von Rechly im Überblick: Rechnungen & Angebote, XRechnung 3.0 & ZUGFeRD, GiroCode, Mahnwesen, DATEV-Export & 100 % Offline Desktop-Vollversion.",
    path: "/features",
    keywords: [
        "Rechnungssoftware Funktionen",
        "XRechnung ZUGFeRD Software kostenlos",
        "Rechnungsprogramm mit GiroCode und DATEV",
        "Open Source Rechnungssoftware",
    ],
});

export default function FeaturesLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const structuredData = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "SoftwareApplication",
                "@id": `${siteUrl}/features#software`,
                name: "Rechly Rechnungssoftware",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web, Windows 10, Windows 11, macOS",
                inLanguage: "de-DE",
                url: `${siteUrl}/features`,
                isAccessibleForFree: true,
                offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "EUR",
                    availability: "https://schema.org/InStock",
                },
            },
            {
                "@type": "WebPage",
                name: "Funktionen der Rechly Rechnungssoftware",
                url: `${siteUrl}/features`,
                description:
                    "Entdecke die Funktionen von Rechly: Rechnungen online schreiben, Kunden verwalten, XRechnung & ZUGFeRD exportieren und die 100 % lokale Desktop-App nutzen.",
                isPartOf: {
                    "@type": "WebSite",
                    "@id": `${siteUrl}/#website`,
                },
                inLanguage: "de-DE",
            },
            {
                "@type": "BreadcrumbList",
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
                        name: "Funktionen",
                        item: `${siteUrl}/features`,
                    },
                ],
            },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(structuredData),
                }}
            />
            {children}
        </>
    );
}
