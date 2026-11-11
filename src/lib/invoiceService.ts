import type {
    InvoiceWithClient,
    InvoiceWithDetails,
    InvoiceFormData,
    InvoiceStatus,
} from "@/types";
import { apiDelete, apiFetch, apiGet, apiPost, apiPut } from "./apiClient";
import { logger } from "./logger";

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

const EMPTY_STATS: InvoiceStats = {
    total: 0,
    draft: 0,
    sent: 0,
    paid: 0,
    cancelled: 0,
    paidAmount: 0,
    unpaidAmount: 0,
};

/**
 * Get all invoices with client info
 */
export const getAllInvoices = async (): Promise<InvoiceWithClient[]> => {    try {
        return await apiGet<InvoiceWithClient[]>(
            "/api/invoices",
            "Failed to fetch invoices",
        );
    } catch (error) {
        logger.error("Error fetching invoices:", error);
        throw error;
    }
};

/**
 * Get invoice by ID with all details (items, client)
 */
export const getInvoiceById = async (
    id: string,
): Promise<InvoiceWithDetails | null> => {
    try {
        return await apiFetch<InvoiceWithDetails | null>(
            `/api/invoices/${id}`,
            { allow404: true },
            "Failed to fetch invoice",
        );
    } catch (error) {
        logger.error("Error fetching invoice:", error);
        return null;
    }
};

/**
 * Create new invoice with items
 */
export const createInvoice = async (data: InvoiceFormData): Promise<{ id: string; invoiceNumber?: string }> => {
    try {
        const result = await apiPost<{ id: string; invoiceNumber?: string }>(
            "/api/invoices",
            data,
            "Failed to create invoice",
        );
        return { id: result.id, invoiceNumber: result.invoiceNumber };
    } catch (error) {
        logger.error("Error creating invoice:", error);
        throw error;
    }
};

/**
 * Update invoice status
 */
export const updateInvoiceStatus = async (
    id: string,
    status: InvoiceStatus,
): Promise<void> => {
    try {
        await apiPut(`/api/invoices/${id}`, { status }, "Failed to update invoice status");
    } catch (error) {
        logger.error("Error updating invoice status:", error);
        throw error;
    }
};

/**
 * Delete invoice and its items
 */
export const deleteInvoice = async (id: string): Promise<void> => {
    try {
        await apiDelete(`/api/invoices/${id}`, "Failed to delete invoice");
    } catch (error) {
        logger.error("Error deleting invoice:", error);
        throw error;
    }
};

/**
 * Get the next sequential invoice number preview (not reserved).
 * Falls back to null when the endpoint is unavailable (older backend).
 */
export const getNextInvoiceNumber = async (
    suggest = false,
): Promise<{ number: string; pattern: string; prefix: string; next: number } | null> => {
    try {
        return await apiGet<{ number: string; pattern: string; prefix: string; next: number }>(
            suggest ? "/api/invoices/next-number?suggest=1" : "/api/invoices/next-number",
            "Failed to fetch next invoice number",
        );
    } catch (error) {
        logger.error("Error getting next invoice number:", error);
        return null;
    }
};

/**
 * Get invoice statistics
 */
export const getInvoiceStats = async (): Promise<InvoiceStats> => {
    try {
        return await apiGet<InvoiceStats>(
            "/api/invoices/stats",
            "Failed to fetch invoice stats",
        );
    } catch (error) {
        logger.error("Error getting invoice stats:", error);
        return { ...EMPTY_STATS };
    }
};
