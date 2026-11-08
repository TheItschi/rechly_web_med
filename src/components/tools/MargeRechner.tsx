"use client";

import React, { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";

const formatEUR = (val: number) =>
    new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
    }).format(val);

const formatPct = (val: number) =>
    `${val.toFixed(2).replace(".", ",")} %`;

export function MargeRechner() {
    const [costPriceStr, setCostPriceStr] = useState("60");
    const [sellingNetStr, setSellingNetStr] = useState("100");
    const [supplierDiscountPct, setSupplierDiscountPct] = useState("10");
    const [supplierSkontoPct, setSupplierSkontoPct] = useState("2");
    const [shippingCostStr, setShippingCostStr] = useState("4.50");
    const [overheadPct, setOverheadPct] = useState("25");
    const [profitMarkupPct, setProfitMarkupPct] = useState("20");
    const [customerSkontoPct] = useState("2");
    const [customerRabattPct, setCustomerRabattPct] = useState("5");

    // Quick Margin vs Markup
    const quick = useMemo(() => {
        const ek = Math.max(0, parseFloat(costPriceStr.replace(",", ".")) || 0);
        const vk = Math.max(0, parseFloat(sellingNetStr.replace(",", ".")) || 0);
        const db = vk - ek; // Rohertrag / Deckungsbeitrag
        const marginPct = vk > 0 ? (db / vk) * 100 : 0; // Handelsspanne / Marge
        const markupPct = ek > 0 ? (db / ek) * 100 : 0; // Aufschlagskalkulation
        return { ek, vk, db, marginPct, markupPct, vkGross19: vk * 1.19 };
    }, [costPriceStr, sellingNetStr]);

    // Full IHK Handelskalkulation (Vorwärtskalkulation)
    const ihk = useMemo(() => {
        const listPurchase = Math.max(0, parseFloat(costPriceStr.replace(",", ".")) || 0);
        const lRabatt = (parseFloat(supplierDiscountPct.replace(",", ".")) || 0) / 100;
        const lSkonto = (parseFloat(supplierSkontoPct.replace(",", ".")) || 0) / 100;
        const bezugskosten = Math.max(0, parseFloat(shippingCostStr.replace(",", ".")) || 0);
        const hkz = (parseFloat(overheadPct.replace(",", ".")) || 0) / 100;
        const gewinnRate = (parseFloat(profitMarkupPct.replace(",", ".")) || 0) / 100;
        const kSkonto = Math.min(0.9, (parseFloat(customerSkontoPct.replace(",", ".")) || 0) / 100);
        const kRabatt = Math.min(0.9, (parseFloat(customerRabattPct.replace(",", ".")) || 0) / 100);

        const zielEinkauf = listPurchase * (1 - lRabatt);
        const barEinkauf = zielEinkauf * (1 - lSkonto);
        const bezugspreis = barEinkauf + bezugskosten; // Einstandspreis
        const selbstkosten = bezugspreis * (1 + hkz);
        const barVerkauf = selbstkosten * (1 + gewinnRate);
        // Im Hundert Rechnung für Kundenskonto und Kundenrabatt
        const zielVerkauf = kSkonto < 1 ? barVerkauf / (1 - kSkonto) : barVerkauf;
        const listenVerkaufNetto = kRabatt < 1 ? zielVerkauf / (1 - kRabatt) : zielVerkauf;
        const listenVerkaufBrutto = listenVerkaufNetto * 1.19;

        return {
            listPurchase,
            zielEinkauf,
            barEinkauf,
            bezugspreis,
            selbstkosten,
            barVerkauf,
            zielVerkauf,
            listenVerkaufNetto,
            listenVerkaufBrutto,
        };
    }, [
        costPriceStr,
        supplierDiscountPct,
        supplierSkontoPct,
        shippingCostStr,
        overheadPct,
        profitMarkupPct,
        customerSkontoPct,
        customerRabattPct,
    ]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Quick Margin vs Markup */}
                <div className="lg:col-span-6 p-6 rounded-2xl border border-slate-200 bg-white space-y-5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                        1. Schnellrechner: Marge (Handelsspanne) vs. Aufschlag
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Einkaufspreis / Kosten (Netto €)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={costPriceStr}
                                onChange={(e) => setCostPriceStr(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Verkaufspreis (Netto €)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={sellingNetStr}
                                onChange={(e) => setSellingNetStr(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base font-bold"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div className="p-4 rounded-xl bg-slate-900 text-white">
                            <span className="text-[11px] font-bold uppercase text-indigo-300">
                                Rohertrag (Gewinn)
                            </span>
                            <p className="text-xl font-extrabold font-mono text-emerald-400 mt-1">
                                {formatEUR(quick.db)}
                            </p>
                            <span className="text-[10px] text-slate-400">pro Stück (Netto)</span>
                        </div>
                        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                            <span className="text-[11px] font-bold uppercase text-indigo-700">
                                Marge (Handelsspanne)
                            </span>
                            <p className="text-xl font-extrabold font-mono text-indigo-950 mt-1">
                                {formatPct(quick.marginPct)}
                            </p>
                            <span className="text-[10px] text-indigo-700">
                                Anteil am Verkaufspreis
                            </span>
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                            <span className="text-[11px] font-bold uppercase text-emerald-800">
                                Kalkulationsaufschlag
                            </span>
                            <p className="text-xl font-extrabold font-mono text-emerald-950 mt-1">
                                {formatPct(quick.markupPct)}
                            </p>
                            <span className="text-[10px] text-emerald-700">
                                Aufschlag auf EK
                            </span>
                        </div>
                    </div>
                </div>

                {/* IHK Handelskalkulation Inputs */}
                <div className="lg:col-span-6 p-6 rounded-2xl border border-slate-200 bg-white space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                        2. Vollständige IHK-Handelskalkulation (Vorwärtskalkulation)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                            <label className="block font-semibold text-slate-600 mb-1">
                                Lieferantenrabatt (%)
                            </label>
                            <input
                                type="number"
                                value={supplierDiscountPct}
                                onChange={(e) => setSupplierDiscountPct(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-600 mb-1">
                                Lieferantenskonto (%)
                            </label>
                            <input
                                type="number"
                                value={supplierSkontoPct}
                                onChange={(e) => setSupplierSkontoPct(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-600 mb-1">
                                Bezugskosten (€)
                            </label>
                            <input
                                type="number"
                                step="0.5"
                                value={shippingCostStr}
                                onChange={(e) => setShippingCostStr(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-600 mb-1">
                                Handlungskosten (% HKZ)
                            </label>
                            <input
                                type="number"
                                value={overheadPct}
                                onChange={(e) => setOverheadPct(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-600 mb-1">
                                Gewinnzuschlag (%)
                            </label>
                            <input
                                type="number"
                                value={profitMarkupPct}
                                onChange={(e) => setProfitMarkupPct(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-600 mb-1">
                                Kundenrabatt (%)
                            </label>
                            <input
                                type="number"
                                value={customerRabattPct}
                                onChange={(e) => setCustomerRabattPct(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between">
                            <span>Listeneinkaufspreis (Netto):</span>
                            <span>{formatEUR(ihk.listPurchase)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-slate-800">
                            <span>= Bezugspreis (Einstandspreis):</span>
                            <span>{formatEUR(ihk.bezugspreis)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-slate-800">
                            <span>= Selbstkostenpreis (inkl. {overheadPct}% HKZ):</span>
                            <span>{formatEUR(ihk.selbstkosten)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-indigo-700 pt-1 border-t border-slate-200 text-sm">
                            <span>= Listenverkaufspreis (Netto):</span>
                            <span>{formatEUR(ihk.listenVerkaufNetto)}</span>
                        </div>
                        <div className="flex justify-between font-extrabold text-slate-900 text-sm">
                            <span>= Bruttoverkaufspreis (inkl. 19% MwSt.):</span>
                            <span>{formatEUR(ihk.listenVerkaufBrutto)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default MargeRechner;
