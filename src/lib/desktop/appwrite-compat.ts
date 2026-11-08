import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

type StoredRow = {
    id: string;
    data: string;
    created_at: string;
    updated_at: string;
};

type ParsedQuery = {
    method: string;
    attribute?: string;
    values?: unknown[];
};

type DesktopDocument = Record<string, unknown> & {
    $id: string;
    $collectionId: string;
    $databaseId: string;
    $createdAt: string;
    $updatedAt: string;
    $permissions: string[];
};

const DESKTOP_USER_ID = "desktop-local-user";

function resolveDataDirectory(): string {
    const configured = process.env.RECHLY_DATA_DIR;
    return path.resolve(configured || path.join(process.cwd(), ".desktop-data"));
}

function parseQuery(query: string): ParsedQuery | null {
    try {
        return JSON.parse(query) as ParsedQuery;
    } catch {
        return null;
    }
}

function compareValues(left: unknown, right: unknown): number {
    if (typeof left === "number" && typeof right === "number") {
        return left - right;
    }
    return String(left ?? "").localeCompare(String(right ?? ""));
}

function documentValue(document: DesktopDocument, attribute?: string): unknown {
    if (!attribute) return undefined;
    return document[attribute];
}

class DesktopDatabases {
    private readonly database: DatabaseSync;
    private readonly transactions = new Map<string, { expires: number; base: Map<string, StoredRow>; rows: Map<string, StoredRow>; changed: Set<string> }>();

    private transaction(id: string) {
        const tx = this.transactions.get(id);
        if (!tx || tx.expires < Date.now()) { this.transactions.delete(id); throw Object.assign(new Error("Transaction expired"), { code: 409 }); }
        return tx;
    }
    async createTransaction(ttl = 60) {
        for (const [id, tx] of this.transactions) if (tx.expires < Date.now()) this.transactions.delete(id);
        const rows = this.database.prepare("SELECT collection_id, document_id AS id, data, created_at, updated_at FROM documents").all() as (StoredRow & { collection_id: string })[];
        const base = new Map(rows.map(row => [row.collection_id + "\0" + row.id, row]));
        const id = randomUUID();
        this.transactions.set(id, { expires: Date.now() + ttl * 1000, base, rows: new Map(base), changed: new Set() });
        return { $id: id };
    }
    async updateTransaction(id: string, commit = false, rollback = false) {
        if (rollback) { this.transactions.delete(id); return {}; }
        const tx = this.transaction(id);
        if (!commit) return { $id: id };
        this.database.exec("BEGIN IMMEDIATE");
        try {
            for (const key of tx.changed) {
                const [collection, document] = key.split("\0");
                const current = this.database.prepare("SELECT document_id AS id, data, created_at, updated_at FROM documents WHERE collection_id = ? AND document_id = ?").get(collection, document) as StoredRow | undefined;
                const before = tx.base.get(key);
                if (!!current !== !!before || (current && before && (current.data !== before.data || current.updated_at !== before.updated_at))) throw Object.assign(new Error("Transaction conflict"), { code: 409 });
            }
            for (const key of tx.changed) {
                const [collection, document] = key.split("\0"), row = tx.rows.get(key);
                if (row) this.database.prepare("INSERT INTO documents (collection_id, document_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(collection_id,document_id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at").run(collection, document, row.data, row.created_at, row.updated_at);
                else this.database.prepare("DELETE FROM documents WHERE collection_id = ? AND document_id = ?").run(collection, document);
            }
            this.database.exec("COMMIT");
        } catch (error) { this.database.exec("ROLLBACK"); throw error; }
        finally { this.transactions.delete(id); }
        return { $id: id };
    }

