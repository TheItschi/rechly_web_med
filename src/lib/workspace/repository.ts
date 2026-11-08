import { Permission, Query, Role, type Databases, type Models } from "node-appwrite";
import { allDocuments } from "../server/pagination";
import { collection, emptyBusiness, saveBusinessRecord, deleteBusinessRecord, type BusinessData, type BusinessCollection } from "./domain";

export const WORKSPACE_COLLECTION = "workspace_records";
const database = "rechly-db";
type Row = Models.Document & { userId: string; kind: BusinessCollection; payload: string };
export class WorkspaceError extends Error {
    constructor(message: string, public status = 400) { super(message); }
}

/** Guest expiry must remove optional workspace data before deleting its identity. */
export async function eraseGuestWorkspace(databases: Databases, userId: string) {
    let rows: Row[];
    try {
        rows = await allDocuments(q => databases.listDocuments<Row>(database, WORKSPACE_COLLECTION, q), [Query.equal("userId", userId)]);
    } catch (error) {
        if (["collection_not_found", "table_not_found"].includes((error as { type?: string }).type || "")) return 0;
        throw error;
    }
    for (const row of rows) {
        if (row.userId !== userId) throw new Error("Workspace ownership mismatch");
        await databases.deleteDocument(database, WORKSPACE_COLLECTION, row.$id);
    }
    return rows.length;
}

/** Admin queries always include the authenticated owner; IDs in JSON cannot grant access. */
export async function readWorkspace(databases: Databases, userId: string): Promise<BusinessData> {
    const rows = await allDocuments(q => databases.listDocuments<Row>(database, WORKSPACE_COLLECTION, q), [Query.equal("userId", userId)]);
    const data = emptyBusiness();
    for (const row of rows) {
        if (row.userId !== userId) throw new Error("Workspace ownership mismatch");
        const key = collection(row.kind);
        const record = JSON.parse(row.payload);
        if (record.id !== row.$id) throw new Error("Workspace record mismatch");
        // Each collection is discriminated by kind in storage, not supplied by a browser.
        (data[key] as Array<BusinessData[BusinessCollection][number]>).push(record);
    }
    for (const key of ["projects", "tasks", "documents"] as const) data[key].sort((a,b) => b.updated_at - a.updated_at);
    return data;
}

export async function workspaceClients(databases: Databases, userId: string) {
    const rows = await allDocuments(q => databases.listDocuments(database, "clients", q), [Query.equal("userId", userId)]);
    return rows.filter(row => row.userId === userId).map(row => ({ id: row.$id, name: String(row.name || "") }));
}

export async function mutateWorkspace(databases: Databases, userId: string, input: unknown) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new WorkspaceError("Ungültige Anfrage.");
    const body = input as Record<string, unknown>;
    let key: BusinessCollection;
    try { key = collection(body.collection); } catch { throw new WorkspaceError("Unbekannter Arbeitsbereich."); }
    if (body.action !== "save" && body.action !== "delete") throw new WorkspaceError("Unbekannte Aktion.");
    const data = await readWorkspace(databases, userId);
    if (body.action === "delete") {
        // Projects are archived, not deleted: concurrent task saves must not create dangling links.
        if (key === "projects") throw new WorkspaceError("Bitte schließen Sie das Projekt über den Status ab.");
        try { deleteBusinessRecord(data, key, body.id); } catch { throw new WorkspaceError("Datensatz nicht gefunden.", 404); }
        await databases.deleteDocument(database, WORKSPACE_COLLECTION, body.id as string);
        return;
    }
    const clients = await workspaceClients(databases, userId);
    let next: BusinessData;
    try { next = saveBusinessRecord(data, key, body.record, clients.map(c => c.id)); }
    catch (error) { throw new WorkspaceError(error instanceof Error ? error.message : "Ungültiger Datensatz."); }
    const record = next[key][0];
    const fields = { userId, kind: key, payload: JSON.stringify(record) };
    if (data[key].some(row => row.id === record.id)) {
        await databases.updateDocument(database, WORKSPACE_COLLECTION, record.id, fields);
    } else {
        // Direct client writes are disabled; all validation happens in this service.
        await databases.createDocument(database, WORKSPACE_COLLECTION, record.id, fields, [Permission.read(Role.user(userId))]);
    }
    return record;
}
