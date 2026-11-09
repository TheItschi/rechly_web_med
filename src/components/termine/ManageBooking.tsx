"use client";
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Modal, Space, Tag, Typography } from "antd";
import SlotPicker, { bookingWhen, type BookingSlot } from "./SlotPicker";
interface ManagedAppointment {
    serviceName: string;
    startUtc: string;
    endUtc: string;
    timezone: string;
    durationMinutes: number;
    status: string;
    businessName: string;
    slug: string;
    canCancel: boolean;
    canReschedule: boolean;
    cancelBefore: string;
    rescheduleBefore: string;
    maxHorizonDays: number;
    contactEmail?: string;
    contactPhone?: string;
}
const labels: Record<string, string> = {
    PENDING: "Wartet auf Bestätigung",
    CONFIRMED: "Bestätigt",
    COMPLETED: "Abgeschlossen",
    CANCELLED_BY_CUSTOMER: "Storniert",
    CANCELLED_BY_BUSINESS: "Vom Unternehmen storniert",
    NO_SHOW: "Nicht erschienen",
};
export default function ManageBooking({ token }: { token: string }) {
    const [appt, setAppt] = useState<ManagedAppointment | null>(null),
        [loading, setLoading] = useState(true),
        [error, setError] = useState(""),
        [actionError, setActionError] = useState(""),
        [success, setSuccess] = useState("");
    const [action, setAction] = useState<"cancel" | "reschedule" | null>(null),
        [busy, setBusy] = useState(false),
        [slot, setSlot] = useState<BookingSlot | null>(null),
        [revision, setRevision] = useState(0);
    const base = `/api/termine/manage/${token}`;
    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const r = await fetch(base, { cache: "no-store" }),
                data = await r.json();
            if (!r.ok) throw new Error(data.error || "Buchung konnte nicht geladen werden.");
            setAppt(data.appointment);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [base]);
    useEffect(() => {
        void load();
    }, [load]);
    async function change() {
        if (!action || (action === "reschedule" && !slot)) return;
        setBusy(true);
        setActionError("");
        try {
            const r = await fetch(base + "/" + action, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    ...(action === "reschedule"
                        ? { body: JSON.stringify({ newStartUtc: slot!.startUtc }) }
                        : {}),
                }),
                data = await r.json();
            if (!r.ok) {
                if (r.status === 409) {
                    setSlot(null);
                    setRevision((v) => v + 1);
                }
                throw new Error(data.error || "Änderung fehlgeschlagen.");
            }
            setSuccess(action === "cancel" ? "Ihr Termin wurde storniert." : "Ihr Termin wurde verschoben.");
            setAction(null);
            setSlot(null);
            await load();
        } catch (e) {
            setActionError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }
    const cancelled = appt?.status.startsWith("CANCELLED"),
        active = appt && ["PENDING", "CONFIRMED"].includes(appt.status);
    return (
        <div className="buchen-page">
            <header className="buchen-hero">
                <div className="buchen-hero-inner">
                    <div className="buchen-eyebrow">Ihre Buchung</div>
                    <h1>{appt?.businessName || "Termin verwalten"}</h1>
                    <p>Alle Details und Änderungen an einem Ort. Bewahren Sie diesen privaten Link auf.</p>
                </div>
            </header>
            <main className="buchen-main booking-manage">
                {loading ? (
                    <Card loading />
                ) : error || !appt ? (
                    <Alert
                        type="error"
                        showIcon
                        title={error || "Buchung nicht gefunden."}
                        description="Prüfen Sie Ihren Link oder kontaktieren Sie das Unternehmen."
                        action={<Button onClick={() => void load()}>Erneut versuchen</Button>}
                    />
                ) : (
                    <Card className="buchen-card">
                        {success && (
                            <Alert type="success" title={success} showIcon style={{ marginBottom: 24 }} />
                        )}
                        <Tag
                            color={
                                cancelled ? "error" : appt.status === "CONFIRMED" ? "success" : "processing"
                            }
                        >
                            {labels[appt.status] || appt.status}
                        </Tag>
                        <Typography.Title level={2}>{appt.serviceName}</Typography.Title>
                        <Typography.Paragraph strong>
                            {bookingWhen(appt.startUtc, appt.timezone)}
                        </Typography.Paragraph>
                        <p className="booking-muted">
                            {appt.durationMinutes} Minuten · {appt.timezone}
                        </p>
                        {appt.status === "PENDING" && (
                            <Alert
                                type="info"
                                showIcon
                                title="Ihre Anfrage wird geprüft."
                                description="Der Termin ist erst nach Bestätigung durch das Unternehmen verbindlich."
                                style={{ marginBottom: 24 }}
                            />
                        )}
                        {active && (
                            <>
                                <div className="booking-policy">
                                    <strong>Ihre Änderungsfristen</strong>
                                    <p>Stornieren bis {bookingWhen(appt.cancelBefore, appt.timezone)}.</p>
                                    <p>Umbuchen bis {bookingWhen(appt.rescheduleBefore, appt.timezone)}.</p>
                                </div>
                                <Space wrap style={{ marginTop: 24 }}>
                                    <Button
                                        type="primary"
                                        disabled={!appt.canReschedule}
                                        onClick={() => {
                                            setAction("reschedule");
                                            setActionError("");
                                            setSlot(null);
                                        }}
                                    >
                                        Termin verschieben
                                    </Button>
                                    <Button
                                        danger
                                        disabled={!appt.canCancel}
                                        onClick={() => {
                                            setAction("cancel");
                                            setActionError("");
                                        }}
                                    >
                                        Termin stornieren
                                    </Button>
                                    {appt.status === "CONFIRMED" && (
                                        <Button href={base + "/calendar"}>Zum Kalender hinzufügen</Button>
                                    )}
                                </Space>
                                {(!appt.canCancel || !appt.canReschedule) && (
                                    <p className="booking-muted">
                                        Für Änderungen nach Ablauf der Frist kontaktieren Sie bitte das
                                        Unternehmen direkt.
                                    </p>
                                )}
                            </>
                        )}
                        {!active && (
                            <Alert
                                type={cancelled ? "warning" : "info"}
                                showIcon
                                title={labels[appt.status] || appt.status}
                                description="Dieser Termin kann nicht mehr online geändert werden."
                                style={{ marginTop: 20 }}
                            />
                        )}
                        <div className="booking-actions">
                            <Button href={"/buchen/" + appt.slug}>Weiteren Termin buchen</Button>
                            <Space wrap>
                                {appt.contactPhone && (
                                    <a href={"tel:" + appt.contactPhone}>{appt.contactPhone}</a>
                                )}
                                {appt.contactEmail && (
                                    <a href={"mailto:" + appt.contactEmail}>{appt.contactEmail}</a>
                                )}
                            </Space>
                        </div>
                    </Card>
                )}
                <Modal
                    title={action === "cancel" ? "Termin wirklich stornieren?" : "Neuen Termin auswählen"}
                    open={!!action}
                    width={action === "reschedule" ? 850 : 480}
                    onCancel={() => {
                        if (!busy) setAction(null);
                    }}
                    maskClosable={!busy}
                    closable={!busy}
                    confirmLoading={busy}
                    cancelButtonProps={{ disabled: busy }}
                    okButtonProps={{
                        danger: action === "cancel",
                        disabled: action === "reschedule" && !slot,
                    }}
                    okText={action === "cancel" ? "Ja, Termin stornieren" : "Umbuchung bestätigen"}
                    cancelText="Bisherigen Termin behalten"
                    onOk={() => void change()}
                >
                    {actionError && (
                        <Alert type="error" showIcon title={actionError} style={{ marginBottom: 16 }} />
                    )}
                    {appt && (
                        <p>
                            Ihr bisheriger Termin:{" "}
                            <strong>{bookingWhen(appt.startUtc, appt.timezone)}</strong>.
                            {action === "reschedule" &&
                                " Er bleibt reserviert, bis die Umbuchung erfolgreich ist."}
                        </p>
                    )}
                    {action === "reschedule" && appt && (
                        <SlotPicker
                            key={revision}
                            endpoint={base + "/availability"}
                            timezone={appt.timezone}
                            maxHorizonDays={appt.maxHorizonDays}
                            value={slot}
                            onChange={setSlot}
                            disabled={busy}
                        />
                    )}
                    {slot && action === "reschedule" && appt && (
                        <Alert
                            type="info"
                            title={"Neuer Termin: " + bookingWhen(slot.startUtc, appt.timezone)}
                            style={{ marginTop: 16 }}
                        />
                    )}
                </Modal>
            </main>
        </div>
    );
}
