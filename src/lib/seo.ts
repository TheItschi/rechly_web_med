import type { Metadata } from "next";
import { getSiteUrl, getTwitterHandle } from "@/lib/env";

const siteUrl = getSiteUrl();

interface PageMetadataOptions {
    title: string;
    description: string;
    path: string;
    type?: "website" | "article";
    noIndex?: boolean;
    keywords?: string[];
    category?: string;
}

export function createPageMetadata({
    title,
    description,
    path,
    type = "website",
    noIndex = false,
    keywords,
    category,
}: PageMetadataOptions): Metadata {
    const canonicalPath = path === "/" ? "/" : path.replace(/\/$/, "");
    const canonicalUrl = `${siteUrl}${canonicalPath === "/" ? "" : canonicalPath}`;
    const brandedTitle =
        title.includes("Rechly") || title.length >= 54
            ? title
            : `${title} | Rechly`;

    const ogParams = new URLSearchParams({
        title: title.replace(/\s*\|\s*Rechly$/i, ""),
        ...(category ? { category } : {}),
    });
    const dynamicSocialImage =
        canonicalPath === "/"
            ? `${siteUrl}/opengraph-image`
            : `${siteUrl}/og?${ogParams.toString()}`;

    return {
        title: { absolute: brandedTitle },
        description,
        ...(keywords && keywords.length > 0 ? { keywords } : {}),
        ...(category ? { category } : {}),
        alternates: {
            canonical: canonicalUrl,
            languages: {
                "de-DE": canonicalUrl,
                de: canonicalUrl,
                "x-default": canonicalUrl,
            },
        },
        openGraph: {
            type,
            locale: "de_DE",
            url: canonicalUrl,
            siteName: "Rechly",
            title: brandedTitle,
            description,
            images: [
                {
                    url: dynamicSocialImage,
                    width: 1200,
                    height: 630,
                    alt: brandedTitle,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: brandedTitle,
            description,
            images: [dynamicSocialImage],
            creator: getTwitterHandle(),
        },
        robots: noIndex
            ? { index: false, follow: false, noarchive: true }
            : {
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
    };
}
