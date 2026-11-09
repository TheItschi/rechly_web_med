"use client";
import { useMemo, useRef, useState } from "react";
import { Alert, Button, Card, Form, Input, Select, Space, Steps, Typography, message } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import SlotPicker, { bookingWhen, type BookingSlot } from "./SlotPicker";
export interface PublicService {
    id: string;
    name: string;
    description?: string;
    category?: string;
    durationMinutes: number;
    priceCents?: number;
    currency: string;
    staffIds: string[];
}
export interface PublicStaff {
    id: string;
    name: string;
    description?: string;
    color?: string;
    serviceIds: string[];
}
export interface PublicBusiness {
    slug: string;
    displayName: string;
    description?: string;
    timezone: string;
    allowAnyStaff: boolean;
    showPrices: boolean;
    currency: string;
    confirmationMode?: string;
    maxHorizonDays?: number;
    cancelNoticeMinutes?: number;
    rescheduleNoticeMinutes?: number;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    website?: string;
}
const price = (service: PublicService) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: service.currency }).format(
        (service.priceCents || 0) / 100,
    );
export default function PublicBooking({
    business,
    services,
    staff,
}: {
    business: PublicBusiness;
    services: PublicService[];
    staff: PublicStaff[];
}) {
    const [step, setStep] = useState(0),
        [serviceId, setServiceId] = useState(""),
        [staffId, setStaffId] = useState(""),
        [query, setQuery] = useState(""),
        [slot, setSlot] = useState<BookingSlot | null>(null);
    const [error, setError] = useState(""),
        [submitting, setSubmitting] = useState(false),
        [refresh, setRefresh] = useState(0);
    const [confirmed, setConfirmed] = useState<{
        manageToken: string;
        startUtc: string;
        status: string;
        delivery: string;
    } | null>(null);
    const [form] = Form.useForm();
    const submittingRef = useRef(false),
        attempt = useRef<{ key: string; fingerprint: string } | null>(null);
    const service = services.find((s) => s.id === serviceId),
        eligible = staff.filter(
            (s) =>
                (!service?.staffIds.length || service.staffIds.includes(s.id)) &&
                (!service || !s.serviceIds?.length || s.serviceIds.includes(service.id)),
        );
    const listed = useMemo(
        () =>
            services.filter((s) =>
                [s.name, s.category, s.description]
                    .join(" ")
                    .toLocaleLowerCase()
                    .includes(query.toLocaleLowerCase()),
            ),
        [services, query],
    );
    const endpoint = `/api/termine/public/${business.slug}/availability?serviceId=${encodeURIComponent(serviceId)}${staffId ? "&staffId=" + encodeURIComponent(staffId) : ""}`;
    function chooseService(id: string) {
        setServiceId(id);
        setStaffId("");
        setSlot(null);
        setError("");
        setStep(1);
        attempt.current = null;
    }
    async function submit(values: {
        customerName: string;
        customerEmail: string;
        customerPhone?: string;
        customerNote?: string;
    }) {
        if (!service || !slot || submittingRef.current) return;
        submittingRef.current = true;
        setSubmitting(true);
        setError("");
        const fingerprint = JSON.stringify([service.id, slot, values]);
        if (attempt.current?.fingerprint !== fingerprint)
            attempt.current = { key: crypto.randomUUID(), fingerprint };
        try {
            const response = await fetch(`/api/termine/public/${business.slug}/appointments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...values,
                    serviceId: service.id,
                    staffId: slot.staffId,
                    startUtc: slot.startUtc,
                    idempotencyKey: attempt.current.key,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                if (response.status === 409) {
                    setSlot(null);
                    setStep(1);
                    setRefresh((r) => r + 1);
                }
                throw new Error(data.error || "Buchung fehlgeschlagen.");
            }
            setConfirmed(data);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
            setError((error as Error).message);
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    }
    const summary = service && (
        <>
            <span className="booking-label">Ihre Auswahl</span>
            <h2>{service.name}</h2>
            <p>
                {service.durationMinutes} Minuten
                {business.showPrices && service.priceCents !== undefined ? " · " + price(service) : ""}
            </p>
            {slot && (
                <p>
                    <strong>{bookingWhen(slot.startUtc, business.timezone)}</strong>
                    <br />
                    <span className="booking-muted">{business.timezone}</span>
                </p>
            )}
            {slot && staff.find((s) => s.id === slot.staffId) && (
                <p>Bei {staff.find((s) => s.id === slot.staffId)?.name}</p>
            )}
            {business.address && <p>{business.address}</p>}
            <div className="booking-policy">
                <strong>Gut zu wissen</strong>
                <p>
                    {business.confirmationMode === "manual"
                        ? "Ihre Anfrage wird vom Unternehmen geprüft. Erst danach ist der Termin bestätigt."
                        : "Nach erfolgreicher Buchung ist Ihr Termin bestätigt."}
                </p>
                <p>
                    Online stornieren{" "}
                    {business.cancelNoticeMinutes
                        ? `bis ${business.cancelNoticeMinutes} Minuten vorher`
                        : "bis zum Terminbeginn"}
                    . Umbuchen{" "}
                    {business.rescheduleNoticeMinutes
                        ? `bis ${business.rescheduleNoticeMinutes} Minuten vorher`
                        : "bis zum Terminbeginn"}
                    .
                </p>
                <p>Sie benötigen kein Rechly-Konto.</p>
            </div>
        </>
    );
    return (
        <div className="buchen-page">
            <header className="buchen-hero">
                <div className="buchen-hero-inner">
                    <div className="buchen-eyebrow">Einfach online buchen</div>
                    <h1>{business.displayName}</h1>
                    {business.description && <p>{business.description}</p>}
                    <div className="buchen-meta">
                        {business.address && <span>{business.address}</span>}
                        {business.contactPhone && (
                            <a href={"tel:" + business.contactPhone}>{business.contactPhone}</a>
                        )}
                        {business.contactEmail && (
                            <a href={"mailto:" + business.contactEmail}>{business.contactEmail}</a>
                        )}
                    </div>
                </div>
            </header>
            <main className="buchen-main">
                {confirmed ? (
                    <Card className="buchen-card booking-confirmation">
                        <div className="booking-success-icon">
                            {confirmed.status === "PENDING" ? (
                                <ClockCircleOutlined />
                            ) : (
                                <CheckCircleOutlined />
                            )}
                        </div>
                        <Typography.Title level={2}>
                            {confirmed.status === "PENDING"
                                ? "Ihre Anfrage ist eingegangen"
                                : "Ihr Termin ist bestätigt"}
                        </Typography.Title>
                        <Typography.Paragraph>
                            {service?.name} · {service?.durationMinutes} Minuten
                            <br />
                            {bookingWhen(confirmed.startUtc, business.timezone)} ({business.timezone})
                        </Typography.Paragraph>
                        <Alert
                            type={confirmed.status === "PENDING" ? "info" : "success"}
                            showIcon
                            title={
                                confirmed.status === "PENDING"
                                    ? "Das Unternehmen prüft Ihren Wunschtermin."
                                    : "Wir freuen uns auf Ihren Besuch."
                            }
                            description={
                                confirmed.delivery === "sent"
                                    ? "Die E-Mail wurde an den Versanddienst übergeben. Prüfen Sie bei Bedarf auch Ihren Spam-Ordner."
                                    : "Die E-Mail ist zum Versand vorgemerkt. Speichern Sie Ihren Verwaltungslink, damit Sie Ihren Termin jederzeit wiederfinden."
                            }
                        />
                        <Space wrap style={{ marginTop: 24 }}>
                            <Button
                                type="primary"
                                size="large"
                                href={`/buchen/verwalten/${confirmed.manageToken}`}
                            >
                                Termin verwalten
                            </Button>
                            {confirmed.status === "CONFIRMED" && (
                                <Button href={`/api/termine/manage/${confirmed.manageToken}/calendar`}>
                                    Zum Kalender hinzufügen
                                </Button>
                            )}
                            <Button
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(
                                            new URL(
                                                `/buchen/verwalten/${confirmed.manageToken}`,
                                                window.location.origin,
                                            ).toString(),
                                        );
                                        message.success("Link kopiert.");
                                    } catch {
                                        message.info(
                                            "Öffnen Sie „Termin verwalten“ und speichern Sie die Adresse.",
                                        );
                                    }
                                }}
                            >
                                Verwaltungslink kopieren
                            </Button>
                        </Space>
                    </Card>
                ) : (
                    <>
                        <Steps
                            current={step}
                            responsive={false}
                            size="small"
                            items={[{ title: "Leistung" }, { title: "Termin" }, { title: "Ihre Angaben" }]}
                            style={{ marginBottom: 28 }}
                        />
                        {error && (
                            <Alert
                                role="alert"
                                type="error"
                                showIcon
                                title={error}
                                style={{ marginBottom: 20 }}
                            />
                        )}
                        <div className={service ? "booking-layout" : ""}>
                            <section aria-label="Buchung">
                                {step === 0 && (
                                    <>
                                        <Typography.Title level={2}>
                                            Was dürfen wir für Sie tun?
                                        </Typography.Title>
                                        <p className="booking-muted">
                                            Wählen Sie eine Leistung. Freie Termine sehen Sie im nächsten
                                            Schritt.
                                        </p>
                                        {services.length > 5 && (
                                            <Input.Search
                                                aria-label="Leistung suchen"
                                                placeholder="Leistung oder Kategorie suchen"
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                style={{ marginBottom: 20 }}
                                            />
                                        )}
                                        <div className="buchen-service-list">
                                            {listed.map((s) => (
                                                <button
                                                    type="button"
                                                    className="buchen-service"
                                                    key={s.id}
                                                    onClick={() => chooseService(s.id)}
                                                >
                                                    {s.category && (
                                                        <span className="booking-label">{s.category}</span>
                                                    )}
                                                    <span className="buchen-service-name">{s.name}</span>
                                                    {s.description && (
                                                        <span className="buchen-service-desc">
                                                            {s.description}
                                                        </span>
                                                    )}
                                                    <span className="buchen-service-meta">
                                                        {s.durationMinutes} Minuten
                                                        {business.showPrices && s.priceCents !== undefined
                                                            ? " · " + price(s)
                                                            : ""}
                                                        <span aria-hidden="true"> →</span>
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                        {!listed.length && (
                                            <Alert
                                                type="info"
                                                title={
                                                    services.length
                                                        ? "Keine passende Leistung gefunden."
                                                        : "Zurzeit sind keine Leistungen online buchbar."
                                                }
                                            />
                                        )}
                                    </>
                                )}
                                {step === 1 && (
                                    <Card className="buchen-card">
                                        <Typography.Title level={3} style={{ marginTop: 0 }}>
                                            Wann passt es Ihnen?
                                        </Typography.Title>
                                        {eligible.length > 1 && (
                                            <label className="booking-zone">
                                                Mitarbeiter
                                                <Select
                                                    aria-label="Mitarbeiter"
                                                    value={staffId}
                                                    onChange={(v) => {
                                                        setStaffId(v);
                                                        setSlot(null);
                                                    }}
                                                    options={[
                                                        ...(business.allowAnyStaff
                                                            ? [{ value: "", label: "Erste freie Person" }]
                                                            : []),
                                                        ...eligible.map((s) => ({
                                                            value: s.id,
                                                            label: s.name,
                                                        })),
                                                    ]}
                                                    placeholder="Bitte auswählen"
                                                />
                                            </label>
                                        )}
                                        {(eligible.length <= 1 || staffId || business.allowAnyStaff) && (
                                            <SlotPicker
                                                key={serviceId + staffId + refresh}
                                                endpoint={endpoint}
                                                timezone={business.timezone}
                                                maxHorizonDays={business.maxHorizonDays}
                                                value={slot}
                                                onChange={setSlot}
                                            />
                                        )}
                                        <div className="booking-actions">
                                            <Button icon={<ArrowLeftOutlined />} onClick={() => setStep(0)}>
                                                Leistung ändern
                                            </Button>
                                            <Button
                                                type="primary"
                                                size="large"
                                                disabled={!slot}
                                                onClick={() => {
                                                    setStep(2);
                                                    setError("");
                                                }}
                                            >
                                                Weiter zu Ihren Angaben
                                            </Button>
                                        </div>
                                    </Card>
                                )}
                                {step === 2 && (
                                    <Card className="buchen-card">
                                        <Typography.Title level={3} style={{ marginTop: 0 }}>
                                            Fast geschafft
                                        </Typography.Title>
                                        <p className="booking-muted">
                                            Wir verwenden Ihre Angaben zur Organisation dieses Termins.
                                        </p>
                                        <Form
                                            name="public-booking"
                                            form={form}
                                            layout="vertical"
                                            disabled={submitting}
                                            onFinish={submit}
                                        >
                                            <Form.Item
                                                name="customerName"
                                                label="Name"
                                                rules={[
                                                    {
                                                        required: true,
                                                        whitespace: true,
                                                        message: "Bitte geben Sie Ihren Namen an.",
                                                    },
                                                ]}
                                            >
                                                <Input autoComplete="name" maxLength={120} />
                                            </Form.Item>
                                            <Form.Item
                                                name="customerEmail"
                                                label="E-Mail"
                                                rules={[
                                                    {
                                                        required: true,
                                                        type: "email",
                                                        message:
                                                            "Bitte geben Sie eine gültige E-Mail-Adresse an.",
                                                    },
                                                ]}
                                            >
                                                <Input
                                                    autoComplete="email"
                                                    inputMode="email"
                                                    maxLength={200}
                                                />
                                            </Form.Item>
                                            <Form.Item name="customerPhone" label="Telefon (optional)">
                                                <Input autoComplete="tel" inputMode="tel" maxLength={40} />
                                            </Form.Item>
                                            <Form.Item
                                                name="customerNote"
                                                label="Nachricht an das Unternehmen (optional)"
                                            >
                                                <Input.TextArea rows={3} maxLength={500} showCount />
                                            </Form.Item>
                                            <p className="booking-muted">
                                                Bitte prüfen Sie den Termin und die Änderungsfristen in Ihrer
                                                Buchungsübersicht.{" "}
                                                <a href="/datenschutz" target="_blank" rel="noreferrer">
                                                    Datenschutz
                                                </a>
                                            </p>
                                            <div className="booking-actions">
                                                <Button disabled={submitting} onClick={() => setStep(1)}>
                                                    Termin ändern
                                                </Button>
                                                <Button
                                                    type="primary"
                                                    size="large"
                                                    htmlType="submit"
                                                    loading={submitting}
                                                >
                                                    {business.confirmationMode === "manual"
                                                        ? "Terminanfrage senden"
                                                        : "Verbindlich buchen"}
                                                </Button>
                                            </div>
                                        </Form>
                                    </Card>
                                )}
                            </section>
                            {service && (
                                <aside className="booking-summary" aria-label="Buchungsübersicht">
                                    {summary}
                                </aside>
                            )}
                        </div>
                    </>
                )}
            </main>
            <footer className="buchen-footer">
                <span>{business.displayName}</span>
                {business.website && /^https?:\/\//.test(business.website) && (
                    <a href={business.website} target="_blank" rel="noreferrer">
                        Website
                    </a>
                )}
                <a href="/datenschutz" target="_blank" rel="noreferrer">
                    Datenschutz
                </a>
                <span>Terminbuchung mit Rechly</span>
            </footer>
        </div>
    );
}
