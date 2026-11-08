import { createHash, randomUUID } from "node:crypto";
import { Query, Permission, Role, type Databases, type Models } from "node-appwrite";
import { allDocuments } from "../server/pagination";
import { WORKSPACE_COLLECTION, WorkspaceError } from "./repository";

export const DB = "rechly-db";
export type WorkspaceRow = Models.Document & { userId: string; kind: string; payload: string };
export const recordId = (user: string, key: string) => createHash("sha256").update(JSON.stringify([user, key])).digest("hex").slice(0, 36);
export const missing = (error: unknown) => (error as { code?: number }).code === 404;

/** Private records: writes always pass through server validation. */
export class WorkspaceStore {
    constructor(public db: Databases, public userId: string, public transactionId?: string) {}
    async rows() {
        const rows = await allDocuments(q => this.db.listDocuments<WorkspaceRow>(DB, WORKSPACE_COLLECTION, q, this.transactionId), [Query.equal("userId", this.userId)]);
        if (rows.some(row => row.userId !== this.userId)) throw new Error("Ownership mismatch");
        return rows;
    }
    async own(collection: string, id: string) {
        const doc = await this.db.getDocument(DB, collection, id, [], this.transactionId);
        if (doc.userId !== this.userId) throw new WorkspaceError("Datensatz nicht gefunden.", 404);
        return doc;
    }
    async list(collection: string) {
        const rows = await allDocuments(q => this.db.listDocuments(DB, collection, q, this.transactionId), [Query.equal("userId", this.userId)]);
        if (rows.some(row => row.userId !== this.userId)) throw new Error("Ownership mismatch");
        return rows;
    }
    async find<T>(kind: string, id: string): Promise<T | undefined> {
        try {
            const row = await this.own(WORKSPACE_COLLECTION, id);
            if (row.kind !== kind) throw new WorkspaceError("Datensatz nicht gefunden.", 404);
            return JSON.parse(row.payload) as T;
        } catch (error) { if (missing(error) || (error instanceof WorkspaceError && error.status === 404)) return undefined; throw error; }
    }
    async put<T extends { id: string }>(kind: string, record: T, exists: boolean) {
        const fields = { userId: this.userId, kind, payload: JSON.stringify(record) };
        if (exists) await this.db.updateDocument(DB, WORKSPACE_COLLECTION, record.id, fields, undefined, this.transactionId);
        else await this.db.createDocument(DB, WORKSPACE_COLLECTION, record.id, fields, [Permission.read(Role.user(this.userId))], this.transactionId);
    }
    async remove(id: string) { await this.db.deleteDocument(DB, WORKSPACE_COLLECTION, id, this.transactionId); }
}

/** No process-local locks: Appwrite commits entries and invoices together or rejects the conflict. */
export async function atomic<T>(db: Databases, userId: string, action: (store: WorkspaceStore) => Promise<T>): Promise<T> {
    let transactionId: string;
    try { transactionId = (await db.createTransaction(60)).$id; }
    catch { throw new WorkspaceError("Diese Aktion benötigt Appwrite-Transaktionen. Bitte die Serverkonfiguration prüfen.", 503); }
    try {
        const result = await action(new WorkspaceStore(db, userId, transactionId));
        await db.updateTransaction(transactionId, true);
        return result;
    } catch (error) {
        try { await db.updateTransaction(transactionId, false, true); } catch { /* A failed/expired transaction cannot commit further writes. */ }
        if ((error as { code?: number }).code === 409) throw new WorkspaceError("Die Daten wurden gleichzeitig geändert. Bitte neu laden und erneut versuchen.", 409);
        throw error;
    }
}
export const newId = randomUUID;
export function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new WorkspaceError("Ungültige Anfrage.");
    return value as Record<string, unknown>;
}
export function text(value: unknown, max: number, required = false): string {
    if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new WorkspaceError("Bitte Text und Pflichtfelder prüfen.");
    return value.trim();
}
export function date(value: unknown): string {
    const result = text(value, 10, true);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) throw new WorkspaceError("Ungültiges Datum.");
    return result;
}
export function amount(value: unknown, max = 100000): number {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) throw new WorkspaceError("Ungültiger Betrag.");
    return Math.round((value + Number.EPSILON) * 100) / 100;
}
