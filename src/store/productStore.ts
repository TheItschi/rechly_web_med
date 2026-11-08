import { create } from "zustand";
import {
    getAllProducts,
    getProductById as apiGetProduct,
    createProduct as apiCreateProduct,
    updateProduct as apiUpdateProduct,
    deleteProduct as apiDeleteProduct,
} from "@/lib/productService";
import { isCacheValid } from "./cache";
import type { Product, ProductFormData } from "@/types";

interface ProductStore {
    products: Product[];
    loading: boolean;
    error: string | null;
    lastFetched: number | null;

    // Actions
    fetchProducts: (force?: boolean) => Promise<void>;
    getProduct: (id: string) => Promise<Product | null>;
    addProduct: (data: ProductFormData) => Promise<Product>;
    editProduct: (
        id: string,
        data: Partial<ProductFormData>
    ) => Promise<Product>;
    removeProduct: (id: string) => Promise<void>;
    clearCache: () => void;
}

export const useProductStore = create<ProductStore>((set, get) => ({
    products: [],
    loading: false,
    error: null,
    lastFetched: null,

    fetchProducts: async (force = false) => {
        const { lastFetched, loading } = get();

        // Skip if already loading
        if (loading) return;

        // Skip if cache is still valid (unless forced)
        if (isCacheValid(lastFetched, force)) {
            return;
        }

        set({ loading: true, error: null });
        try {
            const products = await getAllProducts();
            set({ products, loading: false, lastFetched: Date.now() });
        } catch (error) {
            set({
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch products",
                loading: false,
            });
        }
    },

    getProduct: async (id: string) => {
        const { products } = get();
        // Try to find in cache first
        const cached = products.find((p) => p.id === id);
        if (cached) return cached;

        // Fetch from API if not in cache
        return await apiGetProduct(id);
    },

    addProduct: async (data: ProductFormData) => {
        const newProduct = await apiCreateProduct(data);
        set((state) => ({
            products: [...state.products, newProduct],
        }));
        return newProduct;
    },

    editProduct: async (id: string, data: Partial<ProductFormData>) => {
        const updatedProduct = await apiUpdateProduct(id, data);
        set((state) => ({
            products: state.products.map((p) =>
                p.id === id ? updatedProduct : p,
            ),
        }));
        return updatedProduct;
    },

    removeProduct: async (id: string) => {
        await apiDeleteProduct(id);
        set((state) => ({
            products: state.products.filter((p) => p.id !== id),
        }));
    },

    clearCache: () => {
        set({ products: [], lastFetched: null });
    },
}));
