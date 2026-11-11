import { create } from "zustand";
import {
    getAllInvoices,
    getInvoiceById,
    createInvoice as apiCreateInvoice,
    updateInvoiceStatus as apiUpdateStatus,
    deleteInvoice as apiDeleteInvoice,
    getInvoiceStats as apiGetStats,
} from "@/lib/invoiceService";
import { isCacheValid } from "./cache";
import { logger } from "@/lib/logger";
import type {
    InvoiceStatus,
    InvoiceWithClient,
    InvoiceWithDetails,
    InvoiceFormData,
} from "@/types";

// Invoice stats type (re-exported for backwards compat)
export interface InvoiceStats {
    total: number;
    draft: number;
    sent: number;
    paid: number;
    cancelled: number;
    paidAmount: number;
    unpaidAmount: number;
}

interface InvoiceStore {
    invoices: InvoiceWithClient[];
    stats: InvoiceStats | null;
    loading: boolean;
    error: string | null;
    lastFetched: number | null;

    // Actions
    fetchInvoices: (force?: boolean) => Promise<void>;
    fetchStats: (force?: boolean) => Promise<void>;
    getInvoice: (id: string) => Promise<InvoiceWithDetails | null>;
    addInvoice: (data: InvoiceFormData) => Promise<string>;
    updateStatus: (id: string, status: InvoiceStatus) => Promise<void>;
    removeInvoice: (id: string) => Promise<void>;
    clearCache: () => void;
}

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
    invoices: [],
    stats: null,
    loading: false,
    error: null,
    lastFetched: null,

    fetchInvoices: async (force = false) => {
        const { lastFetched, loading } = get();

        // Skip if already loading
        if (loading) return;

        // Skip if cache is still valid (unless forced)
        if (isCacheValid(lastFetched, force)) {
            return;
        }

        set({ loading: true, error: null });
        try {
            const invoices = await getAllInvoices();
            set({ invoices, loading: false, lastFetched: Date.now() });
        } catch (error) {
            set({
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch invoices",
                loading: false,
            });
        }
    },

    fetchStats: async (force = false) => {
        const { stats, lastFetched } = get();

        // Skip if cache is still valid (unless forced)
        if (!force && stats && isCacheValid(lastFetched)) {
            return;
        }

        try {
            const newStats = await apiGetStats();
            set({ stats: newStats });
        } catch (error) {
            logger.error("Failed to fetch invoice stats:", error);
        }
    },

    getInvoice: async (id: string) => {
        // Always fetch fresh details since it includes items
        return await getInvoiceById(id);
    },

    addInvoice: async (data: InvoiceFormData) => {
        const created = await apiCreateInvoice(data);
        // Invalidate cache to refetch with new invoice
        set({ lastFetched: null, stats: null });
        return created.id;
    },

    updateStatus: async (id: string, status: InvoiceStatus) => {
        await apiUpdateStatus(id, status);
        set((state) => ({
            invoices: state.invoices.map((inv) =>
                inv.id === id
                    ? {
                          ...inv,
                          status,
                      }
                    : inv,
            ),
            stats: null, // Invalidate stats cache
        }));
    },

    removeInvoice: async (id: string) => {
        await apiDeleteInvoice(id);
        set((state) => ({
            invoices: state.invoices.filter((inv) => inv.id !== id),
            stats: null, // Invalidate stats cache
        }));
    },

    clearCache: () => {
        set({ invoices: [], stats: null, lastFetched: null });
    },
}));
