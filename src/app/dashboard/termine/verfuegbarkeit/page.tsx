"use client";

import { useEffect, useState } from "react";
import { Button, Card, DatePicker, Form, Input, Modal, Select, Space, Switch, Table, Tag, TimePicker, message } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { del, get, post } from "@/lib/termine/client";

interface HoursRow { $id: string; kind: string; day?: string; date?: string; closed: boolean; periods: string; breaks: string }
interface BlockRow { $id: string; staffId?: string; startUtc: string; endUtc: string; reason?: string }
interface Staff { $id: string; name: string }

const DOW = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function parsePeriods(raw: string): Array<{ start: Dayjs | null; end: Dayjs | null }> {
    try {
        const v = JSON.parse(raw || "[]");
        if (!Array.isArray(v)) return [];
        return v.map((p: { start: string; end: string }) => ({ start: dayjs(p.start, "HH:mm"), end: dayjs(p.end, "HH:mm") }));
    } catch {
        return [];
    }
}

export default function TermineAvailabilityPage() {
    const [hours, setHours] = useState<HoursRow[]>([]);
    const [blocks, setBlocks] = useState<BlockRow[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [day, setDay] = useState("1");
    const [periods, setPeriods] = useState<Array<{ start: Dayjs | null; end: Dayjs | null }>>([{ start: dayjs("09:00", "HH:mm"), end: dayjs("18:00", "HH:mm") }]);
    const [closed, setClosed] = useState(false);
    const [overrideDate, setOverrideDate] = useState<Dayjs | null>(null);
    const [blockOpen, setBlockOpen] = useState(false);
    const [blockForm] = Form.useForm();

    async function load() {
        setLoading(true);
        try {
            const [h, b, s] = await Promise.all([
                get<{ hours: HoursRow[] }>("/api/termine/hours"),
                get<{ blocks: BlockRow[] }>("/api/termine/blocks"),
                get<{ staff: Staff[] }>("/api/termine/staff"),
            ]);
            setHours(h.hours);
            setBlocks(b.blocks);
            setStaff(s.staff);
        } catch (e) {
            message.error(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { void load(); }, []);

    async function saveWeek() {
        try {
            await post("/api/termine/hours", {
                kind: "week",
                day,
                closed,
                periods: closed ? [] : periods.filter((p) => p.start && p.end).map((p) => ({ start: p.start!.format("HH:mm"), end: p.end!.format("HH:mm") })),
                breaks: [],
            });
            message.success("Gespeichert.");
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
        }
    }

    async function saveOverride() {
        if (!overrideDate) {
            message.warning("Bitte ein Datum wählen.");
            return;
        }
        try {
            await post("/api/termine/hours", {
                kind: "override",
                date: overrideDate.format("YYYY-MM-DD"),
                closed,
                periods: closed ? [] : periods.filter((p) => p.start && p.end).map((p) => ({ start: p.start!.format("HH:mm"), end: p.end!.format("HH:mm") })),
                breaks: [],
            });
            message.success("Gespeichert.");
            setOverrideDate(null);
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
        }
    }

    const weekRows = hours.filter((h) => h.kind === "week");
    const overrideRows = hours.filter((h) => h.kind === "override");

    return (
        <div className="dashboard-page">
            <section className="dashboard-welcome">
                <div>
                    <div className="dashboard-eyebrow">Termine · Verfügbarkeit</div>
                    <h1>Arbeitszeiten</h1>
                    <p>Öffnungszeiten, Ausnahmen und Abwesenheiten bestimmen die buchbaren Zeiten.</p>
                </div>
            </section>

            <Card className="dashboard-panel" title="Wochenplan" loading={loading}>
                <Space wrap style={{ marginBottom: 16 }}>
                    <Select value={day} onChange={setDay} options={DOW.map((label, i) => ({ value: String(i), label }))} style={{ width: 140 }} />
                    <Switch checked={!closed} onChange={(v) => setClosed(!v)} checkedChildren="Geöffnet" unCheckedChildren="Geschlossen" />
                </Space>
                {!closed && periods.map((p, i) => (
                    <Space key={i} style={{ marginBottom: 8 }}>
                        <TimePicker format="HH:mm" value={p.start} onChange={(v) => setPeriods(periods.map((x, j) => (j === i ? { ...x, start: v } : x)))} />
                        <span>–</span>
                        <TimePicker format="HH:mm" value={p.end} onChange={(v) => setPeriods(periods.map((x, j) => (j === i ? { ...x, end: v } : x)))} />
                        <Button danger type="text" onClick={() => setPeriods(periods.filter((_, j) => j !== i))}>Entfernen</Button>
                    </Space>
                ))}
                {!closed && <div><Button type="dashed" onClick={() => setPeriods([...periods, { start: dayjs("09:00", "HH:mm"), end: dayjs("18:00", "HH:mm") }])}>Zeitraum hinzufügen</Button></div>}
                <div style={{ marginTop: 16 }}><Button type="primary" onClick={() => void saveWeek()}>Wochentag speichern</Button></div>
                <Table
                    style={{ marginTop: 16 }} rowKey="$id" pagination={false} size="small" dataSource={weekRows}
                    columns={[
                        { title: "Tag", render: (_: unknown, r: HoursRow) => DOW[Number(r.day)] },
                        { title: "Zeiten", render: (_: unknown, r: HoursRow) => (r.closed ? <Tag>Geschlossen</Tag> : parsePeriods(r.periods).map((p) => `${p.start?.format("HH:mm")}–${p.end?.format("HH:mm")}`).join(", ")) },
                    ]}
                    locale={{ emptyText: "Noch keine Wochentage gespeichert." }}
                />
            </Card>

            <Card className="dashboard-panel" title="Ausnahmen (Feiertage, Urlaub)" style={{ marginTop: 18 }}>
                <Space wrap style={{ marginBottom: 16 }}>
                    <DatePicker value={overrideDate} onChange={setOverrideDate} format="DD.MM.YYYY" />
                    <Switch checked={!closed} onChange={(v) => setClosed(!v)} checkedChildren="Geöffnet" unCheckedChildren="Geschlossen" />
                    <Button type="primary" onClick={() => void saveOverride()}>Ausnahme speichern</Button>
                </Space>
                <Table
                    rowKey="$id" pagination={false} size="small" dataSource={overrideRows}
                    columns={[
                        { title: "Datum", dataIndex: "date" },
                        { title: "Zeiten", render: (_: unknown, r: HoursRow) => (r.closed ? <Tag>Geschlossen</Tag> : parsePeriods(r.periods).map((p) => `${p.start?.format("HH:mm")}–${p.end?.format("HH:mm")}`).join(", ")) },
                    ]}
                    locale={{ emptyText: "Keine Ausnahmen." }}
                />
            </Card>

            <Card
                className="dashboard-panel" title="Abwesenheiten & Sperrzeiten" style={{ marginTop: 18 }}
                extra={<Button icon={<PlusOutlined />} type="primary" onClick={() => setBlockOpen(true)}>Sperren</Button>}
            >
                <Table
                    rowKey="$id" pagination={false} size="small" dataSource={blocks}
                    columns={[
                        { title: "Von", render: (_: unknown, r: BlockRow) => new Date(r.startUtc).toLocaleString("de-DE") },
                        { title: "Bis", render: (_: unknown, r: BlockRow) => new Date(r.endUtc).toLocaleString("de-DE") },
                        { title: "Mitarbeiter", render: (_: unknown, r: BlockRow) => staff.find((s) => s.$id === r.staffId)?.name ?? "Alle" },
                        { title: "Grund", dataIndex: "reason" },
                        {
                            title: "",
                            render: (_: unknown, r: BlockRow) => (
                                <Button size="small" danger icon={<DeleteOutlined />} onClick={async () => {
                                    try { await del(`/api/termine/blocks/${r.$id}`); await load(); }
                                    catch (e) { message.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen."); }
                                }} />
                            ),
                        },
                    ]}
                    locale={{ emptyText: "Keine Sperrzeiten." }}
                />
            </Card>

            <Modal title="Zeitraum sperren" open={blockOpen} onCancel={() => setBlockOpen(false)} footer={null}>
                <Form
                    form={blockForm} layout="vertical"
                    onFinish={async (v) => {
                        try {
                            await post("/api/termine/blocks", {
                                staffId: v.staffId ?? null,
                                startUtc: (v.range[0] as Dayjs).toISOString(),
                                endUtc: (v.range[1] as Dayjs).toISOString(),
                                reason: v.reason,
                            });
                            message.success("Gespeichert.");
                            setBlockOpen(false);
                            blockForm.resetFields();
                            await load();
                        } catch (e) {
                            message.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
                        }
                    }}
                >
                    <Form.Item name="staffId" label="Mitarbeiter (leer = alle)"><Select allowClear options={staff.map((s) => ({ value: s.$id, label: s.name }))} /></Form.Item>
                    <Form.Item name="range" label="Zeitraum" rules={[{ required: true }]}><DatePicker.RangePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: "100%" }} /></Form.Item>
                    <Form.Item name="reason" label="Grund"><Input /></Form.Item>
                    <Button type="primary" htmlType="submit" block>Sperren</Button>
                </Form>
            </Modal>
        </div>
    );
}
