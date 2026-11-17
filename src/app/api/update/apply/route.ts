import { NextResponse, type NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { isLoopbackHostname } from "@/lib/updateCheck";
import { readUpdateStatus, writeUpdateStatus } from "@/lib/updateStatus";

export const dynamic = "force-dynamic";

function isLoopbackRequest(request: NextRequest): boolean {
    const host = request.headers.get("host") || "";
    const hostname = host.startsWith("[")
        ? host.slice(0, host.indexOf("]") + 1)
        : host.split(":")[0];
    return isLoopbackHostname(hostname);
}

/**
 * Starts a local self-update (`scripts/update.mjs`) as a detached process.
 *
 * Laptop-only by construction, guarded three ways:
 * - the request Host must be loopback (localhost / 127.0.0.1 / ::1), so a
 *   hosted deployment can never be reached through this route;
 * - a custom header is required, so a random website in the user's browser
 *   cannot trigger it with a simple cross-origin form POST;
 * - RECHLY_ALLOW_IN_APP_UPDATE=0 disables it entirely.
 * Terminal users can always run `npm run update` instead.
 */
export async function POST(request: NextRequest) {
    if (process.env.RECHLY_ALLOW_IN_APP_UPDATE === "0") {
        return NextResponse.json(
            { error: "In-app updates are disabled. Run: npm run update" },
            { status: 403 },
        );
    }
    if (!isLoopbackRequest(request)) {
        return NextResponse.json({ error: "Local updates are only available on localhost." }, { status: 403 });
    }
    if (request.headers.get("x-rechly-update") !== "1") {
        return NextResponse.json({ error: "Missing update header." }, { status: 403 });
    }

    const script = path.join(process.cwd(), "scripts", "update.mjs");
    if (!existsSync(script)) {
        return NextResponse.json(
            { error: "scripts/update.mjs not found. Run: npm run update" },
            { status: 500 },
        );
    }
    if (readUpdateStatus().state === "running") {
        return NextResponse.json({ started: false, reason: "already-running" });
    }

    writeUpdateStatus({
        state: "running",
        step: "starting",
        message: "Update started…",
        startedAt: new Date().toISOString(),
        finishedAt: null,
    });

    const child = spawn(process.execPath, [script, "--apply"], {
        cwd: process.cwd(),
        detached: true,
        stdio: "ignore",
        windowsHide: true,
        env: { ...process.env, RECHLY_UPDATE_FROM_APP: "1" },
    });
    child.unref();

    return NextResponse.json({ started: true });
}
