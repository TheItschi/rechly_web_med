import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { setGoaeCustomCatalog, type GoaeCatalogEntry, type GoaeCatalogMode } from "@/lib/goae/catalog";

export interface StoredGoaeCatalog {
    mode: GoaeCatalogMode;
    entries: GoaeCatalogEntry[];
    importedAt: string;
    source?: string;
}

export const goaeCatalogPath = (): string =>
    process.env.GOAE_CATALOG_FILE
        || path.join(process.env.RECHLY_DATA_DIR || path.join(process.cwd(), "data"), "goae-katalog.json");

let cache: { mtime: number; catalog: StoredGoaeCatalog } | null = null;

/** Loads the uploaded catalogue (if any) and activates it for this process. */
export async function loadGoaeCatalog(): Promise<StoredGoaeCatalog | null> {
    try {
        const { mtimeMs } = await stat(goaeCatalogPath());
        if (cache?.mtime !== mtimeMs) {
            cache = { mtime: mtimeMs, catalog: JSON.parse(await readFile(goaeCatalogPath(), "utf8")) };
            setGoaeCustomCatalog(cache.catalog);
        }
        return cache.catalog;
    } catch {
        if (cache) setGoaeCustomCatalog(null);
        cache = null;
        return null;
    }
}

export async function saveGoaeCatalog(catalog: StoredGoaeCatalog): Promise<void> {
    await mkdir(path.dirname(goaeCatalogPath()), { recursive: true });
    await writeFile(goaeCatalogPath(), JSON.stringify(catalog));
    await loadGoaeCatalog();
}

export async function resetGoaeCatalog(): Promise<void> {
    await rm(goaeCatalogPath(), { force: true });
    await loadGoaeCatalog();
}
