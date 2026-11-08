"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Segmented, Select, Space, Tag, message } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { get } from "@/lib/termine/client";

interface Appointment {
    $id: string; serviceId: string; staffId: string; customerName: string;
    startUtc: string; endUtc: string; status: string; serviceNameSnapshot: string;
}
interface Staff { $id: string; name: string; color?: string }

const STATUS_COLOR: Record<string, string> = {
    PENDING: "processing", CONFIRMED: "success", COMPLETED: "default",
    CANCELLED_BY_CUSTOMER: "error", CANCELLED_BY_BUSINESS: "error", NO_SHOW: "warning",
};

type View = "day" | "week" | "agenda";

export default function TermineCalendarPage() {
    const [view, setView] = useState<View>("week");
    const [cursor, setCursor] = useState<Dayjs>(dayjs().startOf("day"));
    const [rows, setRows] = useState<Appointment[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [staffId, setStaffId] = useState<string | undefined>(undefined);
    const [timezone, setTimezone] = useState("Europe/Berlin");
    const [loading, setLoading] = useState(true);

    const range = (() => {
        if (view === "day") return [cursor.startOf("day"), cursor.endOf("day")];
        const start = cursor.startOf("week");
        if (view === "week") return [start, start.add(6, "day").endOf("day")];
        return [cursor.startOf("day"), cursor.add(30, "day").endOf("day")];
    })();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            // Query ±1 day around the visible range; grouping by business tz happens client-side.
            const q = new URLSearchParams({
                from: range[0].subtract(1, "day").startOf("day").toISOString(),
                to: range[1].add(1, "day").endOf("day").toISOString(),
                ...(staffId ? { staffId } : {}),
            });
            const [a, s, st] = await Promise.all([
                get<{ appointments: Appointment[] }>(`/api/termine/appointments?${q.toString()}`),
                get<{ staff: Staff[] }>("/api/termine/staff"),
                get<{ settings: { timezone?: string } | null }>("/api/termine/settings"),
            ]);
            setRows(a.appointments.filter((x) => x.status === "PENDING" || x.status === "CONFIRMED"));
            setStaff(s.staff);
            if (st.settings?.timezone) setTimezone(st.settings.timezone);
        } catch (e) {
            message.error(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cursor.format("YYYY-MM-DD"), view, staffId]);

    useEffect(() => { void load(); }, [load]);

    const days: Dayjs[] = [];
    {
        let d = range[0].startOf("day");
        while (d.isBefore(range[1]) || d.isSame(range[1], "day")) {
            days.push(d);
            d = d.add(1, "day");
            if (days.length > 31) break;
        }
    }

    function step(dir: 1 | -1) {
        setCursor((c) => (view === "day" ? c.add(dir, "day") : view === "week" ? c.add(dir, "week") : c.add(dir, "month")));
    }

    return (
        <div className="dashboard-page">
            <section className="dashboard-welcome">
                <div>
                    <div className="dashboard-eyebrow">Termine · Kalender</div>
                    <h1>{range[0].format("DD.MM.")} – {range[1].format("DD.MM.YYYY")}</h1>
                </div>
                <Space wrap>
                    <Button icon={<LeftOutlined />} onClick={() => step(-1)} />
                    <Button onClick={() => setCursor(dayjs().startOf("day"))}>Heute</Button>
                    <Button icon={<RightOutlined />} onClick={() => step(1)} />
                    <Segmented value={view} onChange={(v) => setView(v as View)} options={[{ value: "day", label: "Tag" }, { value: "week", label: "Woche" }, { value: "agenda", label: "Agenda" }]} />
                    <Select allowClear placeholder="Mitarbeiter" value={staffId} onChange={setStaffId} style={{ width: 160 }} options={staff.map((s) => ({ value: s.$id, label: s.name }))} />
                    <DatePicker value={cursor} onChange={(d) => d && setCursor(d.startOf("day"))} format="DD.MM.YYYY" />
                </Space>
            </section>

            <Card className="dashboard-panel" loading={loading}>
                {view === "agenda" ? (
                    <div className="dashboard-invoice-list">
                        {rows.length === 0 && <p className="dashboard-empty-note">Keine Termine im Zeitraum.</p>}
                        {rows.map((a) => (
                            <div key={a.$id} className="dashboard-invoice-row">
                                <span className="dashboard-invoice-symbol">{new Date(a.startUtc).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</span>
                                <span className="dashboard-invoice-info">
                                    <strong>{a.serviceNameSnapshot} — {a.customerName}</strong>
                                    <small>{new Date(a.startUtc).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}–{new Date(a.endUtc).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} · {staff.find((s) => s.$id === a.staffId)?.name ?? ""}</small>
                                </span>
                                <Tag color={STATUS_COLOR[a.status] ?? "default"}>{a.status}</Tag>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="termine-week-grid">
                        {days.map((d) => {
                            const key = d.format("YYYY-MM-DD");
                            const list = rows.filter((a) => new Date(a.startUtc).toLocaleDateString("en-CA", { timeZone: timezone }) === key);
                            const isToday = d.isSame(dayjs(), "day");
                            return (
                                <div key={d.format("YYYY-MM-DD")} className="termine-day-column">
                                    <div className={`termine-day-head${isToday ? " termine-day-today" : ""}`}>
                                        <span>{d.format("dd")}</span>
                                        <strong>{d.format("D.M.")}</strong>
                                    </div>
                                    <div className="termine-day-body">
                                        {list.length === 0 && <span className="dashboard-empty-note">—</span>}
                                        {list.map((a) => (
                                            <div key={a.$id} className="termine-event" style={{ borderLeftColor: staff.find((s) => s.$id === a.staffId)?.color ?? "#365fd6" }}>
                                                <strong>{new Date(a.startUtc).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</strong>
                                                <span>{a.serviceNameSnapshot}</span>
                                                <small>{a.customerName}</small>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>
        </div>
    );
}
