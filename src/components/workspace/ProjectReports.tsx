"use client";
import { useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Statistic, Table, Typography } from "antd";
import type { WorkSnapshot } from "@/lib/workspace/work-types";
import { localDay, money, useResource, useWords, WorkspaceFrame } from "./common";
export default function ProjectReports() {
    const { l, language } = useWords(), resource = useResource<WorkSnapshot>("/api/workspace/work"), { data, busy } = resource;
    const [project, setProject] = useState(""); const [mode, setMode] = useState<"add" | "link" | null>(null); const [error, setError] = useState(""); const [form] = Form.useForm();
    const reports = (data?.reports || []).filter(r => !project || r.project.id === project);
    const required = [{ required: true, message: l("Bitte ausfüllen.", "Required.") }];
    const summary = (key: "value" | "unbilled" | "labor" | "costs") => reports.reduce((n,r) => n + r[key], 0);
    function open(value: "add" | "link") { form.resetFields(); form.setFieldsValue({ project_id: project || undefined, date: localDay(), vendor_name: "", description: "", amount_gross: 0, vat_rate: 19 }); setMode(value); setError(""); }
    return <WorkspaceFrame title={l("Projektcontrolling", "Project reports")} description={l("Arbeitswert, interne Kosten, Ausgaben und tatsächlich gestellte Rechnungen im Überblick.", "See work value, internal costs, expenses and issued invoices together.")} error={resource.error} retry={resource.load}>
        <Space wrap style={{ marginBottom: 20 }}><Select aria-label={l("Projekt filtern", "Filter project")} value={project} onChange={setProject} style={{ minWidth: 240 }} options={[{ value: "", label: l("Alle Projekte", "All projects") }, ...(data?.projects || []).map(p => ({ value: p.id, label: p.name }))]} /><Button disabled={!data?.projects.length || busy} onClick={() => open("add")}>{l("Projektkosten erfassen", "Add project expense")}</Button><Button disabled={!data?.projects.length || busy} onClick={() => open("link")}>{l("Vorhandene Ausgabe zuordnen", "Assign existing expense")}</Button><Link href="/dashboard/workspace/time">{l("Zeiten erfassen", "Record time")}</Link></Space>
        <Row gutter={[16,16]} style={{ marginBottom: 24 }}>{([['value', l("Arbeitswert", "Work value")], ['unbilled', l("Nicht abgerechnet", "Unbilled")], ['labor', l("Interne Arbeitskosten", "Internal labor")], ['costs', l("Projektkosten", "Project expenses")]] as const).map(([key,label]) => <Col xs={24} sm={12} lg={6} key={key}><Card><Statistic title={label} value={money(summary(key), language)} /></Card></Col>)}</Row>
        <Alert type="info" showIcon title={l("Planungsübersicht, keine steuerliche Gewinnermittlung", "Planning estimates, not a tax profit calculation")} description={l("Arbeitswert und Deckungsbeitrag sind Schätzwerte. Rechnungen zählen erst nach dem Entwurf, Zahlungen nur bei Status „Bezahlt“. Ausgaben werden netto berücksichtigt, bei Kleinunternehmen brutto.", "Work value and contribution are estimates. Invoices count after draft status; payments count when marked Paid. Expenses use net amounts, or gross for small businesses.")} style={{ marginBottom: 20 }} />
        <Table rowKey={r => r.project.id} loading={resource.loading} dataSource={reports} scroll={{ x: 1200 }} columns={[
            { title: l("Projekt", "Project"), render: (_,r) => r.project.name, fixed: "left" }, { title: l("Stunden", "Hours"), render: (_,r) => (r.minutes / 60).toFixed(2) },
            ...([['value', l("Arbeitswert", "Work value")], ['unbilled', l("Offener Arbeitswert", "Unbilled value")], ['labor', l("Arbeitskosten", "Labor costs")], ['costs', l("Ausgaben", "Expenses")], ['invoiced', l("Gestellt (netto)", "Invoiced (net)")], ['paid', l("Bezahlt (netto)", "Paid (net)")], ['contribution', l("Geschätzter Beitrag", "Estimated contribution")], ['budgetRemaining', l("Planbudget übrig", "Budget remaining")]] as const).map(([key,title]) => ({ title, render: (_: unknown, r: NonNullable<typeof data>["reports"][number]) => <Typography.Text type={r[key] < 0 ? "danger" : undefined}>{money(r[key], language)}</Typography.Text> })),
        ]} />
        <Typography.Title level={4}>{l("Zugeordnete Ausgaben", "Assigned expenses")}</Typography.Title>
        <Table rowKey="id" dataSource={(data?.expenses || []).filter(e => e.project_id && (!project || e.project_id === project))} scroll={{ x: 600 }} columns={[
            { title: l("Datum", "Date"), dataIndex: "date" }, { title: l("Lieferant", "Supplier"), dataIndex: "vendor_name" }, { title: l("Projekt", "Project"), render: (_,e) => data?.projects.find(p => p.id === e.project_id)?.name }, { title: l("Brutto", "Gross"), render: (_,e) => money(e.amount_gross, language) },
            { title: l("Aktion", "Action"), render: (_,e) => <Popconfirm title={l("Projektzuordnung entfernen? Der Beleg bleibt erhalten.", "Remove project assignment? The expense is retained.")} onConfirm={async () => { try { await resource.mutate({ action: "unlink_expense", expense_id: e.id }); } catch (error) { resource.setError((error as Error).message); } }}><Button disabled={busy}>{l("Zuordnung entfernen", "Unassign")}</Button></Popconfirm> },
        ]} />
        <Modal title={mode === "add" ? l("Projektkosten erfassen", "Add project expense") : l("Ausgabe zuordnen", "Assign expense")} open={!!mode} onCancel={() => !busy && setMode(null)} footer={null} maskClosable={false}>
            {error && <Alert type="error" title={error} />}
            <Form name="workspace-project-expense" form={form} layout="vertical" disabled={busy} onFinish={async values => { try { await resource.mutate({ ...values, action: mode === "add" ? "add_expense" : "link_expense" }); setMode(null); } catch (error) { setError((error as Error).message); } }}>
                <Form.Item name="project_id" label={l("Projekt", "Project")} rules={required}><Select options={data?.projects.map(p => ({ value: p.id, label: p.name }))} /></Form.Item>
                {mode === "link" ? <Form.Item name="expense_id" label={l("Ausgabe", "Expense")} rules={required}><Select showSearch optionFilterProp="label" options={data?.expenses.map(e => ({ value: e.id, label: `${e.date} · ${e.vendor_name} · ${money(e.amount_gross, language)}${e.project_id ? ' · ' + data.projects.find(p => p.id === e.project_id)?.name : ''}` }))} /></Form.Item> : <>
                    <Form.Item name="vendor_name" label={l("Lieferant", "Supplier")} rules={required}><Input maxLength={200} /></Form.Item><Form.Item name="description" label={l("Beschreibung", "Description")}><Input maxLength={1000} /></Form.Item><Form.Item name="date" label={l("Datum", "Date")} rules={required}><Input type="date" /></Form.Item><Form.Item name="amount_gross" label={l("Bruttobetrag (EUR)", "Gross amount (EUR)")} rules={required}><InputNumber min={0} max={1e9} precision={2} /></Form.Item><Form.Item name="vat_rate" label={l("Umsatzsteuer (%)", "VAT (%)")} rules={required}><InputNumber min={0} max={100} /></Form.Item>
                    <Typography.Paragraph type="secondary">{l("Die Ausgabe erscheint auch unter Ausgaben & Belege.", "This expense also appears in Expenses & receipts.")}</Typography.Paragraph>
                </>}
                <Button type="primary" htmlType="submit" loading={busy}>{l("Speichern", "Save")}</Button>
            </Form>
        </Modal>
    </WorkspaceFrame>;
}
