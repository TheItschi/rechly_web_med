"use client";

import { useEffect, useState } from "react";
import { Button, Card, ColorPicker, Form, Input, Modal, Select, Space, Switch, Table, Tag, message } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { del, get, patch, post } from "@/lib/termine/client";

interface Staff { $id: string; name: string; description?: string; active: boolean; bookable: boolean; serviceIds: string[]; color?: string }
interface Service { $id: string; name: string }

export default function TermineStaffPage() {
    const [rows, setRows] = useState<Staff[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Staff | null>(null);
    const [form] = Form.useForm();

    async function load() {
        setLoading(true);
        try {
            const [s, sv] = await Promise.all([
                get<{ staff: Staff[] }>("/api/termine/staff"),
                get<{ services: Service[] }>("/api/termine/services"),
            ]);
            setRows(s.staff);
            setServices(sv.services);
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
        form.setFieldsValue({ active: true, bookable: true, serviceIds: [] });
        setOpen(true);
    }

    function openEdit(r: Staff) {
        setEditing(r);
        form.setFieldsValue(r);
        setOpen(true);
    }

    async function save() {
        try {
            const v = await form.validateFields();
            const color = v.color;
            const payload = {
                ...v,
                color: typeof color === "string" ? color : color?.toHexString?.() ?? undefined,
            };
            if (editing) await patch(`/api/termine/staff/${editing.$id}`, payload);
            else await post("/api/termine/staff", payload);
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
                    <div className="dashboard-eyebrow">Termine · Mitarbeiter</div>
                    <h1>Mitarbeiter</h1>
                    <p>Mitarbeiter sind Profile für die Buchung — kein eigener Login nötig.</p>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Neuer Mitarbeiter</Button>
            </section>
            <Card className="dashboard-panel">
                <Table
                    rowKey="$id" loading={loading} dataSource={rows} pagination={false} scroll={{ x: 560 }}
                    columns={[
                        { title: "Name", dataIndex: "name" },
                        {
                            title: "Status",
                            render: (_: unknown, r: Staff) => (
                                <Space>{r.active ? <Tag color="success">Aktiv</Tag> : <Tag>Inaktiv</Tag>}{r.bookable ? null : <Tag>Versteckt</Tag>}</Space>
                            ),
                        },
                        { title: "Leistungen", render: (_: unknown, r: Staff) => `${r.serviceIds.length}` },
                        {
                            title: "Aktionen",
                            render: (_: unknown, r: Staff) => (
                                <Space>
                                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Bearbeiten</Button>
                                    <Button size="small" danger icon={<DeleteOutlined />} onClick={async () => {
                                        try { await del(`/api/termine/staff/${r.$id}`); message.success("Gelöscht."); await load(); }
                                        catch (e) { message.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen."); }
                                    }} />
                                </Space>
                            ),
                        },
                    ]}
                />
            </Card>
            <Modal title={editing ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"} open={open} onOk={() => void save()} onCancel={() => setOpen(false)} okText="Speichern">
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="Name" rules={[{ required: true, message: "Name erforderlich." }]}><Input /></Form.Item>
                    <Form.Item name="description" label="Beschreibung"><Input.TextArea rows={2} /></Form.Item>
                    <Form.Item name="serviceIds" label="Leistungen"><Select mode="multiple" allowClear options={services.map((s) => ({ value: s.$id, label: s.name }))} /></Form.Item>
                    <Form.Item name="color" label="Kalenderfarbe"><ColorPicker /></Form.Item>
                    <Space size="large">
                        <Form.Item name="active" label="Aktiv" valuePropName="checked"><Switch /></Form.Item>
                        <Form.Item name="bookable" label="Online buchbar" valuePropName="checked"><Switch /></Form.Item>
                    </Space>
                </Form>
            </Modal>
        </div>
    );
}
