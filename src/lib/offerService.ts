import type {
    OfferFormData,
    OfferWithClient,
    OfferWithDetails,
    OfferStatus,
} from "@/types";
import { apiDelete, apiFetch, apiGet, apiPost, apiPut } from "./apiClient";
import { logger } from "./logger";

export async function getAllOffers(): Promise<OfferWithClient[]> {
    try {
        return await apiGet<OfferWithClient[]>("/api/offers", "Failed to fetch offers");
    } catch (error) {
        logger.error("Error fetching offers:", error);
        throw error;
    }
}

export async function getOfferById(id: string): Promise<OfferWithDetails | null> {
    try {
        return await apiFetch<OfferWithDetails | null>(
            `/api/offers/${id}`,
            { allow404: true },
            "Failed to fetch offer",
        );
    } catch (error) {
        logger.error("Error fetching offer:", error);
        return null;
    }
}

export async function createOffer(data: OfferFormData): Promise<string> {
    try {
        const json = await apiPost<{ id: string }>(
            "/api/offers",
            data,
            "Failed to create offer",
        );
        return json.id;
    } catch (error) {
        logger.error("Error creating offer:", error);
        throw error;
    }
}

export async function updateOfferStatus(id: string, status: OfferStatus): Promise<void> {
    try {
        await apiPut(`/api/offers/${id}`, { status }, "Failed to update offer status");
    } catch (error) {
        logger.error("Error updating offer status:", error);
        throw error;
    }
}

export async function deleteOffer(id: string): Promise<void> {
    try {
        await apiDelete(`/api/offers/${id}`, "Failed to delete offer");
    } catch (error) {
        logger.error("Error deleting offer:", error);
        throw error;
    }
}

export async function convertOfferToInvoice(id: string): Promise<string> {
    try {
        const json = await apiPost<{ invoiceId: string }>(
            `/api/offers/${id}/convert`,
            {},
            "Failed to convert offer to invoice",
        );
        return json.invoiceId;
    } catch (error) {
        logger.error("Error converting offer to invoice:", error);
        throw error;
    }
}
