import { createHash } from "node:crypto";
import { Query } from "node-appwrite";
import { calculateInvoiceTotals } from "../currencyUtils";
import { DB, T, TermineError, missing, type TermineStore } from "./store";
import type { AppointmentRow, ServiceRow } from "./booking";
import { findOrCreateCustomer } from "./customers";

// Mirrors COLLECTIONS/DATABASE_ID in src/lib/appwrite-server.ts.
const DATABASE_ID = "rechly-db";
const INVOICES = "invoices";
const INVOICE_ITEMS = "invoice_items";
const COMPANY_INFO = "user_company";
const PRODUCTS = "products";

const draftId = (prefix: string, appointmentId: string) =>
    createHash("sha256").update(`${prefix}:${appointmentId}`).digest("hex").slice(0, 32);

/**
 * Draft-invoice adapter. Reuses Rechly's core `invoices`, `invoice_items`,
 * `clients`, `products` and `user_company` tables — honoring §19 UStG small-business
 * status, service/product VAT rates, unit of measure, and default payment terms.
 * Idempotent: a completed appointment with an existing linked draft returns it.
 */
export async function createDraftFromAppointment(
    store: TermineStore,
    appointmentId: string,
): Promise<{ invoiceId: string; invoiceNumber: string; existed: boolean }> {
    const appt = (await store.own(T.APPOINTMENTS, appointmentId)) as unknown as AppointmentRow;
    if (appt.status !== "COMPLETED")
        throw new TermineError("Nur abgeschlossene Termine können abgerechnet werden.", 409);

    if (appt.linkedInvoiceId) {
        try {
            const existingDoc = await store.db.getDocument(
                DATABASE_ID,
                INVOICES,
                appt.linkedInvoiceId,
                [],
                store.transactionId,
            );
            if (existingDoc && existingDoc.userId === store.userId) {
                return {
                    invoiceId: appt.linkedInvoiceId,
                    invoiceNumber: String(existingDoc.invoiceNumber ?? ""),
                    existed: true,
                };
            }
        } catch (error) {
            if (!missing(error)) throw error;
            // Draft was deleted in /dashboard/invoices — allow regenerating cleanly.
        }
    }

    const { id: clientId } = await findOrCreateCustomer(
        store.db,
        store.userId,
        {
            customerId: appt.customerId,
            name: appt.customerName,
            email: appt.customerEmail,
            phone: appt.customerPhone,
        },
        store.transactionId,
    );

    // Resolve seller tax profile (§19 UStG small business + default payment terms)
    const companyRes = await store.db
        .listDocuments(
            DATABASE_ID,
            COMPANY_INFO,
            [Query.equal("userId", store.userId), Query.limit(1)],
            store.transactionId,
        )
        .catch(() => ({ documents: [] as Array<Record<string, unknown>> }));
    const companyDoc = companyRes.documents[0];
    const isSmallBusiness = Boolean(
        companyDoc?.isSmallBusiness ?? companyDoc?.is_small_business,
    );
    const paymentTerms =
        typeof companyDoc?.paymentTermsDefault === "string" &&
        companyDoc.paymentTermsDefault.trim()
            ? companyDoc.paymentTermsDefault.trim()
            : undefined;

    // Resolve service & optional linked product for VAT rate + unit of measure
    const service = await store.own<ServiceRow>(T.SERVICES, appt.serviceId).catch(() => null);
    let productTaxRate: number | undefined;
    let unitOfMeasure = "Stück";
    if (service?.productId) {
        try {
            const prod = await store.db.getDocument(
                DATABASE_ID,
                PRODUCTS,
                service.productId,
                [],
                store.transactionId,
            );
            if (prod && prod.userId === store.userId) {
                if (typeof prod.taxRatePercent === "number") {
                    productTaxRate = prod.taxRatePercent;
                }
                if (typeof prod.unitOfMeasure === "string" && prod.unitOfMeasure.trim()) {
                    unitOfMeasure = prod.unitOfMeasure.trim();
                }
            }
        } catch {
            // Product was removed; fall back gracefully
        }
    }

    const taxRatePercent = isSmallBusiness
        ? 0
        : typeof service?.taxRatePercent === "number"
          ? service.taxRatePercent
          : typeof productTaxRate === "number"
            ? productTaxRate
            : 19;

    const due = new Date(Date.parse(appt.startUtc) + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const issue = new Date().toISOString().slice(0, 10);
    const prefix = `TN-${issue.replaceAll("-", "")}-`;
    const existing = await store.db
        .listDocuments(
            DATABASE_ID,
            INVOICES,
            [
                Query.equal("userId", store.userId),
                Query.startsWith("invoiceNumber", prefix),
                Query.limit(1000),
            ],
            store.transactionId,
        )
        .catch(() => ({ documents: [] as Array<{ invoiceNumber?: string }> }));
    let max = 0;
    for (const row of existing.documents) {
        const seq = Number(String(row.invoiceNumber ?? "").slice(prefix.length));
        if (Number.isFinite(seq) && seq > max) max = seq;
    }
    const invoiceNumber = `${prefix}${String(max + 1).padStart(4, "0")}`;
    const totals = calculateInvoiceTotals([
        {
            quantity: 1,
            price: appt.servicePriceCents / 100,
            tax_rate_percent: taxRatePercent,
            discount_percent: 0,
        },
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
                ...(paymentTerms ? { paymentTerms } : {}),
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
                ...(service?.productId ? { productId: service.productId } : {}),
                description: `${appt.serviceNameSnapshot} (${appt.startUtc.slice(0, 10)})`,
                quantity: 1,
                unitOfMeasure,
                price: appt.servicePriceCents / 100,
                taxRatePercent,
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
    await store.db.updateDocument(
        DB,
        T.APPOINTMENTS,
        appt.$id,
        { linkedInvoiceId: invoiceId, customerId: clientId },
        undefined,
        store.transactionId,
    );
    return { invoiceId, invoiceNumber, existed: false };
}
