import type { Metadata, Viewport } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import "./globals.css";

// Viewport configuration to prevent iOS zoom on input focus
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
};

export const metadata: Metadata = {
    applicationName: "Rechly-Med",
    title: {
        default: "Rechly-Med – Privatliquidation",
        template: "%s | Rechly-Med",
    },
    description: "Privatliquidation nach GOÄ mit ICD-10-GM-Diagnosen.",
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    // Private application with health data – never index.
    robots: { index: false, follow: false, nocache: true },
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
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="de" suppressHydrationWarning>
            <body>
                <AntdRegistry>
                    <LanguageProvider>
                        <AuthProvider>{children}</AuthProvider>
                    </LanguageProvider>
                </AntdRegistry>
            </body>
        </html>
    );
}