    constructor(dataDirectory: string) {
        this.database = new DatabaseSync(path.join(dataDirectory, "rechly.sqlite"));
        this.database.exec("PRAGMA journal_mode = WAL");
        this.database.exec("PRAGMA foreign_keys = ON");
        this.database.exec(`
            CREATE TABLE IF NOT EXISTS documents (
                collection_id TEXT NOT NULL,
                document_id TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (collection_id, document_id)
            )
        `);
        this.database.exec(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        `);
    }

    private toDocument(
        databaseId: string,
        collectionId: string,
        row: StoredRow,
    ): DesktopDocument {
        return {
            ...(JSON.parse(row.data) as Record<string, unknown>),
            $id: row.id,
            $collectionId: collectionId,
            $databaseId: databaseId,
            $createdAt: row.created_at,
            $updatedAt: row.updated_at,
            $permissions: [],
        };
    }

    async listDocuments(
        databaseId: string,
        collectionId: string,
        queries: string[] = [],
        transactionId?: string,
    ) {
        const rows = transactionId ? [...this.transaction(transactionId).rows].filter(([key]) => key.startsWith(collectionId + "\0")).map(([, row]) => row) : this.database
            .prepare(
                `SELECT document_id AS id, data, created_at, updated_at
                 FROM documents WHERE collection_id = ?`,
            )
            .all(collectionId) as StoredRow[];

        const parsedQueries = queries
            .map(parseQuery)
            .filter((query): query is ParsedQuery => query !== null);
        let documents = rows.map((row) =>
            this.toDocument(databaseId, collectionId, row),
        );

        for (const query of parsedQueries) {
            const target = query.values?.[0];
            if (query.method === "equal") {
                documents = documents.filter((document) =>
                    (query.values || []).some(
                        (value) =>
                            documentValue(document, query.attribute) === value,
                    ),
                );
            } else if (query.method === "greaterThanEqual") {
                documents = documents.filter(
                    (document) =>
                        compareValues(
                            documentValue(document, query.attribute),
                            target,
                        ) >= 0,
                );
            } else if (query.method === "lessThanEqual") {
                documents = documents.filter(
                    (document) =>
                        compareValues(
                            documentValue(document, query.attribute),
                            target,
                        ) <= 0,
                );
            } else if (query.method === "greaterThan") {
                documents = documents.filter(
                    (document) =>
                        compareValues(
                            documentValue(document, query.attribute),
                            target,
                        ) > 0,
                );
            } else if (query.method === "lessThan") {
                documents = documents.filter(
                    (document) =>
                        compareValues(
                            documentValue(document, query.attribute),
                            target,
                        ) < 0,
                );
            } else if (query.method === "startsWith") {
                documents = documents.filter((document) =>
                    String(documentValue(document, query.attribute) ?? "").startsWith(
                        String(target ?? ""),
                    ),
                );
            }
        }

        const order = parsedQueries.find(
            (query) =>
                query.method === "orderAsc" || query.method === "orderDesc",
        );
        if (order) {
            const direction = order.method === "orderDesc" ? -1 : 1;
            documents.sort(
                (left, right) =>
                    compareValues(
                        documentValue(left, order.attribute),
                        documentValue(right, order.attribute),
                    ) * direction,
            );
        }

        const total = documents.length;
        const cursor = parsedQueries.find(query => query.method === "cursorAfter")?.values?.[0];
        if (typeof cursor === "string") {
            const position = documents.findIndex(document => document.$id === cursor);
            if (position < 0) throw new Error("Unknown document cursor");
            documents = documents.slice(position + 1);
        }
        const limit = parsedQueries.find((query) => query.method === "limit")
            ?.values?.[0];
        if (typeof limit === "number") documents = documents.slice(0, limit);

        return { total, documents };
    }

    async getDocument(
        databaseId: string,
        collectionId: string,
        documentId: string,
        _queries: string[] = [],
        transactionId?: string,
    ) {
        const row = transactionId ? this.transaction(transactionId).rows.get(collectionId + "\0" + documentId) : this.database
            .prepare(
                `SELECT document_id AS id, data, created_at, updated_at
                 FROM documents
                 WHERE collection_id = ? AND document_id = ?`,
            )
            .get(collectionId, documentId) as StoredRow | undefined;

        if (!row) {
            throw Object.assign(new Error("Document not found"), {
                code: 404,
                type: "document_not_found",
            });
        }
        return this.toDocument(databaseId, collectionId, row);
    }

    async createDocument(
        databaseId: string,
        collectionId: string,
        requestedId: string,
        data: Record<string, unknown>,
        _permissions: string[] = [],
        transactionId?: string,
    ) {
        const documentId =
            requestedId === "unique()" ? randomUUID() : requestedId;
        const now = new Date().toISOString();

        if (transactionId) {
            const tx = this.transaction(transactionId), key = collectionId + "\0" + documentId;
            if (tx.rows.has(key)) throw Object.assign(new Error("Document already exists"), { code: 409 });
            tx.rows.set(key, { id: documentId, data: JSON.stringify(data), created_at: now, updated_at: now }); tx.changed.add(key);
            return this.getDocument(databaseId, collectionId, documentId, [], transactionId);
        }

        try {
            this.database
                .prepare(
                    `INSERT INTO documents
                     (collection_id, document_id, data, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?)`,
                )
                .run(collectionId, documentId, JSON.stringify(data), now, now);
        } catch (error) {
            if (
                error instanceof Error &&
                error.message.includes("UNIQUE constraint failed")
            ) {
                throw Object.assign(new Error("Document already exists"), {
                    code: 409,
                    type: "document_already_exists",
                });
            }
            throw error;
        }

        return this.getDocument(databaseId, collectionId, documentId);
    }

    async updateDocument(
        databaseId: string,
        collectionId: string,
        documentId: string,
        updates: Record<string, unknown>,
        _permissions?: string[],
        transactionId?: string,
    ) {
        const existing = await this.getDocument(
            databaseId,
            collectionId,
            documentId,
            [], transactionId,
        );
        const data = { ...existing, ...updates } as Record<string, unknown>;
        for (const key of Object.keys(data)) {
            if (key.startsWith("$")) delete data[key];
        }
        const updatedAt = new Date(Math.max(Date.now(), Date.parse(existing.$updatedAt) + 1)).toISOString();

        if (transactionId) {
            const tx = this.transaction(transactionId), key = collectionId + "\0" + documentId;
            tx.rows.set(key, { id: documentId, data: JSON.stringify(data), created_at: existing.$createdAt, updated_at: updatedAt }); tx.changed.add(key);
            return this.getDocument(databaseId, collectionId, documentId, [], transactionId);
        }

        this.database
            .prepare(
                `UPDATE documents SET data = ?, updated_at = ?
                 WHERE collection_id = ? AND document_id = ?`,
            )
            .run(JSON.stringify(data), updatedAt, collectionId, documentId);

        return this.getDocument(databaseId, collectionId, documentId);
    }

    async deleteDocument(
        _databaseId: string,
        collectionId: string,
        documentId: string,
        transactionId?: string,
    ) {
        if (transactionId) { const tx = this.transaction(transactionId), key = collectionId + "\0" + documentId; tx.rows.delete(key); tx.changed.add(key); return {}; }
        this.database
            .prepare(
                "DELETE FROM documents WHERE collection_id = ? AND document_id = ?",
            )
            .run(collectionId, documentId);
        return {};
    }

    getSetting(key: string): string | undefined {
        const row = this.database
            .prepare("SELECT value FROM settings WHERE key = ?")
            .get(key) as { value: string } | undefined;
        return row?.value;
    }

    setSetting(key: string, value: string) {
        this.database
            .prepare(
                `INSERT INTO settings (key, value) VALUES (?, ?)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
            )
            .run(key, value);
    }

