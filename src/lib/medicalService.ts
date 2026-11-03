import { setGoaeCustomCatalog, type GoaeCatalogEntry, type GoaeCatalogMode } from "@/lib/goae/catalog";
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

export interface GoaeCatalogInfo {
    custom: { mode: GoaeCatalogMode; importedAt: string; source?: string; count: number; entries: GoaeCatalogEntry[] } | null;
    effectiveCount: number;
}

export const getGoaeCatalogInfo = async (): Promise<GoaeCatalogInfo> => {
    const res = await fetch("/api/goae/catalog");
    if (!res.ok) throw new Error("GOÄ-Katalog konnte nicht geladen werden");
    return res.json();
};

/** Loads an uploaded GOÄ catalogue into the client-side Prüfmodul. */
export const activateGoaeCatalog = async (): Promise<GoaeCatalogInfo> => {
    const info = await getGoaeCatalogInfo();
    setGoaeCustomCatalog(info.custom ? { mode: info.custom.mode, entries: info.custom.entries } : null);
    return info;
};

export interface Icd10Status {
    available: boolean;
    version?: string;
    count?: number;
    importedAt?: string;
    source?: string;
}

export const getIcd10Status = async (): Promise<Icd10Status> => {
    const res = await fetch("/api/icd10/import");
    if (!res.ok) throw new Error("ICD-10-Status konnte nicht geladen werden");
    return res.json();
};
