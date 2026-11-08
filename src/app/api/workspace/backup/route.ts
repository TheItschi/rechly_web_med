import { NextResponse } from "next/server";
import { workspaceContext, workspaceFailure } from "@/lib/workspace/http";
import { WorkspaceStore } from "@/lib/workspace/store";
export async function GET() {
    try {
        const { databases, userId } = await workspaceContext(), store = new WorkspaceStore(databases, userId);
        const rows = await store.rows();
        const backup = { rechlyWorkspaceVersion: 2, exportedAt: new Date().toISOString(), records: rows.map(row => ({ kind: row.kind, record: JSON.parse(row.payload) })), clients: (await store.list("clients")).map(c => ({ id: c.$id, name: c.name })), note: "Workspace only. Invoices, invoice items, company, customers and receipts require the accounting backup. No automatic restore or sync." };
        return new NextResponse(JSON.stringify(backup, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="rechly-workspace.json"', "Cache-Control": "no-store" } });
    } catch (error) { return workspaceFailure(error); }
}
