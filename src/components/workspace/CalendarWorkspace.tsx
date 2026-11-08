"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Col,
    Empty,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Row,
    Segmented,
    Select,
    Space,
    Tag,
    Typography,
} from "antd";
import type { CalendarEvent, Occurrence } from "@/lib/workspace/calendar";
import type { CalendarBlockItem, CalendarBookingItem } from "@/lib/workspace/calendar-service";
import { useAuth } from "@/contexts/AuthContext";
import {
    BlockTimeModal,
    BookingDetailDrawer,
    bookingStatusLabel,
    ManualBookingModal,
    type SimpleServiceOption,
    type SimpleStaffOption,
    type UnifiedBookingRecord,
} from "@/components/termine/BookingDrawerAndModals";
import { addDays, localDay, useResource, useWords, WorkspaceFrame } from "./common";
import styles from "./calendar.module.css";

interface Deadline {
    id: string;
    date: string;
    title: string;
    href: string;
    kind: string;
}

export interface CalendarSnapshot {
    events: CalendarEvent[];
    items: Occurrence[];
    deadlines: Deadline[];
    bookings?: CalendarBookingItem[];
    blocks?: CalendarBlockItem[];
    staff?: Array<SimpleStaffOption & { color?: string; active: boolean; bookable: boolean; serviceIds: string[] }>;
    services?: Array<SimpleServiceOption & { active: boolean; staffIds: string[] }>;
    termineConfigured?: boolean;
    termineTimezone?: string;
}

function weekStart(day: string) {
    return addDays(day, -((new Date(day + "T12:00").getDay() + 6) % 7));
}

