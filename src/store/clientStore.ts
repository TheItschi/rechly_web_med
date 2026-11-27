import { create } from "zustand";
import type { Client, ClientFormData } from "@/types";

interface ClientStore {
    clients: Client[];
    loading: boolean;
    error: string | null;
    lastFetched: number | null;

    // Actions
    fetchClients: (force?: boolean) => Promise<void>;
    getClient: (id: string) => Promise<Client | null>;
    addClient: (data: ClientFormData) => Promise<Client>;
    editClient: (id: string, data: Partial<ClientFormData>) => Promise<Client>;
    removeClient: (id: string) => Promise<void>;
    clearCache: () => void;
}

/** Sequence number of list requests; only the latest result is applied. */
let fetchSeq = 0;

// API helper functions that use server-side routes
const apiGetClients = async (): Promise<Client[]> => {
    const res = await fetch("/api/clients");
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch clients");
    }
    return res.json();
};

const apiGetClient = async (id: string): Promise<Client | null> => {
    const res = await fetch(`/api/clients/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch client");
    }
    return res.json();
};

const apiCreateClient = async (data: ClientFormData): Promise<Client> => {
    const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create client");
    }
    return res.json();
};

const apiUpdateClient = async (
    id: string,
    data: Partial<ClientFormData>
): Promise<Client> => {
    const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update client");
    }
    return res.json();
};

const apiDeleteClient = async (id: string): Promise<void> => {
    const res = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete client");
    }
};

export const useClientStore = create<ClientStore>((set, get) => ({
    clients: [],
    loading: false,
    error: null,
    lastFetched: null,

    fetchClients: async (force = false) => {
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
            const clients = await apiGetClients();
            if (request !== fetchSeq) return; // a newer request is running
            set({ clients, loading: false, lastFetched: Date.now() });
        } catch (error) {
            set({
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch clients",
                loading: false,
            });
        }
    },

    getClient: async (id: string) => {
        const { clients } = get();
        // Try to find in cache first
        const cached = clients.find((c) => c.id === id);
        if (cached) return cached;

        // Fetch from API if not in cache
        return await apiGetClient(id);
    },

    addClient: async (data: ClientFormData) => {
        const newClient = await apiCreateClient(data);
        set((state) => ({
            clients: [...state.clients, newClient],
        }));
        return newClient;
    },

    editClient: async (id: string, data: Partial<ClientFormData>) => {
        const updatedClient = await apiUpdateClient(id, data);
        set((state) => ({
            clients: state.clients.map((c) =>
                c.id === id ? updatedClient : c
            ),
        }));
        return updatedClient;
    },

    removeClient: async (id: string) => {
        await apiDeleteClient(id);
        set((state) => ({
            clients: state.clients.filter((c) => c.id !== id),
        }));
    },

    clearCache: () => {
        set({ clients: [], lastFetched: null });
    },
}));
