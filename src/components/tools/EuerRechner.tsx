"use client";

import React, { useState, useMemo } from "react";
import { Card, InputNumber, Button, Tag } from "antd";
import {
    DownloadOutlined } from "@ant-design/icons";
import { calculateEuer, EuerRevenueCategory, EuerExpenseCategory } from "@/lib/tools/euer";


export default function EuerRechner() {
    const [rev19, setRev19] = useState<number>(45000);
    const [rev7, setRev7] = useState<number>(0);
    const [rev0, setRev0] = useState<number>(5000); // e.g. Reverse Charge / Kleinunternehmer

    // Expense items
    const [expenseGoods, setExpenseGoods] = useState<number>(3200); // Wareneingang (19%)
    const [expenseSub, setExpenseSub] = useState<number>(6500); // Subunternehmer (19%)
    const [expenseRent, setExpenseRent] = useState<number>(4800); // Raumkosten (0% or 19%)
    const [expenseIt, setExpenseIt] = useState<number>(2400); // IT & Software (19%)
    const [expenseAfa, setExpenseAfa] = useState<number>(1800); // AfA Abschreibung (0% tax)
    const [expenseTravel, setExpenseTravel] = useState<number>(1200); // Reise / Spesen (19%)
    const [expenseOther, setExpenseOther] = useState<number>(950); // Sonstiges (19%)

    const calculation = useMemo(() => {
        const revenues: EuerRevenueCategory[] = [
            { id: "r19", label: "Umsätze zu 19 % (Regelsteuersatz)", netAmount: rev19, vatRate: 19, elsterKz: "81" },
            { id: "r7", label: "Umsätze zu 7 % (Ermäßigter Steuersatz)", netAmount: rev7, vatRate: 7, elsterKz: "86" },
            { id: "r0", label: "Nicht steuerbare / steuerfreie Umsätze (z.B. Reverse Charge)", netAmount: rev0, vatRate: 0, elsterKz: "21" },
        ];

        const expenses: EuerExpenseCategory[] = [
            { id: "e_goods", label: "Waren-, Roh- und Hilfsstoffe", netAmount: expenseGoods, vatRate: 19, categoryGroup: "material" },
            { id: "e_sub", label: "Bezogene Fremdleistungen (Subunternehmer)", netAmount: expenseSub, vatRate: 19, categoryGroup: "service" },
            { id: "e_rent", label: "Miete & Raumkosten (Büro / Homeoffice)", netAmount: expenseRent, vatRate: 0, categoryGroup: "rent" },
            { id: "e_it", label: "Software, Cloud & Telekommunikation", netAmount: expenseIt, vatRate: 19, categoryGroup: "it" },
            { id: "e_afa", label: "Abschreibungen auf Anlagevermögen (AfA)", netAmount: expenseAfa, vatRate: 0, categoryGroup: "afa" },
            { id: "e_travel", label: "Reisekosten & Bewirtung", netAmount: expenseTravel, vatRate: 19, categoryGroup: "travel" },
            { id: "e_other", label: "Sonstige betriebliche Aufwendungen", netAmount: expenseOther, vatRate: 19, categoryGroup: "other" },
        ];

        return calculateEuer(revenues, expenses);
    }, [rev19, rev7, rev0, expenseGoods, expenseSub, expenseRent, expenseIt, expenseAfa, expenseTravel, expenseOther]);

    const exportCsv = () => {
        const lines = [
            "Rechly EÜR & USt-VA Kalkulation",
            `Erstellungsdatum;${new Date().toLocaleDateString("de-DE")}`,
            "",
            "Kategorie;Netto (€);Umsatzsteuer / Vorsteuer (€);Brutto (€)",
            `Betriebseinnahmen 19 %;${rev19.toFixed(2)};${(rev19 * 0.19).toFixed(2)};${(rev19 * 1.19).toFixed(2)}`,
            `Betriebseinnahmen 7 %;${rev7.toFixed(2)};${(rev7 * 0.07).toFixed(2)};${(rev7 * 1.07).toFixed(2)}`,
            `Umsätze steuerfrei / 0 %;${rev0.toFixed(2)};0.00;${rev0.toFixed(2)}`,
            `SUMME BETRIEBSEINNAHMEN;${calculation.totalRevenueNet.toFixed(2)};${calculation.totalVatCollected.toFixed(2)};${calculation.totalRevenueGross.toFixed(2)}`,
            "",
            `Wareneingang;${expenseGoods.toFixed(2)};${(expenseGoods * 0.19).toFixed(2)};${(expenseGoods * 1.19).toFixed(2)}`,
            `Fremdleistungen;${expenseSub.toFixed(2)};${(expenseSub * 0.19).toFixed(2)};${(expenseSub * 1.19).toFixed(2)}`,
            `Raumkosten;${expenseRent.toFixed(2)};0.00;${expenseRent.toFixed(2)}`,
            `IT & Software;${expenseIt.toFixed(2)};${(expenseIt * 0.19).toFixed(2)};${(expenseIt * 1.19).toFixed(2)}`,
            `AfA Abschreibungen;${expenseAfa.toFixed(2)};0.00;${expenseAfa.toFixed(2)}`,
            `Reise & Bewirtung;${expenseTravel.toFixed(2)};${(expenseTravel * 0.19).toFixed(2)};${(expenseTravel * 1.19).toFixed(2)}`,
            `Sonstiges;${expenseOther.toFixed(2)};${(expenseOther * 0.19).toFixed(2)};${(expenseOther * 1.19).toFixed(2)}`,
            `SUMME BETRIEBSAUSGABEN;${calculation.totalExpensesNet.toFixed(2)};${calculation.vorsteuerDeductible.toFixed(2)};${calculation.totalExpensesGross.toFixed(2)}`,
            "",
            `STEUERLICHER GEWINN (§ 4 Abs. 3 EStG);${calculation.netProfit.toFixed(2)};;`,
            `ELSTER USt-Zahllast (Kz 83);${calculation.elster.kz83Zahllast.toFixed(2)};;`,
        ];

        const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "Rechly_EUER_Kalkulation.csv";
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "16px 8px" }}>
            {/* Top KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
                <Card style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Einnahmen (Netto)</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
                        {calculation.totalRevenueNet.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                    </div>
                    <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>
                        Brutto: {calculation.totalRevenueGross.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                    </div>
                </Card>

                <Card style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Ausgaben (Netto)</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#dc2626", marginTop: 4 }}>
                        {calculation.totalExpensesNet.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                        Vorsteuer: {calculation.vorsteuerDeductible.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                    </div>
                </Card>

                <Card style={{ borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                    <div style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>Gewinn (§ 4 Abs. 3 EStG)</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#15803d", marginTop: 4 }}>
                        {calculation.netProfit.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                    </div>
                    <div style={{ fontSize: 11, color: "#166534", marginTop: 4 }}>
                        Marge: {calculation.profitMarginPercent} %
                    </div>
                </Card>

                <Card style={{ borderRadius: 12, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                    <div style={{ fontSize: 12, color: "#1e40af", fontWeight: 600 }}>USt-Zahllast (ELSTER Kz 83)</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#2563eb", marginTop: 4 }}>
                        {calculation.elster.kz83Zahllast.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                    </div>
                    <div style={{ fontSize: 11, color: "#1e40af", marginTop: 4 }}>
                        {calculation.elster.kz83Zahllast >= 0 ? "An Finanzamt zu zahlen" : "Erstattungsanspruch"}
                    </div>
                </Card>
            </div>

            {/* Main Input Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
                {/* Revenue Card */}
                <Card
                    title="1. Betriebseinnahmen (Umsätze netto)"
                    style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                >
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                                Umsätze zu 19 % (Kz 81)
                            </span>
                            <span style={{ fontSize: 12, color: "#64748b" }}>
                                USt: {(rev19 * 0.19).toFixed(2)} €
                            </span>
                        </div>
                        <InputNumber
                            value={rev19}
                            onChange={(v) => setRev19(v || 0)}
                            style={{ width: "100%" }}
                            precision={2}
                            prefix="€"
                        />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                                Umsätze zu 7 % (Kz 86)
                            </span>
                            <span style={{ fontSize: 12, color: "#64748b" }}>
                                USt: {(rev7 * 0.07).toFixed(2)} €
                            </span>
                        </div>
                        <InputNumber
                            value={rev7}
                            onChange={(v) => setRev7(v || 0)}
                            style={{ width: "100%" }}
                            precision={2}
                            prefix="€"
                        />
                    </div>

                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                                Steuerfreie / Reverse Charge Umsätze (Kz 21 / 41)
                            </span>
                            <span style={{ fontSize: 12, color: "#64748b" }}>USt: 0,00 €</span>
                        </div>
                        <InputNumber
                            value={rev0}
                            onChange={(v) => setRev0(v || 0)}
                            style={{ width: "100%" }}
                            precision={2}
                            prefix="€"
                        />
                    </div>
                </Card>

                {/* Operating Expenses Card */}
                <Card
                    title="2. Betriebsausgaben (Netto)"
                    style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                                Wareneinkauf (19%)
                            </label>
                            <InputNumber value={expenseGoods} onChange={(v) => setExpenseGoods(v || 0)} style={{ width: "100%" }} precision={2} />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                                Subunternehmer (19%)
                            </label>
                            <InputNumber value={expenseSub} onChange={(v) => setExpenseSub(v || 0)} style={{ width: "100%" }} precision={2} />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                                Raumkosten / Miete (0%)
                            </label>
                            <InputNumber value={expenseRent} onChange={(v) => setExpenseRent(v || 0)} style={{ width: "100%" }} precision={2} />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                                IT, Software, Hosting (19%)
                            </label>
                            <InputNumber value={expenseIt} onChange={(v) => setExpenseIt(v || 0)} style={{ width: "100%" }} precision={2} />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                                AfA Abschreibungen (0%)
                            </label>
                            <InputNumber value={expenseAfa} onChange={(v) => setExpenseAfa(v || 0)} style={{ width: "100%" }} precision={2} />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                                Reisekosten & Bewirtung (19%)
                            </label>
                            <InputNumber value={expenseTravel} onChange={(v) => setExpenseTravel(v || 0)} style={{ width: "100%" }} precision={2} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                            Sonstige Kosten (19%)
                        </label>
                        <InputNumber value={expenseOther} onChange={(v) => setExpenseOther(v || 0)} style={{ width: "100%" }} precision={2} />
                    </div>
                </Card>
            </div>

            {/* Official ELSTER Kennziffern Box */}
            <Card
                title="3. Offizielle ELSTER USt-VA Kennziffern (Bereit zur Übernahme)"
                style={{ marginTop: 24, borderRadius: 12, border: "1px solid #bfdbfe", background: "#f8fafc" }}
                extra={
                    <Button icon={<DownloadOutlined />} onClick={exportCsv} size="small">
                        CSV exportieren
                    </Button>
                }
            >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                    <div style={{ background: "#ffffff", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Tag color="blue">Kz 81</Tag>
                            <span style={{ fontSize: 11, color: "#64748b" }}>Steuer: {calculation.elster.kz81Tax.toFixed(2)} €</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Umsätze zu 19 % (Bemessungsgrundlage)</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                            {calculation.elster.kz81Base.toFixed(2)} €
                        </div>
                    </div>

                    <div style={{ background: "#ffffff", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Tag color="blue">Kz 86</Tag>
                            <span style={{ fontSize: 11, color: "#64748b" }}>Steuer: {calculation.elster.kz86Tax.toFixed(2)} €</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Umsätze zu 7 % (Bemessungsgrundlage)</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                            {calculation.elster.kz86Base.toFixed(2)} €
                        </div>
                    </div>

                    <div style={{ background: "#ffffff", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Tag color="cyan">Kz 66</Tag>
                            <span style={{ fontSize: 11, color: "#059669" }}>Vorsteuerabzug</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Abziehbare Vorsteuer aus Rechnungen</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#059669", marginTop: 2 }}>
                            {calculation.elster.kz66Vorsteuer.toFixed(2)} €
                        </div>
                    </div>

                    <div style={{ background: "#ffffff", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Tag color="purple">Kz 83</Tag>
                            <span style={{ fontSize: 11, color: "#64748b" }}>Zahllast / Guthaben</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Verbleibende Umsatzsteuer-Zahllast</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#2563eb", marginTop: 2 }}>
                            {calculation.elster.kz83Zahllast.toFixed(2)} €
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
