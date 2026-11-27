import { create } from "zustand";
import {
    getAllBankTransactions,
    matchTransaction,
    ignoreTransaction,
} from "@/lib/bankService";
import type { BankTransaction } from "@/types";

/** Sequence number of list requests; only the latest result is applied. */
let fetchSeq = 0;

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
        // Stale-while-revalidate: data already loaded stays visible and is
        // refreshed in the background (current state after navigating back).
        const silent = !force && lastFetched !== null;
        const request = ++fetchSeq;
        set(silent ? { error: null } : { loading: true, error: null });
        try {
            const transactions = await getAllBankTransactions();
            if (request !== fetchSeq) return; // a newer request is running
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