    async createCollection() {
        return {};
    }
    async createStringAttribute() {
        return {};
    }
    async createIntegerAttribute() {
        return {};
    }
    async createFloatAttribute() {
        return {};
    }
    async createBooleanAttribute() {
        return {};
    }
    async createEnumAttribute() {
        return {};
    }
    async createIndex() {
        return {};
    }
}

class DesktopAccount {
    constructor(private readonly databases: DesktopDatabases) {}

    private user() {
        const prefs = JSON.parse(this.databases.getSetting("user.prefs") || "{}");
        return {
            $id: DESKTOP_USER_ID,
            $createdAt: "2026-01-01T00:00:00.000Z",
            $updatedAt: new Date().toISOString(),
            name: "Desktop User",
            registration: "2026-01-01T00:00:00.000Z",
            status: true,
            labels: [],
            passwordUpdate: "",
            email: "local@rechly.desktop",
            phone: "",
            emailVerification: true,
            phoneVerification: false,
            mfa: false,
            prefs,
            targets: [],
            accessedAt: new Date().toISOString(),
        };
    }

    async get() {
        return this.user();
    }

    async updatePrefs(prefs: Record<string, unknown>) {
        this.databases.setSetting("user.prefs", JSON.stringify(prefs));
        return this.user();
    }

    async create() {
        return this.user();
    }

    private session() {
        return {
            $id: "desktop-session",
            userId: DESKTOP_USER_ID,
            secret: "desktop-local-session",
            expire: "2999-12-31T23:59:59.000Z",
        };
    }

    async createEmailPasswordSession() {
        return this.session();
    }
    async createAnonymousSession() {
        return this.session();
    }
    async createSession() {
        return this.session();
    }
    async createJWT() {
        return { jwt: "desktop-local-jwt" };
    }
    async deleteSession() {
        return {};
    }
    async deleteSessions() {
        return {};
    }
    async updateStatus() {
        return this.user();
    }
    async createOAuth2Token() {
        throw new Error("OAuth is unavailable in offline desktop mode");
    }
}

class DesktopStorage {
    private readonly receiptsDirectory: string;

    constructor(dataDirectory: string) {
        this.receiptsDirectory = path.join(dataDirectory, "receipts");
    }

    async createFile(
        _bucketId: string,
        fileId: string,
        file: File,
        _permissions: string[] = [],
    ) {
        await mkdir(this.receiptsDirectory, { recursive: true });
        const destination = path.join(this.receiptsDirectory, fileId);
        await writeFile(destination, Buffer.from(await file.arrayBuffer()));
        return { $id: fileId, name: file.name, sizeOriginal: file.size };
    }

    getFileView(_bucketId: string, fileId: string) {
        return pathToFileURL(path.join(this.receiptsDirectory, fileId));
    }

    async deleteFile(_bucketId: string, fileId: string) {
        await rm(path.join(this.receiptsDirectory, fileId), { force: true });
        return {};
    }

    async createBucket() {
        await mkdir(this.receiptsDirectory, { recursive: true });
        return {};
    }
}

type DesktopClients = {
    account: DesktopAccount;
    databases: DesktopDatabases;
    storage: DesktopStorage;
};

declare global {
    var rechlyDesktopClients: DesktopClients | undefined;
}

export function isDesktopServer(): boolean {
    return process.env.RECHLY_DESKTOP === "1";
}

export function getDesktopClients(): DesktopClients {
    if (globalThis.rechlyDesktopClients) return globalThis.rechlyDesktopClients;

    const dataDirectory = resolveDataDirectory();
    mkdirSync(dataDirectory, { recursive: true });
    const databases = new DesktopDatabases(dataDirectory);
    globalThis.rechlyDesktopClients = {
        databases,
        account: new DesktopAccount(databases),
        storage: new DesktopStorage(dataDirectory),
    };
    return globalThis.rechlyDesktopClients;
}
