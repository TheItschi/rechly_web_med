import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { unzipSync } from "fflate";
import { decodeCatalogText, looksLikeIcd10Alphabet, parseIcd10Catalog, type Icd10Code } from "@/lib/icd10";

/** Location of the imported catalogue. */
export const icd10CatalogPath = (): string =>
    process.env.ICD10GM_FILE
        || path.join(process.env.RECHLY_DATA_DIR || path.join(process.cwd(), "data"), "icd10gm.json");

type Catalog = { codes: Icd10Code[]; version?: string; importedAt?: string; source?: string };
let cache: (Catalog & { path: string; mtime: number }) | null = null;

export async function loadIcd10Catalog(): Promise<Catalog | null> {
    const file = icd10CatalogPath();
    try {
        const { mtimeMs } = await stat(file);
        // Re-read after a new import without restarting the server.
        if (cache?.path === file && cache.mtime === mtimeMs) return cache;
        const parsed = JSON.parse(await readFile(file, "utf8")) as { version?: string; importedAt?: string; source?: string; codes: [string, string][] };
        cache = {
            path: file,
            mtime: mtimeMs,
            version: parsed.version,
            importedAt: parsed.importedAt,
            source: parsed.source,
            codes: parsed.codes.map(([code, title]) => ({ code, title })),
        };
        return cache;
    } catch {
        return null;
    }
}

export class Icd10ImportError extends Error {}

/**
 * Accepts the BfArM Systematik "…syst_kodes.txt" or the downloaded ZIP
 * containing it, and stores the parsed catalogue.
 */
export async function importIcd10Catalog(fileName: string, bytes: Uint8Array, versionOverride?: string): Promise<{ count: number; version?: string }> {
    let name = fileName;
    let data = bytes;
    if (/\.zip$/i.test(fileName) || (bytes[0] === 0x50 && bytes[1] === 0x4b)) {
        let files: Record<string, Uint8Array>;
        try {
            files = unzipSync(bytes, { filter: (f) => /\.txt$/i.test(f.name) });
        } catch {
            throw new Icd10ImportError("ZIP-Datei konnte nicht gelesen werden");
        }
        const entry = Object.keys(files).find((n) => /syst_kodes\.txt$/i.test(n));
        if (!entry) {
            const alpha = Object.keys(files).some((n) => /alpha/i.test(n));
            throw new Icd10ImportError(alpha
                ? "Das ist das Alphabetische Verzeichnis. Benötigt wird die Systematik (Datei …syst_kodes.txt)."
                : "Keine Datei …syst_kodes.txt im ZIP gefunden");
        }
        name = entry;
        data = files[entry];
    }
    const text = decodeCatalogText(data);
    if (looksLikeIcd10Alphabet(text)) {
        throw new Icd10ImportError("Das ist das Alphabetische Verzeichnis. Benötigt wird die Systematik (Datei …syst_kodes.txt).");
    }
    const codes = parseIcd10Catalog(text);
    if (codes.length < 100) throw new Icd10ImportError(`Nur ${codes.length} Kodes erkannt – ist das die Systematik-Datei …syst_kodes.txt?`);
    const year = versionOverride || path.basename(name).match(/icd10gm(\d{4})/i)?.[1];
    const version = year ? `ICD-10-GM ${year}` : undefined;
    const target = icd10CatalogPath();
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, JSON.stringify({
        version,
        importedAt: new Date().toISOString(),
        source: path.basename(name),
        codes: codes.map((c) => [c.code, c.title]),
    }));
    return { count: codes.length, version };
}
