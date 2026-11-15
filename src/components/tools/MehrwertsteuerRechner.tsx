"use client";

import React, { useMemo, useState } from "react";
import { Calculator, Copy, Check, ArrowLeftRight } from "lucide-react";

const formatEUR = (val: number) =>
    new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
    }).format(val);

type CalcMode = "net_to_gross" | "gross_to_net" | "from_vat";

const QUICK_AMOUNTS = [50, 100, 250, 500, 1000, 2500, 5000, 10000];

export function MehrwertsteuerRechner() {
    const [amountStr, setAmountStr] = useState("1000");
    const [mode, setMode] = useState<CalcMode>("net_to_gross");
    const [vatRate, setVatRate] = useState<number>(19);
    const [customRate, setCustomRate] = useState<string>("");
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const effectiveRate = useMemo(() => {
        if (customRate.trim() !== "") {
            const parsed = parseFloat(customRate.replace(",", "."));
            return Number.isFinite(parsed) && parsed >= 0 ? parsed : 19;
        }
        return vatRate;
    }, [vatRate, customRate]);

    const result = useMemo(() => {
        const raw = parseFloat(amountStr.replace(",", ".")) || 0;
        const r = effectiveRate / 100;

        let net = 0;
        let vat = 0;
        let gross = 0;

        if (mode === "net_to_gross") {
            net = raw;
            vat = net * r;
            gross = net + vat;
        } else if (mode === "gross_to_net") {
            gross = raw;
            net = r > 0 ? gross / (1 + r) : gross;
            vat = gross - net;
        } else {
            vat = raw;
            net = r > 0 ? vat / r : 0;
            gross = net + vat;
        }

        return { net, vat, gross };
    }, [amountStr, mode, effectiveRate]);

    const copyValue = (key: string, val: number) => {
        navigator.clipboard?.writeText(val.toFixed(2).replace(".", ","));
        setCopiedField(key);
        setTimeout(() => setCopiedField(null), 1500);
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Input Panel */}
                <div className="lg:col-span-7 p-6 rounded-2xl border border-slate-200 bg-white space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-[#2855d9]" />
                            Betrag & Rechenrichtung wählen
                        </h3>
                        <span className="text-xs font-semibold text-[#1e43b3] bg-[#eef3fd] px-2.5 py-1 rounded-full">
                            § 12 UStG Steuersätze
                        </span>
                    </div>

                    {/* Direction Tabs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-xl bg-slate-100">
                        <button
                            type="button"
                            onClick={() => setMode("net_to_gross")}
                            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                mode === "net_to_gross"
                                    ? "bg-white text-[#1e43b3] shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            Netto → Brutto (+ MwSt.)
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("gross_to_net")}
                            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                mode === "gross_to_net"
                                    ? "bg-white text-[#1e43b3] shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            Brutto → Netto (- MwSt.)
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("from_vat")}
                            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                mode === "from_vat"
                                    ? "bg-white text-[#1e43b3] shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            Aus MwSt.-Betrag
                        </button>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                            {mode === "net_to_gross"
                                ? "Nettobetrag (ohne MwSt.) in Euro"
                                : mode === "gross_to_net"
                                  ? "Bruttobetrag (inkl. MwSt.) in Euro"
                                  : "Mehrwertsteuerbetrag in Euro"}
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                inputMode="decimal"
                                value={amountStr}
                                onChange={(e) => setAmountStr(e.target.value)}
                                className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-xl font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2855d9]"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                                EUR
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {QUICK_AMOUNTS.map((amt) => (
                                <button
                                    key={amt}
                                    type="button"
                                    onClick={() => setAmountStr(String(amt))}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#eef3fd] hover:text-[#1e43b3] text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
                                >
                                    {amt} €
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* VAT Rate Selector */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                            Mehrwertsteuersatz (Umsatzsteuer)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {[
                                { rate: 19, label: "19 % Regelsteuersatz" },
                                { rate: 7, label: "7 % Ermäßigt" },
                                { rate: 0, label: "0 % (§ 19 / Photovoltaik)" },
                            ].map((opt) => (
                                <button
                                    key={opt.rate}
                                    type="button"
                                    onClick={() => {
                                        setVatRate(opt.rate);
                                        setCustomRate("");
                                    }}
                                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                        customRate === "" && vatRate === opt.rate
                                            ? "border-[#2855d9] bg-[#eef3fd] text-[#1e43b3]"
                                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                            <input
                                type="text"
                                placeholder="Individuell % (z.B. 10,7)"
                                value={customRate}
                                onChange={(e) => setCustomRate(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Live Result Card */}
                <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900 text-white flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#9db8f5]">
                                Ergebnis ({effectiveRate} % MwSt.)
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    setMode(
                                        mode === "net_to_gross"
                                            ? "gross_to_net"
                                            : "net_to_gross",
                                    )
                                }
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#9db8f5] hover:text-white cursor-pointer"
                            >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                                Richtung tauschen
                            </button>
                        </div>

                        <div className="space-y-3">
                            {[
                                {
                                    key: "net",
                                    label: "Nettobetrag (ohne Steuer)",
                                    val: result.net,
                                    highlight: mode === "gross_to_net",
                                },
                                {
                                    key: "vat",
                                    label: `Mehrwertsteuer (${effectiveRate} %)`,
                                    val: result.vat,
                                    highlight: false,
                                },
                                {
                                    key: "gross",
                                    label: "Bruttobetrag (inkl. Steuer)",
                                    val: result.gross,
                                    highlight: mode === "net_to_gross",
                                },
                            ].map((row) => (
                                <div
                                    key={row.key}
                                    className={`p-3.5 rounded-xl border flex items-center justify-between ${
                                        row.highlight
                                            ? "bg-[#2855d9]/30 border-[#7ea2f8]/50"
                                            : "bg-white/5 border-white/10"
                                    }`}
                                >
                                    <div>
                                        <p className="text-xs text-slate-300">{row.label}</p>
                                        <p className="text-xl font-extrabold font-mono text-white mt-0.5">
                                            {formatEUR(row.val)}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => copyValue(row.key, row.val)}
                                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-slate-200 cursor-pointer"
                                        title="Wert kopieren"
                                    >
                                        {copiedField === row.key ? (
                                            <Check className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-1">
                        <p className="font-bold text-white">Verwendete Rechenformel:</p>
                        {mode === "net_to_gross" ? (
                            <p className="font-mono">
                                {formatEUR(result.net)} × {(1 + effectiveRate / 100).toFixed(2)} ={" "}
                                {formatEUR(result.gross)}
                            </p>
                        ) : (
                            <p className="font-mono">
                                {formatEUR(result.gross)} ÷ {(1 + effectiveRate / 100).toFixed(2)} ={" "}
                                {formatEUR(result.net)}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Reference Table for 19% and 7% */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    Schnell-Umrechnungstabelle (19 % und 7 % Mehrwertsteuer)
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 font-bold">
                                <th className="py-2.5 pr-3">Basisbetrag (Netto)</th>
                                <th className="py-2.5 px-3 text-right">+ 19 % MwSt.</th>
                                <th className="py-2.5 px-3 text-right">Brutto (19 %)</th>
                                <th className="py-2.5 px-3 text-right">+ 7 % MwSt.</th>
                                <th className="py-2.5 pl-3 text-right">Brutto (7 %)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                            {[50, 100, 200, 250, 500, 1000, 2500, 5000].map((val) => (
                                <tr key={val} className="hover:bg-slate-50">
                                    <td className="py-2.5 pr-3 font-bold text-slate-900">
                                        {formatEUR(val)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right text-slate-600">
                                        {formatEUR(val * 0.19)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-semibold text-[#1e43b3]">
                                        {formatEUR(val * 1.19)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right text-slate-600">
                                        {formatEUR(val * 0.07)}
                                    </td>
                                    <td className="py-2.5 pl-3 text-right font-semibold text-emerald-700">
                                        {formatEUR(val * 1.07)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
export default MehrwertsteuerRechner;