export default function CalendarWorkspace() {
    const { l, language } = useWords(),
        { user } = useAuth();
    const [cursor, setCursor] = useState(localDay),
        [mode, setMode] = useState("month"),
        [search, setSearch] = useState("");
    const [categories, setCategories] = useState(["work", "personal", "deadline"]),
        [deadlines, setDeadlines] = useState(true),
        [showBookings, setShowBookings] = useState(true),
        [staffFilter, setStaffFilter] = useState<string>("");
    const [editing, setEditing] = useState<Partial<CalendarEvent> | null>(null),
        [occurrence, setOccurrence] = useState("");
    const [selectedBooking, setSelectedBooking] = useState<UnifiedBookingRecord | null>(null);
    const [manualBookingOpen, setManualBookingOpen] = useState(false);
    const [blockOpen, setBlockOpen] = useState(false);
    const [dirty, setDirty] = useState(false),
        [error, setError] = useState("");
    const [source, setSource] = useState(""),
        [preview, setPreview] = useState<{ count: number; skipped: number; titles: string[] } | null>(null),
        [importing, setImporting] = useState(false),
        [importMessage, setImportMessage] = useState("");
    const [reminders, setReminders] = useState(false),
        [zone, setZone] = useState("");
    const file = useRef<HTMLInputElement>(null),
        [form] = Form.useForm(),
        [modal, holder] = Modal.useModal();
    const allDay = Form.useWatch("allDay", form),
        repeat = Form.useWatch("repeat", form);
    const start = mode === "month" ? weekStart(cursor.slice(0, 7) + "-01") : mode === "week" ? weekStart(cursor) : cursor;
    const count = mode === "month" ? 42 : mode === "week" ? 7 : mode === "agenda" ? 30 : 1;
    const days = Array.from({ length: count }, (_, i) => addDays(start, i));
    const resource = useResource<CalendarSnapshot>(
            `/api/workspace/calendar?from=${start}T00:00&to=${addDays(start, count)}T00:00`,
        ),
        { data, busy } = resource;

    const labels: Record<string, string> = {
        work: l("Geschäftlich", "Work"),
        personal: l("Privat", "Personal"),
        deadline: l("Fristen", "Deadlines"),
        none: l("Keine", "None"),
        daily: l("Täglich", "Daily"),
        weekly: l("Wöchentlich", "Weekly"),
        monthly: l("Monatlich", "Monthly"),
        yearly: l("Jährlich", "Yearly"),
    };
    const required = [{ required: true, message: l("Bitte ausfüllen.", "Required.") }];

    useEffect(() => {
        setZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
        setReminders(localStorage.getItem(`rechly-reminders:${user?.$id}`) === "1");
        const requested = new URLSearchParams(window.location.search).get("date");
        if (requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) && !Number.isNaN(Date.parse(requested)))
            setCursor(requested);
    }, [user?.$id]);

    useEffect(() => {
        if (!dirty) return;
        const prevent = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", prevent);
        return () => window.removeEventListener("beforeunload", prevent);
    }, [dirty]);

    function changeDate(direction: number) {
        if (mode === "month") {
            const d = new Date(cursor.slice(0, 7) + "-01T12:00");
            d.setMonth(d.getMonth() + direction);
            setCursor(localDay(d));
        } else setCursor(addDays(cursor, direction * (mode === "week" ? 7 : mode === "agenda" ? 30 : 1)));
    }

    function open(event?: CalendarEvent, day = cursor, occurrenceDate = "") {
        setError("");
        setDirty(false);
        setEditing(event || {});
        setOccurrence(occurrenceDate);
        form.resetFields();
        form.setFieldsValue(
            event
                ? {
                      ...event,
                      ...(event.allDay
                          ? { start: event.start.slice(0, 10), end: addDays(event.end.slice(0, 10), -1) }
                          : {}),
                  }
                : {
                      title: "",
                      start: day + "T09:00",
                      end: day + "T10:00",
                      allDay: false,
                      category: "work",
                      location: "",
                      notes: "",
                      repeat: "none",
                      interval: 1,
                      until: "",
                      reminder: -1,
                  },
        );
    }

    function close() {
        if (busy) return;
        if (dirty)
            modal.confirm({
                title: l("Änderungen verwerfen?", "Discard changes?"),
                onOk: () => {
                    setEditing(null);
                    setDirty(false);
                },
                okText: l("Verwerfen", "Discard"),
                cancelText: l("Weiter bearbeiten", "Keep editing"),
            });
        else setEditing(null);
    }

    async function save(values: Record<string, unknown>) {
        try {
            const startVal = String(values.start),
                endVal = String(values.end);
            if (!values.allDay) {
                for (const value of [startVal, endVal]) {
                    const d = new Date(value);
                    const roundtrip =
                        localDay(d) +
                        `T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                    if (roundtrip !== value)
                        throw new Error(
                            l(
                                "Diese lokale Uhrzeit existiert wegen der Zeitumstellung nicht.",
                                "This local time does not exist due to a daylight-saving transition.",
                            ),
                        );
                }
            }
            await resource.mutate({
                ...values,
                start: values.allDay ? startVal.slice(0, 10) + "T00:00" : startVal,
                end: values.allDay ? addDays(endVal.slice(0, 10), 1) + "T00:00" : endVal,
                action: "save",
                ...(editing?.id ? { id: editing.id, updated_at: editing.updated_at } : {}),
            });
            setEditing(null);
            setDirty(false);
        } catch (error) {
            setError((error as Error).message);
        }
    }

    async function remove(one = false) {
        try {
            await resource.mutate({
                action: "delete",
                id: editing!.id,
                updated_at: editing!.updated_at,
                ...(one ? { occurrence } : {}),
            });
            setEditing(null);
            setDirty(false);
        } catch (error) {
            setError((error as Error).message);
        }
    }

    const q = search.toLocaleLowerCase();
    const matches = (e: Occurrence) =>
        categories.includes(e.category) && [e.title, e.location, e.notes].join(" ").toLocaleLowerCase().includes(q);
    const matchesBooking = (b: CalendarBookingItem) =>
        showBookings &&
        (!staffFilter || b.staffId === staffFilter) &&
        [b.customerName, b.customerEmail, b.serviceNameSnapshot, b.staffName].join(" ").toLocaleLowerCase().includes(q);
    const matchesBlock = (b: CalendarBlockItem) =>
        showBookings &&
        (!staffFilter || !b.staffId || b.staffId === staffFilter) &&
        [b.reason || "", b.staffName || ""].join(" ").toLocaleLowerCase().includes(q);

    function events(day: string) {
        return (data?.items || []).filter(
            (e) => matches(e) && e.occurrenceStart < addDays(day, 1) + "T00:00" && e.occurrenceEnd > day + "T00:00",
        );
    }
    function dayBookings(day: string) {
        return (data?.bookings || []).filter(
            (b) => matchesBooking(b) && b.wallStart < addDays(day, 1) + "T00:00" && b.wallEnd > day + "T00:00",
        );
    }
    function dayBlocks(day: string) {
        return (data?.blocks || []).filter(
            (b) => matchesBlock(b) && b.wallStart < addDays(day, 1) + "T00:00" && b.wallEnd > day + "T00:00",
        );
    }
    function due(day: string) {
        return deadlines && categories.includes("deadline")
            ? (data?.deadlines || []).filter((d) => d.date === day && d.title.toLocaleLowerCase().includes(q))
            : [];
    }

    function eventButton(event: Occurrence) {
        return (
            <button
                key={event.id + event.occurrenceStart}
                className={`${styles.event} ${styles[event.category] || ""}`}
                title={`${event.title} · ${event.location}`}
                onClick={() =>
                    open(
                        data?.events.find((e) => e.id === event.id),
                        event.occurrenceStart.slice(0, 10),
                        event.occurrenceStart.slice(0, 10),
                    )
                }
            >
                {!event.allDay && `${event.occurrenceStart.slice(11)} `}
                {event.title}
                {event.repeat !== "none" && " ↻"}
            </button>
        );
    }

    function bookingButton(booking: CalendarBookingItem) {
        const isPending = booking.status === "PENDING";
        return (
            <button
                key={"booking:" + booking.id}
                className={`${styles.event} ${isPending ? styles.bookingPending : styles.booking}`}
                style={booking.staffColor ? { borderLeftColor: booking.staffColor } : undefined}
                title={`${booking.wallStart.slice(11)} · ${booking.customerName} (${booking.serviceNameSnapshot}) · ${bookingStatusLabel(booking.status, language)}`}
                onClick={() => setSelectedBooking(booking)}
            >
                {booking.wallStart.slice(11)} {booking.customerName} · {booking.serviceNameSnapshot}
                {booking.staffName ? ` (${booking.staffName})` : ""}
            </button>
        );
    }

    function blockChip(block: CalendarBlockItem) {
        return (
            <div
                key={"block:" + block.id}
                className={`${styles.event} ${styles.block}`}
                title={`${l("Gesperrt", "Blocked")}: ${block.reason || l("Sperrzeit", "Blocked time")}`}
            >
                ⊘ {block.wallStart.slice(11)}–{block.wallEnd.slice(11)}{" "}
                {block.reason || l("Sperrzeit", "Blocked")}
                {block.staffName ? ` (${block.staffName})` : ""}
            </div>
        );
    }

    function links(day: string) {
        return due(day).map((d) => (
            <Link className={`${styles.event} ${styles.deadline}`} key={d.id} href={d.href}>
                {d.kind === "invoice" ? l("Rechnung: ", "Invoice: ") : "☑ "}
                {d.title}
            </Link>
        ));
    }

    const dateLabel = (day: string) =>
        new Date(day + "T12:00").toLocaleDateString(language === "de" ? "de-DE" : "en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
        });

    async function chooseFile(selected?: File) {
        if (!selected) return;
        setImportMessage("");
        setImporting(true);
        try {
            if (selected.size > 5 * 1024 * 1024) throw new Error(l("Maximal 5 MB.", "Maximum 5 MB."));
            const textSource = await selected.text();
            const response = await fetch("/api/workspace/calendar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "preview", source: textSource, timeZone: zone }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            setSource(textSource);
            setPreview(result.result);
        } catch (error) {
            setImportMessage((error as Error).message);
        } finally {
            setImporting(false);
            if (file.current) file.current.value = "";
        }
    }

    async function toggleReminders() {
        const next = !reminders;
        if (next && "Notification" in window && Notification.permission === "default")
            await Notification.requestPermission();
        localStorage.setItem(`rechly-reminders:${user?.$id}`, next ? "1" : "0");
        setReminders(next);
        window.dispatchEvent(new Event("rechly-workspace-change"));
    }

    const activeServices = (data?.services || []).filter((s) => s.active);
    const activeStaff = (data?.staff || []).filter((s) => s.active);
    const pendingBookingsCount = (data?.bookings || []).filter((b) => b.status === "PENDING").length;

    return (
        <WorkspaceFrame
            title={l("Kalender & Termine", "Calendar & Scheduling")}
            description={
                l(
                    "Alle Termine, Online-Kundenbuchungen, Sperrzeiten, Aufgabenfristen und fälligen Rechnungen in einem zentralen Kalender.",
                    "All events, online customer bookings, blocked times, task deadlines and invoice due dates in one unified calendar.",
                ) + (zone ? ` (${zone})` : "")
            }
            error={resource.error}
            retry={resource.load}
        >
            {holder}
            <input ref={file} type="file" accept=".ics,text/calendar" hidden onChange={(e) => chooseFile(e.target.files?.[0])} />
            <Space wrap style={{ marginBottom: 16 }}>
                <Button disabled={!data || busy} type="primary" onClick={() => open()}>
                    {l("Termin anlegen", "New event")}
                </Button>
                {data?.termineConfigured && activeServices.length > 0 && (
                    <Button disabled={busy} onClick={() => setManualBookingOpen(true)}>
                        {l("Kundentermin buchen", "Book customer appointment")}
                    </Button>
                )}
                {data?.termineConfigured && (
                    <Button disabled={busy} onClick={() => setBlockOpen(true)}>
                        {l("Sperrzeit eintragen", "Block time")}
                    </Button>
                )}
                <Button onClick={() => file.current?.click()} loading={importing} disabled={busy}>
                    {l("ICS importieren", "Import ICS")}
                </Button>
                <Button href="/api/workspace/calendar?export=1" disabled={!data}>
                    {l("ICS exportieren", "Export ICS")}
                </Button>
                <Button onClick={toggleReminders}>
                    {reminders ? l("Erinnerungen ausschalten", "Turn reminders off") : l("Erinnerungen einschalten", "Enable reminders")}
                </Button>
                <Link href="/dashboard/termine/buchungen">
                    {l("Buchungen & Arbeitszeiten →", "Bookings & hours →")}
                </Link>
                {pendingBookingsCount > 0 && (
                    <Tag color="warning">
                        {pendingBookingsCount} {l("offene Buchungsanfrage(n)", "pending booking request(s)")}
                    </Tag>
                )}
            </Space>
            {reminders && (
                <Alert
                    type="info"
                    style={{ marginBottom: 16 }}
                    title={l(
                        "Erinnerungen erscheinen, solange Rechly in diesem Browser geöffnet ist. Systemmeldungen benötigen zusätzlich die Browser-Erlaubnis.",
                        "Reminders appear while Rechly is open in this browser. System notifications also require browser permission.",
                    )}
                />
            )}
            {importMessage && (
                <Alert
                    type="info"
                    showIcon
                    title={importMessage}
                    closable
                    onClose={() => setImportMessage("")}
                    style={{ marginBottom: 16 }}
                />
            )}
            <Card styles={{ body: { padding: 16 } }} loading={resource.loading && !data}>
                <Space wrap style={{ marginBottom: 16 }}>
                    <Button aria-label={l("Vorheriger Zeitraum", "Previous period")} onClick={() => changeDate(-1)}>
                        ←
                    </Button>
                    <Button onClick={() => setCursor(localDay())}>{l("Heute", "Today")}</Button>
                    <Button aria-label={l("Nächster Zeitraum", "Next period")} onClick={() => changeDate(1)}>
                        →
                    </Button>
                    <Input
                        type="date"
                        aria-label={l("Kalenderdatum", "Calendar date")}
                        value={cursor}
                        onChange={(e) => e.target.value && setCursor(e.target.value)}
                        style={{ width: 150 }}
                    />
                    <Segmented
                        value={mode}
                        onChange={(value) => setMode(String(value))}
                        options={[
                            { value: "month", label: l("Monat", "Month") },
                            { value: "week", label: l("Woche", "Week") },
                            { value: "day", label: l("Tag", "Day") },
                            { value: "agenda", label: "Agenda" },
                        ]}
                    />
                </Space>
                <Space wrap style={{ marginBottom: 20 }}>
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={l("Termine suchen", "Search events")}
                        aria-label={l("Termine suchen", "Search events")}
                        style={{ width: 220 }}
                    />
                    <Checkbox.Group
                        value={categories}
                        onChange={(values) => setCategories(values.map(String))}
                        options={["work", "personal", "deadline"].map((value) => ({ value, label: labels[value] }))}
                    />
                    <Checkbox checked={showBookings} onChange={(e) => setShowBookings(e.target.checked)}>
                        {l("Kundenbuchungen", "Customer bookings")}
                    </Checkbox>
                    <Checkbox checked={deadlines} onChange={(e) => setDeadlines(e.target.checked)}>
                        {l("Aufgaben & Rechnungen", "Tasks & invoices")}
                    </Checkbox>
                    {activeStaff.length > 0 && (
                        <Select
                            allowClear
                            placeholder={l("Alle Mitarbeiter", "All staff")}
                            value={staffFilter || undefined}
                            onChange={(v) => setStaffFilter(v || "")}
                            style={{ minWidth: 160 }}
                            options={activeStaff.map((s) => ({ value: s.id, label: s.name }))}
                        />
                    )}
                </Space>
                {mode === "month" ? (
                    <div className={styles.month}>
                        {Array.from({ length: 7 }, (_, i) => (
                            <div key={i} className={styles.weekday}>
                                {new Date(addDays("2026-11-02", i) + "T12:00").toLocaleDateString(
                                    language === "de" ? "de-DE" : "en-GB",
                                    { weekday: "short" },
                                )}
                            </div>
                        ))}
                        {days.map((day) => {
                            const evList = events(day);
                            const bkList = dayBookings(day);
                            const blList = dayBlocks(day);
                            const totalItems = evList.length + bkList.length + blList.length;
                            const combinedNodes = [
                                ...bkList.map(bookingButton),
                                ...evList.map(eventButton),
                                ...blList.map(blockChip),
                            ];
                            return (
                                <div
                                    key={day}
                                    className={`${styles.day} ${day.slice(0, 7) !== cursor.slice(0, 7) ? styles.muted : ""}`}
                                >
                                    <button
                                        className={`${styles.date} ${day === localDay() ? styles.today : ""}`}
                                        aria-label={dateLabel(day)}
                                        onClick={() => {
                                            setCursor(day);
                                            setMode("day");
                                        }}
                                    >
                                        {Number(day.slice(-2))}
                                    </button>
                                    {combinedNodes.slice(0, 3)}
                                    {links(day)}
                                    {totalItems > 3 && (
                                        <button
                                            className={styles.event}
                                            onClick={() => {
                                                setCursor(day);
                                                setMode("day");
                                            }}
                                        >
                                            +{totalItems - 3}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <div className={mode === "week" ? styles.week : styles.agenda}>
                            {days
                                .filter(
                                    (day) =>
                                        mode !== "agenda" ||
                                        events(day).length ||
                                        dayBookings(day).length ||
                                        dayBlocks(day).length ||
                                        due(day).length,
                                )
                                .map((day) => {
                                    const evs = events(day);
                                    const bks = dayBookings(day);
                                    const bls = dayBlocks(day);
                                    const dues = due(day);
                                    return (
                                        <section className={styles.agendaDay} key={day}>
                                            <Space wrap>
                                                <Typography.Text strong>{dateLabel(day)}</Typography.Text>
                                                <Button
                                                    size="small"
                                                    aria-label={`${l("Termin anlegen", "New event")} ${day}`}
                                                    onClick={() => open(undefined, day)}
                                                >
                                                    +
                                                </Button>
                                            </Space>
                                            {bks.map(bookingButton)}
                                            {evs.map(eventButton)}
                                            {bls.map(blockChip)}
                                            {links(day)}
                                            {!evs.length && !bks.length && !bls.length && !dues.length && (
                                                <Typography.Paragraph type="secondary">
                                                    {l("Keine Termine", "No events")}
                                                </Typography.Paragraph>
                                            )}
                                        </section>
                                    );
                                })}
                            {mode === "agenda" &&
                                !days.some(
                                    (day) =>
                                        events(day).length ||
                                        dayBookings(day).length ||
                                        dayBlocks(day).length ||
                                        due(day).length,
                                ) && <Empty description={l("Keine passenden Termine.", "No matching events.")} />}
                        </div>
                    </div>
                )}
            </Card>

            <Modal
                title={editing?.id ? l("Termin / Serie bearbeiten", "Edit event / series") : l("Neuer Termin", "New event")}
                open={!!editing}
                onCancel={close}
                footer={null}
                maskClosable={false}
                width={700}
                closable={!busy}
            >
                {error && <Alert type="error" title={error} />}
                {editing?.repeat && editing.repeat !== "none" && (
                    <Alert
                        type="info"
                        title={l(
                            "Änderungen gelten für die gesamte Serie. Einzelne Vorkommen können gelöscht werden.",
                            "Edits apply to the whole series. Individual occurrences can be deleted.",
                        )}
                    />
                )}
                <Form
                    name="workspace-calendar-event"
                    form={form}
                    layout="vertical"
                    disabled={busy}
                    onValuesChange={() => setDirty(true)}
                    onFinish={save}
                >
                    <Form.Item name="title" label={l("Titel", "Title")} rules={required}>
                        <Input maxLength={200} />
                    </Form.Item>
                    <Form.Item name="allDay" valuePropName="checked">
                        <Checkbox
                            onChange={(e) => {
                                const values = form.getFieldsValue();
                                form.setFieldsValue(
                                    e.target.checked
                                        ? {
                                              start: String(values.start).slice(0, 10),
                                              end: String(values.end).slice(0, 10),
                                          }
                                        : {
                                              start: String(values.start).slice(0, 10) + "T09:00",
                                              end: String(values.end).slice(0, 10) + "T10:00",
                                          },
                                );
                            }}
                        >
                            {l("Ganztägig", "All day")}
                        </Checkbox>
                    </Form.Item>
                    <Row gutter={12}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="start" label={l("Beginn", "Start")} rules={required}>
                                <Input type={allDay ? "date" : "datetime-local"} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="end"
                                label={allDay ? l("Letzter Tag (einschließlich)", "Last day (inclusive)") : l("Ende", "End")}
                                rules={required}
                            >
                                <Input type={allDay ? "date" : "datetime-local"} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="category" label={l("Kategorie", "Category")} rules={required}>
                        <Select options={["work", "personal", "deadline"].map((value) => ({ value, label: labels[value] }))} />
                    </Form.Item>
                    <Form.Item name="location" label={l("Ort", "Location")}>
                        <Input maxLength={1000} />
                    </Form.Item>
                    <Form.Item name="notes" label={l("Notizen", "Notes")}>
                        <Input.TextArea maxLength={20000} rows={3} />
                    </Form.Item>
                    <Form.Item name="repeat" label={l("Wiederholung", "Repeat")}>
                        <Select
                            options={["none", "daily", "weekly", "monthly", "yearly"].map((value) => ({
                                value,
                                label: labels[value],
                            }))}
                        />
                    </Form.Item>
                    <Row gutter={12} style={{ display: repeat === "none" ? "none" : undefined }}>
                        <Col span={12}>
                            <Form.Item name="interval" label={l("Intervall", "Interval")} rules={required}>
                                <InputNumber min={1} max={30} precision={0} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="until" label={l("Bis (optional)", "Until (optional)")}>
                                <Input type="date" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="reminder" label={l("Erinnerung", "Reminder")}>
                        <Select
                            options={[-1, 0, 5, 10, 15, 30, 60, 1440].map((value) => ({
                                value,
                                label:
                                    value < 0
                                        ? l("Keine", "None")
                                        : value === 0
                                          ? l("Bei Beginn", "At start")
                                          : `${value} ${l("Minuten vorher", "minutes before")}`,
                            }))}
                        />
                    </Form.Item>
                    <Space wrap>
                        <Button type="primary" htmlType="submit" loading={busy}>
                            {l("Speichern", "Save")}
                        </Button>
                        <Button onClick={close}>{l("Abbrechen", "Cancel")}</Button>
                        {editing?.id && (
                            <Popconfirm
                                title={l("Termin / gesamte Serie löschen?", "Delete event / entire series?")}
                                onConfirm={() => remove()}
                            >
                                <Button danger>{l("Serie / Termin löschen", "Delete event / series")}</Button>
                            </Popconfirm>
                        )}
                        {editing?.id && editing.repeat !== "none" && occurrence && (
                            <Popconfirm
                                title={l("Nur dieses Vorkommen löschen?", "Delete this occurrence only?")}
                                onConfirm={() => remove(true)}
                            >
                                <Button danger>{l("Dieses Vorkommen löschen", "Delete this occurrence")}</Button>
                            </Popconfirm>
                        )}
                    </Space>
                </Form>
            </Modal>

            <Modal
                title={l("Kalenderimport prüfen", "Review calendar import")}
                open={!!preview}
                onCancel={() => !busy && !importing && setPreview(null)}
                confirmLoading={busy || importing}
                okButtonProps={{ disabled: !preview?.count }}
                cancelButtonProps={{ disabled: importing }}
                okText={l("Termine importieren", "Import events")}
                cancelText={l("Abbrechen", "Cancel")}
                onOk={async () => {
                    setImporting(true);
                    let imported = 0;
                    try {
                        for (let batch = 0; batch < 50; batch++) {
                            const result = await resource.mutate({ action: "import", source, timeZone: zone });
                            imported += result.imported;
                            setImportMessage(
                                `${imported} ${l("importiert", "imported")}, ${preview?.skipped || 0} ${l("bereits vorhanden", "already present")}. ${result.error || ""}`,
                            );
                            if (result.error || !result.remaining) {
                                setPreview(null);
                                break;
                            }
                        }
                    } catch (error) {
                        setImportMessage(
                            `${imported} ${l("importiert. Erneutes Importieren überspringt vorhandene Termine.", "imported. Re-importing skips existing events.")} ${(error as Error).message}`,
                        );
                    } finally {
                        setImporting(false);
                    }
                }}
            >
                <Typography.Paragraph>
                    {preview?.count} {l("neue Termine", "new events")} · {preview?.skipped}{" "}
                    {l("bereits vorhanden", "already present")}
                </Typography.Paragraph>
                {preview?.titles.map((title, i) => <Typography.Paragraph key={i}>{title}</Typography.Paragraph>)}
            </Modal>

            <BookingDetailDrawer
                booking={selectedBooking}
                staff={activeStaff}
                onClose={() => setSelectedBooking(null)}
                onChanged={resource.load}
            />
            <ManualBookingModal
                open={manualBookingOpen}
                services={activeServices}
                staff={activeStaff}
                initialDate={cursor}
                onCancel={() => setManualBookingOpen(false)}
                onCreated={resource.load}
            />
            <BlockTimeModal
                open={blockOpen}
                staff={activeStaff}
                initialDate={cursor}
                onCancel={() => setBlockOpen(false)}
                onCreated={resource.load}
            />
        </WorkspaceFrame>
    );
}
