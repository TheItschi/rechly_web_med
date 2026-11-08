"use client";

import React, { useMemo, useState } from "react";
import { Printer, FileX2, AlertCircle } from "lucide-react";

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

export function StornorechnungGenerator() {
    const todayIso = new Date().toISOString().slice(0, 10);

    const [docType, setDocType] = useState<
        "Stornorechnung / Rechnungskorrektur" | "Gutschrift (Abrechnungsgutschrift § 14 Abs. 2 S. 2 UStG)"
    >("Stornorechnung / Rechnungskorrektur");
    const [stornoNo, setStornoNo] = useState("ST-2026-0092");
    const [originalInvoiceNo, setOriginalInvoiceNo] = useState("RE-2026-1018");
    const [originalInvoiceDate, setOriginalInvoiceDate] = useState("2026-10-05");
    const [issueDate, setIssueDate] = useState(todayIso);

    const [sellerName, setSellerName] = useState("Mustermann Digital Solutions");
    const [sellerStreet, setSellerStreet] = useState("Friedrichstraße 120");
    const [sellerZipCity, setSellerZipCity] = useState("10117 Berlin");
    const [sellerTaxId, setSellerTaxId] = useState("DE123456789");

    const [buyerName, setBuyerName] = useState("TechVenture GmbH");
    const [buyerStreet, setBuyerStreet] = useState("Maximilianstraße 45");
    const [buyerZipCity, setBuyerZipCity] = useState("80539 München");

    const [description, setDescription] = useState(
        "Vollständige Stornierung der Leistungspositionen aus Rechnung RE-2026-1018 wegen Projektänderung",
    );
    const [netAmountStr, setNetAmountStr] = useState("1200.00");
    const [vatRate, setVatRate] = useState<0 | 7 | 19>(19);
    const [payoutMethod] = useState(
        "Der Korrekturbetrag wird mit Ihrer nächsten Rechnung verrechnet bzw. auf Ihr Bankkonto erstattet.",
    );

    const isStorno = docType.startsWith("Stornorechnung");

    const calc = useMemo(() => {
        const absNet = Math.abs(parseFloat(netAmountStr.replace(",", ".")) || 0);
        const sign = isStorno ? -1 : 1;
        const net = absNet * sign;
        const vat = net * (vatRate / 100);
        const gross = net + vat;
        return { net, vat, gross };
    }, [netAmountStr, vatRate, isStorno]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
                <div className="lg:col-span-7 p-6 rounded-2xl border border-slate-200 bg-white space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <FileX2 className="w-4 h-4 text-rose-600" />
                        Stornorechnung vs. Gutschrift (§ 14 UStG / GoBD)
                    </h3>

                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <strong>Wichtiger Unterschied seit dem Amtshilferichtlinie-Umsetzungsgesetz:</strong> Eine Korrektur einer bereits gestellten Rechnung heißt steuerrechtlich <strong>„Stornorechnung“</strong> oder <strong>„Rechnungskorrektur“</strong> (mit negativem Betrag). Eine <strong>„Gutschrift“</strong> (§ 14 Abs. 2 S. 2 UStG) liegt vor, wenn der Leistungsempfänger für den Lieferanten abrechnet (z. B. Provisionsabrechnung).
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Dokumententyp
                            </label>
                            <select
                                value={docType}
                                onChange={(e) =>
                                    setDocType(
                                        e.target.value as
                                            | "Stornorechnung / Rechnungskorrektur"
                                            | "Gutschrift (Abrechnungsgutschrift § 14 Abs. 2 S. 2 UStG)",
                                    )
                                }
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold"
                            >
                                <option value="Stornorechnung / Rechnungskorrektur">
                                    Stornorechnung / Rechnungskorrektur (Negative Korrektur einer Ausgangsrechnung)
                                </option>
                                <option value="Gutschrift (Abrechnungsgutschrift § 14 Abs. 2 S. 2 UStG)">
                                    Abrechnungsgutschrift (§ 14 Abs. 2 S. 2 UStG – Provision / Honorar)
                                </option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Beleg-Nr. (eigene fortlaufende Nr.)
                            </label>
                            <input
                                type="text"
                                value={stornoNo}
                                onChange={(e) => setStornoNo(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Ausstellungsdatum
                            </label>
                            <input
                                type="date"
                                value={issueDate}
                                onChange={(e) => setIssueDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                        </div>

                        {isStorno && (
                            <>
                                <div>
                                    <label className="block text-xs font-semibold text-rose-700 mb-1">
                                        Ursprüngliche Rechnungsnummer (Pflicht!)
                                    </label>
                                    <input
                                        type="text"
                                        value={originalInvoiceNo}
                                        onChange={(e) => setOriginalInvoiceNo(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-rose-300 bg-rose-50/40 text-sm font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-rose-700 mb-1">
                                        Ursprüngliches Rechnungsdatum (Pflicht!)
                                    </label>
                                    <input
                                        type="date"
                                        value={originalInvoiceDate}
                                        onChange={(e) => setOriginalInvoiceDate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-rose-300 bg-rose-50/40 text-sm"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Aussteller (Firma & Adresse)
                            </label>
                            <input
                                type="text"
                                value={sellerName}
                                onChange={(e) => setSellerName(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs mb-1.5"
                            />
                            <input
                                type="text"
                                value={`${sellerStreet}, ${sellerZipCity}`}
                                onChange={(e) => {
                                    const [st = "", zc = ""] = e.target.value.split(",");
                                    setSellerStreet(st.trim());
                                    setSellerZipCity(zc.trim());
                                }}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs mb-1.5"
                            />
                            <input
                                type="text"
                                value={sellerTaxId}
                                onChange={(e) => setSellerTaxId(e.target.value)}
                                placeholder="USt-IdNr. / Steuernummer"
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Empfänger (Kunde)
                            </label>
                            <input
                                type="text"
                                value={buyerName}
                                onChange={(e) => setBuyerName(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs mb-1.5"
                            />
                            <input
                                type="text"
                                value={buyerStreet}
                                onChange={(e) => setBuyerStreet(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs mb-1.5"
                            />
                            <input
                                type="text"
                                value={buyerZipCity}
                                onChange={(e) => setBuyerZipCity(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                            />
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <label className="block text-xs font-semibold text-slate-600">
                            Grund / Leistungsbeschreibung der Korrektur
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Netto-Betrag (€)
                                </label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={netAmountStr}
                                    onChange={(e) => setNetAmountStr(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Steuersatz
                                </label>
                                <select
                                    value={vatRate}
                                    onChange={(e) =>
                                        setVatRate(Number(e.target.value) as 0 | 7 | 19)
                                    }
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                                >
                                    <option value={19}>19 % USt.</option>
                                    <option value={7}>7 % USt.</option>
                                    <option value={0}>0 % (§ 19 / § 13b)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900 text-white flex flex-col justify-between space-y-5">
                    <div className="space-y-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
                            GoBD-konformer Korrekturbetrag
                        </span>
                        <div className="space-y-1.5 text-sm border-b border-white/10 pb-3">
                            <div className="flex justify-between text-slate-300">
                                <span>Nettobetrag:</span>
                                <span className="font-mono">{formatEUR(calc.net)}</span>
                            </div>
                            <div className="flex justify-between text-slate-300">
                                <span>Umsatzsteuer ({vatRate} %):</span>
                                <span className="font-mono">{formatEUR(calc.vat)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-extrabold text-rose-400 pt-1">
                                <span>Gesamtbetrag:</span>
                                <span className="font-mono">{formatEUR(calc.gross)}</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Nach den GoBD darf eine bereits versendete oder gebuchte Rechnung nicht einfach überschrieben oder gelöscht werden. Diese Stornorechnung referenziert die Originalrechnung rechtssicher.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm cursor-pointer"
                    >
                        <Printer className="w-4 h-4" />
                        Stornorechnung als PDF drucken
                    </button>
                </div>
            </div>

            {/* Printable Sheet */}
            <div className="bg-white border border-slate-300 shadow-lg rounded-2xl p-8 sm:p-12 max-w-4xl mx-auto print:shadow-none print:border-none print:p-0 print:max-w-none text-slate-900">
                <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                    <div>
                        <p className="text-xl font-extrabold text-slate-900">{sellerName}</p>
                        <p className="text-xs text-slate-500">
                            {sellerStreet} · {sellerZipCity}
                        </p>
                    </div>
                    <div className="text-right text-xs text-slate-600">
                        <p className="font-semibold text-slate-900">{sellerName}</p>
                        <p>USt-IdNr. / St.-Nr.: {sellerTaxId}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 py-8">
                    <div className="sm:col-span-7 space-y-1">
                        <p className="text-sm font-bold text-slate-900">{buyerName}</p>
                        <p className="text-sm text-slate-700">{buyerStreet}</p>
                        <p className="text-sm text-slate-700">{buyerZipCity}</p>
                    </div>
                    <div className="sm:col-span-5 bg-slate-50 rounded-xl p-4 text-xs space-y-1.5 border border-slate-200">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Beleg-Nr.:</span>
                            <span className="font-bold text-slate-900">{stornoNo}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Datum:</span>
                            <span className="font-medium">{formatDateDE(issueDate)}</span>
                        </div>
                        {isStorno && (
                            <div className="flex justify-between pt-1 border-t border-slate-200 text-rose-700 font-semibold">
                                <span>Zu Rechnung Nr.:</span>
                                <span>
                                    {originalInvoiceNo} ({formatDateDE(originalInvoiceDate)})
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
                    {isStorno ? "Stornorechnung / Rechnungskorrektur" : "Gutschrift"} Nr. {stornoNo}
                </h2>
                {isStorno && (
                    <p className="text-xs sm:text-sm font-semibold text-rose-700 mb-6">
                        Hiermit stornieren und korrigieren wir unsere Rechnung Nr. {originalInvoiceNo} vom {formatDateDE(originalInvoiceDate)} wie folgt:
                    </p>
                )}

                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-900 text-[11px] font-bold uppercase text-slate-600">
                            <th className="py-2 pr-2 w-12">Pos.</th>
                            <th className="py-2 px-2">Bezeichnung</th>
                            <th className="py-2 px-2 text-right w-20">USt.</th>
                            <th className="py-2 pl-2 text-right w-32">Nettobetrag</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                        <tr>
                            <td className="py-3 pr-2">1</td>
                            <td className="py-3 px-2 font-medium text-slate-900">{description}</td>
                            <td className="py-3 px-2 text-right">{vatRate} %</td>
                            <td className="py-3 pl-2 text-right font-mono font-bold">
                                {formatEUR(calc.net)}
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div className="mt-6 flex flex-col sm:flex-row justify-between items-start gap-6 border-t-2 border-slate-900 pt-5">
                    <p className="text-xs text-slate-600 max-w-md">{payoutMethod}</p>
                    <div className="w-full sm:w-72 space-y-1.5 text-sm">
                        <div className="flex justify-between text-slate-600">
                            <span>Nettobetrag:</span>
                            <span className="font-mono">{formatEUR(calc.net)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                            <span>Umsatzsteuer ({vatRate} %):</span>
                            <span className="font-mono">{formatEUR(calc.vat)}</span>
                        </div>
                        <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-300 pt-2">
                            <span>Gesamtbetrag:</span>
                            <span className="font-mono">{formatEUR(calc.gross)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default StornorechnungGenerator;
