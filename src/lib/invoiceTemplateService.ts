import { apiDelete, apiGet, apiPost } from "./apiClient";
import { logger } from "./logger";

export interface InvoiceTemplateItem {
    description: string;
    quantity: number;
    unitOfMeasure: string;
    price: number;
    taxRatePercent: number;
    discount: number;
    serviceDateStart?: string;
    serviceDateEnd?: string;
    productId?: string;
}

export interface InvoiceTemplate {
    id: string;
    name: string;
    payload: {
        clientId?: string;
        notes?: string;
        paymentTerms?: string;
        deliveryDateStart?: string;
        deliveryDateEnd?: string;
        items: InvoiceTemplateItem[];
    };
    createdAt: number;
}

export const getAllInvoiceTemplates = async (): Promise<InvoiceTemplate[]> => {
    try {
        const res = await apiGet<{ templates: InvoiceTemplate[] }>("/api/invoice-templates", "Failed to load templates");
        return res.templates;
    } catch (error) {
        logger.error("Error fetching invoice templates:", error);
        throw error;
    }
};

export interface InvoiceTemplateDraft {
    name: string;
    payload: InvoiceTemplate["payload"];
}

export const createInvoiceTemplate = async (draft: InvoiceTemplateDraft): Promise<InvoiceTemplate> => {
    try {
        const res = await apiPost<{ template: InvoiceTemplate }>("/api/invoice-templates", draft, "Failed to save template");
        return res.template;
    } catch (error) {
        logger.error("Error saving invoice template:", error);
        throw error;
    }
};

export const deleteInvoiceTemplate = async (id: string): Promise<void> => {
    try {
        await apiDelete(`/api/invoice-templates/${id}`, "Failed to delete template");
    } catch (error) {
        logger.error("Error deleting invoice template:", error);
        throw error;
    }
};
