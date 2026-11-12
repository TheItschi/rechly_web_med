"use client";

import DecimalInput from "@/components/DecimalInput";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Checkbox, Collapse, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from "antd";
import type { TimeEntry, WorkSnapshot } from "@/lib/workspace/work-types";
import { addDays, localDay, money, useResource, useWords, WorkspaceFrame } from "./common";

export default function TimeTracking() {
    const { l, language } = useWords(), router = useRouter();
    const resource = useResource<WorkSnapshot>("/api/workspace/work"), { data, busy } = resource;
    const [project, setProject] = useState(""); const [filter, setFilter] = useState("all"); const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<React.Key[]>([]);
    const [editor, setEditor] = useState<{ id?: string } | null>(null); const [dirty, setDirty] = useState(false); const [editorError, setEditorError] = useState("");
    const [billOpen, setBillOpen] = useState(false), [stopOpen, setStopOpen] = useState(false);
    const [form] = Form.useForm(), [billForm] = Form.useForm(), [stopForm] = Form.useForm(); const [modal, holder] = Modal.useModal();
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => { const tick = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(tick); }, []);
    useEffect(() => { if (!dirty) return; const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; }; window.addEventListener("beforeunload", prevent); return () => window.removeEventListener("beforeunload", prevent); }, [dirty]);
    const required = [{ required: true, message: l("Bitte ausfüllen.", "Required.") }];
    const elapsed = data?.timer ? Math.max(1, Math.ceil((now - data.timer.started_at) / 60000)) : 0;
    function close() { if (busy) return; if (dirty) modal.confirm({ title: l("Änderungen verwerfen?", "Discard changes?"), onOk: () => { setEditor(null); setDirty(false); }, okText: l("Verwerfen", "Discard"), cancelText: l("Weiter bearbeiten", "Keep editing") }); else setEditor(null); }
    function open(entry?: TimeEntry) { form.resetFields(); form.setFieldsValue(entry || { project_id: project || undefined, description: "", date: localDay(), minutes: 60, rate: 0, cost_rate: 0, billable: true }); setEditor(entry || {}); setDirty(false); setEditorError(""); }
    async function save(values: object, action = "save") {
        try { await resource.mutate({ ...values, action, ...(editor?.id ? { id: editor.id } : {}) }); setEditor(null); setDirty(false); }
        catch (error) { setEditorError((error as Error).message); }
    }
    async function run(body: object) { try { await resource.mutate(body); } catch (error) { resource.setError((error as Error).message); } }
    const rows = (data?.entries || []).filter(e => (!project || e.project_id === project) && (filter === "all" || (filter === "unbilled" ? !e.invoice_id && e.billable : !!e.invoice_id)) && e.description.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
    const total = (data?.entries || []).filter(e => selected.includes(e.id)).reduce((sum,e) => sum + Math.round(e.minutes * e.rate / 60 * 100) / 100, 0);
    return <WorkspaceFrame title={l("Zeiten & Abrechnung", "Time & billing")} description={l("Arbeit erfassen, abrechenbare Zeiten auswählen und einen Rechnungsentwurf erstellen.", "Record work, select billable time and create an invoice draft.")} error={resource.error} retry={resource.load}>
        {holder}
        {data && !data.projects.length && <Alert type="info" showIcon title={<Link href="/dashboard/workspace">{l("Legen Sie zuerst ein Projekt an. Zum Abrechnen benötigt es einen Kunden.", "Create a project first. Assign a customer before billing.")}</Link>} style={{ marginBottom: 16 }} />}
        {data?.timer && <Card style={{ marginBottom: 20 }}><Space wrap><Tag color="processing">{l("Timer läuft", "Timer running")}: {elapsed} min</Tag><Typography.Text strong>{data.timer.description}</Typography.Text><Button onClick={() => { stopForm.setFieldsValue({ minutes: Math.min(1440, elapsed), date: localDay(new Date(data.timer!.started_at)) }); setStopOpen(true); setEditorError(""); }} disabled={busy}>{l("Stoppen & prüfen", "Stop & review")}</Button><Popconfirm title={l("Timer ohne Zeiteintrag verwerfen?", "Discard timer without recording time?")} onConfirm={() => run({ action: "cancel", token: data.timer!.token })}><Button danger disabled={busy}>{l("Verwerfen", "Discard")}</Button></Popconfirm></Space></Card>}
        <Card>
            <Space wrap style={{ marginBottom: 20 }}>
                <Select aria-label={l("Projekt filtern", "Filter project")} value={project} onChange={value => { setProject(value); setSelected([]); }} style={{ minWidth: 220 }} options={[{ value: "", label: l("Alle Projekte", "All projects") }, ...(data?.projects || []).map(p => ({ value: p.id, label: p.name }))]} />
                <Select aria-label={l("Abrechnung filtern", "Filter billing")} value={filter} onChange={value => { setFilter(value); setSelected([]); }} style={{ minWidth: 160 }} options={[{ value: "all", label: l("Alle Zeiten", "All time") }, { value: "unbilled", label: l("Nicht abgerechnet", "Unbilled") }, { value: "billed", label: l("Abgerechnet", "Billed") }]} />
                <Input placeholder={l("Tätigkeit suchen", "Search work")} aria-label={l("Tätigkeit suchen", "Search work")} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 210 }} />
                <Button type="primary" disabled={!data?.projects.length || busy} onClick={() => open()}>{l("Zeit erfassen / Timer", "Record time / timer")}</Button>
                <Button href="/api/workspace/work?csv=1" disabled={!data}>{l("CSV exportieren", "Export CSV")}</Button>
            </Space>
            <Table<TimeEntry> rowKey="id" dataSource={rows} loading={resource.loading} scroll={{ x: 850 }} pagination={{ pageSize: 20 }} rowSelection={{ selectedRowKeys: selected, onChange: setSelected, getCheckboxProps: e => ({ disabled: !project || !e.billable || !!e.invoice_id || busy }) }} columns={[
                { title: l("Datum", "Date"), dataIndex: "date", width: 110 },
                { title: l("Tätigkeit", "Work"), render: (_,e) => <><Typography.Text strong>{e.description}</Typography.Text><br /><Typography.Text type="secondary">{data?.projects.find(p => p.id === e.project_id)?.name}</Typography.Text></> },
                { title: "Min.", dataIndex: "minutes", width: 70 }, { title: l("Wert (netto)", "Value (net)"), render: (_,e) => money(e.minutes * e.rate / 60, language) },
                { title: "Status", render: (_,e) => e.invoice_id ? <Link href={`/dashboard/invoices/${e.invoice_id}`}>{l("Abgerechnet", "Billed")}</Link> : <Tag>{e.billable ? l("Abrechenbar", "Billable") : l("Intern", "Internal")}</Tag> },
                { title: l("Aktionen", "Actions"), render: (_,e) => <Space><Button disabled={!!e.invoice_id || busy} onClick={() => open(e)}>{l("Bearbeiten", "Edit")}</Button><Popconfirm title={l("Zeiteintrag löschen?", "Delete time entry?")} onConfirm={() => run({ action: "delete", id: e.id })}><Button danger disabled={!!e.invoice_id || busy}>{l("Löschen", "Delete")}</Button></Popconfirm></Space> },
            ]} />
            <Space wrap style={{ marginTop: 16 }}><Typography.Text>{selected.length}/40 · {money(total, language)}</Typography.Text><Button disabled={!project || !selected.length || selected.length > 40 || busy} onClick={() => { billForm.setFieldsValue({ issue_date: localDay(), due_date: addDays(localDay(), 14), tax_rate: data?.smallBusiness ? 0 : 19 }); setEditorError(""); setBillOpen(true); }}>{l("Auswahl abrechnen", "Bill selected time")}</Button><Typography.Text type="secondary">{l("Wählen Sie ein Projekt, um Zeiten auszuwählen. Abgerechnete Zeiten sind gesperrt.", "Choose a project to select time. Billed entries are locked.")}</Typography.Text></Space>
        </Card>
        <Modal title={l("Zeit erfassen", "Record time")} open={!!editor} onCancel={close} footer={null} maskClosable={false} closable={!busy}>
            {editorError && <Alert type="error" title={editorError} />}
            <Form name="workspace-time" form={form} layout="vertical" disabled={busy} onValuesChange={() => setDirty(true)} onFinish={values => save(values)}>
                <Form.Item name="project_id" label={l("Projekt", "Project")} rules={required}><Select options={data?.projects.map(p => ({ value: p.id, label: p.name }))} /></Form.Item>
                <Form.Item name="description" label={l("Tätigkeit", "Description")} rules={required}><Input.TextArea maxLength={1000} rows={2} /></Form.Item>
                <Form.Item name="date" label={l("Leistungsdatum", "Work date")} rules={required}><Input type="date" /></Form.Item>
                <Form.Item name="minutes" label={l("Dauer in Minuten", "Duration in minutes")} rules={required}><InputNumber min={1} max={1440} precision={0} /></Form.Item>
                <Form.Item name="rate" label={l("Stundensatz (netto, EUR)", "Hourly rate (net, EUR)")} rules={required}><DecimalInput min={0} max={100000} precision={2} /></Form.Item>
                <Form.Item name="billable" valuePropName="checked"><Checkbox>{l("Abrechenbar", "Billable")}</Checkbox></Form.Item>
                <Collapse items={[{ key: "cost", label: l("Optional: interne Kosten", "Optional: internal costs"), forceRender: true, children: <Form.Item name="cost_rate" label={l("Interne Kosten pro Stunde (EUR)", "Internal hourly cost (EUR)")} rules={required}><DecimalInput min={0} max={100000} precision={2} /></Form.Item> }]} />
                <Space wrap style={{ marginTop: 20 }}><Button type="primary" htmlType="submit" loading={busy}>{l("Speichern", "Save")}</Button>{!editor?.id && <Button disabled={!!data?.timer || busy} onClick={async () => { try { const values = await form.validateFields(); await save(values, "start"); } catch { /* Form shows validation messages. */ } }}>{l("Timer starten", "Start timer")}</Button>}<Button onClick={close}>{l("Abbrechen", "Cancel")}</Button></Space>
            </Form>
        </Modal>
        <Modal title={l("Timer prüfen und speichern", "Review and save timer")} open={stopOpen} onCancel={() => !busy && setStopOpen(false)} footer={null}>
            <Alert type="info" title={l("Der Timer läuft bis zum Speichern weiter. Prüfen Sie die Dauer, besonders nach längerer Abwesenheit.", "The timer continues until saved. Review the duration, especially after being away.")} />
            {editorError && <Alert type="error" title={editorError} />}
            <Form name="workspace-timer-stop" form={stopForm} layout="vertical" disabled={busy} onFinish={async values => { try { await resource.mutate({ ...values, action: "stop", token: data!.timer!.token }); setStopOpen(false); } catch (error) { setEditorError((error as Error).message); } }}>
                <Form.Item name="minutes" label={l("Minuten", "Minutes")} rules={required}><InputNumber min={1} max={1440} precision={0} /></Form.Item><Form.Item name="date" label={l("Leistungsdatum", "Work date")} rules={required}><Input type="date" /></Form.Item><Button htmlType="submit" type="primary" loading={busy}>{l("Zeit speichern", "Save time")}</Button>
            </Form>
        </Modal>
        <Modal title={l("Rechnungsentwurf erstellen", "Create invoice draft")} open={billOpen} onCancel={() => !busy && setBillOpen(false)} footer={null}>
            <Typography.Paragraph>{selected.length} {l("Zeiteinträge", "entries")} · {money(total, language)} {l("netto. Bitte den Entwurf vor dem Versand prüfen.", "net. Review the draft before sending.")}</Typography.Paragraph>
            {editorError && <Alert type="error" title={editorError} />}
            <Form name="workspace-time-billing" form={billForm} layout="vertical" disabled={busy} onFinish={async values => { try { const result = await resource.mutate({ ...values, action: "bill", project_id: project, entry_ids: selected }); setSelected([]); setBillOpen(false); router.push(`/dashboard/invoices/${result.id}`); } catch (error) { setEditorError((error as Error).message); } }}>
                <Form.Item name="issue_date" label={l("Rechnungsdatum", "Invoice date")} rules={required}><Input type="date" /></Form.Item><Form.Item name="due_date" label={l("Zahlungsziel", "Due date")} rules={required}><Input type="date" /></Form.Item><Form.Item name="tax_rate" label={l("Umsatzsteuer (%)", "VAT (%)")} rules={required}><InputNumber min={0} max={100} disabled={data?.smallBusiness || busy} /></Form.Item><Button type="primary" htmlType="submit" loading={busy}>{l("Entwurf erstellen", "Create draft")}</Button>
            </Form>
        </Modal>
    </WorkspaceFrame>;
}
