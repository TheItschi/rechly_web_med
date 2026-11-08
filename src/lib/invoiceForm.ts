import type { EInvoiceData } from "@/lib/eRechnung/identifiers";
import { parseEInvoiceData, parseGTIN } from "@/lib/eRechnung/identifiers";
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
    lineItems,
}: BuildInvoiceFormDataArgs): InvoiceFormData {
    const items: InvoiceItemFormData[] = lineItems.map((item) => ({
        gtin: parseGTIN(item.gtin),
        description: item.description,
        quantity: item.quantity,
        unit_of_measure: item.unit_of_measure,
        price: item.price,
        tax_rate_percent: item.tax_rate_percent,
        discount_percent: item.discount_percent,
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
        items,
    };
}
