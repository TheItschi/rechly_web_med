import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Query, Permission, Role, type Databases, type Models } from "node-appwrite";
import { allDocuments } from "../server/pagination";

export const DB = "rechly-db";
export const T = {
    SETTINGS: "termine_settings",
    SLUGS: "termine_slugs",
    SERVICES: "termine_services",
    STAFF: "termine_staff",
    HOURS: "termine_hours",
    BLOCKS: "termine_blocks",
    APPOINTMENTS: "termine_appointments",
    RESERVATIONS: "termine_reservations",
    CUSTOMERS: "termine_customers",
    TOKENS: "termine_tokens",
    OUTBOX: "termine_outbox",
    AUDIT: "termine_audit",
} as const;

export class TermineError extends Error {
    constructor(message: string, public status = 400) {
        super(message);
    }
}

export const missing = (error: unknown) => (error as { code?: number }).code === 404;
export const conflict = (error: unknown) => (error as { code?: number }).code === 409;
export const newId = randomUUID;
export const recordId = (user: string, key: string) =>
    createHash("sha256").update(JSON.stringify([user, key])).digest("hex").slice(0, 36);

/** Deterministic slot-lock id: same business+staff+start can only be reserved once. */
export const reservationId = (businessUserId: string, staffId: string, startUtc: string) =>
    recordId(businessUserId, `slot:${staffId}:${startUtc}`);

export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("hex");

export type Row = Models.Document & { userId: string };

/** Tenant-scoped store; pass a transactionId to join an atomic booking. */
export class TermineStore {
    constructor(
        public db: Databases,
        public userId: string,
        public transactionId?: string,
    ) {}

    perms() {
        return [
            Permission.read(Role.user(this.userId)),
            Permission.update(Role.user(this.userId)),
            Permission.delete(Role.user(this.userId)),
        ];
    }

    async own<T extends Row>(collection: string, id: string): Promise<T> {
        let doc: T;
        try {
            doc = await this.db.getDocument(DB, collection, id, [], this.transactionId);
        } catch (error) {
            if (missing(error)) throw new TermineError("Datensatz nicht gefunden.", 404);
            throw error;
        }
        if (doc.userId !== this.userId) throw new TermineError("Datensatz nicht gefunden.", 404);
        return doc;
    }

    async list<T extends Row>(collection: string, queries: string[] = []): Promise<T[]> {
        const rows = await allDocuments(
            (q) => this.db.listDocuments<T>(DB, collection, q, this.transactionId),
            [Query.equal("userId", this.userId), ...queries],
        );
        if (rows.some((r) => r.userId !== this.userId)) throw new Error("Ownership mismatch");
        return rows;
    }
}

/** No process-local locks: Appwrite commits the booking set or rejects the conflict. */
export async function atomic<T>(
    db: Databases,
    userId: string,
    action: (store: TermineStore) => Promise<T>,
): Promise<T> {
    let transactionId: string;
    try {
        transactionId = (await db.createTransaction(60)).$id;
    } catch {
        throw new TermineError(
            "Diese Aktion benötigt Appwrite-Transaktionen. Bitte die Serverkonfiguration prüfen.",
            503,
        );
    }
    try {
        const result = await action(new TermineStore(db, userId, transactionId));
        await db.updateTransaction(transactionId, true);
        return result;
    } catch (error) {
        try {
            await db.updateTransaction(transactionId, false, true);
        } catch {
            /* A failed/expired transaction cannot commit further writes. */
        }
        if (conflict(error))
            throw new TermineError(
                "Dieser Zeitraum wurde gerade belegt. Bitte einen anderen Zeitpunkt wählen.",
                409,
            );
        throw error;
    }
}
