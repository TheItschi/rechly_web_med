import { NextRequest, NextResponse } from "next/server";
import { workspaceContext, workspaceFailure, workspaceJson } from "@/lib/workspace/http";
import { readWork, mutateWork, timerId } from "@/lib/workspace/work";
import { WorkspaceStore } from "@/lib/workspace/store";
import { timeCsv } from "@/lib/workspace/work-types";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
    try {
        const { databases, userId } = await workspaceContext();
        const store = new WorkspaceStore(databases, userId);
        if (request.nextUrl.searchParams.has("timer")) return NextResponse.json({ timer: await store.find("timers", timerId(userId)) || null }, { headers: { "Cache-Control": "no-store" } });
        const data = await readWork(store);
        if (request.nextUrl.searchParams.has("csv")) return new NextResponse(timeCsv(data), { headers: { "Content-Type": "text/csv;charset=utf-8", "Content-Disposition": 'attachment; filename="rechly-zeiten.csv"', "Cache-Control": "no-store" } });
        return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
    } catch (error) { return workspaceFailure(error); }
}
export async function POST(request: NextRequest) {
    try {
        const { databases, userId } = await workspaceContext();
        return NextResponse.json({ result: await mutateWork(databases, userId, await workspaceJson(request)) });
    } catch (error) { return workspaceFailure(error); }
}
