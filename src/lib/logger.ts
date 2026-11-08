/**
 * Minimal logger — keeps console noise out of production.
 * debug() is dev-only; warn/error always emit (still useful in prod).
 */

type Args = unknown[];

function isDev(): boolean {
    try {
        return process.env.NODE_ENV !== "production";
    } catch {
        return false;
    }
}

// Intentional console usage — this IS the logger implementation.
/* eslint-disable no-console */
export const logger = {
    debug(...args: Args): void {
        if (isDev()) {
            console.log(...args);
        }
    },
    info(...args: Args): void {
        if (isDev()) {
            console.info(...args);
        }
    },
    warn(...args: Args): void {
        console.warn(...args);
    },
    error(...args: Args): void {
        console.error(...args);
    },
};
/* eslint-enable no-console */
