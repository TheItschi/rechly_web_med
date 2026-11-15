import type { Metadata, Viewport } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import {
    getGoogleSiteVerification,
    getOptionalAnalyticsId,
    getSiteUrl,
    getTwitterHandle,
} from "@/lib/env";
import GlobalJsonLd from "@/components/seo/GlobalJsonLd";
import ConsentAnalytics from "@/components/analytics/ConsentAnalytics";
import PublicTheme from "@/components/PublicTheme";
import AppwritePing from "@/components/AppwritePing";
import "./globals.css";

const siteUrl = getSiteUrl();
const analyticsId = getOptionalAnalyticsId();
const twitterHandle = getTwitterHandle();
const googleSiteVerification = getGoogleSiteVerification();

// Viewport configuration to prevent iOS zoom on input focus
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
};

export const metadata: Metadata = {
    applicationName: "Rechly",
    title: {
        default: "Rechly – Open-Source Rechnungssoftware",
        template: "%s | Rechly",
    },
    description:
        "Kostenlose Open-Source Rechnungssoftware für Deutschland: Rechnungen, Angebote, XRechnung und ZUGFeRD erstellen, Kunden verwalten und PDFs exportieren.",
    authors: [{ name: "Rechly", url: siteUrl }],
    creator: "Rechly",
    publisher: "Rechly",
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    metadataBase: new URL(siteUrl),
    alternates: {
        languages: {
            "de": siteUrl,
            "x-default": siteUrl,
        },
    },
    openGraph: {
        type: "website",
        locale: "de_DE",
        url: siteUrl,
        siteName: "Rechly",
        title: "Rechly – Kostenlose Open-Source Rechnungssoftware",
        description:
            "Rechnungen, Angebote, XRechnung und ZUGFeRD erstellen. Open Source, selbst hostbar und für Freelancer sowie kleine Unternehmen entwickelt.",
        images: [
            {
                url: `${siteUrl}/opengraph-image`,
                width: 1200,
                height: 630,
                alt: "Rechly - Kostenlose deutsche Rechnungssoftware für Freelancer",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Rechly – Open-Source Rechnungssoftware",
        description:
            "Rechnungen, Angebote und E-Rechnungen erstellen. Kostenlos nutzbar, selbst hostbar und transparent auf GitHub entwickelt.",
        images: [`${siteUrl}/opengraph-image`],
        creator: twitterHandle,
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    icons: {
        icon: [
            { url: "/favicon.ico", sizes: "any" },
            { url: "/favicon/favicon.svg", type: "image/svg+xml" },
            {
                url: "/favicon/favicon-96x96.png",
                sizes: "96x96",
                type: "image/png",
            },
        ],
        shortcut: "/favicon.ico",
        apple: "/favicon/apple-touch-icon.png",
    },
    manifest: "/favicon/site.webmanifest",
    verification: googleSiteVerification
        ? { google: googleSiteVerification }
        : undefined,
    category: "business",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="de" suppressHydrationWarning>
            <head>
                <GlobalJsonLd />
            </head>
            <body>
                <AppwritePing />
                <ConsentAnalytics googleAnalyticsId={analyticsId} />
                <AntdRegistry>
                    <LanguageProvider>
                        <AuthProvider>
                            <PublicTheme>{children}</PublicTheme>
                        </AuthProvider>
                    </LanguageProvider>
                </AntdRegistry>
            </body>
        </html>
    );
}
