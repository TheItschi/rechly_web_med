import { ID, Permission, Query, Role, type Databases } from "node-appwrite";
import { COLLECTIONS, DATABASE_ID } from "@/lib/appwrite-server";
import { parseGTIN, readEInvoiceData, snapshotIdentifiers, type EInvoiceData } from "@/lib/eRechnung/identifiers";
import { calculateInvoiceTotals, calculateLineItemTotals } from "@/lib/currencyUtils";
import { allDocuments } from "@/lib/server/pagination";

/**
 * Shared validation and persistence helpers for creating invoices
 * (POST /api/invoices) and fully updating drafts (PUT /api/invoices/[id]).
 */

export class InvoiceWriteError extends Error {
    constructor(
        message: string,
        readonly status = 400,
    ) {
        super(message);
        this.name = "InvoiceWriteError";
    }
}

export const NUMBER_TAKEN_MESSAGE =
    "Rechnungsnummer bereits vergeben. Bitte eine andere Nummer wählen oder leer lassen für automatische Vergabe.";

export interface InvoiceItemInput {
    product_id?: string | null;
    description: string;
    gtin?: string;
    quantity: number;
    unit_of_measure?: string;
    price: number;
    tax_rate_percent: number;
    discount_percent?: number;
    service_date_start?: string;
    service_date_end?: string;
}

type Body = Record<string, unknown>;

const optionalDate = (value: unknown): string | undefined =>
    typeof value === "string" && value ? value : undefined;

const ownerPermissions = (userId: string) => [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
];

/**
 * Resolves only tenant-owned source records and takes the immutable
 * e-invoice identifier snapshot. Normalizes the line items (GTIN).
 */
export async function resolveInvoiceSource(databases: Databases, userId: string, body: Body) {
    const customer = await databases.getDocument(DATABASE_ID, COLLECTIONS.CLIENTS, String(body.client_id));
    if (customer.userId !== userId) throw new InvoiceWriteError("Not found", 404);
    const companies = await databases.listDocuments(DATABASE_ID, COLLECTIONS.COMPANY_INFO, [
        Query.equal("userId", userId),
        Query.limit(1),
    ]);
    const identifiers = snapshotIdentifiers(
        readEInvoiceData(customer.eInvoiceData),
        readEInvoiceData(companies.documents[0]?.eInvoiceData),
        body.e_invoice as EInvoiceData | undefined,
    );
    if (!Array.isArray(body.items)) throw new InvoiceWriteError("Invalid items");
    const items = (body.items as InvoiceItemInput[]).map((item) => ({ ...item, gtin: parseGTIN(item.gtin) }));
    return { identifiers, companyDoc: companies.documents[0] ?? null, items };
}

/**
 * Invoice attributes derived from the payload (totals, service period, …).
 * `periodAttrs` holds the newer service-period attributes, which may not
 * exist in schemas that predate their migration.
 */
export function buildInvoiceContent(body: Body, items: InvoiceItemInput[], identifiers: EInvoiceData) {
    // Overall service period: explicit invoice range wins, then legacy single date.
    const deliveryDateStart = optionalDate(body.delivery_date_start);
    const deliveryDateEnd = optionalDate(body.delivery_date_end);
    const legacyDeliveryDate = optionalDate(body.delivery_date);

    const totals = calculateInvoiceTotals(
        items.map((item) => ({
            quantity: item.quantity,
            price: item.price,
            tax_rate_percent: item.tax_rate_percent,
            discount_percent: item.discount_percent || 0,
        })),
    );

    const fields: Record<string, unknown> = {
        ...(Object.keys(identifiers).length ? { eInvoiceData: JSON.stringify(identifiers) } : {}),
        clientId: body.client_id,
        dueDate: body.due_date || null,
        subtotal: totals.netAfterDiscount,
        totalVat: totals.totalVAT,
        totalGross: totals.totalGross,
        notes: body.notes || null,
        purchaseOrderRef: body.purchase_order_ref || null,
        deliveryDate: deliveryDateEnd ?? deliveryDateStart ?? legacyDeliveryDate ?? null,
        paymentTerms: body.payment_terms || null,
    };
    return { fields, deliveryDateStart, deliveryDateEnd };
}

/** Item documents ready to store (service dates omitted when empty). */
export function buildItemDocuments(invoiceId: string, items: InvoiceItemInput[]): Record<string, unknown>[] {
    return items.map((item) => {
        const calc = calculateLineItemTotals(item.quantity, item.price, item.tax_rate_percent, item.discount_percent || 0);
        return {
            invoiceId,
            productId: item.product_id || null,
            description: item.description,
            ...(item.gtin ? { gtin: item.gtin } : {}),
            quantity: item.quantity,
            unitOfMeasure: item.unit_of_measure || "Stück",
            price: item.price,
            taxRatePercent: item.tax_rate_percent,
            discountPercent: item.discount_percent || 0,
            ...(optionalDate(item.service_date_start) ? { serviceDateStart: item.service_date_start } : {}),
            ...(optionalDate(item.service_date_end) ? { serviceDateEnd: item.service_date_end } : {}),
            subtotal: calc.subtotal,
            taxAmount: calc.taxAmount,
            total: calc.total,
        };
    });
}

/**
 * Creates item documents; unknown attributes fall back for schemas that
 * predate the service-date migration. Ids of created documents are pushed
 * to `created` as they succeed, so callers can roll back after a failure.
 */
export async function createItemDocuments(
    databases: Databases,
    userId: string,
    documents: Record<string, unknown>[],
    created: string[] = [],
): Promise<string[]> {
    for (const itemData of documents) {
        const id = ID.unique();
        try {
            await databases.createDocument(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, id, itemData, ownerPermissions(userId));
            created.push(id);
        } catch (itemError) {
            const errMsg = (itemError as { message?: string })?.message || "";
            if (!errMsg.includes("Unknown attribute")) throw itemError;
            const { serviceDateStart: _dropStart, serviceDateEnd: _dropEnd, ...legacyItem } = itemData;
            void _dropStart;
            void _dropEnd;
            await databases.createDocument(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, id, legacyItem, ownerPermissions(userId));
            created.push(id);
        }
    }
    return created;
}

/** True when another invoice of the user already carries this number. */
export async function numberExists(
    databases: Databases,
    userId: string,
    invoiceNumber: string,
    excludeId?: string,
): Promise<boolean> {
    const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICES, [
        Query.equal("userId", userId),
        Query.equal("invoiceNumber", invoiceNumber),
        Query.limit(10),
    ]);
    return existing.documents.some((d) => d.$id !== excludeId);
}

/**
 * Replaces the line items of a draft. New items are created first and the
 * invoice is updated (`applyInvoiceUpdate`); only then are the old items
 * deleted. If creating or updating fails, the newly created items are
 * removed again, so the draft keeps its previous positions.
 */
export async function replaceDraftItems(
    databases: Databases,
    userId: string,
    invoiceId: string,
    documents: Record<string, unknown>[],
    applyInvoiceUpdate: () => Promise<unknown>,
): Promise<void> {
    const oldItems = await allDocuments((queries) => databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, queries), [
        Query.equal("invoiceId", invoiceId),
    ]);
    const created: string[] = [];
    try {
        await createItemDocuments(databases, userId, documents, created);
        await applyInvoiceUpdate();
    } catch (error) {
        for (const id of created) {
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, id).catch(() => undefined);
        }
        throw error;
    }
    for (const item of oldItems) {
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, item.$id);
    }
}
