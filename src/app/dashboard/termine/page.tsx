"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Col, Empty, Row, Skeleton, Statistic, Tag } from "antd";
import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, PlusOutlined, SettingOutlined } from "@ant-design/icons";
import { get } from "@/lib/termine/client";

interface OverviewData {
    settings: null | { slug: string; displayName: string; enabled: boolean; published: boolean };
    today: Array<{ $id: string; customerName: string; serviceNameSnapshot: string; startUtc: string; status: string }>;
    pending: number;
}

export default function TermineOverviewPage() {
    const router = useRouter();
    const [data, setData] = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const settings = await get<{ settings: OverviewData["settings"] }>("/api/termine/settings").then((r) => r.settings).catch(() => null);
                if (!settings) {
                    router.replace("/dashboard/termine/start");
                    return;
                }
                const today = new Date().toISOString().slice(0, 10);
                const [appts, pending] = await Promise.all([
                    get<{ appointments: OverviewData["today"] }>(`/api/termine/appointments?from=${today}T00:00:00.000Z&to=${today}T23:59:59.999Z`),
                    get<{ appointments: Array<unknown> }>("/api/termine/appointments?status=PENDING"),
                ]);
                setData({ settings, today: appts.appointments, pending: pending.appointments.length });
            } catch (e) {
                setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
            } finally {
                setLoading(false);
            }
        })();
    }, [router]);

    if (loading) return <Skeleton active paragraph={{ rows: 4 }} />;
    if (error) return <Card><p>{error}</p></Card>;
    if (!data) return null;

    return (
        <div className="dashboard-page">
            <section className="dashboard-welcome">
                <div>
                    <div className="dashboard-eyebrow">Termine</div>
                    <h1>{data.settings!.displayName}</h1>
                    <p>
                        {data.settings!.published ? "Buchungsseite ist live." : "Buchungsseite ist noch nicht veröffentlicht."}{" "}
                        {data.settings!.enabled ? "" : "(Deaktiviert)"}
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <Button icon={<SettingOutlined />} onClick={() => router.push("/dashboard/termine/einstellungen")}>
                        Einstellungen
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push("/dashboard/termine/buchungen?action=neu")}>
                        Manuelle Buchung
                    </Button>
                </div>
            </section>

            <section className="dashboard-kpi-grid">
                <div className="dashboard-kpi dashboard-kpi--blue">
                    <span className="dashboard-kpi-icon"><CalendarOutlined /></span>
                    <span className="dashboard-kpi-body">
                        <span className="dashboard-kpi-label">Heute</span>
                        <strong>{data.today.length}</strong>
                        <span className="dashboard-kpi-note">Termine</span>
                    </span>
                </div>
                <div className="dashboard-kpi dashboard-kpi--amber">
                    <span className="dashboard-kpi-icon"><ClockCircleOutlined /></span>
                    <span className="dashboard-kpi-body">
                        <span className="dashboard-kpi-label">Anfragen</span>
                        <strong>{data.pending}</strong>
                        <span className="dashboard-kpi-note">zu bestätigen</span>
                    </span>
                </div>
                <div className="dashboard-kpi dashboard-kpi--teal">
                    <span className="dashboard-kpi-icon"><CheckCircleOutlined /></span>
                    <span className="dashboard-kpi-body">
                        <span className="dashboard-kpi-label">Status</span>
                        <strong>{data.settings!.published ? "Live" : "Entwurf"}</strong>
                        <span className="dashboard-kpi-note">{data.settings!.slug}.rechly.de</span>
                    </span>
                </div>
            </section>

            <Row gutter={[18, 18]}>
                <Col xs={24} lg={14}>
                    <Card className="dashboard-panel" title="Heute">
                        {data.today.length === 0 ? (
                            <Empty description="Heute keine Termine." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        ) : (
                            data.today.map((a) => (
                                <div key={a.$id} className="dashboard-risk-row" style={{ marginBottom: 12 }}>
                                    <div>
                                        <strong>{a.serviceNameSnapshot} — {a.customerName}</strong>
                                        <small>{a.startUtc.slice(11, 16)} Uhr</small>
                                    </div>
                                    <Tag color={a.status === "CONFIRMED" ? "success" : "processing"}>{a.status}</Tag>
                                </div>
                            ))
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={10}>
                    <Card className="dashboard-panel" title="Nächste Schritte">
                        <div className="dashboard-action-list" style={{ gridTemplateColumns: "1fr" }}>
                            <button type="button" onClick={() => router.push("/dashboard/termine/kalender")}>
                                <CalendarOutlined /><span>Kalender öffnen</span>
                            </button>
                            <button type="button" onClick={() => router.push("/dashboard/termine/buchungen")}>
                                <ClockCircleOutlined /><span>Buchungen verwalten</span>
                            </button>
                            <button type="button" onClick={() => router.push("/dashboard/termine/leistungen")}>
                                <CheckCircleOutlined /><span>Leistungen pflegen</span>
                            </button>
                        </div>
                        <Row style={{ marginTop: 16 }}>
                            <Col span={12}>
                                <Statistic title="Offene Anfragen" value={data.pending} />
                            </Col>
                            <Col span={12}>
                                <Statistic title="Heute" value={data.today.length} />
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
