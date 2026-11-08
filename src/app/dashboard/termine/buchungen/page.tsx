"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    Alert,
    Button,
    Card,
    ColorPicker,
    DatePicker,
    Form,
    Input,
    Modal,
    Select,
    Space,
    Switch,
    Table,
    Tabs,
    Tag,
    TimePicker,
    message,
} from "antd";
import {
    CalendarOutlined,
    ClockCircleOutlined,
    DeleteOutlined,
    EditOutlined,
    FileTextOutlined,
    LinkOutlined,
    PlusOutlined,
    SettingOutlined,
    TeamOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useLanguage } from "@/contexts/LanguageContext";
import { del, get, patch, post } from "@/lib/termine/client";
import {
    BlockTimeModal,
    BOOKING_STATUS_COLOR,
    BookingDetailDrawer,
    bookingStatusLabel,
    ManualBookingModal,
    type UnifiedBookingRecord,
} from "@/components/termine/BookingDrawerAndModals";

interface AppointmentRow extends Omit<UnifiedBookingRecord, "id"> {
    $id: string;
}

interface ServiceRow {
    $id: string;
    name: string;
    durationMinutes: number;
    priceCents: number;
    currency: string;
    active: boolean;
}

interface StaffRow {
    $id: string;
    name: string;
    description?: string;
    active: boolean;
    bookable: boolean;
    serviceIds: string[];
    color?: string;
}

interface HoursRow {
    $id: string;
    kind: string;
    day?: string;
    date?: string;
    closed: boolean;
    periods: string;
    breaks: string;
}

interface BlockRow {
    $id: string;
    staffId?: string;
    startUtc: string;
    endUtc: string;
    reason?: string;
}

interface SettingsSummary {
    slug: string;
    displayName: string;
    enabled: boolean;
    published: boolean;
}

const DOW_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const DOW_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parsePeriods(raw: string): Array<{ start: Dayjs | null; end: Dayjs | null }> {
    try {
        const v = JSON.parse(raw || "[]");
        if (!Array.isArray(v)) return [];
        return v.map((p: { start: string; end: string }) => ({
            start: dayjs(p.start, "HH:mm"),
            end: dayjs(p.end, "HH:mm"),
        }));
    } catch {
        return [];
    }
}

