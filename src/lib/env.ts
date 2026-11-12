type RequiredEnvKey =
    | "NEXT_PUBLIC_APPWRITE_ENDPOINT"
    | "NEXT_PUBLIC_APPWRITE_PROJECT_ID";

const PRODUCTION_SITE_URL = "https://rechly.de";

function trimTrailingSlashes(value: string): string {
    return value.replace(/\/+$/, "");
}

// NEXT_PUBLIC_* vars must be accessed with literal keys so Next.js can inline
// them at build time. Dynamic `process.env[key]` access is only valid server-side.
const CLIENT_ENV: Record<string, string | undefined> = {
    NEXT_PUBLIC_APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    NEXT_PUBLIC_APPWRITE_PROJECT_ID:
        process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID:
        process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
    NEXT_PUBLIC_REPOSITORY_URL: process.env.NEXT_PUBLIC_REPOSITORY_URL,
    NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
    NEXT_PUBLIC_LINKEDIN_URL: process.env.NEXT_PUBLIC_LINKEDIN_URL,
    NEXT_PUBLIC_TWITTER_HANDLE: process.env.NEXT_PUBLIC_TWITTER_HANDLE,
    NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION:
        process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
};

function getEnvValue(key: string): string | undefined {
    const value = (CLIENT_ENV[key] ?? process.env[key])?.trim();
    return value ? value : undefined;
}

export function getRequiredEnv(key: RequiredEnvKey): string {
    const value = getEnvValue(key);

    if (!value) {
        throw new Error(`${key} is not configured`);
    }

    return value;
}

export function getOptionalEnv(key: string): string | undefined {
    return getEnvValue(key);
}

export function getAppwriteEndpoint(): string {
    return trimTrailingSlashes(getRequiredEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT"));
}

export function getAppwriteProjectId(): string {
    return getRequiredEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
}

export function getSiteUrl(): string {
    const value = getOptionalEnv("NEXT_PUBLIC_APP_URL");

    if (!value) {
        return process.env.NODE_ENV === "production"
            ? PRODUCTION_SITE_URL
            : "http://localhost:3000";
    }

    const normalized = trimTrailingSlashes(value);

    if (
        process.env.NODE_ENV === "production" &&
        /localhost|127\.0\.0\.1/.test(normalized)
    ) {
        return PRODUCTION_SITE_URL;
    }

    return normalized;
}






