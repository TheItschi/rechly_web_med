"use client";

import React, { useMemo, useState } from "react";
import { Car, Printer, Info } from "lucide-react";

const formatEUR = (val: number) =>
    new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
    }).format(val);

type TravelMode = "dienstreise" | "pendlerpauschale" | "kundenabrechnung";

export function FahrtkostenRechner() {
    const [mode, setMode] = useState<TravelMode>("dienstreise");
    const [distanceKm, setDistanceKm] = useState<string>("45");
    const [daysCount, setDaysCount] = useState<string>("220");
    const [vehicleRate, setVehicleRate] = useState<string>("0.30");
    const [clientRatePerKm, setClientRatePerKm] = useState<string>("0.50");
    const [clientVatRate, setClientVatRate] = useState<0 | 7 | 19>(19);
    const [roundTrip, setRoundTrip] = useState<boolean>(true);
    const [tripPurpose, setTripPurpose] = useState(
        "Kundentermin / Vor-Ort-Montage Projekt #2026",
    );

    const calc = useMemo(() => {
        const kmOneWay = Math.max(0, parseFloat(distanceKm.replace(",", ".")) || 0);
        const days = Math.max(1, parseInt(daysCount, 10) || 1);

        if (mode === "pendlerpauschale") {
            // § 9 Abs. 1 S. 3 Nr. 4 EStG: 0,30 € first 20 km (one-way), 0,38 € from 21st km
            const first20 = Math.min(20, kmOneWay);
            const above20 = Math.max(0, kmOneWay - 20);
            const dailyAllowance = first20 * 0.3 + above20 * 0.38;
            const totalAllowance = dailyAllowance * days;
            return {
                effectiveKmPerDay: kmOneWay,
                totalKm: kmOneWay * days,
                netAmount: totalAllowance,
                vatAmount: 0,
                grossAmount: totalAllowance,
                breakdownText: `${first20} km × 0,30 € + ${above20} km × 0,38 € = ${formatEUR(dailyAllowance)} / Arbeitstag × ${days} Tage`,
            };
        }

        const effectiveDailyKm = roundTrip ? kmOneWay * 2 : kmOneWay;
        const totalKm = effectiveDailyKm * (mode === "dienstreise" ? 1 : 1);

        if (mode === "dienstreise") {
            const rate = parseFloat(vehicleRate.replace(",", ".")) || 0.3;
            const total = totalKm * rate;
            return {
                effectiveKmPerDay: effectiveDailyKm,
                totalKm,
                netAmount: total,
                vatAmount: 0,
                grossAmount: total,
                breakdownText: `${totalKm} gefahrene km (${roundTrip ? "Hin- & Rückfahrt" : "Einfache Strecke"}) × ${formatEUR(rate)}/km Pauschale`,
            };
        }

        // B2B Kunden-Weiterberechnung (Nebenleistung teilt Umsatzsteuersatz der Hauptleistung!)
        const rate = parseFloat(clientRatePerKm.replace(",", ".")) || 0.5;
        const net = totalKm * rate;
        const vat = net * (clientVatRate / 100);
        const gross = net + vat;
        return {
            effectiveKmPerDay: effectiveDailyKm,
            totalKm,
            netAmount: net,
            vatAmount: vat,
            grossAmount: gross,
            breakdownText: `${totalKm} km × ${formatEUR(rate)}/km Netto zzgl. ${clientVatRate} % USt. (Nebenleistung zur Hauptleistung)`,
        };
    }, [mode, distanceKm, daysCount, vehicleRate, clientRatePerKm, clientVatRate, roundTrip]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
                <div className="lg:col-span-7 p-6 rounded-2xl border border-slate-200 bg-white space-y-5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <Car className="w-4 h-4 text-[#2855d9]" />
                        Berechnungs-Modus wählen (Stand 2026)
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-xl bg-slate-100">
                        <button
                            type="button"
                            onClick={() => setMode("dienstreise")}
                            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                mode === "dienstreise"
                                    ? "bg-white text-[#1e43b3] shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            Dienstreise (0,30 €/km)
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("pendlerpauschale")}
                            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                mode === "pendlerpauschale"
                                    ? "bg-white text-[#1e43b3] shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            Pendlerpauschale (0,30 / 0,38 €)
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("kundenabrechnung")}
                            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                mode === "kundenabrechnung"
                                    ? "bg-white text-[#1e43b3] shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            Kunden-Weiterberechnung
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                {mode === "pendlerpauschale"
                                    ? "Einfache Entfernung Wohnung ↔ Tätigkeitsstätte (km)"
                                    : "Entfernung einfache Strecke (km)"}
                            </label>
                            <input
                                type="number"
                                value={distanceKm}
                                onChange={(e) => setDistanceKm(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base font-bold"
                            />
                        </div>

                        {mode === "pendlerpauschale" ? (
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Anzahl Arbeitstage im Jahr (z. B. 220)
                                </label>
                                <input
                                    type="number"
                                    value={daysCount}
                                    onChange={(e) => setDaysCount(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base font-bold"
                                />
                            </div>
                        ) : (
                            <div className="flex items-end pb-2">
                                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={roundTrip}
                                        onChange={(e) => setRoundTrip(e.target.checked)}
                                        className="rounded border-slate-300 text-[#2855d9]"
                                    />
                                    Hin- und Rückfahrt berechnen (× 2 = {calc.totalKm} km)
                                </label>
                            </div>
                        )}
                    </div>

                    {mode === "dienstreise" && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Fahrzeugart (§ 9 Abs. 1 S. 3 Nr. 4a EStG / BRKG)
                            </label>
                            <select
                                value={vehicleRate}
                                onChange={(e) => setVehicleRate(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                            >
                                <option value="0.30">PKW / Auto – 0,30 € pro gefahrenem Kilometer</option>
                                <option value="0.20">Motorrad / Motorroller – 0,20 € pro gefahrenem Kilometer</option>
                            </select>
                        </div>
                    )}

                    {mode === "kundenabrechnung" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#eef3fd]/70 border border-[#c9d8f5]">
                            <div>
                                <label className="block text-xs font-semibold text-[#152438] mb-1">
                                    Vereinbarter Netto-Kilometersatz (€/km)
                                </label>
                                <input
                                    type="text"
                                    value={clientRatePerKm}
                                    onChange={(e) => setClientRatePerKm(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-[#9db8f5] bg-white text-sm font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#152438] mb-1">
                                    MwSt.-Satz der Hauptleistung
                                </label>
                                <select
                                    value={clientVatRate}
                                    onChange={(e) =>
                                        setClientVatRate(Number(e.target.value) as 0 | 7 | 19)
                                    }
                                    className="w-full px-3 py-2 rounded-lg border border-[#9db8f5] bg-white text-sm font-semibold"
                                >
                                    <option value={19}>19 % Regelsteuersatz</option>
                                    <option value={7}>7 % Ermäßigter Steuersatz</option>
                                    <option value={0}>0 % (§ 19 Kleinunternehmer / § 13b)</option>
                                </select>
                            </div>
                            <p className="sm:col-span-2 text-[11px] text-[#152438] flex items-start gap-1.5">
                                <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#2855d9]" />
                                Steuer-Tipp: Wenn Sie Fahrtkosten an Ihren Auftraggeber weiterberechnen, sind Sie nicht an die 0,30 € gebunden, müssen aber als umsatzsteuerliche Nebenleistung denselben MwSt.-Satz wie Ihre Hauptleistung aufschlagen!
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Reisezweck / Strecke (für den Eigenbeleg)
                        </label>
                        <input
                            type="text"
                            value={tripPurpose}
                            onChange={(e) => setTripPurpose(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                        />
                    </div>
                </div>

                {/* Right Result Box */}
                <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900 text-white flex flex-col justify-between space-y-5">
                    <div className="space-y-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#9db8f5]">
                            Berechnete Fahrtkosten
                        </span>
                        <div className="p-4 rounded-xl bg-white/10 border border-white/15">
                            <p className="text-xs text-slate-300">Ergebnis-Betrag</p>
                            <p className="text-3xl font-extrabold font-mono text-emerald-400 mt-1">
                                {formatEUR(calc.grossAmount)}
                            </p>
                            <p className="text-xs text-slate-300 mt-2 font-mono">
                                {calc.breakdownText}
                            </p>
                        </div>
                        {mode === "kundenabrechnung" && (
                            <div className="space-y-1 text-xs text-slate-300">
                                <div className="flex justify-between">
                                    <span>Netto-Fahrtkosten auf Rechnung:</span>
                                    <span className="font-mono font-bold text-white">
                                        {formatEUR(calc.netAmount)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>zzgl. {clientVatRate} % Umsatzsteuer:</span>
                                    <span className="font-mono font-bold text-white">
                                        {formatEUR(calc.vatAmount)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-[#2855d9] hover:bg-[#7ea2f8] text-white font-bold text-sm cursor-pointer"
                    >
                        <Printer className="w-4 h-4" />
                        Fahrtkosten-Eigenbeleg als PDF drucken
                    </button>
                </div>
            </div>

            {/* Printable Eigenbeleg */}
            <div className="bg-white border border-slate-300 rounded-2xl p-8 max-w-4xl mx-auto print:shadow-none print:border-none">
                <h3 className="text-lg font-extrabold text-slate-900 border-b border-slate-200 pb-3 mb-4">
                    Fahrtkostenabrechnung / Eigenbeleg ({new Date().toLocaleDateString("de-DE")})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-700">
                    <div>
                        <p className="text-slate-500">Anlass / Reisezweck:</p>
                        <p className="font-bold text-slate-900">{tripPurpose}</p>
                    </div>
                    <div>
                        <p className="text-slate-500">Berechnungsgrundlage:</p>
                        <p className="font-mono font-semibold text-slate-900">
                            {calc.breakdownText}
                        </p>
                    </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700">
                        Auszahlungs- / Abrechnungsbetrag:
                    </span>
                    <span className="text-xl font-extrabold font-mono text-slate-900">
                        {formatEUR(calc.grossAmount)}
                    </span>
                </div>
            </div>
        </div>
    );
}
export default FahrtkostenRechner;