export default function TermineSchedulingHubPage() {
    const { language } = useLanguage();
    const l = (de: string, en: string) => (language === "de" ? de : en);
    const dow = language === "de" ? DOW_DE : DOW_EN;
    const locale = language === "de" ? "de-DE" : "en-GB";
    const searchParams = useSearchParams();

    const [activeTab, setActiveTab] = useState("bookings");
    const [settings, setSettings] = useState<SettingsSummary | null>(null);
    const [rows, setRows] = useState<AppointmentRow[]>([]);
    const [services, setServices] = useState<ServiceRow[]>([]);
    const [staff, setStaff] = useState<StaffRow[]>([]);
    const [hours, setHours] = useState<HoursRow[]>([]);
    const [blocks, setBlocks] = useState<BlockRow[]>([]);
    const [loading, setLoading] = useState(true);

    // Booking filters & modals
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [staffFilter, setStaffFilter] = useState<string | undefined>(undefined);
    const [searchText, setSearchText] = useState("");
    const [day, setDay] = useState<Dayjs | null>(null);
    const [detail, setDetail] = useState<UnifiedBookingRecord | null>(null);
    const [manualOpen, setManualOpen] = useState(false);
    const [preselectedClientId, setPreselectedClientId] = useState<string | undefined>(undefined);

    // Availability state
    const [weekDay, setWeekDay] = useState("1");
    const [periods, setPeriods] = useState<Array<{ start: Dayjs | null; end: Dayjs | null }>>([
        { start: dayjs("09:00", "HH:mm"), end: dayjs("18:00", "HH:mm") },
    ]);
    const [closed, setClosed] = useState(false);
    const [overrideDate, setOverrideDate] = useState<Dayjs | null>(null);
    const [blockOpen, setBlockOpen] = useState(false);

    // Staff modal state
    const [staffModalOpen, setStaffModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffRow | null>(null);
    const [staffForm] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const q = new URLSearchParams();
            if (statusFilter) q.set("status", statusFilter);
            if (staffFilter) q.set("staffId", staffFilter);
            if (day) {
                q.set("from", day.startOf("day").toISOString());
                q.set("to", day.add(1, "day").startOf("day").toISOString());
            }
            const [stRes, a, s, st, h, b] = await Promise.all([
                get<{ settings: SettingsSummary | null }>("/api/termine/settings"),
                get<{ appointments: AppointmentRow[] }>(`/api/termine/appointments?${q.toString()}`),
                get<{ services: ServiceRow[] }>("/api/termine/services"),
                get<{ staff: StaffRow[] }>("/api/termine/staff"),
                get<{ hours: HoursRow[] }>("/api/termine/hours"),
                get<{ blocks: BlockRow[] }>("/api/termine/blocks"),
            ]);
            setSettings(stRes.settings);
            setRows(a.appointments);
            setServices(s.services);
            setStaff(st.staff);
            setHours(h.hours);
            setBlocks(b.blocks);
        } catch (e) {
            message.error(e instanceof Error ? e.message : l("Laden fehlgeschlagen.", "Failed to load scheduling data."));
        } finally {
            setLoading(false);
        }
    }, [statusFilter, staffFilter, day, language]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab && ["bookings", "availability", "staff"].includes(tab)) {
            setActiveTab(tab);
        }
        const stParam = searchParams.get("status");
        if (stParam) setStatusFilter(stParam);
        const clientId = searchParams.get("clientId");
        if (searchParams.get("action") === "neu" || clientId) {
            if (clientId) setPreselectedClientId(clientId);
            setManualOpen(true);
        }
    }, [searchParams]);

    async function saveWeek() {
        try {
            await post("/api/termine/hours", {
                kind: "week",
                day: weekDay,
                closed,
                periods: closed
                    ? []
                    : periods
                          .filter((p) => p.start && p.end)
                          .map((p) => ({ start: p.start!.format("HH:mm"), end: p.end!.format("HH:mm") })),
                breaks: [],
            });
            message.success(l("Arbeitszeiten gespeichert.", "Working hours saved."));
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : l("Speichern fehlgeschlagen.", "Save failed."));
        }
    }

    async function saveOverride() {
        if (!overrideDate) {
            message.warning(l("Bitte ein Datum wählen.", "Please choose a date."));
            return;
        }
        try {
            await post("/api/termine/hours", {
                kind: "override",
                date: overrideDate.format("YYYY-MM-DD"),
                closed,
                periods: closed
                    ? []
                    : periods
                          .filter((p) => p.start && p.end)
                          .map((p) => ({ start: p.start!.format("HH:mm"), end: p.end!.format("HH:mm") })),
                breaks: [],
            });
            message.success(l("Ausnahme gespeichert.", "Date override saved."));
            setOverrideDate(null);
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : l("Speichern fehlgeschlagen.", "Save failed."));
        }
    }

    function openNewStaff() {
        setEditingStaff(null);
        staffForm.resetFields();
        staffForm.setFieldsValue({ active: true, bookable: true, serviceIds: services.map((s) => s.$id) });
        setStaffModalOpen(true);
    }

    function openEditStaff(r: StaffRow) {
        setEditingStaff(r);
        staffForm.setFieldsValue(r);
        setStaffModalOpen(true);
    }

    async function saveStaff() {
        try {
            const v = await staffForm.validateFields();
            const color = v.color;
            const payload = {
                ...v,
                color: typeof color === "string" ? color : color?.toHexString?.() ?? undefined,
            };
            if (editingStaff) await patch(`/api/termine/staff/${editingStaff.$id}`, payload);
            else await post("/api/termine/staff", payload);
            message.success(l("Mitarbeiter gespeichert.", "Staff saved."));
            setStaffModalOpen(false);
            await load();
        } catch (e) {
            if (e instanceof Error && !String(e).includes("validate")) message.error(e.message);
        }
    }

    const filteredBookings = rows.filter((r) => {
        if (!searchText.trim()) return true;
        const q = searchText.toLowerCase();
        return (
            r.customerName.toLowerCase().includes(q) ||
            r.customerEmail.toLowerCase().includes(q) ||
            r.serviceNameSnapshot.toLowerCase().includes(q)
        );
    });

    const weekRows = hours.filter((h) => h.kind === "week");
    const overrideRows = hours.filter((h) => h.kind === "override");
    const staffOptions = staff.filter((s) => s.active).map((s) => ({ id: s.$id, name: s.name }));
    const serviceOptions = services
        .filter((s) => s.active)
        .map((s) => ({
            id: s.$id,
            name: s.name,
            durationMinutes: s.durationMinutes,
            priceCents: s.priceCents,
            currency: s.currency,
        }));

    return (
        <div className="dashboard-page">
            <section className="dashboard-welcome">
                <div>
                    <div className="dashboard-eyebrow">{l("Planung & Online-Buchung", "Scheduling & Online Booking")}</div>
                    <h1>{l("Terminbuchungen & Verfügbarkeit", "Bookings & Availability")}</h1>
                    <p>
                        {l(
                            "Kundenbuchungen verwalten, Arbeitszeiten pflegen und abgeschlossene Termine direkt als Rechnung übernehmen.",
                            "Manage customer bookings, configure working hours and turn completed appointments directly into invoices.",
                        )}
                    </p>
                </div>
                <Space wrap>
                    <Link href="/dashboard/calendar">
                        <Button icon={<CalendarOutlined />}>{l("Kalender öffnen", "Open calendar")}</Button>
                    </Link>
                    <Link href="/dashboard/products?tab=services">
                        <Button>{l("Buchbare Leistungen", "Bookable services")}</Button>
                    </Link>
                    <Link href="/dashboard/settings?tab=booking">
                        <Button icon={<SettingOutlined />}>{l("Buchungs-Einstellungen", "Booking settings")}</Button>
                    </Link>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        disabled={!settings}
                        onClick={() => {
                            setPreselectedClientId(undefined);
                            setManualOpen(true);
                        }}
                    >
                        {l("Manuelle Buchung", "New booking")}
                    </Button>
                </Space>
            </section>

            {!loading && !settings && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    title={l("Online-Terminbuchung noch nicht aktiviert", "Online booking not yet activated")}
                    description={l(
                        "Aktivieren Sie Ihre Buchungs-URL in den Einstellungen — Ihre Firmendaten werden automatisch übernommen.",
                        "Activate your booking URL in Settings — your company profile will be inherited automatically.",
                    )}
                    action={
                        <Link href="/dashboard/settings?tab=booking">
                            <Button type="primary">{l("Jetzt einrichten", "Set up now")}</Button>
                        </Link>
                    }
                />
            )}

            {settings && (
                <div style={{ marginBottom: 12 }}>
                    <Space wrap>
                        <Tag color={settings.enabled && settings.published ? "success" : "default"}>
                            {settings.enabled && settings.published
                                ? l("Öffentliche Buchung aktiv", "Public booking live")
                                : l("Vorschau / Nicht veröffentlicht", "Draft / Unpublished")}
                        </Tag>
                        <a href={`/buchen/${settings.slug}`} target="_blank" rel="noreferrer">
                            /buchen/{settings.slug} <LinkOutlined />
                        </a>
                    </Space>
                </div>
            )}

            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    {
                        key: "bookings",
                        label: (
                            <span>
                                <CalendarOutlined /> {l("Buchungen", "Bookings")} ({rows.length})
                            </span>
                        ),
                        children: (
                            <>
                                <Space wrap style={{ marginBottom: 16 }}>
                                    <Input.Search
                                        allowClear
                                        placeholder={l("Kunde oder Leistung suchen …", "Search client or service …")}
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        style={{ width: 240 }}
                                    />
                                    <Select
                                        allowClear
                                        placeholder="Status"
                                        value={statusFilter}
                                        onChange={setStatusFilter}
                                        style={{ width: 190 }}
                                        options={[
                                            "PENDING",
                                            "CONFIRMED",
                                            "COMPLETED",
                                            "CANCELLED_BY_CUSTOMER",
                                            "CANCELLED_BY_BUSINESS",
                                            "NO_SHOW",
                                        ].map((s) => ({ value: s, label: bookingStatusLabel(s, language) }))}
                                    />
                                    {staff.length > 0 && (
                                        <Select
                                            allowClear
                                            placeholder={l("Mitarbeiter", "Staff")}
                                            value={staffFilter}
                                            onChange={setStaffFilter}
                                            style={{ width: 170 }}
                                            options={staff.map((s) => ({ value: s.$id, label: s.name }))}
                                        />
                                    )}
                                    <DatePicker
                                        value={day}
                                        onChange={setDay}
                                        format="DD.MM.YYYY"
                                        placeholder={l("Tag filtern", "Filter date")}
                                        allowClear
                                    />
                                </Space>

                                <Card className="dashboard-panel">
                                    <Table
                                        rowKey="$id"
                                        loading={loading}
                                        dataSource={filteredBookings}
                                        pagination={{ pageSize: 20 }}
                                        scroll={{ x: 760 }}
                                        onRow={(r) => ({
                                            style: { cursor: "pointer" },
                                            onClick: () =>
                                                setDetail({
                                                    ...r,
                                                    id: r.$id,
                                                    staffName: staff.find((s) => s.$id === r.staffId)?.name,
                                                }),
                                        })}
                                        columns={[
                                            {
                                                title: l("Termin", "Date & Time"),
                                                render: (_: unknown, r: AppointmentRow) =>
                                                    new Date(r.startUtc).toLocaleString(locale, {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    }),
                                            },
                                            { title: l("Leistung", "Service"), dataIndex: "serviceNameSnapshot" },
                                            {
                                                title: l("Kunde", "Customer"),
                                                render: (_: unknown, r: AppointmentRow) => (
                                                    <span>
                                                        <strong>{r.customerName}</strong>
                                                        <br />
                                                        <small style={{ color: "var(--dash-muted)" }}>{r.customerEmail}</small>
                                                    </span>
                                                ),
                                            },
                                            {
                                                title: l("Mitarbeiter", "Staff"),
                                                render: (_: unknown, r: AppointmentRow) =>
                                                    staff.find((s) => s.$id === r.staffId)?.name ?? "—",
                                            },
                                            {
                                                title: "Status",
                                                render: (_: unknown, r: AppointmentRow) => (
                                                    <Tag color={BOOKING_STATUS_COLOR[r.status] ?? "default"}>
                                                        {bookingStatusLabel(r.status, language)}
                                                    </Tag>
                                                ),
                                            },
                                            {
                                                title: l("Abrechnung", "Billing"),
                                                render: (_: unknown, r: AppointmentRow) =>
                                                    r.linkedInvoiceId ? (
                                                        <Link
                                                            href={`/dashboard/invoices/${r.linkedInvoiceId}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Tag color="green">
                                                                <FileTextOutlined /> {l("Rechnung", "Invoice")}
                                                            </Tag>
                                                        </Link>
                                                    ) : r.status === "COMPLETED" ? (
                                                        <Tag color="gold">{l("Abrechenbar", "Ready to bill")}</Tag>
                                                    ) : (
                                                        "—"
                                                    ),
                                            },
                                        ]}
                                        locale={{ emptyText: l("Keine Buchungen gefunden.", "No bookings found.") }}
                                    />
                                </Card>
                            </>
                        ),
                    },
                    {
                        key: "availability",
                        label: (
                            <span>
                                <ClockCircleOutlined /> {l("Arbeitszeiten & Sperrzeiten", "Working Hours & Blocks")}
                            </span>
                        ),
                        children: (
                            <>
                                <Card className="dashboard-panel" title={l("Regulärer Wochenplan", "Weekly schedule")} loading={loading}>
                                    <Space wrap style={{ marginBottom: 16 }}>
                                        <Select
                                            value={weekDay}
                                            onChange={setWeekDay}
                                            options={dow.map((label, i) => ({ value: String(i), label }))}
                                            style={{ width: 140 }}
                                        />
                                        <Switch
                                            checked={!closed}
                                            onChange={(v) => setClosed(!v)}
                                            checkedChildren={l("Geöffnet", "Open")}
                                            unCheckedChildren={l("Geschlossen", "Closed")}
                                        />
                                    </Space>
                                    {!closed &&
                                        periods.map((p, i) => (
                                            <Space key={i} style={{ marginBottom: 8, display: "flex" }} wrap>
                                                <TimePicker
                                                    format="HH:mm"
                                                    value={p.start}
                                                    onChange={(v) =>
                                                        setPeriods(periods.map((x, j) => (j === i ? { ...x, start: v } : x)))
                                                    }
                                                />
                                                <span>–</span>
                                                <TimePicker
                                                    format="HH:mm"
                                                    value={p.end}
                                                    onChange={(v) =>
                                                        setPeriods(periods.map((x, j) => (j === i ? { ...x, end: v } : x)))
                                                    }
                                                />
                                                <Button
                                                    danger
                                                    type="text"
                                                    onClick={() => setPeriods(periods.filter((_, j) => j !== i))}
                                                >
                                                    {l("Entfernen", "Remove")}
                                                </Button>
                                            </Space>
                                        ))}
                                    {!closed && (
                                        <div>
                                            <Button
                                                type="dashed"
                                                onClick={() =>
                                                    setPeriods([
                                                        ...periods,
                                                        { start: dayjs("09:00", "HH:mm"), end: dayjs("18:00", "HH:mm") },
                                                    ])
                                                }
                                            >
                                                {l("Zeitraum hinzufügen", "Add time window")}
                                            </Button>
                                        </div>
                                    )}
                                    <div style={{ marginTop: 16 }}>
                                        <Button type="primary" onClick={() => void saveWeek()}>
                                            {l("Wochentag speichern", "Save weekday")}
                                        </Button>
                                    </div>
                                    <Table
                                        style={{ marginTop: 16 }}
                                        rowKey="$id"
                                        pagination={false}
                                        size="small"
                                        dataSource={weekRows}
                                        columns={[
                                            { title: l("Tag", "Day"), render: (_: unknown, r: HoursRow) => dow[Number(r.day)] },
                                            {
                                                title: l("Zeiten", "Hours"),
                                                render: (_: unknown, r: HoursRow) =>
                                                    r.closed ? (
                                                        <Tag>{l("Geschlossen", "Closed")}</Tag>
                                                    ) : (
                                                        parsePeriods(r.periods)
                                                            .map((p) => `${p.start?.format("HH:mm")}–${p.end?.format("HH:mm")}`)
                                                            .join(", ")
                                                    ),
                                            },
                                        ]}
                                        locale={{ emptyText: l("Noch keine Wochentage gespeichert.", "No weekly hours configured yet.") }}
                                    />
                                </Card>

                                <Card
                                    className="dashboard-panel"
                                    title={l("Ausnahmen (Feiertage, Sonderöffnungszeiten)", "Date overrides (holidays, special hours)")}
                                    style={{ marginTop: 18 }}
                                >
                                    <Space wrap style={{ marginBottom: 16 }}>
                                        <DatePicker value={overrideDate} onChange={setOverrideDate} format="DD.MM.YYYY" />
                                        <Switch
                                            checked={!closed}
                                            onChange={(v) => setClosed(!v)}
                                            checkedChildren={l("Geöffnet", "Open")}
                                            unCheckedChildren={l("Geschlossen", "Closed")}
                                        />
                                        <Button type="primary" onClick={() => void saveOverride()}>
                                            {l("Ausnahme speichern", "Save override")}
                                        </Button>
                                    </Space>
                                    <Table
                                        rowKey="$id"
                                        pagination={false}
                                        size="small"
                                        dataSource={overrideRows}
                                        columns={[
                                            { title: l("Datum", "Date"), dataIndex: "date" },
                                            {
                                                title: l("Zeiten", "Hours"),
                                                render: (_: unknown, r: HoursRow) =>
                                                    r.closed ? (
                                                        <Tag>{l("Geschlossen", "Closed")}</Tag>
                                                    ) : (
                                                        parsePeriods(r.periods)
                                                            .map((p) => `${p.start?.format("HH:mm")}–${p.end?.format("HH:mm")}`)
                                                            .join(", ")
                                                    ),
                                            },
                                        ]}
                                        locale={{ emptyText: l("Keine Ausnahmen.", "No date overrides.") }}
                                    />
                                </Card>

                                <Card
                                    className="dashboard-panel"
                                    title={l("Abwesenheiten & Sperrzeiten (erscheinen auch im Kalender)", "Blocked times & absences (synced to Calendar)")}
                                    style={{ marginTop: 18 }}
                                    extra={
                                        <Button icon={<PlusOutlined />} type="primary" onClick={() => setBlockOpen(true)}>
                                            {l("Zeitraum sperren", "Block time")}
                                        </Button>
                                    }
                                >
                                    <Table
                                        rowKey="$id"
                                        pagination={false}
                                        size="small"
                                        dataSource={blocks}
                                        columns={[
                                            { title: l("Von", "From"), render: (_: unknown, r: BlockRow) => new Date(r.startUtc).toLocaleString(locale) },
                                            { title: l("Bis", "Until"), render: (_: unknown, r: BlockRow) => new Date(r.endUtc).toLocaleString(locale) },
                                            {
                                                title: l("Mitarbeiter", "Staff"),
                                                render: (_: unknown, r: BlockRow) =>
                                                    staff.find((s) => s.$id === r.staffId)?.name ?? l("Alle", "All"),
                                            },
                                            { title: l("Grund", "Reason"), dataIndex: "reason" },
                                            {
                                                title: "",
                                                render: (_: unknown, r: BlockRow) => (
                                                    <Button
                                                        size="small"
                                                        danger
                                                        icon={<DeleteOutlined />}
                                                        onClick={async () => {
                                                            try {
                                                                await del(`/api/termine/blocks/${r.$id}`);
                                                                await load();
                                                            } catch (e) {
                                                                message.error(
                                                                    e instanceof Error ? e.message : l("Löschen fehlgeschlagen.", "Delete failed."),
                                                                );
                                                            }
                                                        }}
                                                    />
                                                ),
                                            },
                                        ]}
                                        locale={{ emptyText: l("Keine Sperrzeiten.", "No blocked times.") }}
                                    />
                                </Card>
                            </>
                        ),
                    },
                    {
                        key: "staff",
                        label: (
                            <span>
                                <TeamOutlined /> {l("Mitarbeiter", "Staff")} ({staff.length})
                            </span>
                        ),
                        children: (
                            <Card
                                className="dashboard-panel"
                                title={l("Buchbare Mitarbeiterprofile", "Bookable staff profiles")}
                                extra={
                                    <Button type="primary" icon={<PlusOutlined />} onClick={openNewStaff}>
                                        {l("Neuer Mitarbeiter", "Add staff")}
                                    </Button>
                                }
                            >
                                <Table
                                    rowKey="$id"
                                    loading={loading}
                                    dataSource={staff}
                                    pagination={false}
                                    scroll={{ x: 560 }}
                                    columns={[
                                        {
                                            title: "Name",
                                            render: (_: unknown, r: StaffRow) => (
                                                <Space>
                                                    {r.color && (
                                                        <span
                                                            style={{
                                                                display: "inline-block",
                                                                width: 10,
                                                                height: 10,
                                                                borderRadius: "50%",
                                                                background: r.color,
                                                            }}
                                                        />
                                                    )}
                                                    <strong>{r.name}</strong>
                                                </Space>
                                            ),
                                        },
                                        {
                                            title: "Status",
                                            render: (_: unknown, r: StaffRow) => (
                                                <Space>
                                                    {r.active ? (
                                                        <Tag color="success">{l("Aktiv", "Active")}</Tag>
                                                    ) : (
                                                        <Tag>{l("Inaktiv", "Inactive")}</Tag>
                                                    )}
                                                    {r.bookable ? null : <Tag>{l("Nur intern", "Internal only")}</Tag>}
                                                </Space>
                                            ),
                                        },
                                        {
                                            title: l("Zugeordnete Leistungen", "Assigned services"),
                                            render: (_: unknown, r: StaffRow) => `${r.serviceIds.length}`,
                                        },
                                        {
                                            title: l("Aktionen", "Actions"),
                                            render: (_: unknown, r: StaffRow) => (
                                                <Space>
                                                    <Button size="small" icon={<EditOutlined />} onClick={() => openEditStaff(r)}>
                                                        {l("Bearbeiten", "Edit")}
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        danger
                                                        icon={<DeleteOutlined />}
                                                        onClick={async () => {
                                                            try {
                                                                await del(`/api/termine/staff/${r.$id}`);
                                                                message.success(l("Gelöscht.", "Deleted."));
                                                                await load();
                                                            } catch (e) {
                                                                message.error(
                                                                    e instanceof Error ? e.message : l("Löschen fehlgeschlagen.", "Delete failed."),
                                                                );
                                                            }
                                                        }}
                                                    />
                                                </Space>
                                            ),
                                        },
                                    ]}
                                    locale={{ emptyText: l("Noch keine Mitarbeiter angelegt.", "No staff profiles created yet.") }}
                                />
                            </Card>
                        ),
                    },
                ]}
            />

            <BookingDetailDrawer
                booking={detail}
                staff={staffOptions}
                onClose={() => setDetail(null)}
                onChanged={load}
            />
            <ManualBookingModal
                open={manualOpen}
                services={serviceOptions}
                staff={staffOptions}
                initialClientId={preselectedClientId}
                onCancel={() => setManualOpen(false)}
                onCreated={load}
            />
            <BlockTimeModal
                open={blockOpen}
                staff={staffOptions}
                onCancel={() => setBlockOpen(false)}
                onCreated={load}
            />

            <Modal
                title={editingStaff ? l("Mitarbeiter bearbeiten", "Edit staff") : l("Neuer Mitarbeiter", "New staff")}
                open={staffModalOpen}
                onOk={() => void saveStaff()}
                onCancel={() => setStaffModalOpen(false)}
                okText={l("Speichern", "Save")}
            >
                <Form form={staffForm} layout="vertical">
                    <Form.Item
                        name="name"
                        label="Name"
                        rules={[{ required: true, message: l("Name erforderlich.", "Name required.") }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label={l("Beschreibung / Rolle", "Description / role")}>
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="serviceIds" label={l("Buchbare Leistungen", "Bookable services")}>
                        <Select
                            mode="multiple"
                            allowClear
                            options={services.map((s) => ({ value: s.$id, label: s.name }))}
                        />
                    </Form.Item>
                    <Form.Item name="color" label={l("Kalenderfarbe", "Calendar color")}>
                        <ColorPicker />
                    </Form.Item>
                    <Space size="large">
                        <Form.Item name="active" label={l("Aktiv", "Active")} valuePropName="checked">
                            <Switch />
                        </Form.Item>
                        <Form.Item name="bookable" label={l("Online buchbar", "Bookable online")} valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    </Space>
                </Form>
            </Modal>
        </div>
    );
}
