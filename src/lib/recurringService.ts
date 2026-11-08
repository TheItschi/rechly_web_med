import type { RecurringFormData, RecurringInvoiceWithDetails } from "@/types";
import { apiDelete, apiFetch, apiGet, apiPost, apiPut } from "./apiClient";
import { logger } from "./logger";

export async function getAllRecurring(): Promise<RecurringInvoiceWithDetails[]> {
    try {
        return await apiGet<RecurringInvoiceWithDetails[]>(
            "/api/recurring",
            "Failed to fetch recurring invoices",
        );
    } catch (error) {
        logger.error("Error fetching recurring invoices:", error);
        throw error;
    }
}

export async function getRecurringById(
    id: string,
): Promise<RecurringInvoiceWithDetails | null> {
    try {
        return await apiFetch<RecurringInvoiceWithDetails | null>(
            `/api/recurring/${id}`,
            { allow404: true },
            "Failed to fetch recurring invoice",
        );
    } catch (error) {
        logger.error("Error fetching recurring invoice:", error);
        return null;
    }
}

export async function createRecurring(data: RecurringFormData): Promise<string> {
    try {
        const json = await apiPost<{ id: string }>(
            "/api/recurring",
            data,
            "Failed to create recurring invoice",
        );
        return json.id;
    } catch (error) {
        logger.error("Error creating recurring invoice:", error);
        throw error;
    }
}

export async function updateRecurring(
    id: string,
    updates: Partial<{ is_active: boolean; notes: string }>,
): Promise<void> {
    try {
        await apiPut(`/api/recurring/${id}`, updates, "Failed to update recurring invoice");
    } catch (error) {
        logger.error("Error updating recurring invoice:", error);
        throw error;
    }
}

export async function deleteRecurring(id: string): Promise<void> {
    try {
        await apiDelete(`/api/recurring/${id}`, "Failed to delete recurring invoice");
    } catch (error) {
        logger.error("Error deleting recurring invoice:", error);
        throw error;
    }
}

export async function generateNextInvoice(id: string): Promise<string> {
    try {
        const json = await apiPost<{ invoiceId: string }>(
            `/api/recurring/${id}/generate`,
            {},
            "Failed to generate invoice",
        );
        return json.invoiceId;
    } catch (error) {
        logger.error("Error generating invoice:", error);
        throw error;
    }
}

export async function toggleRecurringActive(id: string, isActive: boolean): Promise<void> {
    try {
        await apiPut(
            `/api/recurring/${id}`,
            { is_active: isActive },
            "Failed to toggle recurring invoice",
        );
    } catch (error) {
        logger.error("Error toggling recurring invoice:", error);
        throw error;
    }
}
