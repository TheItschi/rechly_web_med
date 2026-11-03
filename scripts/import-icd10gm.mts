/**
 * Imports the BfArM ICD-10-GM Systematik into data/icd10gm.json.
 *
 *   1. Download "ICD-10-GM <Jahr> Systematik – EDV-Fassung TXT (CSV)" from
 *      https://www.bfarm.de (Kodiersysteme → ICD-10-GM → Downloads) and unzip.
 *   2. npm run import:icd10gm -- path/to/icd10gm2026syst_kodes.txt [Version]
 *
 * Writes to $ICD10GM_FILE or <RECHLY_DATA_DIR|./data>/icd10gm.json.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseIcd10Catalog } from "../src/lib/icd10/index.js";

const [input, versionArg] = process.argv.slice(2);
if (!input) {
    console.error("Usage: npm run import:icd10gm -- <icd10gmXXXXsyst_kodes.txt> [Version]");
    process.exit(1);
}
const buffer = await readFile(input);
let text = buffer.toString("utf8");
if (text.includes("�")) text = buffer.toString("latin1"); // older releases are ISO-8859-1
const codes = parseIcd10Catalog(text);
if (codes.length < 100) {
    console.error(`Only ${codes.length} codes recognised – is this the Systematik "kodes" file?`);
    process.exit(1);
}
const version = versionArg || path.basename(input).match(/icd10gm(\d{4})/i)?.[1] || undefined;
const target = process.env.ICD10GM_FILE
    || path.join(process.env.RECHLY_DATA_DIR || path.join(process.cwd(), "data"), "icd10gm.json");
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, JSON.stringify({ version: version ? `ICD-10-GM ${version}` : undefined, codes: codes.map((c) => [c.code, c.title]) }));
console.log(`${codes.length} ICD-10-GM codes written to ${target}`);
