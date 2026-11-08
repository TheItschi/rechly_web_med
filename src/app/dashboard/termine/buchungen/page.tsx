"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, DatePicker, Descriptions, Drawer, Form, Input, Modal, Select, Space, Table, Tag, message } from "antd";
import type { Dayjs } from "dayjs";
import { get, patch, post } from "@/lib/termine/client";

interface Appointment {
    $id: string; serviceId: string; staffId: string; customerName: string; customerEmail: string; customerPhone?: string;
    customerNote?: string; startUtc: string; endUtc: string; businessTimezone: string; durationMinutes: number;
    status: string; serviceNameSnapshot: string; servicePriceCents: number; currency: string;
    source: string; internalNote?: string; linkedInvoiceId?: string;
}
interface Option { $id: string; name: string }

const STATUS_COLOR: Record<string, string> = {
    PENDING: "processing", CONFIRMED: "success", COMPLETED: "default",
    CANCELLED_BY_CUSTOMER: "error", CANCELLED_BY_BUSINESS: "error", NO_SHOW: "warning",
};

export default function TermineBookingsPage() {
    const searchParams = useSearchParams();
    const [rows, setRows] = useState<Appointment[]>([]);
    const [services, setServices] = useState<Option[]>([]);
    const [staff, setStaff] = useState<Option[]>([]);
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState<Appointment | null>(null);
    const [manualOpen, setManualOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [day, setDay] = useState<Dayjs | null>(null);
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const q = new URLSearchParams();
            if (statusFilter) q.set("status", statusFilter);
            if (day) {
                q.set("from", day.startOf("day").toISOString());
                q.set("to", day.add(1, "day").startOf("day").toISOString());
            }
            const [a, s, st] = await Promise.all([
                get<{ appointments: Appointment[] }>(`/api/termine/appointments?${q.toString()}`),
                get<{ services: Option[] }>("/api/termine/services"),
                get<{ staff: Option[] }>("/api/termine/staff"),
            ]);
            setRows(a.appointments);
            setServices(s.services);
            setStaff(st.staff);
        } catch (e) {
            message.error(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, day]);

    useEffect(() => { void load(); }, [load]);
    useEffect(() => {
        if (searchParams.get("action") === "neu") setManualOpen(true);
    }, [searchParams]);

    async function transition(id: string, status: string) {
        try {
            await patch(`/api/termine/appointments/${id}`, { status });
            message.success("Status aktualisiert.");
            setDetail(null);
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : "Aktualisierung fehlgeschlagen.");
        }
    }

    async function invoiceDraft(id: string) {
        try {
            const r = await post<{ invoiceId: string; existed: boolean }>(`/api/termine/appointments/${id}/invoice-draft`, {});
            message.success(r.existed ? "Rechnungsentwurf existiert bereits." : "Rechnungsentwurf erstellt.");
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : "Entwurf fehlgeschlagen.");
        }
    }

    return (
        <div className="dashboard-page">
            <section className="dashboard-welcome">
                <div>
                    <div className="dashboard-eyebrow">Termine · Buchungen</div>
                    <h1>Buchungen</h1>
                    <p>Bestätigen, verschieben, stornieren und abrechnen.</p>
                </div>
                <Button type="primary" onClick={() => setManualOpen(true)}>Manuelle Buchung</Button>
            </section>

            <Space wrap style={{ marginBottom: 16 }}>
                <Select allowClear placeholder="Status" value={statusFilter} onChange={setStatusFilter} style={{ width: 200 }}
                    options={["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_BUSINESS", "NO_SHOW"].map((s) => ({ value: s, label: s }))} />
                <DatePicker value={day} onChange={setDay} format="DD.MM.YYYY" placeholder="Tag filtern" allowClear />
            </Space>

            <Card className="dashboard-panel">
                <Table
                    rowKey="$id" loading={loading} dataSource={rows} pagination={{ pageSize: 20 }} scroll={{ x: 720 }}
                    onRow={(r) => ({ onClick: () => setDetail(r) })}
                    columns={[
                        { title: "Start", render: (_: unknown, r: Appointment) => new Date(r.startUtc).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) },
                        { title: "Leistung", dataIndex: "serviceNameSnapshot" },
                        { title: "Kunde", dataIndex: "customerName" },
                        { title: "Status", render: (_: unknown, r: Appointment) => <Tag color={STATUS_COLOR[r.status] ?? "default"}>{r.status}</Tag> },
                        { title: "Quelle", dataIndex: "source" },
                    ]}
                    locale={{ emptyText: "Keine Buchungen." }}
                />
            </Card>

            <Drawer title="Buchung" open={!!detail} onClose={() => setDetail(null)} size={420}>
                {detail && (
                    <div>
                        <Descriptions column={1} size="small" bordered>
                            <Descriptions.Item label="Leistung">{detail.serviceNameSnapshot}</Descriptions.Item>
                            <Descriptions.Item label="Start">{new Date(detail.startUtc).toLocaleString("de-DE")}</Descriptions.Item>
                            <Descriptions.Item label="Ende">{new Date(detail.endUtc).toLocaleString("de-DE")}</Descriptions.Item>
                            <Descriptions.Item label="Kunde">{detail.customerName} · {detail.customerEmail}{detail.customerPhone ? ` · ${detail.customerPhone}` : ""}</Descriptions.Item>
                            {detail.customerNote && <Descriptions.Item label="Kundennotiz">{detail.customerNote}</Descriptions.Item>}
                            <Descriptions.Item label="Status"><Tag color={STATUS_COLOR[detail.status] ?? "default"}>{detail.status}</Tag></Descriptions.Item>
                            {detail.linkedInvoiceId && <Descriptions.Item label="Rechnung">{detail.linkedInvoiceId}</Descriptions.Item>}
                        </Descriptions>
                        <Space wrap style={{ marginTop: 16 }}>
                            {detail.status === "PENDING" && <Button type="primary" onClick={() => void transition(detail.$id, "CONFIRMED")}>Bestätigen</Button>}
                            {(detail.status === "PENDING" || detail.status === "CONFIRMED") && (
                                <>
                                    <Button onClick={() => void transition(detail.$id, "COMPLETED")}>Abschließen</Button>
                                    <Button danger onClick={() => void transition(detail.$id, "CANCELLED_BY_BUSINESS")}>Stornieren</Button>
                                    <Button onClick={() => void transition(detail.$id, "NO_SHOW")}>No-Show</Button>
                                </>
                            )}
                            {detail.status === "COMPLETED" && !detail.linkedInvoiceId && (
                                <Button type="primary" onClick={() => void invoiceDraft(detail.$id)}>Rechnungsentwurf</Button>
                            )}
                    </Space>
                        <p style={{ marginTop: 12, fontSize: 12, color: "var(--dash-muted)" }}>
                            Historie bleibt erhalten: Stornieren statt Löschen. Umbuchungen laufen über den Kalender.
                        </p>
                    </div>
                )}
            </Drawer>

            <Modal title="Manuelle Buchung" open={manualOpen} onCancel={() => setManualOpen(false)} footer={null} width={560}>
                <Form
                    form={form} layout="vertical"
                    onFinish={async (v) => {
                        try {
                            await post("/api/termine/appointments", {
                                serviceId: v.serviceId,
                                staffId: v.staffId,
                                startUtc: (v.when as Dayjs).toISOString(),
                                customerName: v.customerName,
                                customerEmail: v.customerEmail,
                                customerPhone: v.customerPhone,
                                internalNote: v.internalNote,
                            });
                            message.success("Gebucht.");
                            setManualOpen(false);
                            form.resetFields();
                            await load();
                        } catch (e) {
                            message.error(e instanceof Error ? e.message : "Buchung fehlgeschlagen.");
                        }
                    }}
                >
                    <Form.Item name="serviceId" label="Leistung" rules={[{ required: true }]}><Select options={services.map((s) => ({ value: s.$id, label: s.name }))} /></Form.Item>
                    <Form.Item name="staffId" label="Mitarbeiter"><Select allowClear options={staff.map((s) => ({ value: s.$id, label: s.name }))} /></Form.Item>
                    <Form.Item name="when" label="Termin" rules={[{ required: true }]}><DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: "100%" }} /></Form.Item>
                    <Form.Item name="customerName" label="Kundenname" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="customerEmail" label="E-Mail" rules={[{ required: true, type: "email" }]}><Input /></Form.Item>
                    <Form.Item name="customerPhone" label="Telefon"><Input /></Form.Item>
                    <Form.Item name="internalNote" label="Interne Notiz"><Input.TextArea rows={2} /></Form.Item>
                    <Button type="primary" htmlType="submit" block>Buchen</Button>
                </Form>
            </Modal>
        </div>
    );
}
