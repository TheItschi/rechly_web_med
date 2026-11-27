import { create } from "zustand";
import {
    getAllExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
} from "@/lib/expenseService";
import type { Expense, ExpenseFormData } from "@/types";

/** Sequence number of list requests; only the latest result is applied. */
let fetchSeq = 0;

interface ExpenseStore {
    expenses: Expense[];
    loading: boolean;
    error: string | null;
    lastFetched: number | null;
    fetchExpenses: (force?: boolean) => Promise<void>;
    addExpense: (data: ExpenseFormData) => Promise<string>;
    editExpense: (id: string, data: Partial<ExpenseFormData>) => Promise<void>;
    removeExpense: (id: string) => Promise<void>;
    clearCache: () => void;
}

export const useExpenseStore = create<ExpenseStore>((set, get) => ({
    expenses: [],
    loading: false,
    error: null,
    lastFetched: null,

    fetchExpenses: async (force = false) => {
        const { lastFetched, loading } = get();
        if (loading) return;
        // Stale-while-revalidate: data already loaded stays visible and is
        // refreshed in the background (current state after navigating back).
        const silent = !force && lastFetched !== null;
        const request = ++fetchSeq;
        set(silent ? { error: null } : { loading: true, error: null });
        try {
            const expenses = await getAllExpenses();
            if (request !== fetchSeq) return; // a newer request is running
            set({ expenses, lastFetched: Date.now() });
        } catch (err) {
            set({
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to load expenses",
            });
        } finally {
            set({ loading: false });
        }
    },

    addExpense: async (data) => {
        const id = await createExpense(data);
        set({ lastFetched: null });
        return id;
    },

    editExpense: async (id, data) => {
        await updateExpense(id, data);
        set((state) => ({
            expenses: state.expenses.map((e) =>
                e.id === id ? ({ ...e, ...data } as Expense) : e,
            ),
        }));
    },

    removeExpense: async (id) => {
        await deleteExpense(id);
        set((state) => ({
            expenses: state.expenses.filter((e) => e.id !== id),
        }));
    },

    clearCache: () => set({ lastFetched: null, expenses: [] }),
}));
