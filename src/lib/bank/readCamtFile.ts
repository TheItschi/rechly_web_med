import { unzipSync } from "fflate";

/** Text of an XML file in the encoding its declaration names (default UTF-8). */
export function decodeXml(bytes: Uint8Array): string {
    const head = new TextDecoder("ascii").decode(bytes.slice(0, 200));
    const declared = /encoding\s*=\s*["']([\w.-]+)["']/i.exec(head)?.[1]?.toLowerCase();
    try {
        return new TextDecoder(declared || "utf-8").decode(bytes);
    } catch {
        return new TextDecoder("utf-8").decode(bytes);
    }
}

/**
 * CAMT export as uploaded: a single .xml or a .zip with one XML per
 * account/day (Sparkasse and others deliver ZIPs for longer periods).
 */
export async function readCamtFile(file: File): Promise<string[]> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK"
    if (!isZip) return [decodeXml(bytes)];
    const entries = unzipSync(bytes, { filter: (f) => /\.xml$/i.test(f.name) && !f.name.startsWith("__MACOSX/") });
    return Object.keys(entries)
        .sort()
        .map((name) => decodeXml(entries[name]));
}
