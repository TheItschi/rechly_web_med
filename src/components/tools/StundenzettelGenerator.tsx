"use client";

import React, { useMemo, useState } from "react";
import {
    Plus,
    Trash2,
    Printer,
    Download,
    Clock,
    AlertTriangle,
    CheckCircle2,
} from "lucide-react";

interface TimeRow {
    id: string;
    date: string;
    start: string;
    end: string;
    breakMinutes: number;
    projectTask: string;
}

const parseTimeMinutes = (hhmm: string): number => {
    const [h = "0", m = "0"] = hhmm.split(":");
    return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
};

const formatEUR = (val: number) =>
    new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
    }).format(val);

export function StundenzettelGenerator() {
    const [employeeOrFreelancer, setEmployeeOrFreelancer] = useState(
        "Max Mustermann (Senior Consultant / Techniker)",
    );
    const [clientOrCompany, setClientOrCompany] = useState(
        "TechVenture GmbH – Projekt Relaunch",
    );
    const [monthLabel, setMonthLabel] = useState("Oktober 2026");
    const [hourlyRateStr, setHourlyRateStr] = useState("95");
    const [showBillingAmount, setShowBillingAmount] = useState(true);

    const [rows, setRows] = useState<TimeRow[]>([
        {
            id: "1",
            date: "2026-10-19",
            start: "08:30",
            end: "17:00",
            breakMinutes: 45,
            projectTask: "Architektur-Workshop & API-Integration",
        },
        {
            id: "2",
            date: "2026-10-20",
            start: "09:00",
            end: "16:30",
            breakMinutes: 30,
            projectTask: "Frontend-Komponenten & Code-Review",
        },
        {
            id: "3",
            date: "2026-10-21",
            start: "08:00",
            end: "18:00",
            breakMinutes: 45,
            projectTask: "Performance-Audit, Datenbank-Tuning & Deployment",
        },
    ]);

    const evaluatedRows = useMemo(() => {
        return rows.map((r) => {
            const startMin = parseTimeMinutes(r.start);
            const endMin = parseTimeMinutes(r.end);
            const grossMin = Math.max(0, endMin - startMin);
            const netMin = Math.max(0, grossMin - r.breakMinutes);
            const decimalHours = netMin / 60;

            // § 4 ArbZG statutory break rules:
            // > 6h (360 netMin) requires at least 30 min break
            // > 9h (540 netMin) requires at least 45 min break
            let requiredBreak = 0;
            if (netMin > 540) requiredBreak = 45;
            else if (netMin > 360) requiredBreak = 30;

            const breakCompliant = r.breakMinutes >= requiredBreak;
            const maxHoursExceeded = netMin > 600; // > 10h (§ 3 ArbZG)

            return {
                ...r,
                netMin,
                decimalHours,
                requiredBreak,
                breakCompliant,
                maxHoursExceeded,
            };
        });
    }, [rows]);

    const summary = useMemo(() => {
        const totalDecimalHours = evaluatedRows.reduce(
            (acc, r) => acc + r.decimalHours,
            0,
        );
        const rate = parseFloat(hourlyRateStr.replace(",", ".")) || 0;
        const totalNetHonorarium = totalDecimalHours * rate;
        const allBreaksOk = evaluatedRows.every(
            (r) => r.breakCompliant && !r.maxHoursExceeded,
        );
        return { totalDecimalHours, rate, totalNetHonorarium, allBreaksOk };
    }, [evaluatedRows, hourlyRateStr]);

    const addRow = () => {
        setRows((prev) => [
            ...prev,
            {
                id: `${Date.now()}`,
                date: new Date().toISOString().slice(0, 10),
                start: "09:00",
                end: "17:30",
                breakMinutes: 30,
                projectTask: "Projektarbeit laut Vereinbarung",
            },
        ]);
    };

    const updateRow = (id: string, patch: Partial<TimeRow>) => {
        setRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        );
    };

    const removeRow = (id: string) => {
        if (rows.length <= 1) return;
        setRows((prev) => prev.filter((r) => r.id !== id));
    };

    const exportCsv = () => {
        const header =
            "Datum;Beginn;Ende;Pause (Min);Netto-Stunden (Dezimal);Taetigkeit\n";
        const body = evaluatedRows
            .map(
                (r) =>
                    `${r.date};${r.start};${r.end};${r.breakMinutes};${r.decimalHours.toFixed(2).replace(".", ",")};"${r.projectTask.replace(/"/g, '""')}"`,
            )
            .join("\n");
        const blob = new Blob([header + body], {
            type: "text/csv;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Stundenzettel-${monthLabel.replace(/\s+/g, "-")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
                <div className="lg:col-span-8 p-6 rounded-2xl border border-slate-200 bg-white space-y-5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#2855d9]" />
                            Stundenzettel & § 4 ArbZG Pausen-Prüfung
                        </h3>
                        <span
                            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                                summary.allBreaksOk
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                            }`}
                        >
                            {summary.allBreaksOk ? (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    ArbZG & MiLoG konform
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Pausenzeit prüfen
                                </>
                            )}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Mitarbeiter / Freelancer
                            </label>
                            <input
                                type="text"
                                value={employeeOrFreelancer}
                                onChange={(e) => setEmployeeOrFreelancer(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Kunde / Projekt / Betrieb
                            </label>
                            <input
                                type="text"
                                value={clientOrCompany}
                                onChange={(e) => setClientOrCompany(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Abrechnungszeitraum
                            </label>
                            <input
                                type="text"
                                value={monthLabel}
                                onChange={(e) => setMonthLabel(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Stundensatz Netto (€/Std.)
                            </label>
                            <input
                                type="number"
                                value={hourlyRateStr}
                                onChange={(e) => setHourlyRateStr(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                            />
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        {evaluatedRows.map((row) => (
                            <div
                                key={row.id}
                                className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2"
                            >
                                <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center">
                                    <input
                                        type="date"
                                        value={row.date}
                                        onChange={(e) =>
                                            updateRow(row.id, { date: e.target.value })
                                        }
                                        className="sm:col-span-3 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                                    />
                                    <input
                                        type="time"
                                        value={row.start}
                                        onChange={(e) =>
                                            updateRow(row.id, { start: e.target.value })
                                        }
                                        className="sm:col-span-2 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                                    />
                                    <input
                                        type="time"
                                        value={row.end}
                                        onChange={(e) =>
                                            updateRow(row.id, { end: e.target.value })
                                        }
                                        className="sm:col-span-2 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                                    />
                                    <div className="sm:col-span-2 flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={row.breakMinutes}
                                            onChange={(e) =>
                                                updateRow(row.id, {
                                                    breakMinutes:
                                                        parseInt(e.target.value, 10) || 0,
                                                })
                                            }
                                            className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                                        />
                                        <span className="text-[10px] text-slate-500">Min</span>
                                    </div>
                                    <div className="sm:col-span-2 text-right font-mono text-xs font-bold text-[#1e43b3]">
                                        {row.decimalHours.toFixed(2).replace(".", ",")} Std.
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeRow(row.id)}
                                        className="sm:col-span-1 flex justify-end text-slate-400 hover:text-rose-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={row.projectTask}
                                    onChange={(e) =>
                                        updateRow(row.id, { projectTask: e.target.value })
                                    }
                                    placeholder="Tätigkeitsbeschreibung / Leistungsnachweis"
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                                />
                                {!row.breakCompliant && (
                                    <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Hinweis § 4 ArbZG: Bei über {row.requiredBreak === 45 ? "9" : "6"} Std. Arbeitszeit sind mind. {row.requiredBreak} Min. Pause gesetzlich vorgeschrieben.
                                    </p>
                                )}
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addRow}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#eef3fd] text-[#1e43b3] hover:bg-[#eef3fd] text-xs font-bold cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Arbeitstag hinzufügen
                        </button>
                    </div>
                </div>

                {/* Right Summary */}
                <div className="lg:col-span-4 p-6 rounded-2xl bg-slate-900 text-white flex flex-col justify-between space-y-5">
                    <div className="space-y-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#9db8f5]">
                            Gesamtauswertung ({monthLabel})
                        </span>
                        <div className="p-4 rounded-xl bg-white/10 border border-white/15 space-y-2">
                            <div className="flex justify-between text-xs text-slate-300">
                                <span>Summe Dezimalstunden:</span>
                                <span className="font-mono font-bold text-white text-base">
                                    {summary.totalDecimalHours.toFixed(2).replace(".", ",")} Std.
                                </span>
                            </div>
                            {showBillingAmount && (
                                <div className="flex justify-between text-xs text-slate-300 pt-2 border-t border-white/10">
                                    <span>Honorar Netto ({summary.rate} €/h):</span>
                                    <span className="font-mono font-extrabold text-emerald-400 text-base">
                                        {formatEUR(summary.totalNetHonorarium)}
                                    </span>
                                </div>
                            )}
                        </div>
                        <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showBillingAmount}
                                onChange={(e) => setShowBillingAmount(e.target.checked)}
                                className="rounded border-slate-500 text-[#2855d9]"
                            />
                            Stundensatz & Gesamthonorar auf PDF ausweisen
                        </label>
                    </div>

                    <div className="space-y-2.5">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#2855d9] hover:bg-[#7ea2f8] text-white font-bold text-sm cursor-pointer"
                        >
                            <Printer className="w-4 h-4" />
                            Stundenzettel als PDF drucken
                        </button>
                        <button
                            type="button"
                            onClick={exportCsv}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs cursor-pointer"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Als Excel / CSV exportieren
                        </button>
                    </div>
                </div>
            </div>

            {/* Printable Sheet */}
            <div className="bg-white border border-slate-300 shadow-lg rounded-2xl p-8 max-w-4xl mx-auto print:shadow-none print:border-none text-slate-900">
                <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-6">
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-900">
                            Stundennachweis / Tätigkeitsbericht – {monthLabel}
                        </h2>
                        <p className="text-xs text-slate-600 mt-1">
                            Leistungserbringer: <strong>{employeeOrFreelancer}</strong> · Kunde/Projekt:{" "}
                            <strong>{clientOrCompany}</strong>
                        </p>
                    </div>
                </div>

                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="border-b-2 border-slate-900 font-bold uppercase text-slate-600">
                            <th className="py-2 pr-2">Datum</th>
                            <th className="py-2 px-2">Zeitraum</th>
                            <th className="py-2 px-2">Pause</th>
                            <th className="py-2 px-2">Ausgeführte Tätigkeit</th>
                            <th className="py-2 pl-2 text-right">Netto-Std.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {evaluatedRows.map((r) => (
                            <tr key={r.id}>
                                <td className="py-2.5 pr-2 font-mono">{r.date}</td>
                                <td className="py-2.5 px-2 font-mono">
                                    {r.start} – {r.end}
                                </td>
                                <td className="py-2.5 px-2">{r.breakMinutes} Min.</td>
                                <td className="py-2.5 px-2 font-medium">{r.projectTask}</td>
                                <td className="py-2.5 pl-2 text-right font-mono font-bold">
                                    {r.decimalHours.toFixed(2).replace(".", ",")} h
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-6 pt-4 border-t-2 border-slate-900 flex justify-between items-center text-sm font-bold">
                    <span>Gesamtstunden ({monthLabel}):</span>
                    <span className="font-mono text-base">
                        {summary.totalDecimalHours.toFixed(2).replace(".", ",")} Stunden
                        {showBillingAmount && ` (${formatEUR(summary.totalNetHonorarium)} Netto)`}
                    </span>
                </div>

                <div className="mt-10 grid grid-cols-2 gap-8 text-xs text-slate-500">
                    <div className="border-t border-slate-400 pt-1">
                        Datum, Unterschrift Leistungserbringer / Arbeitnehmer
                    </div>
                    <div className="border-t border-slate-400 pt-1">
                        Datum, Unterschrift & Freigabe Auftraggeber / Arbeitgeber
                    </div>
                </div>
            </div>
        </div>
    );
}
export default StundenzettelGenerator;
