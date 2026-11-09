"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Button,
    DatePicker,
    Descriptions,
    Divider,
    Drawer,
    Form,
    Input,
    Modal,
    Popconfirm,
    Select,
    Space,
    Tag,
    Typography,
    message,
} from "antd";
import {
    CalendarOutlined,
    CheckCircleOutlined,
    CheckSquareOutlined,
    CloseCircleOutlined,
    FileTextOutlined,
    SwapOutlined,
    UserOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useLanguage } from "@/contexts/LanguageContext";
import { patch, post } from "@/lib/termine/client";

export interface UnifiedBookingRecord {
    id: string;
    serviceId: string;
    staffId: string;
    staffName?: string;
    customerId?: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    customerNote?: string;
    internalNote?: string;
    startUtc: string;
    endUtc: string;
    businessTimezone: string;
    durationMinutes: number;
    status: string;
    serviceNameSnapshot: string;
    servicePriceCents: number;
    currency: string;
    source?: string;
    linkedInvoiceId?: string;
}

export interface SimpleStaffOption {
    id: string;
    name: string;
}

export interface SimpleServiceOption {
    id: string;
    name: string;
    durationMinutes?: number;
    priceCents?: number;
    currency?: string;
}

interface ClientLookup {
    id: string;
    name: string;
    email?: string;
    phone?: string;
}

export const BOOKING_STATUS_COLOR: Record<string, string> = {
    PENDING: "processing",
    CONFIRMED: "success",
    COMPLETED: "blue",
    CANCELLED_BY_CUSTOMER: "error",
    CANCELLED_BY_BUSINESS: "error",
    NO_SHOW: "warning",
};

export function bookingStatusLabel(status: string, language: string): string {
    const de: Record<string, string> = {
        PENDING: "Anfrage offen",
        CONFIRMED: "Bestätigt",
        COMPLETED: "Abgeschlossen",
        CANCELLED_BY_CUSTOMER: "Vom Kunden storniert",
        CANCELLED_BY_BUSINESS: "Storniert",
        NO_SHOW: "Nicht erschienen",
    };
    const en: Record<string, string> = {
        PENDING: "Pending",
        CONFIRMED: "Confirmed",
        COMPLETED: "Completed",
        CANCELLED_BY_CUSTOMER: "Cancelled by customer",
        CANCELLED_BY_BUSINESS: "Cancelled",
        NO_SHOW: "No-show",
    };
    return (language === "de" ? de[status] : en[status]) ?? status;
}

