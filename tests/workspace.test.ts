import test from "node:test";
import assert from "node:assert/strict";
import type { Databases } from "node-appwrite";
import { eraseGuestWorkspace, mutateWorkspace, readWorkspace, WorkspaceError } from "../src/lib/workspace/repository";
import { workspaceDocumentPdf } from "../src/lib/workspace/pdf";

function backend() {
    const records: Record<string, Array<{ $id: string; [key: string]: unknown }>> = { workspace_records: [], clients: [{ $id: "alice-client", userId: "alice", name: "Alice's customer" }, { $id: "bob-client", userId: "bob", name: "Bob's customer" }] };
    const writes: string[] = [];
    const db = {
        async listDocuments(_db: string, collection: string, queries: string[]) {
            const filters = queries.map(q => JSON.parse(q));
            let rows = [...records[collection]].sort((a,b) => a.$id.localeCompare(b.$id));
            for (const query of filters) {
                if (query.method === "equal") rows = rows.filter(row => query.values.includes(row[query.attribute]));
                if (query.method === "cursorAfter") rows = rows.filter(row => row.$id.localeCompare(query.values[0]) > 0);
            }
            return { documents: rows.slice(0, filters.find(q => q.method === "limit")?.values[0] || 25) };
        },
        async createDocument(_db: string, collection: string, id: string, fields: object, permissions: string[]) { records[collection].push({ $id: id, ...fields, $permissions: permissions }); writes.push(id); },
        async updateDocument(_db: string, collection: string, id: string, fields: object) { Object.assign(records[collection].find(row => row.$id === id)!, fields); writes.push(id); },
        async deleteDocument(_db: string, collection: string, id: string) { records[collection] = records[collection].filter(row => row.$id !== id); writes.push(id); },
    } as unknown as Databases;
    return { db, records, writes };
}
const project = { name: "Website", description: "", client_id: "alice-client", status: "active", budget: 500, due_date: "2026-12-31" };
const task = { title: "Review", project_id: "", assignee: "", status: "todo", priority: "high", due_date: "" };
const save = (collection: string, record: object) => ({ action: "save", collection, record });

test("workspace links projects/tasks/documents, updates, archives and deletes without changing unrelated records", async () => {
    const { db, records } = backend();
    const p = await mutateWorkspace(db, "alice", save("projects", project));
    const t = await mutateWorkspace(db, "alice", save("tasks", { ...task, project_id: p!.id }));
    const d = await mutateWorkspace(db, "alice", save("documents", { title: "Minutes", kind: "minutes", recipient: "", body: "Decisions", project_id: p!.id }));
    await mutateWorkspace(db, "alice", save("tasks", { ...t, status: "done" }));
    await mutateWorkspace(db, "alice", save("projects", { ...p, status: "done" }));
    assert.equal((await readWorkspace(db, "alice")).tasks[0].status, "done");
    await assert.rejects(mutateWorkspace(db, "alice", { action: "delete", collection: "projects", id: p!.id }), /Status/);
    await mutateWorkspace(db, "alice", { action: "delete", collection: "documents", id: d!.id });
    const data = await readWorkspace(db, "alice");
    assert.equal(data.documents.length, 0);
    assert.equal(data.tasks.length, 1);
    assert.equal(data.projects[0].status, "done");
    assert.deepEqual(records.workspace_records[0].$permissions, ['read("user:alice")']);
});

test("tenant IDs and foreign references cannot read, update or delete another user's records", async () => {
    const { db, writes } = backend();
    const p = await mutateWorkspace(db, "alice", save("projects", project));
    const t = await mutateWorkspace(db, "alice", save("tasks", task));
    assert.deepEqual(await readWorkspace(db, "bob"), { projects: [], documents: [], tasks: [] });
    const before = writes.length;
    await assert.rejects(mutateWorkspace(db, "bob", save("projects", { ...p, client_id: "bob-client" })), WorkspaceError);
    await assert.rejects(mutateWorkspace(db, "bob", save("projects", project)), WorkspaceError);
    await assert.rejects(mutateWorkspace(db, "bob", save("tasks", { ...task, project_id: p!.id })), WorkspaceError);
    await assert.rejects(mutateWorkspace(db, "bob", { action: "delete", collection: "tasks", id: t!.id }), WorkspaceError);
    assert.equal(writes.length, before);
});

test("rejects invalid dates, types, oversized content and non-finite budgets before writing", async () => {
    const { db, writes } = backend();
    for (const bad of [{ ...project, budget: Infinity }, { ...project, budget: -1 }, { ...project, due_date: "2026-02-31" }, { ...project, name: " " }]) {
        await assert.rejects(mutateWorkspace(db, "alice", save("projects", bad)), WorkspaceError);
    }
    await assert.rejects(mutateWorkspace(db, "alice", save("documents", { title: "Note", kind: "html", body: "", recipient: "", project_id: "" })), WorkspaceError);
    await assert.rejects(mutateWorkspace(db, "alice", save("documents", { title: "Note", kind: "note", body: "a".repeat(100001), recipient: "", project_id: "" })), WorkspaceError);
    assert.equal(writes.length, 0);
});

test("reads beyond Appwrite's first page without mixing tenants", async () => {
    const { db, records } = backend();
    for (let index = 0; index < 260; index++) {
        const id = String(index).padStart(4, "0");
        records.workspace_records.push({ $id: id, userId: "alice", kind: "tasks", payload: JSON.stringify({ ...task, id, updated_at: index }) });
    }
    assert.equal((await readWorkspace(db, "alice")).tasks.length, 260);
    assert.equal((await readWorkspace(db, "bob")).tasks.length, 0);
    records.workspace_records.push({ $id: "foreign", userId: "bob", kind: "tasks", payload: JSON.stringify({ ...task, id: "foreign", updated_at: 0 }) });
    assert.equal(await eraseGuestWorkspace(db, "alice"), 260);
    assert.equal(records.workspace_records.length, 1);
    assert.equal(records.workspace_records[0].userId, "bob");
});

test("guest cleanup tolerates an unprovisioned workspace but propagates backend failures", async () => {
    const { db } = backend();
    db.listDocuments = async () => { throw Object.assign(new Error("missing"), { type: "collection_not_found" }); };
    assert.equal(await eraseGuestWorkspace(db, "alice"), 0);
    db.listDocuments = async () => { throw new Error("network error"); };
    await assert.rejects(eraseGuestWorkspace(db, "alice"), /network error/);
});

test("document export embeds a font and paginates Unicode text without interpreting markup", async () => {
    const bytes = await workspaceDocumentPdf({ id: "document", title: "Grüße & Protokoll", kind: "note", recipient: "Müller", project_id: "", updated_at: Date.now(), body: '<script>alert("x")</script>\n'.repeat(250) });
    assert.equal(bytes.subarray(0, 4).toString(), "%PDF");
    assert.ok(bytes.length > 5000);
    assert.ok((bytes.toString("latin1").match(/\/Type \/Page\b/g) || []).length > 1);
});
