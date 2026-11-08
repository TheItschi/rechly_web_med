import { createHash } from "node:crypto";
import { Query } from "node-appwrite";
import { calculateInvoiceTotals } from "../currencyUtils";
import { DB, T, TermineError, type TermineStore } from "./store";
import type { AppointmentRow } from "./booking";
import { findOrCreateCustomer } from "./customers";

// Mirrors COLLECTIONS/DATABASE_ID in src/lib/appwrite-server.ts.
const DATABASE_ID = "rechly-db";
const INVOICES = "invoices";
const INVOICE_ITEMS = "invoice_items";

const draftId = (prefix: string, appointmentId: string) =>
    createHash("sha256").update(`${prefix}:${appointmentId}`).digest("hex").slice(0, 32);

/**
 * Draft-invoice adapter. Reuses the existing invoice document shape, totals
 * math and tax rules — no second invoice engine. Idempotent: a completed
 * appointment with linkedInvoiceId returns the existing draft.
 */
export async function createDraftFromAppointment(
    store: TermineStore,
    appointmentId: string,
): Promise<{ invoiceId: string; invoiceNumber: string; existed: boolean }> {
    const appt = (await store.own(T.APPOINTMENTS, appointmentId)) as unknown as AppointmentRow;
    if (appt.status !== "COMPLETED")
        throw new TermineError("Nur abgeschlossene Termine können abgerechnet werden.", 409);
    if (appt.linkedInvoiceId) return { invoiceId: appt.linkedInvoiceId, invoiceNumber: "", existed: true };

    const { id: clientId } = await findOrCreateCustomer(
        store.db,
        store.userId,
        { name: appt.customerName, email: appt.customerEmail, phone: appt.customerPhone },
        store.transactionId,
    );

    const due = new Date(Date.parse(appt.startUtc) + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const issue = new Date().toISOString().slice(0, 10);
    const prefix = `TN-${issue.replaceAll("-", "")}-`;
    const existing = await store.db
        .listDocuments(DATABASE_ID, INVOICES, [
            Query.equal("userId", store.userId),
            Query.startsWith("invoiceNumber", prefix),
            Query.limit(1000),
        ])
        .catch(() => ({ documents: [] as Array<{ invoiceNumber?: string }> }));
    let max = 0;
    for (const row of existing.documents) {
        const seq = Number(String(row.invoiceNumber ?? "").slice(prefix.length));
        if (Number.isFinite(seq) && seq > max) max = seq;
    }
    const invoiceNumber = `${prefix}${String(max + 1).padStart(4, "0")}`;
    const totals = calculateInvoiceTotals([
        { quantity: 1, price: appt.servicePriceCents / 100, tax_rate_percent: 19, discount_percent: 0 },
    ]);
    const invoiceId = draftId("appt-inv", appt.$id);
    try {
        await store.db.createDocument(
            DATABASE_ID,
            INVOICES,
            invoiceId,
            {
                userId: store.userId,
                clientId,
                invoiceNumber,
                issueDate: issue,
                dueDate: due,
                subtotal: totals.netAfterDiscount,
                totalVat: totals.totalVAT,
                totalGross: totals.totalGross,
                status: "draft",
                notes: `Termin am ${appt.startUtc.slice(0, 10)} (${appt.serviceNameSnapshot})`,
            },
            store.perms(),
            store.transactionId,
        );
        await store.db.createDocument(
            DATABASE_ID,
            INVOICE_ITEMS,
            draftId("appt-item", appt.$id),
            {
                invoiceId,
                description: `${appt.serviceNameSnapshot} (${appt.startUtc.slice(0, 10)})`,
                quantity: 1,
                unitOfMeasure: "Stück",
                price: appt.servicePriceCents / 100,
                taxRatePercent: 19,
                discountPercent: 0,
                subtotal: totals.netAfterDiscount,
                taxAmount: totals.totalVAT,
                total: totals.totalGross,
            },
            store.perms(),
            store.transactionId,
        );
    } catch (error) {
        if ((error as { code?: number }).code === 409)
            return { invoiceId, invoiceNumber: "", existed: true };
        throw error;
    }
    await store.db.updateDocument(DB, T.APPOINTMENTS, appt.$id, { linkedInvoiceId: invoiceId }, undefined, store.transactionId);
    return { invoiceId, invoiceNumber, existed: false };
}