export function BookingDetailDrawer({
    booking,
    staff = [],
    onClose,
    onChanged,
}: {
    booking: UnifiedBookingRecord | null;
    staff?: SimpleStaffOption[];
    onClose: () => void;
    onChanged: () => Promise<void> | void;
}) {
    const { language } = useLanguage();
    const l = (de: string, en: string) => (language === "de" ? de : en);
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState("");
    const [rescheduleOpen, setRescheduleOpen] = useState(false);
    const [rescheduleForm] = Form.useForm();

    useEffect(() => {
        setNote(booking?.internalNote ?? "");
    }, [booking]);

    async function transition(status: string) {
        if (!booking) return;
        setBusy(true);
        try {
            if (status === "CANCELLED_BY_BUSINESS") {
                await post(`/api/termine/appointments/${booking.id}/cancel`, {});
            } else {
                await patch(`/api/termine/appointments/${booking.id}`, { status });
            }
            message.success(l("Status aktualisiert.", "Status updated."));
            await onChanged();
            onClose();
        } catch (e) {
            message.error(e instanceof Error ? e.message : l("Aktualisierung fehlgeschlagen.", "Update failed."));
        } finally {
            setBusy(false);
        }
    }

    async function saveNote() {
        if (!booking) return;
        setBusy(true);
        try {
            await patch(`/api/termine/appointments/${booking.id}`, { internalNote: note });
            message.success(l("Notiz gespeichert.", "Note saved."));
            await onChanged();
        } catch (e) {
            message.error(e instanceof Error ? e.message : l("Speichern fehlgeschlagen.", "Save failed."));
        } finally {
            setBusy(false);
        }
    }

    async function createInvoiceDraft() {
        if (!booking) return;
        setBusy(true);
        try {
            const res = await post<{ invoiceId: string; existed: boolean }>(
                `/api/termine/appointments/${booking.id}/invoice-draft`,
                {},
            );
            message.success(
                res.existed
                    ? l("Rechnungsentwurf geöffnet.", "Opening existing invoice draft.")
                    : l("Rechnungsentwurf erstellt.", "Invoice draft created."),
            );
            await onChanged();
            router.push(`/dashboard/invoices/${res.invoiceId}`);
        } catch (e) {
            message.error(e instanceof Error ? e.message : l("Entwurf fehlgeschlagen.", "Could not create invoice draft."));
        } finally {
            setBusy(false);
        }
    }

    async function createFollowUpTask() {
        if (!booking) return;
        setBusy(true);
        try {
            const due = new Date(Date.parse(booking.startUtc) + 24 * 3600 * 1000).toISOString().slice(0, 10);
            const resp = await fetch("/api/workspace", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    collection: "tasks",
                    action: "save",
                    record: {
                        title: `${l("Nachbereitung", "Follow-up")}: ${booking.serviceNameSnapshot} – ${booking.customerName}`,
                        project_id: "",
                        assignee: booking.staffName ?? "",
                        status: "todo",
                        priority: "normal",
                        due_date: due,
                    },
                }),
            });
            if (!resp.ok) throw new Error(l("Aufgabe konnte nicht erstellt werden.", "Could not create task."));
            message.success(l("Folgeaufgabe in Projekten & Aufgaben angelegt.", "Follow-up task created."));
        } catch (e) {
            message.error(e instanceof Error ? e.message : l("Aufgabe fehlgeschlagen.", "Task creation failed."));
        } finally {
            setBusy(false);
        }
    }

    const locale = language === "de" ? "de-DE" : "en-GB";
    const resolvedStaffName =
        booking?.staffName || staff.find((s) => s.id === booking?.staffId)?.name || booking?.staffId;

    return (
        <>
            <Drawer
                title={l("Terminbuchung verwalten", "Manage booking")}
                open={!!booking}
                onClose={onClose}
                size={460}
            >
                {booking && (
                    <div>
                        <Descriptions column={1} size="small" bordered>
                            <Descriptions.Item label={l("Leistung", "Service")}>
                                <strong>{booking.serviceNameSnapshot}</strong> ({booking.durationMinutes} min ·{" "}
                                {((booking.servicePriceCents || 0) / 100).toLocaleString(locale, {
                                    style: "currency",
                                    currency: booking.currency || "EUR",
                                })}
                                )
                            </Descriptions.Item>
                            <Descriptions.Item label={l("Beginn", "Start")}>
                                {new Date(booking.startUtc).toLocaleString(locale)}
                            </Descriptions.Item>
                            <Descriptions.Item label={l("Ende", "End")}>
                                {new Date(booking.endUtc).toLocaleString(locale)}
                            </Descriptions.Item>
                            {resolvedStaffName && (
                                <Descriptions.Item label={l("Mitarbeiter", "Staff")}>
                                    {resolvedStaffName}
                                </Descriptions.Item>
                            )}
                            <Descriptions.Item label={l("Kunde", "Customer")}>
                                <Space orientation="vertical" size={2}>
                                    <span>
                                        <strong>{booking.customerName}</strong>
                                        {booking.customerId && (
                                            <>
                                                {" · "}
                                                <Link href={`/dashboard/clients?client=${booking.customerId}`}>
                                                    <UserOutlined /> {l("Kundenakte", "Client profile")}
                                                </Link>
                                            </>
                                        )}
                                    </span>
                                    <a href={`mailto:${booking.customerEmail}`}>{booking.customerEmail}</a>
                                    {booking.customerPhone && (
                                        <a href={`tel:${booking.customerPhone}`}>{booking.customerPhone}</a>
                                    )}
                                </Space>
                            </Descriptions.Item>
                            {booking.customerNote && (
                                <Descriptions.Item label={l("Kundennotiz", "Customer note")}>
                                    {booking.customerNote}
                                </Descriptions.Item>
                            )}
                            <Descriptions.Item label="Status">
                                <Tag color={BOOKING_STATUS_COLOR[booking.status] ?? "default"}>
                                    {bookingStatusLabel(booking.status, language)}
                                </Tag>
                            </Descriptions.Item>
                            {booking.linkedInvoiceId && (
                                <Descriptions.Item label={l("Rechnung", "Invoice")}>
                                    <Link href={`/dashboard/invoices/${booking.linkedInvoiceId}`}>
                                        <FileTextOutlined /> {l("Rechnung öffnen →", "Open invoice →")}
                                    </Link>
                                </Descriptions.Item>
                            )}
                        </Descriptions>

                        <Divider style={{ margin: "16px 0 12px" }} />
                        <Typography.Text strong style={{ display: "block", marginBottom: 6 }}>
                            {l("Interne Notiz", "Internal note")}
                        </Typography.Text>
                        <Input.TextArea
                            rows={2}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={l("Interne Notizen zum Termin …", "Internal notes about this appointment …")}
                        />
                        <div style={{ marginTop: 8 }}>
                            <Button size="small" onClick={() => void saveNote()} loading={busy}>
                                {l("Notiz speichern", "Save note")}
                            </Button>
                        </div>

                        <Divider style={{ margin: "16px 0 12px" }} />
                        <Space wrap>
                            {booking.status === "PENDING" && (
                                <Button
                                    type="primary"
                                    icon={<CheckCircleOutlined />}
                                    loading={busy}
                                    onClick={() => void transition("CONFIRMED")}
                                >
                                    {l("Bestätigen", "Confirm")}
                                </Button>
                            )}
                            {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
                                <>
                                    <Button
                                        type="primary"
                                        ghost
                                        icon={<CheckCircleOutlined />}
                                        loading={busy}
                                        disabled={Date.parse(booking.startUtc) > Date.now()}
                                        title={l("Ab Terminbeginn verfügbar", "Available once the appointment starts")}
                                        onClick={() => void transition("COMPLETED")}
                                    >
                                        {l("Abschließen", "Mark completed")}
                                    </Button>
                                    <Button
                                        icon={<SwapOutlined />}
                                        disabled={busy}
                                        onClick={() => {
                                            rescheduleForm.setFieldsValue({
                                                when: dayjs(booking.startUtc),
                                                staffId: booking.staffId,
                                            });
                                            setRescheduleOpen(true);
                                        }}
                                    >
                                        {l("Verschieben", "Reschedule")}
                                    </Button>
                                    <Button loading={busy} disabled={Date.parse(booking.startUtc) > Date.now()} title={l("Ab Terminbeginn verfügbar", "Available once the appointment starts")} onClick={() => void transition("NO_SHOW")}>
                                        {l("Nicht erschienen", "No-show")}
                                    </Button>
                                    <Popconfirm
                                        title={l(
                                            "Termin stornieren und Zeitfenster wieder freigeben?",
                                            "Cancel appointment and release the time slot?",
                                        )}
                                        onConfirm={() => void transition("CANCELLED_BY_BUSINESS")}
                                        okText={l("Stornieren", "Cancel booking")}
                                        cancelText={l("Zurück", "Keep")}
                                    >
                                        <Button danger icon={<CloseCircleOutlined />} loading={busy}>
                                            {l("Stornieren", "Cancel")}
                                        </Button>
                                    </Popconfirm>
                                </>
                            )}
                            {booking.status === "COMPLETED" && !booking.linkedInvoiceId && (
                                <Button
                                    type="primary"
                                    icon={<FileTextOutlined />}
                                    loading={busy}
                                    onClick={() => void createInvoiceDraft()}
                                >
                                    {l("Rechnungsentwurf erstellen", "Create invoice draft")}
                                </Button>
                            )}
                            {booking.linkedInvoiceId && (
                                <Button
                                    type="primary"
                                    icon={<FileTextOutlined />}
                                    onClick={() => router.push(`/dashboard/invoices/${booking.linkedInvoiceId}`)}
                                >
                                    {l("Rechnung öffnen", "Open invoice")}
                                </Button>
                            )}
                            <Button
                                icon={<CheckSquareOutlined />}
                                loading={busy}
                                onClick={() => void createFollowUpTask()}
                            >
                                {l("Folgeaufgabe", "Follow-up task")}
                            </Button>
                        </Space>
                    </div>
                )}
            </Drawer>

            <Modal
                title={l("Termin verschieben", "Reschedule booking")}
                open={rescheduleOpen}
                onCancel={() => !busy && setRescheduleOpen(false)}
                footer={null}
            >
                <Form
                    form={rescheduleForm}
                    layout="vertical"
                    onFinish={async (v) => {
                        if (!booking) return;
                        setBusy(true);
                        try {
                            await post(`/api/termine/appointments/${booking.id}/reschedule`, {
                                newStartUtc: (v.when as Dayjs).toISOString(),
                                newStaffId: v.staffId || undefined,
                            });
                            message.success(l("Termin verschoben.", "Appointment rescheduled."));
                            setRescheduleOpen(false);
                            onClose();
                            await onChanged();
                        } catch (e) {
                            message.error(
                                e instanceof Error ? e.message : l("Umbuchung fehlgeschlagen.", "Reschedule failed."),
                            );
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    <Form.Item
                        name="when"
                        label={l("Neuer Zeitpunkt", "New date & time")}
                        rules={[{ required: true }]}
                    >
                        <DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: "100%" }} minuteStep={15} />
                    </Form.Item>
                    {staff.length > 0 && (
                        <Form.Item name="staffId" label={l("Mitarbeiter", "Staff")}>
                            <Select options={staff.map((s) => ({ value: s.id, label: s.name }))} />
                        </Form.Item>
                    )}
                    <Button type="primary" htmlType="submit" loading={busy} block>
                        {l("Neuen Termin speichern", "Save new time")}
                    </Button>
                </Form>
            </Modal>
        </>
    );
}

