import { MetadataRoute } from "next";

// Private application with health data – keep all crawlers out.
export default function robots(): MetadataRoute.Robots {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
}
