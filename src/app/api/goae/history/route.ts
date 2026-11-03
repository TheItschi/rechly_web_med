import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient, createSessionClient, COLLECTIONS, DATABASE_ID } from "@/lib/appwrite-server";
import { isCollectionNotFound } from "@/lib/appwrite-errors";
import { parseGoaeLineData } from "@/lib/goae/line";
import type { GoaeHistoryEntry } from "@/lib/goae/check";

/**
 * GET /api/goae/history?client_id=…[&exclude=<invoiceId>]
 * GOÄ services already billed to a patient – input for the Prüfmodul's
 * Behandlungsfall and period rules. Cancelled invoices are ignored, credit
 * notes are netted against the original lines, and an invoice replaced by a
 * correction only counts once.
 */
export async function GET(request: NextRequest) {
    let userId: string;
    try {
        const { account } = await createSessionClient();
        userId = (await account.get()).$id;
    } catch {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const clientId = request.nextUrl.searchParams.get("client_id");
    const exclude = request.nextUrl.searchParams.get("exclude");
    if (!clientId) return NextResponse.json({ error: "client_id required" }, { status: 400 });

    try {
        const { databases } = await createAdminClient();
        const invoices = (await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICES, [
            Query.equal("userId", userId),
            Query.equal("clientId", clientId),
            Query.limit(1000),
        ])).documents.filter((d) => d.status !== "cancelled" && d.$id !== exclude);

        const superseded = new Set(invoices.filter((d) => d.correctionType === "correction" && d.correctsInvoiceId).map((d) => d.correctsInvoiceId as string));
        const relevant = invoices.filter((d) => !superseded.has(d.$id));
        const numberOf = new Map(relevant.map((d) => [d.$id, d.invoiceNumber as string]));

        const totals = new Map<string, GoaeHistoryEntry>();
        const ids = relevant.map((d) => d.$id);
        for (let i = 0; i < ids.length; i += 100) {
            const items = await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, [
                Query.equal("invoiceId", ids.slice(i, i + 100)),
                Query.limit(5000),
            ]);
            for (const item of items.documents) {
                const goae = parseGoaeLineData(item.goaeData);
                if (!goae) continue;
                const key = `${goae.number}|${goae.service_date}`;
                const prev = totals.get(key);
                const qty = Number(item.quantity) || 0;
                totals.set(key, {
                    number: goae.number,
                    serviceDate: goae.service_date,
                    quantity: (prev?.quantity ?? 0) + qty,
                    invoiceNumber: prev?.invoiceNumber ?? (qty > 0 ? numberOf.get(item.invoiceId) : undefined),
                });
            }
        }
        return NextResponse.json([...totals.values()].filter((e) => e.quantity > 0));
    } catch (error) {
        if (isCollectionNotFound(error)) return NextResponse.json([]);
        console.error("Error loading GOÄ history:", error);
        return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
    }
}