export function ManualBookingModal({
    open,
    services,
    staff,
    initialClientId,
    initialDate,
    onCancel,
    onCreated,
}: {
    open: boolean;
    services: SimpleServiceOption[];
    staff: SimpleStaffOption[];
    initialClientId?: string;
    initialDate?: string;
    onCancel: () => void;
    onCreated: () => Promise<void> | void;
}) {
    const { language } = useLanguage();
    const l = (de: string, en: string) => (language === "de" ? de : en);
    const [form] = Form.useForm();
    const [clients, setClients] = useState<ClientLookup[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        form.resetFields();
        if (initialDate) {
            form.setFieldsValue({ when: dayjs(`${initialDate}T09:00`) });
        }
        void (async () => {
            try {
                const res = await fetch("/api/clients", { cache: "no-store" });
                if (!res.ok) return;
                const list = (await res.json()) as ClientLookup[];
                if (!Array.isArray(list)) return;
                setClients(list);
                if (initialClientId) {
                    const matched = list.find((c) => c.id === initialClientId);
                    if (matched) {
                        form.setFieldsValue({
                            customerId: matched.id,
                            customerName: matched.name,
                            customerEmail: matched.email || "",
                            customerPhone: matched.phone || "",
                        });
                    }
                }
            } catch {
                // Non-fatal; manual entry still works
            }
        })();
    }, [open, initialClientId, initialDate, form]);

    return (
        <Modal
            title={
                <Space>
                    <CalendarOutlined />
                    <span>{l("Kundentermin buchen", "Book customer appointment")}</span>
                </Space>
            }
            open={open}
            onCancel={onCancel}
            footer={null}
            width={560}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={async (v) => {
                    setSubmitting(true);
                    try {
                        await post("/api/termine/appointments", {
                            serviceId: v.serviceId,
                            staffId: v.staffId || undefined,
                            customerId: v.customerId || undefined,
                            startUtc: (v.when as Dayjs).toISOString(),
                            customerName: v.customerName,
                            customerEmail: v.customerEmail,
                            customerPhone: v.customerPhone || undefined,
                            internalNote: v.internalNote || undefined,
                        });
                        message.success(l("Termin gebucht.", "Appointment booked."));
                        form.resetFields();
                        onCancel();
                        await onCreated();
                    } catch (e) {
                        message.error(e instanceof Error ? e.message : l("Buchung fehlgeschlagen.", "Booking failed."));
                    } finally {
                        setSubmitting(false);
                    }
                }}
            >
                <Form.Item
                    name="customerId"
                    label={l("Vorhandenen Kunden auswählen (optional)", "Select existing client (optional)")}
                >
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder={l("Aus Kundenstamm übernehmen …", "Pick from Clients …")}
                        options={clients.map((c) => ({
                            value: c.id,
                            label: `${c.name}${c.email ? ` (${c.email})` : ""}`,
                        }))}
                        onChange={(id) => {
                            const matched = clients.find((c) => c.id === id);
                            if (matched) {
                                form.setFieldsValue({
                                    customerName: matched.name,
                                    customerEmail: matched.email || form.getFieldValue("customerEmail") || "",
                                    customerPhone: matched.phone || form.getFieldValue("customerPhone") || "",
                                });
                            }
                        }}
                    />
                </Form.Item>
                <Form.Item
                    name="serviceId"
                    label={l("Buchbare Leistung", "Bookable service")}
                    rules={[{ required: true, message: l("Bitte Leistung wählen.", "Select a service.") }]}
                >
                    <Select
                        options={services.map((s) => ({
                            value: s.id,
                            label: `${s.name}${s.durationMinutes ? ` (${s.durationMinutes} min)` : ""}`,
                        }))}
                    />
                </Form.Item>
                <Form.Item name="staffId" label={l("Mitarbeiter (optional)", "Staff (optional)")}>
                    <Select allowClear options={staff.map((s) => ({ value: s.id, label: s.name }))} />
                </Form.Item>
                <Form.Item
                    name="when"
                    label={l("Datum & Uhrzeit", "Date & time")}
                    rules={[{ required: true, message: l("Bitte Zeitpunkt wählen.", "Select date & time.") }]}
                >
                    <DatePicker showTime format="DD.MM.YYYY HH:mm" minuteStep={15} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                    name="customerName"
                    label={l("Kundenname", "Customer name")}
                    rules={[{ required: true, message: l("Name erforderlich.", "Name required.") }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    name="customerEmail"
                    label={l("E-Mail", "Email")}
                    rules={[{ required: true, type: "email", message: l("Gültige E-Mail erforderlich.", "Valid email required.") }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item name="customerPhone" label={l("Telefon (optional)", "Phone (optional)")}>
                    <Input />
                </Form.Item>
                <Form.Item name="internalNote" label={l("Interne Notiz", "Internal note")}>
                    <Input.TextArea rows={2} />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={submitting} block>
                    {l("Termin verbindlich buchen", "Book appointment")}
                </Button>
            </Form>
        </Modal>
    );
}

export function BlockTimeModal({
    open,
    staff,
    initialDate,
    onCancel,
    onCreated,
}: {
    open: boolean;
    staff: SimpleStaffOption[];
    initialDate?: string;
    onCancel: () => void;
    onCreated: () => Promise<void> | void;
}) {
    const { language } = useLanguage();
    const l = (de: string, en: string) => (language === "de" ? de : en);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        form.resetFields();
        if (initialDate) {
            form.setFieldsValue({
                range: [dayjs(`${initialDate}T09:00`), dayjs(`${initialDate}T17:00`)],
            });
        }
    }, [open, initialDate, form]);

    return (
        <Modal
            title={l("Zeitraum für Online-Buchung sperren", "Block time for online booking")}
            open={open}
            onCancel={onCancel}
            footer={null}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={async (v) => {
                    setSubmitting(true);
                    try {
                        await post("/api/termine/blocks", {
                            staffId: v.staffId ?? null,
                            startUtc: (v.range[0] as Dayjs).toISOString(),
                            endUtc: (v.range[1] as Dayjs).toISOString(),
                            reason: v.reason,
                        });
                        message.success(l("Sperrzeit gespeichert.", "Blocked time saved."));
                        form.resetFields();
                        onCancel();
                        await onCreated();
                    } catch (e) {
                        message.error(e instanceof Error ? e.message : l("Speichern fehlgeschlagen.", "Save failed."));
                    } finally {
                        setSubmitting(false);
                    }
                }}
            >
                <Form.Item
                    name="staffId"
                    label={l("Mitarbeiter (leer = gesamtes Unternehmen)", "Staff (empty = entire business)")}
                >
                    <Select allowClear options={staff.map((s) => ({ value: s.id, label: s.name }))} />
                </Form.Item>
                <Form.Item
                    name="range"
                    label={l("Zeitraum", "Time range")}
                    rules={[{ required: true }]}
                >
                    <DatePicker.RangePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="reason" label={l("Grund (z. B. Urlaub, Pause, Außentermin)", "Reason (e.g. vacation, break)")}>
                    <Input />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={submitting} block>
                    {l("Zeitraum sperren", "Block time")}
                </Button>
            </Form>
        </Modal>
    );
}
