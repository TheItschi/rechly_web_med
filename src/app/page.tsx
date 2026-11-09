import AuthRedirect from "@/components/landing/AuthRedirect";
import HomeLanding from "@/components/landing/HomeLanding";
import { getSiteUrl } from "@/lib/env";
import { homeFaqsDe } from "@/lib/home-faq";
import { createPageMetadata } from "@/lib/seo";

const siteUrl = getSiteUrl();
const title = "Rechly – Kostenlose Rechnungssoftware & Terminbuchung";
const description =
    "Kostenlose Open-Source-Rechnungssoftware für Selbstständige: E-Rechnungen, Kunden, Projekte und Online-Terminbuchung. Im Browser oder lokal am Desktop.";

export const metadata = createPageMetadata({ title, description, path: "/" });

const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "SoftwareApplication",
            "@id": `${siteUrl}/#software`,
            name: "Rechly",
            url: siteUrl,
            applicationCategory: "BusinessApplication",
            applicationSubCategory: "Rechnungssoftware",
            operatingSystem: "Web, Windows, macOS",
            inLanguage: ["de", "en"],
            description,
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
            author: { "@id": `${siteUrl}/#organization` },
            publisher: { "@id": `${siteUrl}/#organization` },
            featureList: [
                "Rechnungen und Angebote erstellen",
                "PDF, XRechnung und ZUGFeRD exportieren",
                "Kundenverwaltung",
                "Online-Terminbuchung mit verfügbaren Zeiten und Selbstverwaltung",
                "Projekte, Aufgaben und Zeiterfassung",
                "Ausgaben, Bankabgleich per Dateiimport und DATEV-Export",
                "Datenimport aus unterstützten CSV- und Rechnungsdateien",
                "Optionale KI-Rechnungshilfe mit eigenem Anbieter oder Ollama",
                "Desktop-App für lokale Rechnungsverwaltung",
                "Open Source unter AGPL-3.0 und selbst hostbar",
            ],
        },
        {
            "@type": "WebPage",
            "@id": `${siteUrl}/#webpage`,
            name: title,
            description,
            url: siteUrl,
            isPartOf: { "@id": `${siteUrl}/#website` },
            about: { "@id": `${siteUrl}/#software` },
            primaryImageOfPage: { "@type": "ImageObject", url: `${siteUrl}/opengraph-image` },
            inLanguage: "de-DE",
            dateModified: "2026-11-08",
        },
        {
            "@type": "FAQPage",
            "@id": `${siteUrl}/#faq`,
            isPartOf: { "@id": `${siteUrl}/#webpage` },
            mainEntity: homeFaqsDe.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
        },
    ],
};

export default function Home() {
    return (
        <>
            <AuthRedirect />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
            />
            <HomeLanding />
        </>
    );
}
