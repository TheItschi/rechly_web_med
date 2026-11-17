/**
 * Update detection for locally-run Rechly installs (a clone on a laptop).
 *
 * Two signals, in order:
 * 1. GitHub Releases - if the repo publishes tagged releases, a newer
 *    semver tag than package.json `version` means an update exists.
 * 2. Main-branch commits - this repo ships by pushing to `main`, so if no
 *    release exists, a different latest `main` commit than the running
 *    checkout also means an update exists.
 *
 * Pure helpers only (no I/O) so they are unit-testable; the API route in
 * `src/app/api/update/check/route.ts` does the fetching.
 */

export function parseSemver(value: string): [number, number, number] | null {
    const match = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(value.trim());
    if (!match) return null;
    return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Returns >0 if `a` is newer than `b`, <0 if older, 0 if equal, null if either is unparseable. */
export function compareSemver(a: string, b: string): number | null {
    const pa = parseSemver(a);
    const pb = parseSemver(b);
    if (!pa || !pb) return null;
    for (let i = 0; i < 3; i += 1) {
        if (pa[i] !== pb[i]) return pa[i] - pb[i];
    }
    return 0;
}

/** Extracts `owner/repo` from a GitHub URL (https or git@), or null. */
export function parseGithubRepo(repoUrl: string): string | null {
    const trimmed = repoUrl.trim().replace(/\/+$/, "").replace(/\.git$/, "");
    const https = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)$/.exec(trimmed);
    if (https) return `${https[1]}/${https[2]}`;
    const ssh = /^git@github\.com:([^/]+)\/([^/]+)$/.exec(trimmed);
    if (ssh) return `${ssh[1]}/${ssh[2]}`;
    // Already in owner/repo form.
    if (/^[^/\s]+\/[^/\s]+$/.test(trimmed)) return trimmed;
    return null;
}

export interface LatestRelease {
    tag: string;
    url: string;
    name?: string;
}

export interface UpdateAssessmentInput {
    currentVersion: string;
    currentCommit: string | null;
    latestRelease: LatestRelease | null;
    latestMainCommit: string | null;
    repo: string;
}

export interface UpdateAssessment {
    updateAvailable: boolean;
    /** "release" when a newer tag exists, "commit" when only main moved, null when up to date / unknown. */
    kind: "release" | "commit" | null;
    latestVersion: string | null;
    latestCommit: string | null;
    url: string | null;
}

export function assessUpdate(input: UpdateAssessmentInput): UpdateAssessment {
    const { currentVersion, currentCommit, latestRelease, latestMainCommit, repo } = input;

    if (latestRelease) {
        const cmp = compareSemver(latestRelease.tag, currentVersion);
        if (cmp !== null && cmp > 0) {
            return {
                updateAvailable: true,
                kind: "release",
                latestVersion: latestRelease.tag.replace(/^v/, ""),
                latestCommit: latestMainCommit,
                url: latestRelease.url,
            };
        }
    }

    if (
        latestMainCommit &&
        currentCommit &&
        latestMainCommit.toLowerCase() !== currentCommit.toLowerCase() &&
        !latestMainCommit.startsWith(currentCommit) &&
        !currentCommit.startsWith(latestMainCommit)
    ) {
        return {
            updateAvailable: true,
            kind: "commit",
            latestVersion: latestRelease ? latestRelease.tag.replace(/^v/, "") : null,
            latestCommit: latestMainCommit,
            url:
                `https://github.com/${repo}/compare/${currentCommit}...${latestMainCommit}`,
        };
    }

    return {
        updateAvailable: false,
        kind: null,
        latestVersion: latestRelease ? latestRelease.tag.replace(/^v/, "") : null,
        latestCommit: latestMainCommit,
        url: latestRelease ? latestRelease.url : null,
    };
}

/** True for hostnames a laptop-local install is served from. */
export function isLoopbackHostname(hostname: string): boolean {
    const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");
}
