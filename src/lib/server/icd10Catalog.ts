import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { Icd10Code } from "@/lib/icd10";

/** Location of the imported catalogue (see scripts/import-icd10gm.ts). */
export const icd10CatalogPath = (): string =>
    process.env.ICD10GM_FILE
        || path.join(process.env.RECHLY_DATA_DIR || path.join(process.cwd(), "data"), "icd10gm.json");

let cache: { path: string; mtime: number; codes: Icd10Code[]; version?: string } | null = null;

export async function loadIcd10Catalog(): Promise<{ codes: Icd10Code[]; version?: string } | null> {
    const file = icd10CatalogPath();
    try {
        const { mtimeMs } = await stat(file);
        // Re-read after a new import without restarting the server.
        if (cache?.path === file && cache.mtime === mtimeMs) return cache;
        const parsed = JSON.parse(await readFile(file, "utf8")) as { version?: string; codes: [string, string][] };
        cache = { path: file, mtime: mtimeMs, version: parsed.version, codes: parsed.codes.map(([code, title]) => ({ code, title })) };
        return cache;
    } catch {
        return null;
    }
}
