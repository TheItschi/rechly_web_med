/**
 * Source and legal information shown in the app (AGPL-3.0 § 13: users
 * interacting over a network must be able to obtain the Corresponding Source).
 * Values are injected at build time (next.config.ts) or via NEXT_PUBLIC_* env.
 */
export const SOURCE_URL = process.env.NEXT_PUBLIC_SOURCE_URL || "https://github.com/TheItschi/rechly_web_med";
export const SOURCE_COMMIT = process.env.NEXT_PUBLIC_SOURCE_COMMIT || "";
export const SOURCE_BRANCH = process.env.NEXT_PUBLIC_SOURCE_BRANCH || "";
export const UPSTREAM_URL = "https://github.com/myaxyo/rechly_web";
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "";

/** Link to exactly the running version if the commit is known, else the branch/repo. */
export const sourceLink = (): string =>
    SOURCE_COMMIT
        ? `${SOURCE_URL}/tree/${SOURCE_COMMIT}`
        : SOURCE_BRANCH
            ? `${SOURCE_URL}/tree/${SOURCE_BRANCH}`
            : SOURCE_URL;

/** Operator's own legal pages (needed when running the app for others). */
export const IMPRINT_URL = process.env.NEXT_PUBLIC_IMPRINT_URL || "";
export const PRIVACY_URL = process.env.NEXT_PUBLIC_PRIVACY_URL || "";
export const TERMS_URL = process.env.NEXT_PUBLIC_TERMS_URL || "";
