import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * On-disk status for an in-app update run, written by `scripts/update.mjs`
 * (a detached process) and polled by the dashboard banner. Lives in
 * `.rechly/` at the repo root, which is gitignored.
 */
export type UpdateRunState = "idle" | "running" | "done" | "failed";

export interface UpdateRunStatus {
    state: UpdateRunState;
    step: string | null;
    message: string | null;
    startedAt: string | null;
    finishedAt: string | null;
}

export const IDLE_UPDATE_STATUS: UpdateRunStatus = {
    state: "idle",
    step: null,
    message: null,
    startedAt: null,
    finishedAt: null,
};

export function updateStatusPath(cwd: string = process.cwd()): string {
    return path.join(cwd, ".rechly", "update-status.json");
}

export function readUpdateStatus(cwd: string = process.cwd()): UpdateRunStatus {
    try {
        const raw = readFileSync(updateStatusPath(cwd), "utf8");
        const parsed = JSON.parse(raw) as Partial<UpdateRunStatus>;
        return { ...IDLE_UPDATE_STATUS, ...parsed };
    } catch {
        return IDLE_UPDATE_STATUS;
    }
}

export function writeUpdateStatus(
    status: UpdateRunStatus,
    cwd: string = process.cwd(),
): void {
    const file = updateStatusPath(cwd);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(status, null, 2)}\n`, "utf8");
}

export function updateStatusExists(cwd: string = process.cwd()): boolean {
    return existsSync(updateStatusPath(cwd));
}
