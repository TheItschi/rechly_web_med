import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createSessionClient } from "@/lib/appwrite-server";
import { getSiteUrl } from "@/lib/env";
import { mutateWorkspace, readWorkspace, workspaceClients, WorkspaceError } from "@/lib/workspace/repository";
import { workspaceDocumentPdf } from "@/lib/workspace/pdf";

export const runtime = "nodejs";
async function context() {
    if (process.env.NEXT_PUBLIC_RECHLY_WORKSPACE_ENABLED !== "1") throw new WorkspaceError("Workspace is not enabled.", 404);
    let user;
    try { const { account } = await createSessionClient(); user = await account.get(); }
    catch { throw new WorkspaceError("Please sign in again.", 401); }
    const { databases } = await createAdminClient();
    return { databases, userId: user.$id };
}
function failure(error: unknown) {
    if (error instanceof WorkspaceError) return NextResponse.json({ error: error.message }, { status: error.status });
    // Do not expose document contents or backend details in errors or logs.
    return NextResponse.json({ error: "Workspace unavailable. Please try again later." }, { status: 503 });
}
export async function GET(request: NextRequest) {
    try {
        const { databases, userId } = await context();
        const data = await readWorkspace(databases, userId);
        const documentId = request.nextUrl.searchParams.get("documentId");
        if (documentId) {
            const document = data.documents.find(row => row.id === documentId);
            if (!document) throw new WorkspaceError("Document not found.", 404);
            const bytes = await workspaceDocumentPdf(document);
            return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="document.pdf"', "Cache-Control": "no-store" } });
        }
        return NextResponse.json({ data, clients: await workspaceClients(databases, userId) }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
    try {
        const origin = request.headers.get("origin");
        const allowed = [new URL(getSiteUrl()).origin];
        // Next normalizes 127.0.0.1 to localhost in NextURL; browsers keep the Host.
        // Cloud production uses the configured public origin, including behind a proxy.
        if (process.env.NODE_ENV !== "production" || process.env.RECHLY_DESKTOP === "1") {
            allowed.push(request.nextUrl.origin);
            const host = request.headers.get("host");
            if (host) allowed.push(new URL(`${request.nextUrl.protocol}//${host}`).origin);
        }
        if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && !allowed.includes(origin))) throw new WorkspaceError("Invalid origin.", 403);
        if (!request.headers.get("content-type")?.startsWith("application/json")) throw new WorkspaceError("Expected JSON.", 415);
        const { databases, userId } = await context();
        const raw = await request.text();
        if (Buffer.byteLength(raw) > 220_000) throw new WorkspaceError("Document is too large.", 413);
        let body;
        try { body = JSON.parse(raw); } catch { throw new WorkspaceError("Invalid JSON."); }
        const record = await mutateWorkspace(databases, userId, body);
        return NextResponse.json({ record: record ?? null });
    } catch (error) { return failure(error); }
}
