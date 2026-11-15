"use client";

import React, { useMemo, useState } from "react";
import { Printer, Receipt, Sparkles } from "lucide-react";
import { amountToGermanReceiptWords } from "@/lib/tools/germanNumberWords";

const formatEUR = (val: number) =>
    new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
    }).format(val);

const formatDateDE = (iso: string) => {
    if (!iso) return "";
    const parts = iso.split("-");
    if (parts.length !== 3) return iso;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
};

export function QuittungGenerator() {
    const todayIso = new Date().toISOString().slice(0, 10);

    const [receiptNo, setReceiptNo] = useState("QU-2026-041");
    const [grossAmountStr, setGrossAmountStr] = useState("238.00");
    const [vatRate, setVatRate] = useState<0 | 7 | 19>(19);
    const [taxNote, setTaxNote] = useState<"standard" | "kleinunternehmer" | "privat">(
        "standard",
    );
    const [fromPerson, setFromPerson] = useState(
        "Max Mustermann, Musterstraße 10, 10115 Berlin",
    );
    const [toRecipient, setToRecipient] = useState(
        "Autohaus & Meisterwerkstatt Schmidt GmbH",
    );
    const [purpose, setPurpose] = useState(
        "Barzahlung KFZ-Inspektion & Ölwechsel laut Auftrag #402",
    );
    const [city, setCity] = useState("Berlin");
    const [dateIso, setDateIso] = useState(todayIso);
    const [taxNumber, setTaxNumber] = useState("DE123456789");
    const [printDuplicate, setPrintDuplicate] = useState(true);

    const calc = useMemo(() => {
        const gross = Math.max(0, parseFloat(grossAmountStr.replace(",", ".")) || 0);
        const effectiveRate = taxNote === "standard" ? vatRate : 0;
        const net = effectiveRate > 0 ? gross / (1 + effectiveRate / 100) : gross;
        const vat = gross - net;
        const inWords = amountToGermanReceiptWords(gross);
        return { gross, net, vat, effectiveRate, inWords };
    }, [grossAmountStr, vatRate, taxNote]);

    const renderReceiptSlip = (label: string) => (
        <div className="border-2 border-slate-900 rounded-xl p-6 bg-white space-y-4">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                        Quittung
                    </h3>
                    <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                        {label}
                    </span>
                </div>
                <div className="text-right text-xs">
                    <span className="text-slate-500">Quittungs-Nr.: </span>
                    <strong className="font-mono text-slate-900">{receiptNo}</strong>
                </div>
            </div>

            {/* Financials Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
                <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-500">
                        Nettobetrag
                    </span>
                    <span className="font-mono font-bold text-sm text-slate-900">
                        {formatEUR(calc.net)}
                    </span>
                </div>
                <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-500">
                        MwSt.-Satz
                    </span>
                    <span className="font-mono font-bold text-sm text-slate-900">
                        {calc.effectiveRate} %
                    </span>
                </div>
                <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-500">
                        MwSt.-Betrag
                    </span>
                    <span className="font-mono font-bold text-sm text-slate-900">
                        {formatEUR(calc.vat)}
                    </span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-300">
                    <span className="block text-[10px] font-bold uppercase text-[#1e43b3]">
                        Gesamtbetrag (Brutto)
                    </span>
                    <span className="font-mono font-black text-base text-slate-900">
                        {formatEUR(calc.gross)}
                    </span>
                </div>
            </div>

            {/* Amount in Words */}
            <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 border-b border-dotted border-slate-400 pb-1.5">
                    <span className="font-bold text-slate-600 shrink-0 w-36">
                        Betrag in Worten:
                    </span>
                    <span className="font-mono font-bold text-slate-900 bg-amber-50/70 px-2 py-0.5 rounded">
                        {calc.inWords}
                    </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 border-b border-dotted border-slate-400 pb-1.5">
                    <span className="font-bold text-slate-600 shrink-0 w-36">
                        Von (Zahlender):
                    </span>
                    <span className="font-semibold text-slate-900">{fromPerson}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 border-b border-dotted border-slate-400 pb-1.5">
                    <span className="font-bold text-slate-600 shrink-0 w-36">
                        Für (Zweck):
                    </span>
                    <span className="font-semibold text-slate-900">{purpose}</span>
                </div>
            </div>

            {taxNote === "kleinunternehmer" && (
                <p className="text-[11px] font-semibold text-slate-700">
                    Hinweis: Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).
                </p>
            )}
            {taxNote === "privat" && (
                <p className="text-[11px] font-semibold text-slate-700">
                    Hinweis: Privatverkauf unter Ausschluss jeglicher Sachmängelhaftung (ohne Umsatzsteuerausweis).
                </p>
            )}

            {/* Signature Footer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 text-xs">
                <div className="space-y-1">
                    <p className="text-slate-600">
                        <strong>Ort, Datum:</strong> {city}, den {formatDateDE(dateIso)}
                    </p>
                    <p className="text-slate-600">
                        <strong>Zahlungsempfänger:</strong> {toRecipient}
                    </p>
                    {taxNote !== "privat" && taxNumber && (
                        <p className="text-slate-500 text-[11px]">
                            St.-Nr. / USt-IdNr.: {taxNumber}
                        </p>
                    )}
                </div>
                <div className="pt-8 border-t border-slate-800 text-center text-[11px] text-slate-600">
                    Betrag dankend erhalten – Stempel & Unterschrift Empfänger (§ 368 BGB)
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
                <div className="lg:col-span-7 p-6 rounded-2xl border border-slate-200 bg-white space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-[#2855d9]" />
                        Quittungsdaten eingeben (§ 368 BGB)
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Bruttobetrag (€)
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={grossAmountStr}
                                onChange={(e) => setGrossAmountStr(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Besteuerung
                            </label>
                            <select
                                value={taxNote}
                                onChange={(e) =>
                                    setTaxNote(
                                        e.target.value as
                                            | "standard"
                                            | "kleinunternehmer"
                                            | "privat",
                                    )
                                }
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                            >
                                <option value="standard">Regelbesteuerung (mit MwSt.)</option>
                                <option value="kleinunternehmer">§ 19 UStG Kleinunternehmer</option>
                                <option value="privat">Privatquittung (0% MwSt.)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                MwSt.-Satz
                            </label>
                            <select
                                disabled={taxNote !== "standard"}
                                value={taxNote === "standard" ? vatRate : 0}
                                onChange={(e) =>
                                    setVatRate(Number(e.target.value) as 0 | 7 | 19)
                                }
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold disabled:bg-slate-100"
                            >
                                <option value={19}>19 %</option>
                                <option value={7}>7 %</option>
                                <option value={0}>0 %</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Von (Name & Anschrift des Zahlenden)
                            </label>
                            <input
                                type="text"
                                value={fromPerson}
                                onChange={(e) => setFromPerson(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Für (Verwendungszweck / Leistung)
                            </label>
                            <input
                                type="text"
                                value={purpose}
                                onChange={(e) => setPurpose(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Zahlungsempfänger (Aussteller der Quittung)
                            </label>
                            <input
                                type="text"
                                value={toRecipient}
                                onChange={(e) => setToRecipient(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-500">
                                Quittungs-Nr.
                            </label>
                            <input
                                type="text"
                                value={receiptNo}
                                onChange={(e) => setReceiptNo(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-500">
                                Ort
                            </label>
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-500">
                                Datum
                            </label>
                            <input
                                type="date"
                                value={dateIso}
                                onChange={(e) => setDateIso(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-500">
                                Steuernummer
                            </label>
                            <input
                                type="text"
                                value={taxNumber}
                                onChange={(e) => setTaxNumber(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Info & Print Panel */}
                <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900 text-white flex flex-col justify-between space-y-5">
                    <div className="space-y-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#9db8f5]">
                            <Sparkles className="w-4 h-4" />
                            Automatisch in Worten
                        </span>
                        <div className="p-3.5 rounded-xl bg-white/10 border border-white/15 font-mono text-sm font-bold text-amber-300">
                            {calc.inWords}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Der Zahlbetrag wird automatisch fälschungssicher als deutsches Zahlwort ausgeschrieben. Bis 250 € Brutto gilt die Quittung gleichzeitig als Kleinbetragsrechnung nach § 33 UStDV.
                        </p>
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer pt-2">
                            <input
                                type="checkbox"
                                checked={printDuplicate}
                                onChange={(e) => setPrintDuplicate(e.target.checked)}
                                className="rounded border-slate-500 text-[#2855d9]"
                            />
                            Original + Durchschlag (Kopie für Buchhaltung) auf 1 A4-Seite drucken
                        </label>
                    </div>

                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-[#2855d9] hover:bg-[#7ea2f8] text-white font-bold text-sm transition-colors cursor-pointer"
                    >
                        <Printer className="w-4 h-4" />
                        Quittung als PDF drucken / speichern
                    </button>
                </div>
            </div>

            {/* Printable Area */}
            <div className="max-w-4xl mx-auto space-y-6 print:space-y-8">
                {renderReceiptSlip("Original für Kunden")}
                {printDuplicate && (
                    <>
                        <div className="border-t-2 border-dashed border-slate-400 my-4 text-center text-[10px] uppercase tracking-widest text-slate-400">
                            ✂ Hier abtrennen ✂
                        </div>
                        {renderReceiptSlip("Durchschlag / Beleg für Buchhaltung")}
                    </>
                )}
            </div>
        </div>
    );
}
export default QuittungGenerator;
