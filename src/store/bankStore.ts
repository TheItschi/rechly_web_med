import { create } from "zustand";
import {
    getAllBankTransactions,
    matchTransaction,
    ignoreTransaction,
} from "@/lib/bankService";
import type { BankTransaction } from "@/types";
import { isCacheValid } from "./cache";

interface BankStore {
    transactions: BankTransaction[];
    loading: boolean;
    error: string | null;
    lastFetched: number | null;
    fetchTransactions: (force?: boolean) => Promise<void>;
    matchTx: (transactionId: string, invoiceId: string) => Promise<void>;
    ignoreTx: (transactionId: string) => Promise<void>;
    clearCache: () => void;
}

export const useBankStore = create<BankStore>((set, get) => ({
    transactions: [],
    loading: false,
    error: null,
    lastFetched: null,

    fetchTransactions: async (force = false) => {
        const { lastFetched, loading } = get();
        if (loading) return;
        if (isCacheValid(lastFetched, force)) return;

        set({ loading: true, error: null });
        try {
            const transactions = await getAllBankTransactions();
            set({ transactions, lastFetched: Date.now() });
        } catch (err) {
            set({
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to load transactions",
            });
        } finally {
            set({ loading: false });
        }
    },

    matchTx: async (transactionId, invoiceId) => {
        await matchTransaction(transactionId, invoiceId);
        set((state) => ({
            transactions: state.transactions.map((t) =>
                t.id === transactionId
                    ? {
                          ...t,
                          status: "matched" as const,
                          matched_invoice_id: invoiceId,
                      }
                    : t,
            ),
        }));
    },

    ignoreTx: async (transactionId) => {
        await ignoreTransaction(transactionId);
        set((state) => ({
            transactions: state.transactions.map((t) =>
                t.id === transactionId
                    ? { ...t, status: "ignored" as const }
                    : t,
            ),
        }));
    },

    clearCache: () => set({ lastFetched: null, transactions: [] }),
}));
