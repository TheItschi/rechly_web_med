import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { getOptionalEnv, getRepoUrl } from "@/lib/env";
import {
    assessUpdate,
    parseGithubRepo,
    type LatestRelease,
} from "@/lib/updateCheck";
import packageJson from "../../../../../package.json";

export const dynamic = "force-dynamic";

const CHECK_TTL_MS = 30 * 60 * 1000;

interface CachedCheck {
    at: number;
    payload: Record<string, unknown>;
}

let cached: CachedCheck | null = null;
let cachedCommit: string | null | undefined;

async function currentCommit(): Promise<string | null> {
    if (cachedCommit !== undefined) return cachedCommit;
    const fromEnv =
        getOptionalEnv("RECHLY_GIT_COMMIT") || getOptionalEnv("GIT_COMMIT");
    if (fromEnv) {
        cachedCommit = fromEnv.trim();
        return cachedCommit;
    }
    cachedCommit = await new Promise<string | null>((resolve) => {
        execFile(
            "git",
            ["rev-parse", "HEAD"],
            { cwd: process.cwd(), timeout: 2_000 },
            (error, stdout) => {
                resolve(error ? null : stdout.trim() || null);
            },
        );
    });
    return cachedCommit;
}

async function githubJson(url: string): Promise<unknown | null> {
    try {
        const headers: Record<string, string> = {
            Accept: "application/vnd.github+json",
            "User-Agent": "rechly-update-check",
        };
        const token = getOptionalEnv("RECHLY_UPDATE_GITHUB_TOKEN");
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(url, {
            headers,
            signal: AbortSignal.timeout(5_000),
        });
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null; // Offline laptop, GitHub down, rate-limited: all "unknown".
    }
}

/**
 * Reports whether a newer Rechly exists for this install. Read-only and
 * safe to expose: the dashboard banner only renders it on loopback hosts,
 * so hosted users never see it. Disable with RECHLY_UPDATE_CHECK=0.
 */
export async function GET() {
    if (getOptionalEnv("RECHLY_UPDATE_CHECK") === "0") {
        return NextResponse.json({ enabled: false, updateAvailable: false });
    }
    if (cached && Date.now() - cached.at < CHECK_TTL_MS) {
        return NextResponse.json(cached.payload);
    }

    const repo =
        parseGithubRepo(getOptionalEnv("RECHLY_UPDATE_REPO") || "") ||
        parseGithubRepo(getRepoUrl()) ||
        "myaxyo/rechly_web";
    const branch = getOptionalEnv("RECHLY_UPDATE_BRANCH") || "main";
    const currentVersion = packageJson.version;
    const commit = await currentCommit();

    const [releaseJson, commitJson] = await Promise.all([
        githubJson(`https://api.github.com/repos/${repo}/releases/latest`),
        githubJson(
            `https://api.github.com/repos/${repo}/commits/${encodeURIComponent(branch)}`,
        ),
    ]);

    let latestRelease: LatestRelease | null = null;
    if (
        releaseJson &&
        typeof releaseJson === "object" &&
        "tag_name" in releaseJson &&
        typeof (releaseJson as { tag_name: unknown }).tag_name === "string"
    ) {
        const r = releaseJson as { tag_name: string; html_url?: string; name?: string };
        latestRelease = { tag: r.tag_name, url: r.html_url || `https://github.com/${repo}/releases`, name: r.name };
    }

    let latestMainCommit: string | null = null;
    if (
        commitJson &&
        typeof commitJson === "object" &&
        "sha" in commitJson &&
        typeof (commitJson as { sha: unknown }).sha === "string"
    ) {
        latestMainCommit = (commitJson as { sha: string }).sha;
    }

    const assessment = assessUpdate({
        currentVersion,
        currentCommit: commit,
        latestRelease,
        latestMainCommit,
        repo,
    });

    const payload = {
        enabled: true,
        repo,
        branch,
        currentVersion,
        currentCommit: commit ? commit.slice(0, 7) : null,
        reachable: Boolean(latestRelease || latestMainCommit),
        checkedAt: new Date().toISOString(),
        ...assessment,
        latestCommit: assessment.latestCommit
            ? assessment.latestCommit.slice(0, 7)
            : null,
    };
    cached = { at: Date.now(), payload };
    return NextResponse.json(payload);
}
