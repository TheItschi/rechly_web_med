import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";
import { TOOLS_CATALOG } from "@/lib/tools/catalog";
import { VORLAGEN_CATALOG } from "@/lib/tools/vorlagenCatalog";
import { LEXIKON_CATALOG } from "@/lib/tools/lexikonCatalog";

const siteUrl = getSiteUrl();

export default function sitemap(): MetadataRoute.Sitemap {
    const coreRoutes: Array<{
        url: string;
        lastModified: string;
        changeFrequency:
            | "always"
            | "hourly"
            | "daily"
            | "weekly"
            | "monthly"
            | "yearly"
            | "never";
        priority: number;
    }> = [
        {
            url: "",
            lastModified: "2026-11-06",
            changeFrequency: "weekly",
            priority: 1.0,
        },
        {
            url: "/open-source",
            lastModified: "2026-11-06",
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: "/features",
            lastModified: "2026-11-06",
            changeFrequency: "monthly",
            priority: 0.9,
        },
        {
            url: "/rechnungssoftware-fuer-freelancer",
            lastModified: "2026-11-06",
            changeFrequency: "monthly",
            priority: 0.9,
        },
        {
            url: "/rechnungsprogramm-kostenlos",
            lastModified: "2026-11-06",
            changeFrequency: "monthly",
            priority: 0.92,
        },
        {
            url: "/rechnung-schreiben",
            lastModified: "2026-11-06",
            changeFrequency: "monthly",
            priority: 0.95,
        },
        {
            url: "/kostenlose-rechnungssoftware",
            lastModified: "2026-11-06",
            changeFrequency: "monthly",
            priority: 0.92,
        },
        {
            url: "/kleinunternehmer-rechnung",
            lastModified: "2026-11-06",
            changeFrequency: "monthly",
            priority: 0.88,
        },
        {
            url: "/e-rechnung-software",
            lastModified: "2026-11-06",
            changeFrequency: "monthly",
            priority: 0.92,
        },
        {
            url: "/rechnung-fuer-kleinunternehmer-erstellen",
            lastModified: "2026-11-06",
            changeFrequency: "monthly",
            priority: 0.87,
        },
        {
            url: "/lexoffice-alternative",
            lastModified: "2026-11-06",
            changeFrequency: "monthly",
            priority: 0.9,
        },
        {
            url: "/sevdesk-alternative",
            lastModified: "2026-11-06",
            changeFrequency: "monthly",
            priority: 0.9,
        },
        {
            url: "/rechnungsvorlage",
            lastModified: "2026-11-06",
            changeFrequency: "monthly",
            priority: 0.88,
        },
        {
            url: "/zahlungserinnerung-schreiben",
            lastModified: "2026-11-06",
            changeFrequency: "monthly",
            priority: 0.88,
        },
        // Hubs
        {
            url: "/tools",
            lastModified: "2026-11-06",
            changeFrequency: "daily",
            priority: 0.96,
        },
        {
            url: "/vorlagen",
            lastModified: "2026-11-06",
            changeFrequency: "weekly",
            priority: 0.94,
        },
        {
            url: "/lexikon",
            lastModified: "2026-11-06",
            changeFrequency: "weekly",
            priority: 0.93,
        },
    ];

    const toolRoutes = TOOLS_CATALOG.map((tool) => ({
        url: tool.path,
        lastModified: "2026-11-06",
        changeFrequency: "weekly" as const,
        priority: tool.slug === "rechnungsgenerator" ? 0.96 : 0.91,
    }));

    const vorlagenRoutes = VORLAGEN_CATALOG.map((vorlage) => ({
        url: `/vorlagen/${vorlage.slug}`,
        lastModified: "2026-11-06",
        changeFrequency: "weekly" as const,
        priority: 0.89,
    }));

    const lexikonRoutes = LEXIKON_CATALOG.map((entry) => ({
        url: `/lexikon/${entry.slug}`,
        lastModified: "2026-11-06",
        changeFrequency: "monthly" as const,
        priority: 0.88,
    }));

    const legalRoutes = [
        {
            url: "/impressum",
            lastModified: "2025-12-01",
            changeFrequency: "yearly" as const,
            priority: 0.3,
        },
        {
            url: "/datenschutz",
            lastModified: "2026-08-08",
            changeFrequency: "yearly" as const,
            priority: 0.3,
        },
        {
            url: "/agb",
            lastModified: "2025-12-01",
            changeFrequency: "yearly" as const,
            priority: 0.3,
        },
        {
            url: "/cookies",
            lastModified: "2026-08-08",
            changeFrequency: "yearly" as const,
            priority: 0.2,
        },
    ];

    const allRoutes = [
        ...coreRoutes,
        ...toolRoutes,
        ...vorlagenRoutes,
        ...lexikonRoutes,
        ...legalRoutes,
    ];

    return allRoutes.map((route) => ({
        url: `${siteUrl}${route.url}`,
        lastModified: route.lastModified,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
    }));
}
