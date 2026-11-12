import { Query } from "node-appwrite";
import { COLLECTIONS, DATABASE_ID, type createAdminClient } from "@/lib/appwrite-server";
import { parseGTIN, readEInvoiceData, snapshotIdentifiers } from "@/lib/eRechnung/identifiers";
import { normalizeGoaeLine } from "@/lib/goae/line";
import { normalizeMedicalData } from "@/lib/icd10";
import { loadGoaeCatalog } from "@/lib/server/goaeCatalogStore";
import { calculateInvoiceTotals, calculateLineItemTotals } from "@/lib/currencyUtils";

type Databases = Awaited<ReturnType<typeof createAdminClient>>["databases"];

export class InvoiceWriteError extends Error {
    constructor(message: string, readonly status = 400) {
        super(message);
    }
}

interface ItemInput {
    product_id?: string;
    description: string;
    gtin?: string;
    goae?: unknown;
    quantity: number;
    unit_of_measure?: string;
    price: number;
    tax_rate_percent: number;
    discount_percent?: number;
}

/**
 * Validates an invoice payload (create or draft update) and returns the
 * invoice attributes plus ready-to-store item documents. GOÄ prices are
 * recomputed server-side; totals are always derived from the items.
 */
export async function prepareInvoiceWrite(databases: Databases, userId: string, body: Record<string, unknown>) {
    const customer = await databases.getDocument(DATABASE_ID, COLLECTIONS.CLIENTS, String(body.client_id));
    if (customer.userId !== userId) throw new InvoiceWriteError("Not found", 404);
    const companies = await databases.listDocuments(DATABASE_ID, COLLECTIONS.COMPANY_INFO, [Query.equal("userId", userId), Query.limit(1)]);
    const identifiers = snapshotIdentifiers(readEInvoiceData(customer.eInvoiceData), readEInvoiceData(companies.documents[0]?.eInvoiceData), body.e_invoice as never);
    if (!Array.isArray(body.items)) throw new InvoiceWriteError("Invalid items");

    await loadGoaeCatalog(); // activates an uploaded GOÄ catalogue for price/points
    const items = (body.items as ItemInput[]).map((raw) => {
        const item = { ...raw, gtin: parseGTIN(raw.gtin) };
        let goaeData: string | undefined;
        if (item.goae) {
            // GOÄ lines: the price is always Einfachsatz × Steigerungssatz.
            const { data, unitPrice } = normalizeGoaeLine(item.goae);
            goaeData = JSON.stringify(data);
            item.price = unitPrice;
        }
        const calc = calculateLineItemTotals(item.quantity, item.price, item.tax_rate_percent, item.discount_percent || 0);
        return {
            productId: item.product_id || null,
            description: item.description,
            ...(item.gtin ? { gtin: item.gtin } : {}),
            ...(goaeData ? { goaeData } : {}),
            quantity: item.quantity,
            unitOfMeasure: item.unit_of_measure || "Stück",
            price: item.price,
            taxRatePercent: item.tax_rate_percent,
            discountPercent: item.discount_percent || 0,
            subtotal: calc.subtotal,
            taxAmount: calc.taxAmount,
            total: calc.total,
        };
    });
    const medical = normalizeMedicalData(body.medical);
    const totals = calculateInvoiceTotals(items.map((i) => ({
        quantity: i.quantity, price: i.price, tax_rate_percent: i.taxRatePercent, discount_percent: i.discountPercent,
    })));

    const invoiceData: Record<string, unknown> = {
        ...(Object.keys(identifiers).length ? { eInvoiceData: JSON.stringify(identifiers) } : {}),
        clientId: body.client_id,
        invoiceNumber: body.invoice_number,
        issueDate: body.issue_date,
        dueDate: body.due_date || null,
        subtotal: totals.netAfterDiscount,
        totalVat: totals.totalVAT,
        totalGross: totals.totalGross,
        notes: body.notes || null,
        purchaseOrderRef: body.purchase_order_ref || null,
        deliveryDate: body.delivery_date || null,
        paymentTerms: body.payment_terms || null,
    };
    return { invoiceData, items, medical };
}
