import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Standalone output for containerized deployments (Heroku, Docker, etc.)
    output: "standalone",

    // Keep pdfkit (ZUGFeRD) out of the bundle: it loads its standard fonts
    // (*.afm) from node_modules/pdfkit/js/data at runtime, which are missing
    // once bundled.
    serverExternalPackages: ["pdfkit"],
    outputFileTracingIncludes: {
        "/api/workspace": ["./node_modules/pdfkit/js/data/**", "./public/fonts/liberation/**"],
        "/api/invoices/[id]/zugferd": ["./node_modules/pdfkit/js/data/**", "./public/fonts/liberation/**"],
    },

    // Disable type checking during build (we run it separately)
    typescript: {
        ignoreBuildErrors: false,
    },

    // Use Turbopack (Next.js 16 default)
    turbopack: {
        // Resolve aliases for react-pdf compatibility
        resolveAlias: {
            canvas: { browser: "./empty-module.js" },
        },
    },

    async headers() {
        return [
            {
                source: "/buchen/verwalten/:path*",
                headers: [{key:"Referrer-Policy",value:"no-referrer"},{key:"X-Robots-Tag",value:"noindex, nofollow, noarchive"},{key:"Cache-Control",value:"private, no-store"}],
            },
            {
                source: "/dashboard/:path*",
                headers: [
                    {
                        key: "X-Robots-Tag",
                        value: "noindex, nofollow, noarchive",
                    },
                ],
            },
            {
                source: "/:privateRoute(login|register|onboarding|auth)/:path*",
                headers: [
                    {
                        key: "X-Robots-Tag",
                        value: "noindex, nofollow, noarchive",
                    },
                ],
            },
        ];
    },

    // Optimizations
    experimental: {
        optimizePackageImports: [
            "antd",
            "@ant-design/icons",
            "dayjs",
            "@ant-design/nextjs-registry",
        ],
    },

    async rewrites() {
        return [
            { source: "/werkzeuge", destination: "/tools" },
            { source: "/verzugszinsen-rechner", destination: "/tools/verzugszinsen-rechner" },
            { source: "/girocode-generator", destination: "/tools/girocode-generator" },
            { source: "/e-rechnung-viewer", destination: "/tools/e-rechnung-viewer" },
            { source: "/stundensatz-rechner", destination: "/tools/stundensatz-rechner" },
            { source: "/skontorechner", destination: "/tools/skontorechner" },
            { source: "/arbeitstage-rechner", destination: "/tools/arbeitstage-rechner" },
            { source: "/ust-idnr-pruefen", destination: "/tools/ust-idnr-pruefen" },
            { source: "/kleinunternehmer-rechner", destination: "/tools/kleinunternehmer-rechner" },
            { source: "/leitweg-id-pruefen", destination: "/tools/leitweg-id-pruefen" },
            { source: "/gewerbesteuer-rechner", destination: "/tools/gewerbesteuer-rechner" },
            { source: "/bewirtungsbeleg-rechner", destination: "/tools/bewirtungsbeleg-rechner" },
            { source: "/impressum-generator", destination: "/tools/impressum-generator" },
            { source: "/verpflegungsmehraufwand-rechner", destination: "/tools/verpflegungsmehraufwand-rechner" },
            { source: "/kassenbuch-vorlage", destination: "/tools/kassenbuch-vorlage" },
            { source: "/bautagebuch-vorlage", destination: "/tools/bautagebuch-vorlage" },
            { source: "/steuerkalender-2026", destination: "/tools/steuerkalender-2026" },
            { source: "/mahnung-generator", destination: "/tools/mahnung-generator" },
            { source: "/euer-rechner", destination: "/tools/euer-rechner" },
            { source: "/reverse-charge-rechner", destination: "/tools/reverse-charge-rechner" },
            { source: "/afa-rechner", destination: "/tools/afa-rechner" },
            { source: "/sepa-xml-generator", destination: "/tools/sepa-xml-generator" },
            { source: "/rechnungsgenerator", destination: "/tools/rechnungsgenerator" },
            { source: "/angebotsgenerator", destination: "/tools/angebotsgenerator" },
            { source: "/mehrwertsteuer-rechner", destination: "/tools/mehrwertsteuer-rechner" },
            { source: "/quittung-erstellen", destination: "/tools/quittung-erstellen" },
            { source: "/lieferschein-generator", destination: "/tools/lieferschein-generator" },
            { source: "/stornorechnung-generator", destination: "/tools/stornorechnung-generator" },
            { source: "/fahrtkosten-rechner", destination: "/tools/fahrtkosten-rechner" },
            { source: "/stundenzettel-generator", destination: "/tools/stundenzettel-generator" },
            { source: "/marge-rechner", destination: "/tools/marge-rechner" },
        ];
    },
};

export default nextConfig;
