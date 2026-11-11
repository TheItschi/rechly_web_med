import type { EInvoiceData } from "@/lib/eRechnung/identifiers";
import { parseEInvoiceData, parseGTIN } from "@/lib/eRechnung/identifiers";
import { formatDateGerman } from "@/lib/dateUtils";
import type { InvoiceFormData, InvoiceItemFormData } from "@/types";

/**
 * Line item as edited in the invoice create form.
 * Extracted from invoices/create/page.tsx for reuse and testing.
 */
export interface InvoiceLineItem {
    gtin?: string;
    key: string;
    description: string;
    service_summary?: string;
    quantity: number;
    unit_of_measure: string;
    price: number;
    tax_rate_percent: number;
    discount_percent: number;
    /** Linked catalog product (kept for traceability, not required). */
    product_id?: string;
    /** Optional per-item service period (YYYY-MM-DD). Omitted when unset. */
    service_date_start?: string;
    service_date_end?: string;
}

export type InvoiceDraftError = "missing-client" | "missing-items";

/**
 * Guard checks shown before submit (mirrors the UI error messages).
 */
export function validateInvoiceDraft(
    clientId: string | undefined,
    itemCount: number,
): InvoiceDraftError | null {
    if (!clientId) return "missing-client";
    if (itemCount === 0) return "missing-items";
    return null;
}

export interface BuildInvoiceFormDataArgs {
    clientId: string;
    eInvoice: EInvoiceData | undefined;
    invoiceNumber: string;
    /** Already formatted as YYYY-MM-DD */
    issueDate: string;
    /** Already formatted as YYYY-MM-DD */
    dueDate: string;
    notes?: string;
    paymentTerms?: string;
    /** Optional overall service period (YYYY-MM-DD). */
    deliveryDateStart?: string;
    deliveryDateEnd?: string;
    lineItems: InvoiceLineItem[];
}

/**
 * Build the API payload from form state. Pure function — date formatting
 * stays in the component (dayjs), everything else is testable here.
 */
export function buildInvoiceFormData({
    clientId,
    eInvoice,
    invoiceNumber,
    issueDate,
    dueDate,
    notes,
    paymentTerms,
    deliveryDateStart,
    deliveryDateEnd,
    lineItems,
}: BuildInvoiceFormDataArgs): InvoiceFormData {
    const items: InvoiceItemFormData[] = lineItems.map((item) => ({
        gtin: parseGTIN(item.gtin),
        ...(item.product_id ? { product_id: item.product_id } : {}),
        description: item.description,
        quantity: item.quantity,
        unit_of_measure: item.unit_of_measure,
        price: item.price,
        tax_rate_percent: item.tax_rate_percent,
        discount_percent: item.discount_percent,
        ...(item.service_date_start ? { service_date_start: item.service_date_start } : {}),
        ...(item.service_date_end ? { service_date_end: item.service_date_end } : {}),
    }));

    return {
        client_id: clientId,
        e_invoice:
            eInvoice === undefined
                ? undefined
                : {
                      ...parseEInvoiceData(eInvoice),
                      // An explicitly cleared buyer ID must not reapply the customer default.
                      ...(Object.hasOwn(eInvoice, "buyer_identifier")
                          ? {
                                buyer_identifier: eInvoice.buyer_identifier || {
                                    value: "",
                                },
                            }
                          : {}),
                  },
        invoice_number: invoiceNumber,
        issue_date: issueDate,
        due_date: dueDate,
        notes: notes || undefined,
        payment_terms: paymentTerms || undefined,
        ...(deliveryDateStart ? { delivery_date_start: deliveryDateStart } : {}),
        ...(deliveryDateEnd ? { delivery_date_end: deliveryDateEnd } : {}),
        items,
    };
}

/**
 * Human-readable service period for display ("05.01.2025 – 12.01.2025",
 * single date if start equals end, fallback to a legacy delivery date).
 * Returns null when nothing usable is present.
 */
export function formatServicePeriod(
    start?: string | null,
    end?: string | null,
    fallback?: string | null,
): string | null {
    const isDate = (d: unknown): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
    const s = isDate(start) ? start : undefined;
    const e = isDate(end) ? end : undefined;
    if (s && e) {
        return s === e
            ? formatDateGerman(s)
            : `${formatDateGerman(s)} – ${formatDateGerman(e)}`;
    }
    if (s) return `${formatDateGerman(s)} – …`;
    if (e) return `… – ${formatDateGerman(e)}`;
    if (isDate(fallback)) return formatDateGerman(fallback);
    return null;
}

/**
 * Compute the overall service period from per-item service dates.
 * Returns the earliest start and latest end found, or null when no
 * item carries usable dates. Used by "aus Positionen übernehmen".
 */
export function summarizeServicePeriod(
    items: ReadonlyArray<Pick<InvoiceLineItem, "service_date_start" | "service_date_end">>,
): { start: string; end: string } | null {
    const starts = items
        .map((item) => item.service_date_start)
        .filter((d): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d));
    const ends = items
        .map((item) => item.service_date_end)
        .filter((d): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d));
    if (starts.length === 0 && ends.length === 0) {
        return null;
    }
    const sortedStarts = [...starts].sort();
    const sortedEnds = [...ends].sort();
    const start = sortedStarts[0] ?? sortedEnds[0];
    const end = sortedEnds[sortedEnds.length - 1] ?? sortedStarts[sortedStarts.length - 1];
    if (start > end) {
        return { start: end, end: start };
    }
    return { start, end };
}
