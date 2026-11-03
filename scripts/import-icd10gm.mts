/**
 * CLI alternative to Einstellungen → ICD-10 Codes.
 *   npm run import:icd10gm -- <icd10gm2026syst_kodes.txt | ZIP> [Jahr]
 * Writes to $ICD10GM_FILE or <RECHLY_DATA_DIR|./data>/icd10gm.json.
 */
import { readFile } from "node:fs/promises";
import { importIcd10Catalog, icd10CatalogPath } from "../src/lib/server/icd10Catalog.js";

const [input, year] = process.argv.slice(2);
if (!input) {
    console.error("Usage: npm run import:icd10gm -- <icd10gmXXXXsyst_kodes.txt|zip> [Jahr]");
    process.exit(1);
}
try {
    const { count, version } = await importIcd10Catalog(input, new Uint8Array(await readFile(input)), year);
    console.log(`${count} Kodes${version ? ` (${version})` : ""} → ${icd10CatalogPath()}`);
} catch (error) {
    console.error((error as Error).message);
    process.exit(1);
}
