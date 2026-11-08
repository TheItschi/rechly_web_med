"use client";

import React, { useState, useMemo } from "react";
import { InputNumber, Slider, Card, Typography, Button } from "antd";
import {
    ArrowRightOutlined } from "@ant-design/icons";
import Link from "next/link";

const { Text } = Typography;

export default function StundensatzRechner() {
    // Financial Target Inputs
    const [desiredNetIncomeMonthly, setDesiredNetIncomeMonthly] = useState<number>(3800);
    const [businessOverheadMonthly, setBusinessOverheadMonthly] = useState<number>(850);
    const [healthAndPensionMonthly, setHealthAndPensionMonthly] = useState<number>(950);
    const [taxRatePercent, setTaxRatePercent] = useState<number>(30);

    // Time & Capacity Inputs
    const [vacationDaysYearly, setVacationDaysYearly] = useState<number>(28);
    const [sickDaysYearly, setSickDaysYearly] = useState<number>(10);
    const [adminDaysYearly, setAdminDaysYearly] = useState<number>(15); // Akquise, Buchhaltung, Fortbildung
    const [dailyWorkingHours] = useState<number>(8);
    const [billableRatioPercent, setBillableRatioPercent] = useState<number>(65); // 65% direkt abrechenbare Zeit

    const calc = useMemo(() => {
        // 1. Annual required gross earnings before taxes
        const desiredNetYearly = desiredNetIncomeMonthly * 12;
        const healthAndPensionYearly = healthAndPensionMonthly * 12;
        const businessOverheadYearly = businessOverheadMonthly * 12;

        // Gross profit needed: (Net + Health/Pension) / (1 - TaxRate)
        const grossIncomeNeededYearly = (desiredNetYearly + healthAndPensionYearly) / (1 - taxRatePercent / 100);
        const totalRevenueNeededYearly = grossIncomeNeededYearly + businessOverheadYearly;
        const totalRevenueNeededMonthly = totalRevenueNeededYearly / 12;

        // 2. Available and billable working hours
        // Germany has ~250 potential working days (Mon-Fri)
        const baseWorkingDaysYearly = 250;
        const publicHolidaysYearly = 10;
        const actualProductiveDays = Math.max(
            1,
            baseWorkingDaysYearly - publicHolidaysYearly - vacationDaysYearly - sickDaysYearly - adminDaysYearly
        );

        const totalProductiveHours = actualProductiveDays * dailyWorkingHours;
        const billableHoursYearly = Math.round(totalProductiveHours * (billableRatioPercent / 100));
        const billableHoursMonthly = Math.round(billableHoursYearly / 12);

        // 3. Minimum & recommended rates
        const minimumHourlyRate = billableHoursYearly > 0 ? totalRevenueNeededYearly / billableHoursYearly : 0;
        // Recommended rate includes 15% safety buffer for project delays, unpaid invoices & investments
        const recommendedHourlyRate = minimumHourlyRate * 1.15;
        const dayRate = recommendedHourlyRate * dailyWorkingHours;

        return {
            totalRevenueNeededYearly: Math.round(totalRevenueNeededYearly),
            totalRevenueNeededMonthly: Math.round(totalRevenueNeededMonthly),
            actualProductiveDays,
            billableHoursYearly,
            billableHoursMonthly,
            minimumHourlyRate: Math.round(minimumHourlyRate),
            recommendedHourlyRate: Math.round(recommendedHourlyRate),
            dayRate: Math.round(dayRate) };
    }, [
        desiredNetIncomeMonthly,
        businessOverheadMonthly,
        healthAndPensionMonthly,
        taxRatePercent,
        vacationDaysYearly,
        sickDaysYearly,
        adminDaysYearly,
        dailyWorkingHours,
        billableRatioPercent,
    ]);

    return (
        <div>
            {/* Input Sections Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 28, marginBottom: 32 }}>
                {/* Monthly Financial Goals */}
                <Card
                    title="1. Monatlicher Finanzbedarf & Kosten"
                    size="small"
                    style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                >
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                                Gewünschtes Netto-Einkommen (Auszahlung) *
                            </label>
                            <InputNumber
                                min={1000}
                                max={50000}
                                step={100}
                                value={desiredNetIncomeMonthly}
                                onChange={(val) => setDesiredNetIncomeMonthly(val || 3000)}
                                style={{ width: "100%" }}
                                size="middle"
                                addonAfter="€ / Monat"
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                                Betriebskosten (Miete, Software, Steuerberater, Kfz)
                            </label>
                            <InputNumber
                                min={0}
                                max={20000}
                                step={50}
                                value={businessOverheadMonthly}
                                onChange={(val) => setBusinessOverheadMonthly(val || 0)}
                                style={{ width: "100%" }}
                                size="middle"
                                addonAfter="€ / Monat"
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                                Krankenversicherung & Altersvorsorge
                            </label>
                            <InputNumber
                                min={0}
                                max={10000}
                                step={50}
                                value={healthAndPensionMonthly}
                                onChange={(val) => setHealthAndPensionMonthly(val || 0)}
                                style={{ width: "100%" }}
                                size="middle"
                                addonAfter="€ / Monat"
                            />
                        </div>

                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                                <span>Geschätzter Steuersatz (ESt + GewSt):</span>
                                <span style={{ color: "#2563eb" }}>{taxRatePercent} %</span>
                            </div>
                            <Slider
                                min={15}
                                max={45}
                                value={taxRatePercent}
                                onChange={setTaxRatePercent}
                            />
                        </div>
                    </div>
                </Card>

                {/* Working Capacity & Time Planning */}
                <Card
                    title="2. Arbeitszeit, Urlaub & Auslastung"
                    size="small"
                    style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                >
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div>
                                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                                    Urlaubstage (Jahr)
                                </label>
                                <InputNumber
                                    min={0}
                                    max={60}
                                    value={vacationDaysYearly}
                                    onChange={(val) => setVacationDaysYearly(val || 0)}
                                    style={{ width: "100%" }}
                                    size="middle"
                                    addonAfter="Tage"
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                                    Krankheitstage (Puffer)
                                </label>
                                <InputNumber
                                    min={0}
                                    max={40}
                                    value={sickDaysYearly}
                                    onChange={(val) => setSickDaysYearly(val || 0)}
                                    style={{ width: "100%" }}
                                    size="middle"
                                    addonAfter="Tage"
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                                Akquise-, Fortbildungs- & Buchhaltungstage
                            </label>
                            <InputNumber
                                min={0}
                                max={60}
                                value={adminDaysYearly}
                                onChange={(val) => setAdminDaysYearly(val || 0)}
                                style={{ width: "100%" }}
                                size="middle"
                                addonAfter="Tage / Jahr"
                            />
                        </div>

                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                                <span>Abrechenbare Quote (Billable Hours):</span>
                                <span style={{ color: "#2563eb" }}>{billableRatioPercent} %</span>
                            </div>
                            <Slider
                                min={40}
                                max={90}
                                value={billableRatioPercent}
                                onChange={setBillableRatioPercent}
                            />
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                                Realistischer Branchendurchschnitt in DE: 60 % bis 70 % (Rest fließt in Verwaltung und Akquise).
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Calculated Rates Display Grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 16,
                    marginBottom: 32 }}
            >
                <Card
                    size="small"
                    style={{
                        borderRadius: 12,
                        border: "2px solid #2563eb",
                        background: "#eff6ff" }}
                >
                    <Text style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 800, color: "#1e40af" }}>
                        Empfohlener Stundensatz
                    </Text>
                    <div style={{ fontSize: 32, fontWeight: 900, color: "#1d4ed8", marginTop: 4 }}>
                        {calc.recommendedHourlyRate} €
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#64748b" }}> / Std. netto</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#2563eb", marginTop: 4 }}>
                        Inkl. 15% Sicherheits- & Investitionspuffer
                    </div>
                </Card>

                <Card size="small" style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                        Tagessatz (8 Std.)
                    </Text>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", marginTop: 4 }}>
                        {calc.dayRate} €
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}> / Tag</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        Idealer Richtwert für B2B-Projekte
                    </div>
                </Card>

                <Card size="small" style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                        Absoluter Mindestsatz
                    </Text>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#dc2626", marginTop: 4 }}>
                        {calc.minimumHourlyRate} €
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}> / Std.</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        Unterhalb dieses Satzes machst du Verlust
                    </div>
                </Card>

                <Card size="small" style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                        Benötigter Mindestumsatz
                    </Text>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", marginTop: 4 }}>
                        {calc.totalRevenueNeededYearly.toLocaleString("de-DE")} €
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}> / Jahr</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        ca. {calc.totalRevenueNeededMonthly.toLocaleString("de-DE")} € monatlich
                    </div>
                </Card>
            </div>

            {/* Capacity Summary & Action Button */}
            <div
                style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "20px 24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 16 }}
            >
                <div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                        Deine Kapazitätsrechnung: {calc.billableHoursYearly} abrechenbare Stunden / Jahr
                    </h4>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                        Basiert auf {calc.actualProductiveDays} produktiven Arbeitstagen und ca.{" "}
                        {calc.billableHoursMonthly} Stunden Rechnungsstellung pro Monat.
                    </p>
                </div>

                <Link href="/register">
                    <Button
                        type="primary"
                        icon={<ArrowRightOutlined />}
                        style={{ background: "#2563eb", height: 42, padding: "0 20px" }}
                    >
                        Angebot mit {calc.recommendedHourlyRate} €/Std. in Rechly schreiben
                    </Button>
                </Link>
            </div>
        </div>
    );
}
