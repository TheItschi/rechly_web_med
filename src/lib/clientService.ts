import type { Client, ClientFormData } from "@/types";
import { apiDelete, apiFetch, apiGet, apiPost, apiPut } from "./apiClient";
import { logger } from "./logger";

/**
 * Client Service - CRUD operations via API routes
 * All Appwrite calls are proxied through server-side API routes
 * to work with SSR authentication
 */

/**
 * Get all clients for the current user.
 * Returns [] on 401 (logged-out) so pages can render empty state.
 */
export const getAllClients = async (): Promise<Client[]> => {
    try {
        return await apiGet<Client[]>("/api/clients", "Failed to fetch clients");
    } catch (error) {
        logger.error("Error fetching clients:", error);
        throw error;
    }
};

/**
 * Get client by ID
 */
export const getClientById = async (id: string): Promise<Client | null> => {
    try {
        return await apiFetch<Client | null>(
            `/api/clients/${id}`,
            { allow404: true },
            "Failed to fetch client",
        );
    } catch (error) {
        logger.error("Error fetching client:", error);
        return null;
    }
};

/**
 * Create new client
 */
export const createClient = async (data: ClientFormData): Promise<Client> => {
    try {
        return await apiPost<Client>("/api/clients", data, "Failed to create client");
    } catch (error) {
        logger.error("Error creating client:", error);
        throw error;
    }
};

/**
 * Update existing client
 */
export const updateClient = async (
    id: string,
    data: Partial<ClientFormData>,
): Promise<Client> => {
    try {
        return await apiPut<Client>(
            `/api/clients/${id}`,
            data,
            "Failed to update client",
        );
    } catch (error) {
        logger.error("Error updating client:", error);
        throw error;
    }
};

/**
 * Delete client
 */
export const deleteClient = async (id: string): Promise<void> => {
    try {
        await apiDelete(`/api/clients/${id}`, "Failed to delete client");
    } catch (error) {
        logger.error("Error deleting client:", error);
        throw error;
    }
};
