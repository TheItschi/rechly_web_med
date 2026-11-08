"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    Alert,
    Button,
    Card,
    Col,
    Row,
    Segmented,
    Select,
    Space,
    Spin,
    Statistic,
    Table,
    Tabs,
    Tag,
    Typography,
} from "antd";
import { CalendarOutlined, EuroOutlined, ProjectOutlined } from "@ant-design/icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency } from "@/lib/currencyUtils";
import { isTermineEnabled, isWorkspaceEnabled } from "@/lib/features";
import ProjectReports from "@/components/workspace/ProjectReports";
import type { UstvaReport, EuerReport } from "@/lib/taxReports";

const { Title, Paragraph, Text } = Typography;

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

interface BookingMetricRow {
    $id: string;
    serviceNameSnapshot: string;
    servicePriceCents: number;
    currency: string;
    status: string;
    startUtc: string;
    linkedInvoiceId?: string;
}

export default function ReportsPage() {
    const { language } = useLanguage();
    const l = (de: string, en: string) => (language === "de" ? de : en);
    const now = new Date();
    const [activeTab, setActiveTab] = useState("tax");
    const [year, setYear] = useState(now.getFullYear());
    const [part, setPart] = useState<string>(`Q${Math.floor(now.getMonth() / 3) + 1}`);
    const [loading, setLoading] = useState(true);
    const [ustva, setUstva] = useState<UstvaReport | null>(null);
    const [euer, setEuer] = useState<EuerReport | null>(null);
    const [bookings, setBookings] = useState<BookingMetricRow[]>([]);

    useEffect(() => {
        const tabParam = new URLSearchParams(window.location.search).get("tab");
        if (tabParam && ["tax", "projects", "bookings"].includes(tabParam)) {
            setActiveTab(tabParam);
        }
        if (isTermineEnabled()) {
            void fetch("/api/termine/appointments", { cache: "no-store" })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => {
                    if (d?.appointments) setBookings(d.appointments);
                })
                .catch(() => {});
        }
    }, []);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/reports/tax?year=${year}&part=${part}`);
            if (!res.ok) throw new Error("failed");
            const data = await res.json();
            setUstva(data.ustva);
            setEuer(data.euer);
        } catch (error) {
            console.error("Error loading reports:", error);
        } finally {
            setLoading(false);
        }
    }, [year, part]);

    useEffect(() => {
        void load();
    }, [load]);

    const ustvaRows = ustva
        ? [
              {
                  key: "81",
                  kz: "81",
                  label: "Steuerpflichtige Umsätze 19 % (netto)",
                  value: ustva.kz81Net,
              },
              {
                  key: "81t",
                  kz: "",
                  label: "Umsatzsteuer 19 %",
                  value: ustva.kz81Tax,
              },
              {
                  key: "86",
                  kz: "86",
                  label: "Steuerpflichtige Umsätze 7 % (netto)",
                  value: ustva.kz86Net,
              },
              {
                  key: "86t",
                  kz: "",
                  label: "Umsatzsteuer 7 %",
                  value: ustva.kz86Tax,
              },
              ...(ustva.taxFreeNet !== 0
                  ? [
                        {
                            key: "free",
                            kz: "–",
                            label: "Steuerfreie Umsätze (netto)",
                            value: ustva.taxFreeNet,
                        },
                    ]
                  : []),
              {
                  key: "66",
                  kz: "66",
                  label: "Vorsteuer aus Ausgaben",
                  value: ustva.kz66Vorsteuer,
              },
              {
                  key: "83",
                  kz: "83",
                  label: "Zahllast (+) / Erstattung (−)",
                  value: ustva.kz83Zahllast,
              },
          ]
        : [];

    const completedBookings = bookings.filter((b) => b.status === "COMPLETED");
    const unbilledBookings = completedBookings.filter((b) => !b.linkedInvoiceId);
    const completedValueEur = completedBookings.reduce((s, b) => s + (b.servicePriceCents || 0) / 100, 0);
    const unbilledValueEur = unbilledBookings.reduce((s, b) => s + (b.servicePriceCents || 0) / 100, 0);
    const cancelledOrNoShowCount = bookings.filter((b) =>
        ["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_BUSINESS", "NO_SHOW"].includes(b.status),
    ).length;

    const serviceBreakdownMap = new Map<string, { service: string; count: number; revenue: number }>();
    for (const b of completedBookings) {
        const key = b.serviceNameSnapshot || "—";
        const cur = serviceBreakdownMap.get(key) || { service: key, count: 0, revenue: 0 };
        cur.count += 1;
        cur.revenue += (b.servicePriceCents || 0) / 100;
        serviceBreakdownMap.set(key, cur);
    }
    const serviceBreakdown = [...serviceBreakdownMap.values()].sort((a, b) => b.revenue - a.revenue);

    return (
        <div style={{ maxWidth: 1200 }}>
            <Title level={3}>{l("Berichte, Steuern & Controlling", "Reports, Tax & Controlling")}</Title>
            <Paragraph type="secondary">
                {l(
                    "Steuerauswertungen (UStVA & EÜR), Projektcontrolling und Terminbuchungs-Auswertungen an einem zentralen Ort.",
                    "Tax reports (VAT & EÜR), project profitability and appointment booking analytics in one place.",
                )}
            </Paragraph>

            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    {
                        key: "tax",
                        label: (
                            <span>
                                <EuroOutlined /> {l("Steuern (UStVA & EÜR)", "Tax (UStVA & EÜR)")}
                            </span>
                        ),
                        children: (
                            <>
                                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                                    <Col>
                                        <Select
                                            value={year}
                                            onChange={setYear}
                                            options={[year - 1, year, year + 1]
                                                .filter((y) => y <= now.getFullYear())
                                                .map((y) => ({ value: y, label: String(y) }))}
                                            style={{ width: 100 }}
                                        />
                                    </Col>
                                    <Col>
                                        <Segmented
                                            value={part}
                                            onChange={(value) => setPart(String(value))}
                                            options={[...QUARTERS]}
                                        />
                                    </Col>
                                </Row>

                                {loading ? (
                                    <Spin size="large" />
                                ) : (
                                    <Row gutter={[16, 16]}>
                                        <Col xs={24} lg={12}>
                                            <Card title={`Umsatzsteuervoranmeldung ${part}/${year}`}>
                                                <Table
                                                    size="small"
                                                    pagination={false}
                                                    dataSource={ustvaRows}
                                                    columns={[
                                                        {
                                                            title: "KZ",
                                                            dataIndex: "kz",
                                                            width: 60,
                                                        },
                                                        { title: "Position", dataIndex: "label" },
                                                        {
                                                            title: "Betrag",
                                                            dataIndex: "value",
                                                            align: "right" as const,
                                                            render: (value: number) => (
                                                                <Text strong={value === ustva?.kz83Zahllast}>
                                                                    {formatCurrency(value, "de")}
                                                                </Text>
                                                            ),
                                                        },
                                                    ]}
                                                />
                                            </Card>
                                        </Col>
                                        <Col xs={24} lg={12}>
                                            <Card title={`EÜR ${year} (vereinfacht)`}>
                                                {euer && (
                                                    <Table
                                                        size="small"
                                                        pagination={false}
                                                        dataSource={[
                                                            ...euer.incomeByRate.map((item) => ({
                                                                key: `in-${item.rate}`,
                                                                label: `Einnahmen ${item.rate} % (netto)`,
                                                                value: item.net,
                                                            })),
                                                            {
                                                                key: "vat-in",
                                                                label: "Vereinnahmte Umsatzsteuer",
                                                                value: euer.collectedVat,
                                                            },
                                                            {
                                                                key: "sum-in",
                                                                label: "Summe Betriebseinnahmen",
                                                                value: euer.totalIncome,
                                                            },
                                                            ...euer.expenseGroups.map((group) => ({
                                                                key: `ex-${group.category}`,
                                                                label: `Ausgaben: ${group.category}`,
                                                                value: -group.net,
                                                            })),
                                                            {
                                                                key: "vat-out",
                                                                label: "Gezahlte Vorsteuer",
                                                                value: -euer.paidVorsteuer,
                                                            },
                                                            {
                                                                key: "profit",
                                                                label: "Gewinn / Verlust",
                                                                value: euer.profit,
                                                            },
                                                        ]}
                                                        columns={[
                                                            {
                                                                title: "Position",
                                                                dataIndex: "label",
                                                            },
                                                            {
                                                                title: "Betrag",
                                                                dataIndex: "value",
                                                                align: "right" as const,
                                                                render: (value: number, record: { key: string }) => (
                                                                    <Text
                                                                        strong={
                                                                            record.key === "profit" ||
                                                                            record.key === "sum-in"
                                                                        }
                                                                    >
                                                                        {formatCurrency(value, "de")}
                                                                    </Text>
                                                                ),
                                                            },
                                                        ]}
                                                    />
                                                )}
                                            </Card>
                                        </Col>
                                        <Col span={24}>
                                            <Alert
                                                type="info"
                                                showIcon
                                                title="Direkt in ELSTER übertragen"
                                                description="Die Kennzahlen (KZ) entsprechen den Feldern der Umsatzsteuervoranmeldung in ELSTER. Eine direkte Übermittlung ist mit Open-Source-Software derzeit nicht möglich (die ELSTER-Schnittstelle ERiC ist proprietär) – kopieren Sie die Werte in Ihr ELSTER-Formular."
                                            />
                                        </Col>
                                    </Row>
                                )}
                            </>
                        ),
                    },
                    ...(isWorkspaceEnabled()
                        ? [
                              {
                                  key: "projects",
                                  label: (
                                      <span>
                                          <ProjectOutlined /> {l("Projektcontrolling", "Project Controlling")}
                                      </span>
                                  ),
                                  children: <ProjectReports embedded />,
                              },
                          ]
                        : []),
                    ...(isTermineEnabled()
                        ? [
                              {
                                  key: "bookings",
                                  label: (
                                      <span>
                                          <CalendarOutlined /> {l("Termin-Auswertung", "Booking Analytics")}
                                      </span>
                                  ),
                                  children: (
                                      <div>
                                          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                                              <Col xs={24} sm={12} lg={6}>
                                                  <Card>
                                                      <Statistic
                                                          title={l("Abgeschlossene Termine", "Completed bookings")}
                                                          value={completedBookings.length}
                                                      />
                                                  </Card>
                                              </Col>
                                              <Col xs={24} sm={12} lg={6}>
                                                  <Card>
                                                      <Statistic
                                                          title={l("Leistungswert abgeschlossen", "Completed service value")}
                                                          value={formatCurrency(completedValueEur, "de")}
                                                      />
                                                  </Card>
                                              </Col>
                                              <Col xs={24} sm={12} lg={6}>
                                                  <Card>
                                                      <Statistic
                                                          title={l("Noch nicht abgerechnet", "Unbilled completed")}
                                                          value={`${unbilledBookings.length} (${formatCurrency(unbilledValueEur, "de")})`}
                                                      />
                                                  </Card>
                                              </Col>
                                              <Col xs={24} sm={12} lg={6}>
                                                  <Card>
                                                      <Statistic
                                                          title={l("Storno / Nicht erschienen", "Cancelled / No-show")}
                                                          value={cancelledOrNoShowCount}
                                                      />
                                                  </Card>
                                              </Col>
                                          </Row>

                                          {unbilledBookings.length > 0 && (
                                              <Alert
                                                  type="warning"
                                                  showIcon
                                                  style={{ marginBottom: 16 }}
                                                  title={l(
                                                      `${unbilledBookings.length} abgeschlossene(r) Termin(e) noch ohne Rechnung (${formatCurrency(unbilledValueEur, "de")})`,
                                                      `${unbilledBookings.length} completed appointment(s) not yet billed (${formatCurrency(unbilledValueEur, "de")})`,
                                                  )}
                                                  action={
                                                      <Link href="/dashboard/termine/buchungen?status=COMPLETED">
                                                          <Button type="primary" size="small">
                                                              {l("Jetzt abrechnen →", "Bill now →")}
                                                          </Button>
                                                      </Link>
                                                  }
                                              />
                                          )}

                                          <Card title={l("Umsatz nach Leistung (abgeschlossen)", "Completed value by service")}>
                                              <Table
                                                  rowKey="service"
                                                  size="small"
                                                  pagination={false}
                                                  dataSource={serviceBreakdown}
                                                  columns={[
                                                      { title: l("Leistung", "Service"), dataIndex: "service" },
                                                      { title: l("Termine", "Appointments"), dataIndex: "count", width: 120 },
                                                      {
                                                          title: l("Wert", "Value"),
                                                          dataIndex: "revenue",
                                                          align: "right" as const,
                                                          render: (v: number) => (
                                                              <Space>
                                                                  <Tag color="green">{formatCurrency(v, "de")}</Tag>
                                                              </Space>
                                                          ),
                                                      },
                                                  ]}
                                                  locale={{
                                                      emptyText: l(
                                                          "Noch keine abgeschlossenen Termine.",
                                                          "No completed bookings yet.",
                                                      ),
                                                  }}
                                              />
                                          </Card>
                                      </div>
                                  ),
                              },
                          ]
                        : []),
                ]}
            />
        </div>
    );
}
