"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Card,
    Tag,
    Button,
    Skeleton,
    Empty,
    Progress,
} from "antd";
import {
    FileTextOutlined,
    UserOutlined,
    ShoppingOutlined,
    PlusOutlined,
    ArrowRightOutlined,
    AlertOutlined,
    RiseOutlined,
    WalletOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    SettingOutlined,
    TagsOutlined,
    CalendarOutlined,
    ProjectOutlined,
} from "@ant-design/icons";
import { useInvoiceStore, useClientStore, useProductStore } from "@/store";
import { useLanguage } from "@/contexts/LanguageContext";
import { getCompanyInfo } from "@/lib/companyService";
import { getDashboardAnalytics } from "@/lib/analyticsService";
import { formatCurrency } from "@/lib/currencyUtils";
import { formatDateGerman } from "@/lib/dateUtils";
import { isTermineEnabled, isWorkspaceEnabled } from "@/lib/features";
import type { DashboardAnalytics, UserCompany } from "@/types";

export default function DashboardPage() {
    const router = useRouter();
    const { t, language } = useLanguage();
    const l = (de: string, en: string) => (language === "de" ? de : en);
    const [company, setCompany] = useState<UserCompany | null>(null);
    const [companyLoading, setCompanyLoading] = useState(true);
    const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
    const [opsSummary, setOpsSummary] = useState<{
        todayBookings: number;
        pendingBookings: number;
        nextBooking?: { customerName: string; serviceNameSnapshot: string; startUtc: string };
        openTasks: number;
        activeProjects: number;
        unbilledTimeValue: number;
        timerRunning?: string;
    }>({
        todayBookings: 0,
        pendingBookings: 0,
        openTasks: 0,
        activeProjects: 0,
        unbilledTimeValue: 0,
    });

    const statusColors: Record<string, string> = {
        draft: "default",
        sent: "processing",
        paid: "success",
        cancelled: "error",
    };

    const statusLabels: Record<string, string> = {
        draft: t("status.draft"),
        sent: t("status.sent"),
        paid: t("status.paid"),
        cancelled: t("status.cancelled"),
    };

    const {
        invoices,
        stats,
        loading: invoicesLoading,
        fetchInvoices,
        fetchStats,
    } = useInvoiceStore();
    const { clients, loading: clientsLoading, fetchClients } = useClientStore();
    const {
        products,
        loading: productsLoading,
        fetchProducts,
    } = useProductStore();

    const loading =
        invoicesLoading || clientsLoading || productsLoading || companyLoading;
    const recentInvoices = invoices.slice(0, 6);
    const paidTotal = stats?.paidAmount ?? 0;
    const unpaidTotal = stats?.unpaidAmount ?? 0;
    const paidRatio =
        paidTotal + unpaidTotal > 0
            ? Math.round((paidTotal / (paidTotal + unpaidTotal)) * 100)
            : 0;

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadData = async () => {
        try {
            setCompanyLoading(true);
            await Promise.all([
                fetchInvoices(),
                fetchStats(),
                fetchClients(),
                fetchProducts(),
                getCompanyInfo().then(setCompany),
                getDashboardAnalytics().then(setAnalytics),
            ]);
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        } finally {
            setCompanyLoading(false);
        }
        // Non-blocking unified platform summary (Termine + Workspace)
        void (async () => {
            try {
                const todayPrefix = new Date().toISOString().slice(0, 10);
                const nowIso = new Date().toISOString();
                const [apptsRes, wsRes, workRes] = await Promise.all([
                    isTermineEnabled()
                        ? fetch(`/api/termine/appointments?from=${todayPrefix}T00:00:00.000Z`, {
                              cache: "no-store",
                          })
                              .then((r) => (r.ok ? r.json() : null))
                              .catch(() => null)
                        : Promise.resolve(null),
                    isWorkspaceEnabled()
                        ? fetch("/api/workspace", { cache: "no-store" })
                              .then((r) => (r.ok ? r.json() : null))
                              .catch(() => null)
                        : Promise.resolve(null),
                    isWorkspaceEnabled()
                        ? fetch("/api/workspace/work", { cache: "no-store" })
                              .then((r) => (r.ok ? r.json() : null))
                              .catch(() => null)
                        : Promise.resolve(null),
                ]);

                const appts: Array<{
                    customerName: string;
                    serviceNameSnapshot: string;
                    startUtc: string;
                    status: string;
                }> = apptsRes?.appointments || [];
                const activeAppts = appts.filter(
                    (a) => a.status === "PENDING" || a.status === "CONFIRMED",
                );
                const todayBookings = activeAppts.filter(
                    (a) => a.startUtc.slice(0, 10) === todayPrefix,
                ).length;
                const pendingBookings = appts.filter((a) => a.status === "PENDING").length;
                const nextBooking = activeAppts.find((a) => a.startUtc >= nowIso);

                const tasks: Array<{ status: string }> = wsRes?.data?.tasks || [];
                const projects: Array<{ status: string }> = wsRes?.data?.projects || [];
                const reports: Array<{ unbilled: number }> = workRes?.reports || [];
                const unbilledTimeValue = reports.reduce((s, r) => s + (r.unbilled || 0), 0);

                setOpsSummary({
                    todayBookings,
                    pendingBookings,
                    nextBooking,
                    openTasks: tasks.filter((tk) => tk.status !== "done").length,
                    activeProjects: projects.filter((p) => p.status === "active").length,
                    unbilledTimeValue,
                    timerRunning: workRes?.timer?.description,
                });
            } catch {
                // Keep dashboard resilient if optional endpoints are unavailable
            }
        })();
    };

    if (loading) {
        return (
            <div className="dashboard-page">
                <Skeleton active paragraph={{ rows: 2 }} />
                <div className="dashboard-kpi-grid" style={{ marginTop: 28 }}>
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="dashboard-panel">
                            <Skeleton active paragraph={{ rows: 1 }} />
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    const kpis = [
        {
            label: t("dashboard.invoices"),
            value: String(stats?.total ?? 0),
            note: `${stats?.sent ?? 0} ${t("dashboard.sent")}`,
            icon: <FileTextOutlined />,
            tone: "blue",
            path: "/dashboard/invoices",
        },
        {
            label: t("dashboard.clients"),
            value: String(clients.length),
            note: t("dashboard.manageClients"),
            icon: <UserOutlined />,
            tone: "teal",
            path: "/dashboard/clients",
        },
        {
            label: t("dashboard.products"),
            value: String(products.length),
            note: t("dashboard.manageProducts"),
            icon: <ShoppingOutlined />,
            tone: "violet",
            path: "/dashboard/products",
        },
        {
            label: t("dashboard.openAmounts"),
            value: formatCurrency(unpaidTotal),
            note: `${stats?.draft ?? 0} ${t("dashboard.drafts")}`,
            icon: <ClockCircleOutlined />,
            tone: "amber",
            path: "/dashboard/invoices",
        },
    ];

    return (
        <div className="dashboard-page">
            <section className="dashboard-welcome">
                <div>
                    <div className="dashboard-eyebrow">{t("dashboard.overview")}</div>
                    <h1>
                        {company
                            ? `${t("dashboard.welcome")}, ${company.name}`
                            : t("dashboard.welcomeDefault")}
                    </h1>
                    <p>{t("dashboard.subtitle")}</p>
                </div>
                <Button
                    type="primary"
                    size="large"
                    icon={<PlusOutlined />}
                    onClick={() => router.push("/dashboard/invoices/create")}
                >
                    {t("dashboard.newInvoice")}
                </Button>
            </section>

            <section className="dashboard-kpi-grid">
                {kpis.map((kpi) => (
                    <button
                        key={kpi.label}
                        className={`dashboard-kpi dashboard-kpi--${kpi.tone}`}
                        onClick={() => router.push(kpi.path)}
                        type="button"
                    >
                        <span className="dashboard-kpi-icon">{kpi.icon}</span>
                        <span className="dashboard-kpi-body">
                            <span className="dashboard-kpi-label">{kpi.label}</span>
                            <strong>{kpi.value}</strong>
                            <span className="dashboard-kpi-note">{kpi.note}</span>
                        </span>
                        <ArrowRightOutlined className="dashboard-kpi-arrow" />
                    </button>
                ))}
            </section>

            <section className="dashboard-finance-grid">
                <Card className="dashboard-panel dashboard-revenue-panel">
                    <div className="dashboard-panel-heading">
                        <div>
                            <span className="dashboard-panel-icon"><RiseOutlined /></span>
                            <h2>{t("dashboard.revenueOverview")}</h2>
                        </div>
                        <Tag color={paidRatio >= 70 ? "success" : "processing"}>
                            {paidRatio}% {t("dashboard.paid")}
                        </Tag>
                    </div>
                    <div className="dashboard-revenue-values">
                        <div>
                            <span>{t("dashboard.totalPaid")}</span>
                            <strong className="text-positive">{formatCurrency(paidTotal)}</strong>
                        </div>
                        <div>
                            <span>{t("dashboard.openAmounts")}</span>
                            <strong className="text-warning">{formatCurrency(unpaidTotal)}</strong>
                        </div>
                    </div>
                    <Progress
                        percent={paidRatio}
                        showInfo={false}
                        strokeColor="#10b981"
                        railColor="#e2e8f0"
                        size={["100%", 8]}
                    />
                    <div className="dashboard-status-summary">
                        <span><i className="status-dot status-dot--draft" />{stats?.draft ?? 0} {t("dashboard.drafts")}</span>
                        <span><i className="status-dot status-dot--sent" />{stats?.sent ?? 0} {t("dashboard.sent")}</span>
                        <span><i className="status-dot status-dot--paid" />{stats?.paid ?? 0} {t("dashboard.paid")}</span>
                    </div>
                </Card>

                <Card className="dashboard-panel dashboard-actions-panel">
                    <div className="dashboard-panel-heading">
                        <div>
                            <span className="dashboard-panel-icon"><WalletOutlined /></span>
                            <h2>{t("dashboard.quickActions")}</h2>
                        </div>
                    </div>
                    <div className="dashboard-action-list">
                        <button type="button" onClick={() => router.push("/dashboard/calendar")}>
                            <CalendarOutlined />
                            <span>{l("Kalender & Termine", "Calendar & Scheduling")}</span>
                            <ArrowRightOutlined />
                        </button>
                        <button type="button" onClick={() => router.push("/dashboard/termine/buchungen")}>
                            <ClockCircleOutlined />
                            <span>
                                {l("Terminbuchungen", "Bookings")}
                                {opsSummary.pendingBookings > 0 ? ` (${opsSummary.pendingBookings})` : ""}
                            </span>
                            <ArrowRightOutlined />
                        </button>
                        <button type="button" onClick={() => router.push("/dashboard/workspace")}>
                            <ProjectOutlined />
                            <span>
                                {l("Projekte & Aufgaben", "Projects & Tasks")}
                                {opsSummary.openTasks > 0 ? ` (${opsSummary.openTasks})` : ""}
                            </span>
                            <ArrowRightOutlined />
                        </button>
                        <button type="button" onClick={() => router.push("/dashboard/offers")}>
                            <TagsOutlined />
                            <span>{t("dashboard.offers")}</span>
                            <ArrowRightOutlined />
                        </button>
                        <button type="button" onClick={() => router.push("/dashboard/clients")}>
                            <UserOutlined />
                            <span>{t("dashboard.manageClients")}</span>
                            <ArrowRightOutlined />
                        </button>
                        <button type="button" onClick={() => router.push("/dashboard/products")}>
                            <ShoppingOutlined />
                            <span>{l("Produkte & Leistungen", "Products & Services")}</span>
                            <ArrowRightOutlined />
                        </button>
                        <button type="button" onClick={() => router.push("/dashboard/settings")}>
                            <SettingOutlined />
                            <span>{t("dashboard.settings")}</span>
                            <ArrowRightOutlined />
                        </button>
                    </div>
                </Card>
            </section>

            <section className="dashboard-analytics-grid" style={{ marginBottom: 20 }}>
                <Card
                    className="dashboard-panel"
                    title={
                        <span>
                            <CalendarOutlined /> {l("Termine & Online-Buchungen", "Appointments & Online Booking")}
                        </span>
                    }
                    extra={
                        <Button type="link" onClick={() => router.push("/dashboard/calendar")}>
                            {l("Zum Kalender", "Open Calendar")} <ArrowRightOutlined />
                        </Button>
                    }
                >
                    <div className="dashboard-forecast-values" style={{ marginBottom: 12 }}>
                        <div>
                            <span>{l("Heute geplant", "Today")}</span>
                            <strong>{opsSummary.todayBookings}</strong>
                        </div>
                        <div>
                            <span>{l("Offene Anfragen", "Pending approval")}</span>
                            <strong>{opsSummary.pendingBookings}</strong>
                        </div>
                    </div>
                    {opsSummary.nextBooking ? (
                        <div className="dashboard-anomaly-note" style={{ cursor: "pointer" }} onClick={() => router.push("/dashboard/termine/buchungen")}>
                            <CalendarOutlined />{" "}
                            {l("Nächster Termin:", "Next appointment:")}{" "}
                            <strong>{opsSummary.nextBooking.customerName}</strong> ·{" "}
                            {opsSummary.nextBooking.serviceNameSnapshot} (
                            {new Date(opsSummary.nextBooking.startUtc).toLocaleString(
                                language === "de" ? "de-DE" : "en-GB",
                                { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" },
                            )}
                            )
                        </div>
                    ) : (
                        <p className="dashboard-empty-note">
                            {l("Keine anstehenden Buchungen.", "No upcoming customer bookings.")}
                        </p>
                    )}
                </Card>

                <Card
                    className="dashboard-panel"
                    title={
                        <span>
                            <ProjectOutlined /> {l("Projekte, Aufgaben & Zeiten", "Projects, Tasks & Time")}
                        </span>
                    }
                    extra={
                        <Button type="link" onClick={() => router.push("/dashboard/workspace")}>
                            {l("Zum Arbeitsbereich", "Open Projects")} <ArrowRightOutlined />
                        </Button>
                    }
                >
                    <div className="dashboard-forecast-values" style={{ marginBottom: 12 }}>
                        <div>
                            <span>{l("Offene Aufgaben", "Open tasks")}</span>
                            <strong>{opsSummary.openTasks}</strong>
                        </div>
                        <div>
                            <span>{l("Offene Zeiten (netto)", "Unbilled time (net)")}</span>
                            <strong>{formatCurrency(opsSummary.unbilledTimeValue)}</strong>
                        </div>
                    </div>
                    {opsSummary.timerRunning ? (
                        <div
                            className="dashboard-anomaly-note"
                            style={{ cursor: "pointer" }}
                            onClick={() => router.push("/dashboard/workspace/time")}
                        >
                            <ClockCircleOutlined /> {l("Timer läuft:", "Timer running:")}{" "}
                            <strong>{opsSummary.timerRunning}</strong>
                        </div>
                    ) : (
                        <p className="dashboard-empty-note">
                            {opsSummary.activeProjects}{" "}
                            {l("aktive(s) Projekt(e) · Zeiterfassung bereit", "active project(s) · Time tracking ready")}
                        </p>
                    )}
                </Card>
            </section>

            <section className="dashboard-main-grid">
                <Card
                    className="dashboard-panel dashboard-recent-panel"
                    title={t("dashboard.recentInvoices")}
                    extra={
                        <Button type="link" onClick={() => router.push("/dashboard/invoices")}>
                            {t("dashboard.showAll")} <ArrowRightOutlined />
                        </Button>
                    }
                >
                    {recentInvoices.length === 0 ? (
                        <Empty
                            description={t("dashboard.noInvoices")}
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        >
                            <Button
                                type="primary"
                                onClick={() => router.push("/dashboard/invoices/create")}
                            >
                                {t("dashboard.createFirst")}
                            </Button>
                        </Empty>
                    ) : (
                        <div className="dashboard-invoice-list">
                            {recentInvoices.map((invoice) => (
                                <button
                                    type="button"
                                    key={invoice.id}
                                    onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                                    className="dashboard-invoice-row"
                                >
                                    <span className="dashboard-invoice-symbol"><FileTextOutlined /></span>
                                    <span className="dashboard-invoice-info">
                                        <strong>{invoice.invoice_number}</strong>
                                        <small>
                                            {invoice.client?.name || t("dashboard.unknownClient")}
                                            {" · "}{formatDateGerman(invoice.issue_date)}
                                        </small>
                                    </span>
                                    <Tag color={statusColors[invoice.status]}>
                                        {statusLabels[invoice.status]}
                                    </Tag>
                                    <strong className="dashboard-invoice-amount">
                                        {formatCurrency(invoice.total_gross)}
                                    </strong>
                                    <ArrowRightOutlined className="dashboard-row-arrow" />
                                </button>
                            ))}
                        </div>
                    )}
                </Card>

                <div className="dashboard-side-stack">
                    <Card className="dashboard-panel dashboard-forecast-card">
                        <div className="dashboard-panel-heading">
                            <div>
                                <span className="dashboard-panel-icon"><RiseOutlined /></span>
                                <h2>Revenue Forecast</h2>
                            </div>
                            <span className="dashboard-confidence">
                                {analytics?.forecast.confidence ?? 0}% confidence
                            </span>
                        </div>
                        <div className="dashboard-forecast-values">
                            <div>
                                <span>Next 30 days</span>
                                <strong>{formatCurrency(analytics?.forecast.next30Days ?? 0)}</strong>
                            </div>
                            <div>
                                <span>Next 90 days</span>
                                <strong>{formatCurrency(analytics?.forecast.next90Days ?? 0)}</strong>
                            </div>
                        </div>
                    </Card>

                    <Card className="dashboard-panel dashboard-insights-card">
                        <div className="dashboard-panel-heading">
                            <div>
                                <span className="dashboard-panel-icon"><AlertOutlined /></span>
                                <h2>KPI Intelligence</h2>
                            </div>
                        </div>
                        {analytics?.kpiInsights?.length ? (
                            <div className="dashboard-insight-list">
                                {analytics.kpiInsights.slice(0, 4).map((insight) => (
                                    <div key={insight.key} className="dashboard-insight-item">
                                        <span>{insight.value}</span>
                                        <i className={`insight-level insight-level--${insight.importance}`} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="dashboard-empty-note">No KPI insights generated yet.</p>
                        )}
                    </Card>
                </div>
            </section>

            <section className="dashboard-analytics-grid">
                <Card className="dashboard-panel" title="Late-Payment Risk">
                    {analytics?.latePaymentRisk?.length ? (
                        <div className="dashboard-risk-list">
                            {analytics.latePaymentRisk.slice(0, 5).map((risk) => (
                                <div key={risk.clientId} className="dashboard-risk-row">
                                    <div>
                                        <strong>{risk.clientName}</strong>
                                        <small>Late rate {risk.lateRate}% · Avg {risk.averageDaysLate}d</small>
                                    </div>
                                    <Tag color={risk.riskLevel === "high" ? "error" : risk.riskLevel === "medium" ? "warning" : "success"}>
                                        {(risk.riskScore * 100).toFixed(1)}%
                                    </Tag>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="dashboard-empty-note">Not enough data for risk scoring yet.</p>
                    )}
                </Card>

                <Card className="dashboard-panel" title="Customer Segmentation & Anomalies">
                    <div className="dashboard-segment-list">
                        {analytics?.customerSegments?.length ? (
                            ["champions", "loyal", "at_risk", "new", "needs_attention"].map((segment) => {
                                const count = analytics.customerSegments.filter((entry) => entry.segment === segment).length;
                                return (
                                    <span key={segment}>
                                        {segment.replace("_", " ")} <strong>{count}</strong>
                                    </span>
                                );
                            })
                        ) : (
                            <p className="dashboard-empty-note">No segmentation data yet.</p>
                        )}
                    </div>
                    {analytics?.anomalies?.length ? (
                        <div className="dashboard-anomaly-note">
                            <AlertOutlined /> {analytics.anomalies[0].message}
                        </div>
                    ) : (
                        <p className="dashboard-empty-note"><CheckCircleOutlined /> No anomalies detected.</p>
                    )}
                </Card>
            </section>
        </div>
    );
}
