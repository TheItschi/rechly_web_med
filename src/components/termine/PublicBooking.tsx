"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Descriptions, Form, Input, Steps, Typography, message } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export interface PublicService {
    id: string; name: string; description?: string; category?: string;
    durationMinutes: number; priceCents?: number; currency: string; staffIds: string[];
}
export interface PublicStaff {
    id: string; name: string; description?: string; color?: string; serviceIds: string[];
}
export interface PublicBusiness {
    slug: string; displayName: string; description?: string; timezone: string;
    allowAnyStaff: boolean; showPrices: boolean; currency: string;
    confirmationMode?: string;
    contactEmail?: string; contactPhone?: string; address?: string; website?: string;
}

interface Slot { startUtc: string; staffId: string }

function eur(cents: number | undefined, currency: string) {
    if (cents === undefined) return "";
    return `${(cents / 100).toFixed(2).replace(".", ",")} ${currency === "EUR" ? "€" : currency}`;
}

export default function PublicBooking({ business, services, staff }: { business: PublicBusiness; services: PublicService[]; staff: PublicStaff[] }) {
    const [step, setStep] = useState(0);
    const [serviceId, setServiceId] = useState<string | null>(null);
    const [staffId, setStaffId] = useState<string | null>(null);
    const [slotsByDay, setSlotsByDay] = useState<Record<string, Slot[]>>({});
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [day, setDay] = useState<string | null>(null);
    const [startUtc, setStartUtc] = useState<string | null>(null);
    const [confirmed, setConfirmed] = useState<{ manageToken: string; startUtc: string; status?: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();

    const service = services.find((s) => s.id === serviceId) ?? null;
    const eligibleStaff = useMemo(
        () => (service ? staff.filter((s) => service.staffIds.length === 0 || service.staffIds.includes(s.id)) : []),
        [service, staff],
    );
    const showStaffStep = business.allowAnyStaff && eligibleStaff.length > 1;

    const steps = showStaffStep
        ? ["Leistung", "Mitarbeiter", "Datum", "Uhrzeit", "Daten"]
        : ["Leistung", "Datum", "Uhrzeit", "Daten"];
    const dateStep = showStaffStep ? 2 : 1;
    const timeStep = showStaffStep ? 3 : 2;
    const formStep = showStaffStep ? 4 : 3;

    const loadSlots = useCallback(async () => {
        if (!service) return;
        setLoadingSlots(true);
        try {
            const q = new URLSearchParams({ serviceId: service.id, days: "31" });
            if (staffId) q.set("staffId", staffId);
            const res = await fetch(`/api/termine/public/${business.slug}/availability?${q.toString()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Verfügbarkeit konnte nicht geladen werden.");
            setSlotsByDay(data.slots ?? {});
            const days = Object.keys(data.slots ?? {}).sort();
            if (days.length > 0) setDay(days[0]);
        } catch (e) {
            message.error(e instanceof Error ? e.message : "Verfügbarkeit konnte nicht geladen werden.");
        } finally {
            setLoadingSlots(false);
        }
    }, [service, staffId, business.slug]);

    useEffect(() => {
        if (step === dateStep && service) void loadSlots();
    }, [step, service, loadSlots, dateStep]);

    const dayList = useMemo(() => Object.keys(slotsByDay).sort(), [slotsByDay]);
    const daySlots = day && slotsByDay[day] ? slotsByDay[day] : [];

    function fmtDay(iso: string) {
        return new Date(iso + "T12:00:00Z").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: business.timezone });
    }
    function fmtTime(utc: string) {
        return new Date(utc).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: business.timezone });
    }

    async function submit(values: { customerName: string; customerEmail: string; customerPhone?: string; customerNote?: string }) {
        if (!service || !startUtc) return;
        setSubmitting(true);
        try {
            const idempotencyKey = `${service.id}:${startUtc}:${values.customerEmail.toLowerCase().trim()}`;
            const res = await fetch(`/api/termine/public/${business.slug}/appointments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    serviceId: service.id,
                    staffId: staffId ?? undefined,
                    startUtc,
                    customerName: values.customerName,
                    customerEmail: values.customerEmail,
                    customerPhone: values.customerPhone,
                    customerNote: values.customerNote,
                    idempotencyKey,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Buchung fehlgeschlagen.");
            setConfirmed({ manageToken: data.manageToken, startUtc: data.startUtc, status: data.status });
            setStep(5);
            window.scrollTo({ top: 0 });
        } catch (e) {
            message.error(e instanceof Error ? e.message : "Buchung fehlgeschlagen.");
            // Slot may be gone — refresh.
            await loadSlots();
        } finally {
            setSubmitting(false);
        }
    }

    const stepIndex = (n: number) => (showStaffStep ? n : n - (n > 0 ? 1 : 0));

    return (
        <div className="buchen-page">
            <header className="buchen-hero">
                <div className="buchen-hero-inner">
                    <div className="buchen-eyebrow">Online-Buchung</div>
                    <h1>{business.displayName}</h1>
                    {business.description && <p>{business.description}</p>}
                    <div className="buchen-meta">
                        {business.address && <span>{business.address}</span>}
                        {business.contactPhone && <span>{business.contactPhone}</span>}
                        {business.contactEmail && <span>{business.contactEmail}</span>}
                    </div>
                </div>
            </header>

            <main className="buchen-main">
                {confirmed ? (
                    <Card className="buchen-card">
                        <div style={{ textAlign: "center", padding: 16 }}>
                            {confirmed.status === "PENDING" ? (
                                <>
                                    <ClockCircleOutlined style={{ fontSize: 48, color: "#faad14" }} />
                                    <Title level={3} style={{ marginTop: 16 }}>Buchungsanfrage eingegangen</Title>
                                    <Text>
                                        {service?.name} am {fmtDay(confirmed.startUtc.slice(0, 10))} um {fmtTime(confirmed.startUtc)} Uhr
                                    </Text>
                                    <p style={{ marginTop: 12, color: "#475569" }}>
                                        Vielen Dank! Ihre Buchungsanfrage ist eingegangen und wird derzeit vom Unternehmen geprüft. Sobald der Termin bestätigt wurde, erhalten Sie eine verbindliche Bestätigung mit Kalendereintrag per E-Mail.
                                    </p>
                                    <p style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
                                        Über den folgenden Link können Sie den aktuellen Status Ihrer Anfrage einsehen:
                                    </p>
                                </>
                            ) : (
                                <>
                                    <CheckCircleOutlined style={{ fontSize: 48, color: "#10b981" }} />
                                    <Title level={3} style={{ marginTop: 16 }}>Termin bestätigt</Title>
                                    <Text>
                                        {service?.name} am {fmtDay(confirmed.startUtc.slice(0, 10))} um {fmtTime(confirmed.startUtc)} Uhr
                                    </Text>
                                    <p style={{ marginTop: 12, color: "#475569" }}>
                                        Eine Bestätigung mit Kalendereintrag wurde per E-Mail versendet. Über den folgenden Link können Sie den Termin verwalten oder stornieren:
                                    </p>
                                </>
                            )}
                            <Input.Search
                                readOnly
                                value={`${typeof window !== "undefined" ? window.location.origin : ""}/buchen/verwalten/${confirmed.manageToken}`}
                                enterButton="Kopieren"
                                onSearch={(v) => {
                                    void navigator.clipboard?.writeText(v).then(() => message.success("Link kopiert."));
                                }}
                            />
                        </div>
                    </Card>
                ) : (
                    <>
                        <Steps current={stepIndex(step)} size="small" style={{ marginBottom: 24 }} items={steps.map((t) => ({ title: t }))} />
                        {step === 0 && (
                            <div className="buchen-service-list">
                                {services.map((s) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        className={`buchen-service${serviceId === s.id ? " buchen-service--active" : ""}`}
                                        onClick={() => {
                                            setServiceId(s.id);
                                            setStaffId(null);
                                            setDay(null);
                                            setStartUtc(null);
                                            setStep(1);
                                            window.scrollTo({ top: 0 });
                                        }}
                                    >
                                        <span className="buchen-service-name">{s.name}</span>
                                        {s.description && <span className="buchen-service-desc">{s.description}</span>}
                                        <span className="buchen-service-meta">
                                            {s.durationMinutes} Min
                                            {business.showPrices && s.priceCents !== undefined ? ` · ${eur(s.priceCents, s.currency)}` : ""}
                                        </span>
                                    </button>
                                ))}
                                {services.length === 0 && <Alert message="Derzeit sind keine Leistungen buchbar." type="info" showIcon />}
                            </div>
                        )}
                        {step === 1 && showStaffStep && (
                            <Card className="buchen-card">
                                <div style={{ display: "grid", gap: 10 }}>
                                    <button type="button" className={`buchen-service${staffId === null ? " buchen-service--active" : ""}`} onClick={() => { setStaffId(null); setDay(null); setStartUtc(null); }}>
                                        <span className="buchen-service-name">Beliebig verfügbar</span>
                                        <span className="buchen-service-desc">Erster freier Mitarbeiter</span>
                                    </button>
                                    {eligibleStaff.map((s) => (
                                        <button type="button" key={s.id} className={`buchen-service${staffId === s.id ? " buchen-service--active" : ""}`} onClick={() => { setStaffId(s.id); setDay(null); setStartUtc(null); }}>
                                            <span className="buchen-service-name">{s.name}</span>
                                            {s.description && <span className="buchen-service-desc">{s.description}</span>}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                                    <Button icon={<ArrowLeftOutlined />} onClick={() => setStep(0)}>Zurück</Button>
                                    <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => { setStep(dateStep); window.scrollTo({ top: 0 }); }}>Weiter</Button>
                                </div>
                            </Card>
                        )}
                        {step === dateStep && (
                            <Card className="buchen-card" loading={loadingSlots}>
                                {dayList.length === 0 && !loadingSlots ? (
                                    <Alert message="In den nächsten 31 Tagen ist leider kein Termin frei." type="info" showIcon />
                                ) : (
                                    <div className="buchen-days">
                                        {dayList.map((d) => (
                                            <button key={d} type="button" className={`buchen-day${day === d ? " buchen-day--active" : ""}`} onClick={() => { setDay(d); setStartUtc(null); }}>
                                                {fmtDay(d)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                                    <Button icon={<ArrowLeftOutlined />} onClick={() => setStep(0)}>Zurück</Button>
                                    <Button type="primary" icon={<ArrowRightOutlined />} disabled={!day || daySlots.length === 0} onClick={() => { setStep(timeStep); window.scrollTo({ top: 0 }); }}>Weiter</Button>
                                </div>
                            </Card>
                        )}
                        {step === timeStep && (
                            <Card className="buchen-card" loading={loadingSlots}>
                                {!day ? (
                                    <Alert message="Bitte zuerst einen Tag wählen." type="info" showIcon />
                                ) : daySlots.length === 0 ? (
                                    <Alert message="An diesem Tag ist leider keine Zeit mehr frei." type="info" showIcon />
                                ) : (
                                    <div className="buchen-times">
                                        {daySlots.map((s) => (
                                            <button
                                                key={`${s.startUtc}-${s.staffId}`}
                                                type="button"
                                                className={`buchen-time${startUtc === s.startUtc ? " buchen-time--active" : ""}`}
                                                onClick={() => {
                                                    setStartUtc(s.startUtc);
                                                    if (!showStaffStep) setStaffId(s.staffId);
                                                    setStep(formStep);
                                                    window.scrollTo({ top: 0 });
                                                }}
                                            >
                                                {fmtTime(s.startUtc)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                                    <Button icon={<ArrowLeftOutlined />} onClick={() => setStep(dateStep)}>Zurück</Button>
                                </div>
                            </Card>
                        )}
                        {step === formStep && (
                            <Card className="buchen-card">
                                <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
                                    <Descriptions.Item label="Leistung">{service?.name} ({service?.durationMinutes} Min{service && business.showPrices && service.priceCents !== undefined ? `, ${eur(service.priceCents, service.currency)}` : ""})</Descriptions.Item>
                                    <Descriptions.Item label="Termin">{day ? fmtDay(day) : ""} um {startUtc ? fmtTime(startUtc) : ""} Uhr</Descriptions.Item>
                                </Descriptions>
                                <Form form={form} layout="vertical" onFinish={(v) => void submit(v)}>
                                    <Form.Item name="customerName" label="Name" rules={[{ required: true, message: "Bitte Namen angeben." }]}>
                                        <Input autoComplete="name" />
                                    </Form.Item>
                                    <Form.Item name="customerEmail" label="E-Mail" rules={[{ required: true, type: "email", message: "Bitte gültige E-Mail angeben." }]}>
                                        <Input autoComplete="email" inputMode="email" />
                                    </Form.Item>
                                    <Form.Item name="customerPhone" label="Telefon (optional)">
                                        <Input autoComplete="tel" />
                                    </Form.Item>
                                    <Form.Item name="customerNote" label="Anmerkung (optional)">
                                        <Input.TextArea rows={2} maxLength={500} />
                                    </Form.Item>
                                    <p style={{ fontSize: 12, color: "#64748b" }}>
                                        Mit der Buchung stimmen Sie der Verarbeitung Ihrer Angaben zur Terminverwaltung zu.
                                    </p>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <Button icon={<ArrowLeftOutlined />} onClick={() => setStep(timeStep)}>Zurück</Button>
                                        <Button type="primary" htmlType="submit" loading={submitting} icon={<ArrowRightOutlined />}>
                                            {business.confirmationMode === "manual" ? "Terminanfrage senden" : "Verbindlich buchen"}
                                        </Button>
                                    </div>
                                </Form>
                            </Card>
                        )}
                    </>
                )}
            </main>
            <footer className="buchen-footer">
                <span>{business.displayName}</span>
                {business.website && <a href={business.website} target="_blank" rel="noreferrer">Website</a>}
                {business.address && <span>{business.address}</span>}
            </footer>
        </div>
    );
}
