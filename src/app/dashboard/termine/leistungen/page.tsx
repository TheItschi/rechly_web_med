"use client";

import { useEffect, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, message } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { del, get, patch, post } from "@/lib/termine/client";

interface Service { $id: string; name: string; description?: string; category?: string; durationMinutes: number; priceCents: number; currency: string; prepMinutes: number; cleanupMinutes: number; active: boolean; publicVisible: boolean; staffIds: string[]; sortOrder: number }
interface Staff { $id: string; name: string }

export default function TermineServicesPage() {
    const [rows, setRows] = useState<Service[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Service | null>(null);
    const [form] = Form.useForm();

    async function load() {
        setLoading(true);
        try {
            const [s, st] = await Promise.all([
                get<{ services: Service[] }>("/api/termine/services"),
                get<{ staff: Staff[] }>("/api/termine/staff"),
            ]);
            setRows(s.services);
            setStaff(st.staff);
        } catch (e) {
            message.error(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { void load(); }, []);

    function openNew() {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ durationMinutes: 30, priceCents: 2500, prepMinutes: 0, cleanupMinutes: 0, active: true, publicVisible: true, staffIds: [], sortOrder: rows.length });
        setOpen(true);
    }

    function openEdit(r: Service) {
        setEditing(r);
        form.setFieldsValue({ ...r, price: (r.priceCents / 100).toFixed(2) });
        setOpen(true);
    }

    async function save() {
        try {
            const v = await form.validateFields();
            const { price, ...rest } = v as Record<string, unknown> & { price?: number };
            const payload = { ...rest, priceCents: Math.round(Number(price ?? 0) * 100) };
            if (editing) await patch(`/api/termine/services/${editing.$id}`, payload);
            else await post("/api/termine/services", payload);
            message.success("Gespeichert.");
            setOpen(false);
            await load();
        } catch (e) {
            if (e instanceof Error && !String(e).includes("validate")) message.error(e.message);
        }
    }

    return (
        <div className="dashboard-page">
            <section className="dashboard-welcome">
                <div>
                    <div className="dashboard-eyebrow">Termine · Leistungen</div>
                    <h1>Leistungen</h1>
                    <p>Dauer und Preis werden bei der Buchung als Snapshot festgehalten.</p>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Neue Leistung</Button>
            </section>
            <Card className="dashboard-panel">
                <Table
                    rowKey="$id"
                    loading={loading}
                    dataSource={rows}
                    pagination={false}
                    scroll={{ x: 640 }}
                    columns={[
                        { title: "Name", dataIndex: "name" },
                        { title: "Dauer", render: (_: unknown, r: Service) => `${r.durationMinutes} Min` },
                        { title: "Preis", render: (_: unknown, r: Service) => `${(r.priceCents / 100).toFixed(2).replace(".", ",")} €` },
                        { title: "Status", render: (_: unknown, r: Service) => (<Space>{r.active ? <Tag color="success">Aktiv</Tag> : <Tag>Archiviert</Tag>}{r.publicVisible ? null : <Tag>Versteckt</Tag>}</Space>) },
                        {
                            title: "Aktionen",
                            render: (_: unknown, r: Service) => (
                                <Space>
                                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Bearbeiten</Button>
                                    <Button
                                        size="small" danger icon={<DeleteOutlined />}
                                        onClick={async () => {
                                            try { await del(`/api/termine/services/${r.$id}`); message.success("Gelöscht."); await load(); }
                                            catch (e) { message.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen."); }
                                        }}
                                    />
                                </Space>
                            ),
                        },
                    ]}
                />
            </Card>
            <Modal title={editing ? "Leistung bearbeiten" : "Neue Leistung"} open={open} onOk={() => void save()} onCancel={() => setOpen(false)} okText="Speichern" width={560}>
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="Name" rules={[{ required: true, message: "Name erforderlich." }]}><Input /></Form.Item>
                    <Form.Item name="description" label="Beschreibung"><Input.TextArea rows={2} /></Form.Item>
                    <Form.Item name="category" label="Kategorie"><Input /></Form.Item>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Form.Item name="durationMinutes" label="Dauer (Min)" rules={[{ required: true }]}><InputNumber min={5} max={1440} style={{ width: "100%" }} /></Form.Item>
                        <Form.Item name="price" label="Preis (€)"><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item>
                        <Form.Item name="prepMinutes" label="Vorbereitung (Min)"><InputNumber min={0} max={240} style={{ width: "100%" }} /></Form.Item>
                        <Form.Item name="cleanupMinutes" label="Nachbereitung (Min)"><InputNumber min={0} max={240} style={{ width: "100%" }} /></Form.Item>
                    </div>
                    <Form.Item name="staffIds" label="Mitarbeiter"><Select mode="multiple" allowClear options={staff.map((s) => ({ value: s.$id, label: s.name }))} /></Form.Item>
                    <Form.Item name="sortOrder" label="Reihenfolge"><InputNumber style={{ width: "100%" }} /></Form.Item>
                    <Space size="large">
                        <Form.Item name="active" label="Aktiv" valuePropName="checked"><Switch /></Form.Item>
                        <Form.Item name="publicVisible" label="Öffentlich sichtbar" valuePropName="checked"><Switch /></Form.Item>
                    </Space>
                </Form>
            </Modal>
        </div>
    );
}
