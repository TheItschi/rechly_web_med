"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Empty, Form, Input, InputNumber, Modal, Popconfirm, Progress, Row, Select, Segmented, Space, Spin, Tabs, Tag, Typography } from "antd";
import { PlusOutlined, DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useLanguage } from "@/contexts/LanguageContext";
import type { BusinessCollection, BusinessData, BusinessDocument, BusinessTask } from "@/lib/workspace/domain";
import { WorkspaceLinks } from "@/components/workspace/common";
import TaskBoard from "@/components/workspace/TaskBoard";

type RecordData = BusinessData[BusinessCollection][number];
type Snapshot = { data: BusinessData; clients: { id: string; name: string }[] };
const initial: BusinessData = { projects: [], tasks: [], documents: [] };
const statuses = { projects: ["active", "paused", "done"], tasks: ["todo", "doing", "done"], documents: ["letter", "minutes", "note"] };

function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = name; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Workspace() {
    const { language } = useLanguage();
    const l = (de: string, en: string) => language === "de" ? de : en;
    const [snapshot, setSnapshot] = useState<Snapshot>({ data: initial, clients: [] });
    const [key, setKey] = useState<BusinessCollection>("projects");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [board, setBoard] = useState(true);
    const [loading, setLoading] = useState(true);
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [editorError, setEditorError] = useState("");
    const [editing, setEditing] = useState<{ id?: string } | null>(null);
    const [dirty, setDirty] = useState(false);
    const [form] = Form.useForm();
    const [modal, holder] = Modal.useModal();
    const { data, clients } = snapshot;
    const labels: Record<string, string> = {
        projects: l("Projekte", "Projects"), tasks: l("Aufgaben", "Tasks"), documents: l("Dokumente", "Documents"),
        active: l("Aktiv", "Active"), paused: l("Pausiert", "Paused"), done: l("Erledigt", "Done"),
        todo: l("Offen", "To do"), doing: l("In Arbeit", "In progress"),
        letter: l("Brief", "Letter"), minutes: l("Protokoll", "Minutes"), note: l("Notiz", "Note"),
    };
    const required = [{ required: true, whitespace: true, message: l("Bitte ausfüllen.", "Please fill in this field.") }];

    async function load() {
        setLoading(true);
        try {
            const response = await fetch("/api/workspace", { cache: "no-store" });
            if (!response.ok) throw new Error(l("Arbeitsbereich nicht verfügbar. Bitte erneut versuchen oder neu anmelden.", "Workspace unavailable. Please retry or sign in again."));
            setSnapshot(await response.json()); setReady(true); setError("");
        } catch (error) { setError((error as Error).message); }
        finally { setLoading(false); }
    }
    useEffect(() => {
        const tab = new URLSearchParams(window.location.search).get("tab");
        if (tab === "tasks" || tab === "documents" || tab === "projects") setKey(tab);
        void load(); /* Fetch once; language switches retain the editor. */
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        if (!dirty) return;
        const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
        window.addEventListener("beforeunload", prevent);
        return () => window.removeEventListener("beforeunload", prevent);
    }, [dirty]);

    function close() {
        if (busy) return;
        const discard = () => { setEditing(null); setDirty(false); };
        if (dirty) modal.confirm({ title: l("Ungespeicherte Änderungen verwerfen?", "Discard unsaved changes?"), okText: l("Verwerfen", "Discard"), cancelText: l("Weiter bearbeiten", "Keep editing"), onOk: discard });
        else discard();
    }
    function edit(record?: RecordData) {
        form.resetFields();
        form.setFieldsValue(record || (key === "projects"
            ? { name: "", description: "", client_id: "", status: "active", due_date: "", budget: 0 }
            : key === "tasks" ? { title: "", project_id: "", assignee: "", status: "todo", priority: "normal", due_date: "" }
            : { title: "", kind: "note", recipient: "", body: "", project_id: "" }));
        setEditing(record || {}); setDirty(false); setEditorError("");
    }
    async function mutate(body: object) {
        const response = await fetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: key, ...body }) });
        if (!response.ok) {
            const result = await response.json();
            throw new Error(language === "de" ? result.error : "Could not save. Check your fields and linked records, then retry.");
        }
    }
    async function save(values: object) {
        setBusy(true); setEditorError("");
        try {
            await mutate({ action: "save", record: { ...values, ...(editing?.id ? { id: editing.id } : {}) } });
            setEditing(null); setDirty(false); await load();
        } catch (error) { setEditorError((error as Error).message); }
        finally { setBusy(false); }
    }
    async function remove(id: string) {
        setBusy(true);
        try { await mutate({ action: "delete", id }); await load(); }
        catch (error) { setError((error as Error).message); }
        finally { setBusy(false); }
    }
    async function exportPdf(id: string) {
        setBusy(true);
        try {
            const response = await fetch(`/api/workspace?documentId=${encodeURIComponent(id)}`);
            if (!response.ok) throw new Error(l("PDF konnte nicht erstellt werden.", "Could not create PDF."));
            download(await response.blob(), "document.pdf");
        } catch (error) { setError((error as Error).message); }
        finally { setBusy(false); }
    }
    function template(kind: string) {
        if (form.getFieldValue("body")?.trim()) return;
        form.setFieldsValue({ body: kind === "letter" ? l("Sehr geehrte Damen und Herren,\n\n\n\nMit freundlichen Grüßen", "Dear Sir or Madam,\n\n\n\nKind regards") : kind === "minutes" ? l("Datum:\nTeilnehmende:\n\nBesprochene Themen:\n\nEntscheidungen:\n\nNächste Schritte:", "Date:\nAttendees:\n\nDiscussion:\n\nDecisions:\n\nNext steps:") : "" });
        setDirty(true);
    }
    const rows = data[key].filter(record => {
        const status = "status" in record ? record.status : record.kind;
        return (filter === "all" || status === filter) && Object.values(record).some(value => String(value).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
    });
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const money = (value: number) => new Intl.NumberFormat(language === "de" ? "de-DE" : "en-GB", { style: "currency", currency: "EUR" }).format(value);
    return <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {holder}
        <WorkspaceLinks />
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
            <div><Typography.Title level={2}>{l("Arbeitsbereich", "Workspace")}</Typography.Title>
                <Typography.Paragraph type="secondary">{l("Projekte planen, Aufgaben organisieren und Geschäftsdokumente schreiben – nur wenn Sie es brauchen.", "Plan projects, organize tasks and write business documents whenever you need them.")}</Typography.Paragraph>
                <Space wrap><Tag>{data.projects.filter(p => p.status === "active").length} {l("aktive Projekte", "active projects")}</Tag><Tag>{data.tasks.filter(t => t.status !== "done").length} {l("offene Aufgaben", "open tasks")}</Tag><Tag>{data.documents.length} {labels.documents}</Tag></Space>
            </div>
            {error && <Alert type="error" showIcon title={error} action={<Button onClick={load} loading={loading}>{l("Erneut versuchen", "Retry")}</Button>} />}
            <Card>
                <Tabs activeKey={key} onChange={value => { setKey(value as BusinessCollection); setSearch(""); setFilter("all"); }} items={(["projects", "tasks", "documents"] as const).map(value => ({ key: value, label: labels[value], disabled: busy }))} />
                <Space wrap style={{ marginBottom: 24, width: "100%" }}>
                    <Input prefix={<SearchOutlined aria-hidden />} aria-label={l("Arbeitsbereich durchsuchen", "Search workspace")} placeholder={l("Suchen …", "Search …")} value={search} onChange={event => setSearch(event.target.value)} allowClear style={{ width: 230 }} />
                    <Select aria-label={l("Status filtern", "Filter status")} value={filter} onChange={setFilter} style={{ minWidth: 145 }} options={[{ value: "all", label: l("Alle", "All") }, ...statuses[key].map(value => ({ value, label: labels[value] }))]} />
                    {key === "tasks" && <Segmented value={board ? "board" : "cards"} onChange={value => setBoard(value === "board")} options={[{ value: "board", label: l("Aufgabenboard", "Task board") }, { value: "cards", label: l("Karten", "Cards") }]} />}
                    <Button type="primary" icon={<PlusOutlined aria-hidden />} disabled={!ready || loading || busy} onClick={() => edit()}>{l("Neu anlegen", "Create new")}</Button>
                    <Button icon={<DownloadOutlined aria-hidden />} disabled={!ready || loading} href="/api/workspace/backup">{l("Arbeitsbereich exportieren", "Export workspace")}</Button>
                </Space>
                <Spin spinning={loading}>
                    {!rows.length ? <Empty description={search || filter !== "all" ? l("Keine passenden Einträge.", "No matching records.") : l("Hier ist Platz für Ihre Arbeit. Erstellen Sie den ersten Eintrag.", "Room for your work. Create your first record.")} /> : key === "tasks" && board ? <TaskBoard tasks={rows as BusinessTask[]} projects={data.projects} busy={busy} edit={edit} change={async (task,status) => { setBusy(true); try { await mutate({ action: "save", record: { ...task, status } }); await load(); } catch (error) { setError((error as Error).message); } finally { setBusy(false); } }} /> : <Row gutter={[16, 16]}>
                        {rows.map(record => {
                            const title = "name" in record ? record.name : record.title;
                            const status = "status" in record ? record.status : record.kind;
                            const project = "project_id" in record ? data.projects.find(p => p.id === record.project_id) : undefined;
                            const tasks = data.tasks.filter(t => t.project_id === record.id);
                            const overdue = "due_date" in record && record.due_date && record.due_date < today && status !== "done";
                            return <Col xs={24} md={12} xl={8} key={record.id}><Card size="small" style={{ height: "100%" }}>
                                <Space wrap><Tag color={status === "done" ? "green" : "default"}>{labels[status]}</Tag>{overdue && <Tag color="red">{l("Überfällig", "Overdue")}</Tag>}{"priority" in record && record.priority === "high" && <Tag color="orange">{l("Hohe Priorität", "High priority")}</Tag>}</Space>
                                <Typography.Title level={4} style={{ overflowWrap: "anywhere" }}>{title}</Typography.Title>
                                {"description" in record && <Typography.Paragraph ellipsis={{ rows: 2 }}>{record.description}</Typography.Paragraph>}
                                {"body" in record && <Typography.Paragraph ellipsis={{ rows: 3 }}>{record.body}</Typography.Paragraph>}
                                {project && <Typography.Paragraph type="secondary">{project.name}</Typography.Paragraph>}
                                {"assignee" in record && record.assignee && <Typography.Paragraph>{record.assignee}</Typography.Paragraph>}
                                {"due_date" in record && record.due_date && <Typography.Paragraph type={overdue ? "danger" : "secondary"}>{l("Termin", "Due")}: {record.due_date}</Typography.Paragraph>}
                                {"budget" in record && <><Typography.Paragraph type="secondary">{clients.find(c => c.id === record.client_id)?.name || l("Ohne Kunde", "No customer")} · {l("Planbudget", "Planned budget")}: {money(record.budget)}</Typography.Paragraph><Progress percent={tasks.length ? Math.round(tasks.filter(t => t.status === "done").length / tasks.length * 100) : 0} size="small" /><Typography.Paragraph type="secondary">{tasks.filter(t => t.status === "done").length}/{tasks.length} {labels.tasks}</Typography.Paragraph></>}
                                <Space wrap><Button disabled={busy} onClick={() => edit(record)}>{l("Öffnen", "Open")}</Button>
                                    {key === "projects" && <Button disabled={busy} onClick={() => { setKey("tasks"); setSearch(""); setFilter("all"); form.resetFields(); form.setFieldsValue({ title: "", project_id: record.id, assignee: "", status: "todo", priority: "normal", due_date: "" }); setEditing({}); setDirty(false); setEditorError(""); }}>{l("Aufgabe anlegen", "Add task")}</Button>}
                                    {key === "documents" && <><Button disabled={busy} onClick={() => exportPdf(record.id)}>PDF</Button><Button onClick={() => { const doc = record as BusinessDocument; download(new Blob([`${doc.recipient}\n\n${doc.title}\n\n${doc.body}`], { type: "text/plain;charset=utf-8" }), "document.txt"); }}>TXT</Button></>}
                                    {key !== "projects" && <Popconfirm title={l("Eintrag endgültig löschen?", "Permanently delete this record?")} onConfirm={() => remove(record.id)} okText={l("Löschen", "Delete")} cancelText={l("Abbrechen", "Cancel")}><Button danger disabled={busy}>{l("Löschen", "Delete")}</Button></Popconfirm>}
                                </Space>
                            </Card></Col>;
                        })}
                    </Row>}
                </Spin>
            </Card>
            <details><summary style={{ cursor: "pointer" }}>{l("Hinweise zu Projekten und Exporten", "About projects and exports")}</summary><Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>{l("Budgets sind Planwerte. Zuständige Personen sind Textangaben, keine Einladungen. Projekte werden über „Erledigt“ archiviert. Der JSON-Export enthält nur diesen Arbeitsbereich; es gibt noch keinen automatischen Import oder Desktop-Abgleich.", "Budgets are estimates. Assignees are text labels, not invitations. Set projects to Done to archive them. JSON export contains this workspace only; automatic import and desktop synchronization are not available yet.")}</Typography.Paragraph></details>
        </Space>
        <Modal title={`${labels[key]} · ${editing?.id ? l("Bearbeiten", "Edit") : l("Neu", "New")}`} open={!!editing} onCancel={close} footer={null} width={720} maskClosable={false} keyboard={!busy} closable={!busy}>
            {editorError && <Alert type="error" showIcon title={editorError} style={{ marginBottom: 16 }} />}
            <Form form={form} layout="vertical" onFinish={save} onValuesChange={() => setDirty(true)} disabled={busy}>
                <Form.Item name={key === "projects" ? "name" : "title"} label={l("Titel", "Title")} rules={required}><Input maxLength={key === "tasks" ? 300 : 200} autoFocus /></Form.Item>
                {key === "projects" ? <>
                    <Form.Item name="client_id" label={l("Kunde (optional)", "Customer (optional)")}><Select showSearch optionFilterProp="label" options={[{ value: "", label: l("Ohne Kunde", "No customer") }, ...clients.map(c => ({ value: c.id, label: c.name }))]} /></Form.Item>
                    <Form.Item name="description" label={l("Beschreibung", "Description")}><Input.TextArea rows={3} maxLength={10000} /></Form.Item>
                    <Form.Item name="budget" label={l("Planbudget (EUR)", "Planned budget (EUR)")} rules={[{ required: true }]}><InputNumber min={0} max={1e12} precision={2} style={{ width: "100%" }} /></Form.Item>
                </> : <Form.Item name="project_id" label={l("Projekt (optional)", "Project (optional)")}><Select showSearch optionFilterProp="label" options={[{ value: "", label: l("Ohne Projekt", "No project") }, ...data.projects.map(p => ({ value: p.id, label: p.name }))]} /></Form.Item>}
                {key === "documents" ? <>
                    <Form.Item name="kind" label={l("Vorlage", "Template")}><Select onChange={template} options={statuses.documents.map(value => ({ value, label: labels[value] }))} /></Form.Item>
                    <Form.Item name="recipient" label={l("Empfänger (optional)", "Recipient (optional)")}><Input.TextArea rows={2} maxLength={1000} /></Form.Item>
                    <Form.Item name="body" label={l("Inhalt", "Content")}><Input.TextArea rows={12} maxLength={100000} showCount /></Form.Item>
                </> : <>
                    <Form.Item name="status" label="Status"><Select options={statuses[key].map(value => ({ value, label: labels[value] }))} /></Form.Item>
                    <Form.Item name="due_date" label={l("Termin (optional)", "Due date (optional)")}><Input type="date" /></Form.Item>
                    {key === "tasks" && <><Form.Item name="assignee" label={l("Zuständig (optional)", "Assignee (optional)")}><Input maxLength={200} /></Form.Item><Form.Item name="priority" label={l("Priorität", "Priority")}><Select options={[{ value: "normal", label: "Normal" }, { value: "high", label: l("Hoch", "High") }]} /></Form.Item></>}
                </>}
                <Space><Button type="primary" htmlType="submit" loading={busy}>{l("Speichern", "Save")}</Button><Button onClick={close} disabled={busy}>{l("Abbrechen", "Cancel")}</Button><Typography.Text type="secondary">{dirty ? l("Ungespeicherte Änderungen", "Unsaved changes") : ""}</Typography.Text></Space>
            </Form>
        </Modal>
    </div>;
}
