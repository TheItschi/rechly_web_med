import type { Databases } from "node-appwrite";

const database = "rechly-db";
const collection = "clients";
const attribute = "eInvoiceData";
/** Payloads are validated to 16,000 characters, but the attribute is created
 * much larger so Appwrite stores it off-row (TEXT) instead of as an inline
 * VARCHAR that can exceed MariaDB's row-size limit on wide collections. */
const minSize = 16000;
const createSize = 1000000;
type SchemaDatabase = Pick<Databases, "getAttribute" | "createStringAttribute">;

export class ClientMetadataUnavailableError extends Error {
    constructor() {
        super("Lieferadressen und E-Rechnungsdaten können derzeit nicht gespeichert werden. Ihre Eingaben bleiben erhalten. Bitte erneut versuchen; falls der Fehler bestehen bleibt, kontaktieren Sie den Support.");
    }
}

function missingMetadata(error: unknown): boolean {
    const e = error as { code?: number; message?: string } | null;
    return e?.code === 400 && typeof e.message === "string" && /Unknown attribute:\s*["']eInvoiceData["']/i.test(e.message);
}

function emptyMetadata(value: unknown): boolean {
    if (typeof value !== "string") return false;
    try {
        const data = JSON.parse(value);
        return data && typeof data === "object" && !Array.isArray(data) &&
            Object.entries(data).every(([key, entry]) => key === "delivery_locations" && Array.isArray(entry) && entry.length === 0);
    } catch { return false; }
}

async function repairMetadata(db: SchemaDatabase, pause: () => Promise<void>) {
    let metadata;
    try { metadata = await db.getAttribute(database, collection, attribute); }
    catch (error) {
        if ((error as { code?: number })?.code !== 404) throw error;
        try { await db.createStringAttribute(database, collection, attribute, createSize, false); }
        catch (createError) {
            // Another server may already be provisioning this same attribute.
            if ((createError as { code?: number })?.code !== 409) throw createError;
        }
    }
    for (let attempt = 0; attempt < 20; attempt++) {
        metadata ??= await db.getAttribute(database, collection, attribute);
        const field = metadata as { type?: string; size?: number; required?: boolean; array?: boolean; status?: string; format?: string };
        if (field.type !== "string" || (field.size ?? 0) < minSize || field.required || field.array || field.format || ["failed", "stuck", "deleting"].includes(field.status ?? "")) {
            throw new ClientMetadataUnavailableError();
        }
        if (field.status === "available") return;
        if (attempt < 19) await pause();
        metadata = undefined;
    }
    throw new ClientMetadataUnavailableError();
}

/** Called only after authentication (and ownership checks on edits).
 * Repair only this fixed, additive field after Appwrite rejects the write.
 * Never drop a supplied delivery address, change an existing field, or retry
 * timeouts/unknown outcomes that could create duplicate customers.
 */
export async function writeClientWithMetadata<T>(
    db: SchemaDatabase,
    data: Record<string, unknown>,
    write: (data: Record<string, unknown>) => Promise<T>,
    pause: () => Promise<void> = () => new Promise(resolve => setTimeout(resolve, 250)),
): Promise<T> {
    try { return await write(data); }
    catch (error) {
        if (!Object.hasOwn(data, attribute) || !missingMetadata(error)) throw error;
        if (emptyMetadata(data.eInvoiceData)) {
            const legacy = { ...data };
            delete legacy.eInvoiceData;
            return write(legacy);
        }
        try { await repairMetadata(db, pause); }
        catch { throw new ClientMetadataUnavailableError(); }
        try { return await write(data); }
        catch (retryError) {
            if (missingMetadata(retryError)) throw new ClientMetadataUnavailableError();
            throw retryError;
        }
    }
}
