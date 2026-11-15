import { randomBytes } from "crypto";

/** Unguessable, URL-safe share token for public invoice links (32 chars). */
export function generateShareToken(): string {
    return randomBytes(24).toString("base64url");
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

export function isValidShareToken(value: unknown): value is string {
    return typeof value === "string" && TOKEN_PATTERN.test(value);
}
