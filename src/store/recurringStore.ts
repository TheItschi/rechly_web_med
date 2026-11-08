import { create } from "zustand";
import {
    getAllRecurring,
    createRecurring,
    updateRecurring,
    deleteRecurring,
} from "@/lib/recurringService";
import type { RecurringInvoiceWithDetails, RecurringFormData } from "@/types";
import { isCacheValid } from "./cache";

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
        if (isCacheValid(lastFetched, force)) return;

        set({ loading: true, error: null });
        try {
            const templates = await getAllRecurring();
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
