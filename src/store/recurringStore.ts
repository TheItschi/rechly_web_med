import { create } from "zustand";
import {
    getAllRecurring,
    createRecurring,
    updateRecurring,
    deleteRecurring,
} from "@/lib/recurringService";
import type { RecurringInvoiceWithDetails, RecurringFormData } from "@/types";

/** Sequence number of list requests; only the latest result is applied. */
let fetchSeq = 0;

interface RecurringStore {
    templates: RecurringInvoiceWithDetails[];
    loading: boolean;
    error: string | null;
    lastFetched: number | null;
    fetchTemplates: (force?: boolean) => Promise<void>;
    addTemplate: (data: RecurringFormData) => Promise<string>;
    toggleActive: (id: string, isActive: boolean) => Promise<void>;
    removeTemplate: (id: string) => Promise<void>;
    clearCache: () => void;
}

export const useRecurringStore = create<RecurringStore>((set, get) => ({
    templates: [],
    loading: false,
    error: null,
    lastFetched: null,

    fetchTemplates: async (force = false) => {
        const { lastFetched, loading } = get();
        if (loading) return;
        // Stale-while-revalidate: data already loaded stays visible and is
        // refreshed in the background (current state after navigating back).
        const silent = !force && lastFetched !== null;
        const request = ++fetchSeq;
        set(silent ? { error: null } : { loading: true, error: null });
        try {
            const templates = await getAllRecurring();
            if (request !== fetchSeq) return; // a newer request is running
            set({ templates, lastFetched: Date.now() });
        } catch (err) {
            set({
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to load templates",
            });
        } finally {
            set({ loading: false });
        }
    },

    addTemplate: async (data) => {
        const id = await createRecurring(data);
        set({ lastFetched: null });
        return id;
    },

    toggleActive: async (id, isActive) => {
        await updateRecurring(id, { is_active: isActive });
        set((state) => ({
            templates: state.templates.map((t) =>
                t.id === id ? { ...t, is_active: isActive } : t,
            ),
        }));
    },

    removeTemplate: async (id) => {
        await deleteRecurring(id);
        set((state) => ({
            templates: state.templates.filter((t) => t.id !== id),
        }));
    },

    clearCache: () => set({ lastFetched: null, templates: [] }),
}));
