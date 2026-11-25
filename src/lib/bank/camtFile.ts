/**
 * Reads an uploaded CAMT export: a single .xml file or a .zip holding one XML
 * per account/day (banks deliver ZIPs for longer periods). Input is bounded
 * in file count and (decompressed) size before anything is inflated.
 */
import { unzipSync } from "fflate";

/** Upper bounds, shared with the import API. */
export const CAMT_LIMITS = {
    /** XML documents per import */
    maxFiles: 100,
    /** Size of the uploaded file */
    maxUploadBytes: 10 * 1024 * 1024,
    /** Sum of all XML documents after decompression */
    maxTotalBytes: 25 * 1024 * 1024,
} as const;

export class CamtFileError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CamtFileError";
    }
}

/** Text of an XML document in the encoding its declaration names (default UTF-8). */
export function decodeXml(bytes: Uint8Array): string {
    const head = new TextDecoder("latin1").decode(bytes.subarray(0, 200));
    const declared = /<\?xml[^>]*encoding\s*=\s*["']([\w.-]+)["']/i
        .exec(head)?.[1]
        ?.toLowerCase();
    let decoder: TextDecoder;
    try {
        decoder = new TextDecoder(declared || "utf-8");
    } catch {
        decoder = new TextDecoder("utf-8");
    }
    return decoder.decode(bytes).replace(/^\uFEFF/, "");
}

const isZip = (bytes: Uint8Array) =>
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04;

/** XML documents of an uploaded .xml or .zip, in file-name order. */
export function extractCamtDocuments(bytes: Uint8Array): string[] {
    if (bytes.length > CAMT_LIMITS.maxUploadBytes) {
        throw new CamtFileError("The file is too large.");
    }
    if (!isZip(bytes)) return [decodeXml(bytes)];

    let files = 0;
    let declaredTotal = 0;
    let entries: Record<string, Uint8Array>;
    try {
        entries = unzipSync(bytes, {
            // Checked against the ZIP directory before anything is inflated.
            filter: (file) => {
                if (
                    !/\.xml$/i.test(file.name) ||
                    file.name.startsWith("__MACOSX/")
                )
                    return false;
                files++;
                declaredTotal += file.originalSize;
                if (files > CAMT_LIMITS.maxFiles)
                    throw new CamtFileError(
                        `The ZIP contains more than ${CAMT_LIMITS.maxFiles} XML files.`,
                    );
                if (declaredTotal > CAMT_LIMITS.maxTotalBytes)
                    throw new CamtFileError("The ZIP content is too large.");
                return true;
            },
        });
    } catch (error) {
        if (error instanceof CamtFileError) throw error;
        throw new CamtFileError("The ZIP file could not be read.");
    }
    const names = Object.keys(entries).sort();
    // The directory sizes could be forged: verify what was actually inflated.
    const actualTotal = names.reduce(
        (sum, name) => sum + entries[name].length,
        0,
    );
    if (actualTotal > CAMT_LIMITS.maxTotalBytes)
        throw new CamtFileError("The ZIP content is too large.");
    if (!names.length) throw new CamtFileError("The ZIP contains no XML file.");
    return names.map((name) => decodeXml(entries[name]));
}
