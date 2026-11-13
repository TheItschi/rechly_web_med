import type {
    InvoiceWithClient,
    InvoiceWithDetails,
    InvoiceFormData,
} from "@/types";

/**
 * Invoice Service - CRUD operations via API routes
 * All Appwrite calls are proxied through server-side API routes
 * to work with SSR authentication
 */

/**
 * Invoice statistics type
 */
export interface InvoiceStats {
    total: number;
    draft: number;
    sent: number;
    paid: number;
    cancelled: number;
    paidAmount: number;
    unpaidAmount: number;
}

/**
 * Get all invoices with client info
 */
export const getAllInvoices = async (): Promise<InvoiceWithClient[]> => {
    try {
        const res = await fetch("/api/invoices");
        if (!res.ok) {
            if (res.status === 401) {
                console.log("Not authenticated, returning empty invoices");
                return [];
            }
            throw new Error("Failed to fetch invoices");
        }
        return res.json();
    } catch (error) {
        console.error("Error fetching invoices:", error);
        throw error;
    }
};

/**
 * Get invoice by ID with all details (items, client)
 */
export const getInvoiceById = async (
    id: string
): Promise<InvoiceWithDetails | null> => {
    try {
        const res = await fetch(`/api/invoices/${id}`);
        if (res.status === 404) return null;
        if (!res.ok) {
            throw new Error("Failed to fetch invoice");
        }
        return res.json();
    } catch (error) {
        console.error("Error fetching invoice:", error);
        return null;
    }
};

/**
 * Create new invoice with items
 */
export const createInvoice = async (data: InvoiceFormData): Promise<{ id: string; invoiceNumber?: string }> => {
    try {
        const res = await fetch("/api/invoices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Failed to create invoice");
        }

        const result = await res.json();
        return { id: result.id, invoiceNumber: result.invoiceNumber };
    } catch (error) {
        console.error("Error creating invoice:", error);
        throw error;
    }
};

/**
 * Next sequential invoice number preview (not reserved). With `suggest`,
 * the counter is derived from existing invoice numbers. Null if unavailable.
 */
export const getNextInvoiceNumber = async (
    suggest = false,
): Promise<{ number: string; pattern: string; prefix: string; next: number } | null> => {
    try {
        const res = await fetch(suggest ? "/api/invoices/next-number?suggest=1" : "/api/invoices/next-number");
        return res.ok ? await res.json() : null;
    } catch {
        return null;
    }
};

/** Replace content and items of a draft invoice. */
export const updateDraftInvoice = async (id: string, data: InvoiceFormData): Promise<void> => {
    const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Rechnung konnte nicht gespeichert werden");
    }
};

/**
 * Update invoice status
 */
export const updateInvoiceStatus = async (
    id: string,
    status: string
): Promise<void> => {
    try {
        const res = await fetch(`/api/invoices/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Failed to update invoice status");
        }
    } catch (error) {
        console.error("Error updating invoice status:", error);
        throw error;
    }
};

/**
 * Delete invoice and its items
 */
export const deleteInvoice = async (id: string): Promise<void> => {
    try {
        const res = await fetch(`/api/invoices/${id}`, {
            method: "DELETE",
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Failed to delete invoice");
        }
    } catch (error) {
        console.error("Error deleting invoice:", error);
        throw error;
    }
};

/**
 * Get invoice statistics
 */
export const getInvoiceStats = async (): Promise<InvoiceStats> => {
    try {
        const res = await fetch("/api/invoices/stats");
        if (!res.ok) {
            return {
                total: 0,
                draft: 0,
                sent: 0,
                paid: 0,
                cancelled: 0,
                paidAmount: 0,
                unpaidAmount: 0,
            };
        }
        return res.json();
    } catch (error) {
        console.error("Error getting invoice stats:", error);
        return {
            total: 0,
            draft: 0,
            sent: 0,
            paid: 0,
            cancelled: 0,
            paidAmount: 0,
            unpaidAmount: 0,
        };
    }
};
