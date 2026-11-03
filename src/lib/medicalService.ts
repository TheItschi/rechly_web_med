import type { GoaeHistoryEntry } from "@/lib/goae/check";
import type { Icd10Code } from "@/lib/icd10";

export const getGoaeHistory = async (clientId: string, excludeInvoiceId?: string): Promise<GoaeHistoryEntry[]> => {
    const params = new URLSearchParams({ client_id: clientId });
    if (excludeInvoiceId) params.set("exclude", excludeInvoiceId);
    const res = await fetch(`/api/goae/history?${params}`);
    if (!res.ok) throw new Error("GOÄ-Historie konnte nicht geladen werden");
    return res.json();
};

export interface Icd10SearchResult {
    available: boolean;
    version?: string;
    results: Icd10Code[];
}

export const searchIcd10Codes = async (query: string, signal?: AbortSignal): Promise<Icd10SearchResult> => {
    const res = await fetch(`/api/icd10/search?q=${encodeURIComponent(query)}`, { signal });
    if (!res.ok) throw new Error("ICD-10-GM-Suche fehlgeschlagen");
    return res.json();
};
