import { NextRequest, NextResponse } from "next/server";
import { workspaceContext, workspaceFailure, workspaceJson } from "@/lib/workspace/http";
import { WorkspaceStore } from "@/lib/workspace/store";
import { calendarSnapshot, calendarExport, mutateCalendar } from "@/lib/workspace/calendar-service";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
    try {
        const { databases, userId } = await workspaceContext(), store = new WorkspaceStore(databases, userId);
        if (request.nextUrl.searchParams.has("export")) return new NextResponse(await calendarExport(store), { headers: { "Content-Type": "text/calendar;charset=utf-8", "Content-Disposition": 'attachment; filename="rechly-kalender.ics"', "Cache-Control": "no-store" } });
        return NextResponse.json(await calendarSnapshot(store, request.nextUrl.searchParams.get("from") || "", request.nextUrl.searchParams.get("to") || ""), { headers: { "Cache-Control": "no-store" } });
    } catch (error) { return workspaceFailure(error); }
}
export async function POST(request: NextRequest) {
    try { const { databases, userId } = await workspaceContext(); return NextResponse.json({ result: await mutateCalendar(databases, userId, await workspaceJson(request, 6 * 1024 * 1024)) }); }
    catch (error) { return workspaceFailure(error); }
}
