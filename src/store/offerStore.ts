import { create } from "zustand";
import {
    getAllOffers,
    createOffer,
    updateOfferStatus,
    deleteOffer,
} from "@/lib/offerService";
import type { OfferWithClient, OfferFormData, OfferStatus } from "@/types";
import { isCacheValid } from "./cache";

interface OfferStore {
    offers: OfferWithClient[];
    loading: boolean;
    error: string | null;
    lastFetched: number | null;
    fetchOffers: (force?: boolean) => Promise<void>;
    addOffer: (data: OfferFormData) => Promise<string>;
    updateStatus: (id: string, status: OfferStatus) => Promise<void>;
    removeOffer: (id: string) => Promise<void>;
    clearCache: () => void;
}

export const useOfferStore = create<OfferStore>((set, get) => ({
    offers: [],
    loading: false,
    error: null,
    lastFetched: null,

    fetchOffers: async (force = false) => {
        const { lastFetched, loading } = get();
        if (loading) return;
        if (isCacheValid(lastFetched, force)) return;

        set({ loading: true, error: null });
        try {
            const offers = await getAllOffers();
            set({ offers, lastFetched: Date.now() });
        } catch (err) {
            set({
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to load offers",
            });
        } finally {
            set({ loading: false });
        }
    },

    addOffer: async (data) => {
        const id = await createOffer(data);
        set({ lastFetched: null });
        return id;
    },

    updateStatus: async (id, status) => {
        await updateOfferStatus(id, status);
        set((state) => ({
            offers: state.offers.map((o) =>
                o.id === id ? { ...o, status } : o,
            ),
        }));
    },

    removeOffer: async (id) => {
        await deleteOffer(id);
        set((state) => ({ offers: state.offers.filter((o) => o.id !== id) }));
    },

    clearCache: () => set({ lastFetched: null, offers: [] }),
}));
