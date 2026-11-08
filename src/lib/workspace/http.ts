import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createSessionClient } from "../appwrite-server";
import { getSiteUrl } from "../env";
import { WorkspaceError } from "./repository";
export async function workspaceContext() {
    if (process.env.NEXT_PUBLIC_RECHLY_WORKSPACE_ENABLED !== "1") throw new WorkspaceError("Workspace is not enabled.", 404);
    let user;
    try { user = await (await createSessionClient()).account.get(); } catch { throw new WorkspaceError("Bitte erneut anmelden.", 401); }
    return { databases: (await createAdminClient()).databases, userId: user.$id };
}
export function workspaceFailure(error: unknown) {
    if (error instanceof WorkspaceError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Arbeitsbereich derzeit nicht verfügbar. Bitte erneut versuchen." }, { status: 503 });
}
export async function workspaceJson(request: NextRequest, maxBytes = 240000) {
    const origin = request.headers.get("origin"), allowed = [new URL(getSiteUrl()).origin];
    if (process.env.NODE_ENV !== "production" || process.env.RECHLY_DESKTOP === "1") {
        allowed.push(request.nextUrl.origin);
        const host = request.headers.get("host");
        if (host) allowed.push(new URL(`${request.nextUrl.protocol}//${host}`).origin);
    }
    if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && !allowed.includes(origin))) throw new WorkspaceError("Invalid origin.", 403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new WorkspaceError("Expected JSON.", 415);
    const reader = request.body?.getReader();
    if (!reader) throw new WorkspaceError("Empty request.");
    const chunks: Uint8Array[] = []; let bytes = 0;
    for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBytes) { await reader.cancel(); throw new WorkspaceError("Datei zu groß.", 413); }
        chunks.push(value);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown; } catch { throw new WorkspaceError("Invalid JSON."); }
}
