import { create } from "zustand";
import type {
    InvoiceWithClient,
    InvoiceWithDetails,
    InvoiceFormData,
} from "@/types";

// Invoice stats type
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
    updateStatus: (id: string, status: string) => Promise<void>;
    removeInvoice: (id: string) => Promise<void>;
    clearCache: () => void;
}

/** Sequence number of list requests; only the latest result is applied. */
let fetchSeq = 0;

// API helper functions that use server-side routes
const apiGetInvoices = async (): Promise<InvoiceWithClient[]> => {
    const res = await fetch("/api/invoices");
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch invoices");
    }
    return res.json();
};

const apiGetInvoice = async (
    id: string
): Promise<InvoiceWithDetails | null> => {
    const res = await fetch(`/api/invoices/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch invoice");
    }
    return res.json();
};

const apiCreateInvoice = async (data: InvoiceFormData): Promise<string> => {
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
    return result.id;
};

const apiUpdateInvoiceStatus = async (
    id: string,
    status: string
): Promise<void> => {
    const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update invoice");
    }
};

const apiDeleteInvoice = async (id: string): Promise<void> => {
    const res = await fetch(`/api/invoices/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete invoice");
    }
};

const apiGetInvoiceStats = async (): Promise<InvoiceStats> => {
    const res = await fetch("/api/invoices/stats");
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch invoice stats");
    }
    return res.json();
};

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

        // Stale-while-revalidate: data already loaded stays visible and is
        // refreshed in the background, so returning to a list (e.g. after
        // creating an invoice) shows the current state without a reload.
        const silent = !force && lastFetched !== null;
        const request = ++fetchSeq;
        set(silent ? { error: null } : { loading: true, error: null });
        try {
            const invoices = await apiGetInvoices();
            if (request !== fetchSeq) return; // a newer request is running
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
        // Always refreshed; cached stats stay visible meanwhile.
        void force;

        try {
            const newStats = await apiGetInvoiceStats();
            set({ stats: newStats });
        } catch (error) {
            console.error("Failed to fetch invoice stats:", error);
        }
    },

    getInvoice: async (id: string) => {
        // Always fetch fresh details since it includes items
        return await apiGetInvoice(id);
    },

    addInvoice: async (data: InvoiceFormData) => {
        const invoiceId = await apiCreateInvoice(data);
        // Invalidate cache to refetch with new invoice
        set({ lastFetched: null, stats: null });
        return invoiceId;
    },

    updateStatus: async (id: string, status: string) => {
        await apiUpdateInvoiceStatus(id, status);
        set((state) => ({
            invoices: state.invoices.map((inv) =>
                inv.id === id
                    ? {
                          ...inv,
                          status: status as
                              | "draft"
                              | "sent"
                              | "paid"
                              | "cancelled",
                      }
                    : inv
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
