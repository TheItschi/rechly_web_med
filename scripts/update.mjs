#!/usr/bin/env node
/**
 * Rechly local updater - for people running a clone of this repo on their
 * own machine (`npm run dev` / `npm run build && npm run start`).
 *
 *   npm run update              pull latest, install deps, migrate, done
 *   npm run update -- --check   only report whether an update exists
 *   npm run update -- --build   also run `npm run build` (for `npm run start`)
 *   npm run update -- --dry-run print what would run, change nothing
 *
 * Safety: refuses to run with uncommitted tracked changes, only ever
 * fast-forwards, and never touches `.env.local` or your Appwrite data.
 * Optional Appwrite schema migrations (additive, idempotent) run when
 * Appwrite env vars are present; skip them with RECHLY_UPDATE_MIGRATIONS=0.
 * Progress is mirrored to `.rechly/update-status.json` so the dashboard
 * banner can follow along when started from the app.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const dryRun = args.has("--dry-run");
const withBuild = args.has("--build");
const branch = process.env.RECHLY_UPDATE_BRANCH || "main";
const isWindows = process.platform === "win32";
const npm = isWindows ? "npm.cmd" : "npm";

function setStatus(state, step, message, finished = false) {
    try {
        const dir = path.join(root, ".rechly");
        mkdirSync(dir, { recursive: true });
        writeFileSync(
            path.join(dir, "update-status.json"),
            `${JSON.stringify({
                state,
                step,
                message,
                startedAt: setStatus.startedAt ?? (setStatus.startedAt = new Date().toISOString()),
                finishedAt: finished ? new Date().toISOString() : null,
            }, null, 2)}\n`,
        );
    } catch { /* status file is best-effort */ }
    console.log(`[rechly update] ${message}`);
}

function run(command, commandArgs, { capture = false } = {}) {
    if (dryRun && !capture) {
        console.log(`[dry-run] ${command} ${commandArgs.join(" ")}`);
        return "";
    }
    const result = spawnSync(command, commandArgs, {
        cwd: root,
        encoding: "utf8",
        stdio: capture ? "pipe" : "inherit",
        shell: isWindows && command === npm,
    });
    if (result.error) throw new Error(`${command} failed to start: ${result.error.message}`);
    if (result.status !== 0) {
        const detail = capture ? (result.stderr || result.stdout || "").trim() : "";
        throw new Error(`${command} ${commandArgs.join(" ")} exited with ${result.status}${detail ? `: ${detail}` : ""}`);
    }
    return (result.stdout || "").trim();
}

function fail(message) {
    setStatus("failed", "failed", message, true);
    console.error(`\nUpdate stopped: ${message}`);
    process.exit(1);
}

try {
    run("git", ["rev-parse", "--is-inside-work-tree"], { capture: true });
} catch {
    fail("This is not a git clone of Rechly. Download the latest code from GitHub and copy your .env.local over, or re-clone the repository.");
}

try {
    const dirty = run("git", ["status", "--porcelain", "--untracked-files=no"], { capture: true });
    if (dirty) {
        fail(`You have uncommitted changes:\n${dirty}\nCommit or stash them first (git stash), then run the update again. Your changes are untouched.`);
    }

    setStatus("running", "fetch", `Fetching latest changes (origin/${branch})…`);
    run("git", ["fetch", "origin", branch]);

    const local = run("git", ["rev-parse", "HEAD"], { capture: true });
    const remote = run("git", ["rev-parse", `origin/${branch}`], { capture: true });
    if (local === remote) {
        setStatus("done", "up-to-date", "You already have the latest version of Rechly.", true);
        process.exit(0);
    }
    console.log(`Update available: ${local.slice(0, 7)} -> ${remote.slice(0, 7)}`);
    if (checkOnly) {
        setStatus("done", "check", `An update is available (${remote.slice(0, 7)}). Run: npm run update`, true);
        process.exit(0);
    }

    setStatus("running", "pull", "Downloading the new version (fast-forward only)…");
    try {
        run("git", ["pull", "--ff-only", "origin", branch]);
    } catch {
        fail("Your local branch has diverged from origin and cannot fast-forward. Nothing was changed by this step - resolve it manually with git, or re-clone and copy .env.local over.");
    }

    setStatus("running", "install", "Installing dependencies (npm install)…");
    run(npm, ["install"]);

    const hasAppwrite =
        process.env.RECHLY_DESKTOP !== "1" &&
        process.env.RECHLY_UPDATE_MIGRATIONS !== "0" &&
        existsSync(path.join(root, ".env.local"));
    if (hasAppwrite) {
        for (const script of ["migrate-einvoice.mjs", "migrate-company-numbering.mjs"]) {
            if (dryRun) {
                console.log(`[dry-run] node --env-file=.env.local scripts/${script}`);
                continue;
            }
            setStatus("running", "migrate", `Applying Appwrite schema updates (${script})…`);
            const result = spawnSync(process.execPath, ["--env-file=.env.local", path.join("scripts", script)], {
                cwd: root, stdio: "inherit", shell: isWindows,
            });
            if (result.status !== 0) {
                console.warn(`[rechly update] Warning: ${script} did not complete. Your data is unchanged; re-run it manually later: node --env-file=.env.local scripts/${script}`);
            }
        }
    } else {
        console.log("[rechly update] Skipping Appwrite migrations (no .env.local, desktop mode, or RECHLY_UPDATE_MIGRATIONS=0).");
    }

    if (withBuild) {
        setStatus("running", "build", "Building the new version (npm run build)…");
        run(npm, ["run", "build"]);
    }

    if (dryRun) {
        setStatus("done", "dry-run", "Dry run complete - nothing was changed.", true);
    } else {
        setStatus(
            "done",
            "done",
            withBuild
                ? "Update installed and built. Restart the app (npm run start) to use it."
                : "Update installed. `npm run dev` picks it up automatically; if you use `npm run start`, run: npm run update -- --build, then restart.",
            true,
        );
    }
} catch (error) {
    fail(error instanceof Error ? error.message : String(error));
}
