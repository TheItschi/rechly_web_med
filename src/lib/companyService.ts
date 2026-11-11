import type { UserCompany } from "@/types";
import { apiGet, apiPost } from "./apiClient";
import { logger } from "./logger";

/**
 * Company Service - CRUD operations via API routes
 * All Appwrite calls are proxied through server-side API routes
 * to work with SSR authentication
 */

/**
 * Get company info for current user
 */
export const getCompanyInfo = async (options: { throwOnError?: boolean } = {}): Promise<UserCompany | null> => {
    try {
        return await apiGet<UserCompany | null>("/api/company", "Failed to fetch company info");
    } catch (error) {
        logger.error("Error fetching company info:", error);
        if (options.throwOnError) throw error;
        return null;
    }
};

/**
 * Save company info (upsert - create or update)
 */
export const saveCompanyInfo = async (
    data: Omit<UserCompany, "id" | "created_at" | "updated_at">,
): Promise<UserCompany> => {
    try {
        return await apiPost<UserCompany>("/api/company", data, "Failed to save company info");
    } catch (error) {
        logger.error("Error saving company info:", error);
        throw error;
    }
};
