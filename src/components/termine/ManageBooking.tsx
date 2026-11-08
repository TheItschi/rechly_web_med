"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, Descriptions, Modal, Space, Tag, Typography, message } from "antd";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;

interface ManagedAppointment {
    serviceName: string;
    startUtc: string;
    endUtc: string;
    timezone: string;
    durationMinutes: number;
    status: string;
    businessName: string;
}

const STATUS_LABEL: Record<string, string> = {
    PENDING: "Angefragt",
    CONFIRMED: "Bestätigt",
    COMPLETED: "Abgeschlossen",
    CANCELLED_BY_CUSTOMER: "Storniert",
    CANCELLED_BY_BUSINESS: "Storniert",
    NO_SHOW: "Nicht erschienen",
};

export default function ManageBooking({ token }: { token: string }) {
    const router = useRouter();
    const [appt, setAppt] = useState<ManagedAppointment | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/termine/manage/${token}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Buchung nicht gefunden.");
            setAppt(data.appointment);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Buchung nicht gefunden.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    async function cancel() {
        Modal.confirm({
            title: "Termin wirklich stornieren?",
            okText: "Ja, stornieren",
            cancelText: "Behalten",
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    const res = await fetch(`/api/termine/manage/${token}/cancel`, { method: "POST" });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Stornierung fehlgeschlagen.");
                    message.success("Termin storniert.");
                    await load();
                } catch (e) {
                    message.error(e instanceof Error ? e.message : "Stornierung fehlgeschlagen.");
                }
            },
        });
    }

    if (loading) return <Card loading style={{ maxWidth: 640, margin: "48px auto" }} />;
    if (error || !appt) {
        return (
            <div className="buchen-page">
                <main className="buchen-main">
                    <Alert type="error" showIcon message={error ?? "Buchung nicht gefunden."} description="Der Link ist ungültig oder abgelaufen. Bitten Sie das Unternehmen um einen neuen Verwaltungslink." />
                    <div style={{ marginTop: 16 }}><Button onClick={() => router.push("/")}>Zur Startseite</Button></div>
                </main>
            </div>
        );
    }

    const cancelled = appt.status === "CANCELLED_BY_CUSTOMER" || appt.status === "CANCELLED_BY_BUSINESS";
    const when = new Date(appt.startUtc).toLocaleString("de-DE", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: appt.timezone });

    return (
        <div className="buchen-page">
            <header className="buchen-hero">
                <div className="buchen-hero-inner">
                    <div className="buchen-eyebrow">Terminverwaltung</div>
                    <h1>{appt.businessName}</h1>
                </div>
            </header>
            <main className="buchen-main">
                <Card className="buchen-card">
                    <Title level={4} style={{ marginTop: 0 }}>{appt.serviceName}</Title>
                    <Descriptions column={1} size="small" style={{ marginBottom: 8 }}>
                        <Descriptions.Item label="Termin">{when} Uhr ({appt.durationMinutes} Min)</Descriptions.Item>
                        <Descriptions.Item label="Status"><Tag color={cancelled ? "error" : appt.status === "CONFIRMED" ? "success" : "processing"}>{STATUS_LABEL[appt.status] ?? appt.status}</Tag></Descriptions.Item>
                    </Descriptions>
                    {appt.status === "PENDING" && (
                        <Alert
                            type="info"
                            showIcon
                            style={{ marginBottom: 12 }}
                            message="Buchungsanfrage wird geprüft"
                            description="Ihre Anfrage liegt dem Unternehmen zur Prüfung vor. Sobald der Termin bestätigt wurde, erhalten Sie eine Benachrichtigung mit Kalendereintrag per E-Mail."
                        />
                    )}
                    {!cancelled && appt.status !== "COMPLETED" && (
                        <Space wrap>
                            <Button danger onClick={() => void cancel()}>Termin stornieren</Button>
                            <Text type="secondary">Umbuchungen sind telefonisch oder per E-Mail möglich.</Text>
                        </Space>
                    )}
                    {(cancelled || appt.status === "COMPLETED") && (
                        <Alert type={cancelled ? "warning" : "success"} showIcon message={cancelled ? "Dieser Termin ist storniert." : "Dieser Termin ist abgeschlossen. Vielen Dank!"} />
                    )}
                </Card>
            </main>
        </div>
    );
}
