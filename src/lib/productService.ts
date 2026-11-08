import type { Product, ProductFormData, ProductBulkUploadResult } from "@/types";
import { apiDelete, apiFetch, apiGet, apiPost, apiPut } from "./apiClient";
import { logger } from "./logger";

/**
 * Product Service - CRUD operations via API routes
 * All Appwrite calls are proxied through server-side API routes
 * to work with SSR authentication
 */

/**
 * Get all products for the current user
 */
export const getAllProducts = async (): Promise<Product[]> => {
    try {
        return await apiGet<Product[]>("/api/products", "Failed to fetch products");
    } catch (error) {
        logger.error("Error fetching products:", error);
        throw error;
    }
};

/**
 * Get product by ID
 */
export const getProductById = async (id: string): Promise<Product | null> => {
    try {
        return await apiFetch<Product | null>(
            `/api/products/${id}`,
            { allow404: true },
            "Failed to fetch product",
        );
    } catch (error) {
        logger.error("Error fetching product:", error);
        return null;
    }
};

/**
 * Create new product
 */
export const createProduct = async (data: ProductFormData): Promise<Product> => {
    try {
        return await apiPost<Product>("/api/products", data, "Failed to create product");
    } catch (error) {
        logger.error("Error creating product:", error);
        throw error;
    }
};

/**
 * Update existing product
 */
export const updateProduct = async (
    id: string,
    data: Partial<ProductFormData>,
): Promise<Product> => {
    try {
        return await apiPut<Product>(
            `/api/products/${id}`,
            data,
            "Failed to update product",
        );
    } catch (error) {
        logger.error("Error updating product:", error);
        throw error;
    }
};

/**
 * Delete product
 */
export const deleteProduct = async (id: string): Promise<void> => {
    try {
        await apiDelete(`/api/products/${id}`, "Failed to delete product");
    } catch (error) {
        logger.error("Error deleting product:", error);
        throw error;
    }
};

export const bulkUploadProducts = async (file: File): Promise<ProductBulkUploadResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/products/bulk-upload", {
        method: "POST",
        body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || "Bulk upload failed");
    }
    return data;
};
