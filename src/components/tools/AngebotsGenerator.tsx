"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Plus,
    Trash2,
    Printer,
    ArrowRight,
    FileCheck2,
    Building2,
    User,
} from "lucide-react";
import type { TaxMode } from "@/lib/tools/vorlagenCatalog";

interface OfferItem {
    id: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    taxRate: 0 | 7 | 19;
    optional?: boolean;
}

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

export function AngebotsGenerator() {
    const router = useRouter();

    const [docType, setDocType] = useState<
        "Angebot" | "Freibleibendes Angebot" | "Kostenvoranschlag"
    >("Angebot");
    const [offerNumber, setOfferNumber] = useState("AN-2026-0184");
    const [issueDate, setIssueDate] = useState(() =>
        new Date().toISOString().slice(0, 10),
    );
    const [validUntil, setValidUntil] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 21);
        return d.toISOString().slice(0, 10);
    });
    const [taxMode, setTaxMode] = useState<TaxMode>("standard");
    const [includeSignatureBlock, setIncludeSignatureBlock] = useState(true);

    // Seller
    const [sellerName, setSellerName] = useState("Mustermann Projekt & Handwerk GmbH");
    const [sellerStreet, setSellerStreet] = useState("Industriestraße 18");
    const [sellerZipCity, setSellerZipCity] = useState("50667 Köln");
    const [sellerTaxId, setSellerTaxId] = useState("DE298374651");
    const [sellerIban] = useState("DE89 3704 0044 0532 0130 00");

    // Buyer
    const [buyerName, setBuyerName] = useState("Immobilienverwaltung Rhein-West GmbH");
    const [buyerStreet, setBuyerStreet] = useState("Hohenzollernring 52");
    const [buyerZipCity, setBuyerZipCity] = useState("50672 Köln");

    const [introText, setIntroText] = useState(
        "Vielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen folgendes Angebot zu unseren allgemeinen Geschäftsbedingungen:",
    );
    const [closingText, setClosingText] = useState(
        "Dieses Angebot ist gültig bis zum oben genannten Bindefrist-Datum. Für Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.",
    );

    const [items, setItems] = useState<OfferItem[]>([
        {
            id: "1",
            description: "Konzeption, Planung & Projektvorbereitung vor Ort",
            quantity: 1,
            unit: "Psch.",
            unitPrice: 480,
            taxRate: 19,
            optional: false,
        },
        {
            id: "2",
            description: "Fachgerechte Ausführung & Montage laut Leistungsverzeichnis",
            quantity: 16,
            unit: "Std.",
            unitPrice: 78,
            taxRate: 19,
            optional: false,
        },
        {
            id: "3",
            description: "Optional: Jährliches Wartungs- & Servicepaket (12 Monate)",
            quantity: 1,
            unit: "Psch.",
            unitPrice: 290,
            taxRate: 19,
            optional: true,
        },
    ]);

    const totals = useMemo(() => {
        let netTotal = 0;
        let vat19 = 0;
        let vat7 = 0;
        let optionalNet = 0;

        for (const item of items) {
            const lineNet = item.quantity * item.unitPrice;
            if (item.optional) {
                optionalNet += lineNet;
                continue;
            }
            netTotal += lineNet;
            const rate = taxMode === "standard" ? item.taxRate : 0;
            const lineVat = lineNet * (rate / 100);
            if (rate === 19) vat19 += lineVat;
            if (rate === 7) vat7 += lineVat;
        }
        const totalVat = vat19 + vat7;
        const grossTotal = netTotal + totalVat;
        return { netTotal, vat19, vat7, totalVat, grossTotal, optionalNet };
    }, [items, taxMode]);

    const addItem = () => {
        setItems((prev) => [
            ...prev,
            {
                id: `${Date.now()}`,
                description: "Neue Angebotsposition",
                quantity: 1,
                unit: "Stk.",
                unitPrice: 120,
                taxRate: taxMode === "standard" ? 19 : 0,
                optional: false,
            },
        ]);
    };

    const updateItem = (id: string, patch: Partial<OfferItem>) => {
        setItems((prev) =>
            prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
        );
    };

    const removeItem = (id: string) => {
        if (items.length <= 1) return;
        setItems((prev) => prev.filter((it) => it.id !== id));
    };

    const convertToInvoice = () => {
        try {
            const activeItems = items
                .filter((i) => !i.optional)
                .map((i) => ({
                    description: i.description,
                    quantity: i.quantity,
                    unit: i.unit,
                    unitPrice: i.unitPrice,
                    taxRate: i.taxRate,
                    isLabor35a: false,
                }));
            sessionStorage.setItem(
                "rechly_doc_to_invoice",
                JSON.stringify({
                    sellerName,
                    sellerStreet,
                    sellerZipCity,
                    sellerTaxId,
                    sellerIban,
                    buyerName,
                    buyerStreet,
                    buyerZipCity,
                    taxMode,
                    items: activeItems,
                }),
            );
        } catch {
            // ignore storage errors
        }
        router.push("/tools/rechnungsgenerator?from=offer");
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
                <div className="lg:col-span-7 space-y-5">
                    <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                            <FileCheck2 className="w-4 h-4 text-indigo-600" />
                            1. Angebots-Typ & Bindefrist (§ 145 BGB)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Dokumententyp
                                </label>
                                <select
                                    value={docType}
                                    onChange={(e) =>
                                        setDocType(
                                            e.target.value as
                                                | "Angebot"
                                                | "Freibleibendes Angebot"
                                                | "Kostenvoranschlag",
                                        )
                                    }
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50"
                                >
                                    <option value="Angebot">Verbindliches Angebot (§ 145 BGB)</option>
                                    <option value="Freibleibendes Angebot">Freibleibendes Angebot</option>
                                    <option value="Kostenvoranschlag">Kostenvoranschlag (§ 649 BGB)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Angebots-Nr.
                                </label>
                                <input
                                    type="text"
                                    value={offerNumber}
                                    onChange={(e) => setOfferNumber(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Gültig bis (Bindefrist)
                                </label>
                                <input
                                    type="date"
                                    value={validUntil}
                                    onChange={(e) => setValidUntil(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pt-1">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Steuer-Modus
                                </label>
                                <select
                                    value={taxMode}
                                    onChange={(e) => setTaxMode(e.target.value as TaxMode)}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium"
                                >
                                    <option value="standard">Regelbesteuerung (19% / 7%)</option>
                                    <option value="kleinunternehmer">Kleinunternehmer (§ 19 UStG)</option>
                                    <option value="reverse_charge">Reverse Charge (§ 13b UStG)</option>
                                </select>
                            </div>
                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer mt-4">
                                <input
                                    type="checkbox"
                                    checked={includeSignatureBlock}
                                    onChange={(e) => setIncludeSignatureBlock(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600"
                                />
                                Auftragsbestätigungs-Unterschriftsfeld einblenden
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2.5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <Building2 className="w-4 h-4 text-indigo-600" />
                                Anbieter (Ihr Betrieb)
                            </h3>
                            <input
                                type="text"
                                value={sellerName}
                                onChange={(e) => setSellerName(e.target.value)}
                                placeholder="Firmenname"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                            <input
                                type="text"
                                value={sellerStreet}
                                onChange={(e) => setSellerStreet(e.target.value)}
                                placeholder="Straße & Hausnummer"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                            <input
                                type="text"
                                value={sellerZipCity}
                                onChange={(e) => setSellerZipCity(e.target.value)}
                                placeholder="PLZ & Ort"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                            <input
                                type="text"
                                value={sellerTaxId}
                                onChange={(e) => setSellerTaxId(e.target.value)}
                                placeholder="USt-IdNr. / Steuernummer"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                        </div>

                        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2.5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <User className="w-4 h-4 text-indigo-600" />
                                Angebotsempfänger (Kunde)
                            </h3>
                            <input
                                type="text"
                                value={buyerName}
                                onChange={(e) => setBuyerName(e.target.value)}
                                placeholder="Kundenname"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                            <input
                                type="text"
                                value={buyerStreet}
                                onChange={(e) => setBuyerStreet(e.target.value)}
                                placeholder="Straße & Hausnummer"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                            <input
                                type="text"
                                value={buyerZipCity}
                                onChange={(e) => setBuyerZipCity(e.target.value)}
                                placeholder="PLZ & Ort"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-500">
                                    Angebotsdatum
                                </label>
                                <input
                                    type="date"
                                    value={issueDate}
                                    onChange={(e) => setIssueDate(e.target.value)}
                                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                                Angebotspositionen (inkl. Alternativ-/Eventualpositionen)
                            </h3>
                            <button
                                type="button"
                                onClick={addItem}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Position
                            </button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <div
                                    key={item.id}
                                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500">
                                            Pos. {idx + 1}
                                        </span>
                                        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(item.optional)}
                                                onChange={(e) =>
                                                    updateItem(item.id, { optional: e.target.checked })
                                                }
                                                className="rounded border-slate-300 text-amber-600"
                                            />
                                            Eventual-/Alternativposition (nicht in Summe)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
                                            disabled={items.length <= 1}
                                            className="text-slate-400 hover:text-rose-600 disabled:opacity-30"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) =>
                                            updateItem(item.id, { description: e.target.value })
                                        }
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                                    />
                                    <div className="grid grid-cols-3 gap-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={item.quantity}
                                            onChange={(e) =>
                                                updateItem(item.id, {
                                                    quantity: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                                        />
                                        <input
                                            type="text"
                                            value={item.unit}
                                            onChange={(e) =>
                                                updateItem(item.id, { unit: e.target.value })
                                            }
                                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                                        />
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={item.unitPrice}
                                            onChange={(e) =>
                                                updateItem(item.id, {
                                                    unitPrice: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Action Box */}
                <div className="lg:col-span-5 space-y-5">
                    <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                            Angebotssumme & Direkt-Umwandlung
                        </p>
                        <div className="space-y-1.5 text-sm border-b border-white/10 pb-3">
                            <div className="flex justify-between text-slate-300">
                                <span>Netto-Angebotssumme:</span>
                                <span className="font-mono">{formatEUR(totals.netTotal)}</span>
                            </div>
                            {taxMode === "standard" && (
                                <div className="flex justify-between text-slate-300">
                                    <span>zzgl. Umsatzsteuer:</span>
                                    <span className="font-mono">{formatEUR(totals.totalVat)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-extrabold text-white pt-1">
                                <span>Gesamtbetrag (Brutto):</span>
                                <span className="font-mono text-emerald-400">
                                    {formatEUR(totals.grossTotal)}
                                </span>
                            </div>
                            {totals.optionalNet > 0 && (
                                <div className="flex justify-between text-xs text-amber-300 pt-1">
                                    <span>Optionalpositionen (Netto):</span>
                                    <span className="font-mono">{formatEUR(totals.optionalNet)}</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2.5">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm transition-colors cursor-pointer"
                            >
                                <Printer className="w-4 h-4" />
                                Angebot als PDF drucken / speichern
                            </button>
                            <button
                                type="button"
                                onClick={convertToInvoice}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 font-bold text-sm transition-colors cursor-pointer"
                            >
                                1-Klick: In Rechnung umwandeln
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                        <label className="block text-xs font-bold text-slate-700">
                            Einleitungstext
                        </label>
                        <textarea
                            rows={2}
                            value={introText}
                            onChange={(e) => setIntroText(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                        />
                        <label className="block text-xs font-bold text-slate-700">
                            Schlusstext & Bindefrist-Klausel
                        </label>
                        <textarea
                            rows={2}
                            value={closingText}
                            onChange={(e) => setClosingText(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                        />
                    </div>
                </div>
            </div>

            {/* Printable Offer Sheet */}
            <div className="bg-white border border-slate-300 shadow-lg rounded-2xl p-8 sm:p-12 max-w-4xl mx-auto print:shadow-none print:border-none print:p-0 print:max-w-none text-slate-900">
                <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                    <div>
                        <p className="text-xl font-extrabold text-slate-900">{sellerName}</p>
                        <p className="text-xs text-slate-500 mt-1">
                            {sellerStreet} · {sellerZipCity}
                        </p>
                    </div>
                    <div className="text-right text-xs text-slate-600">
                        <p className="font-semibold text-slate-900">{sellerName}</p>
                        <p>{sellerStreet}</p>
                        <p>{sellerZipCity}</p>
                        {sellerTaxId && <p>USt-IdNr.: {sellerTaxId}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 py-8">
                    <div className="sm:col-span-7 space-y-1">
                        <p className="text-[10px] underline text-slate-400 mb-2">
                            {sellerName} · {sellerStreet} · {sellerZipCity}
                        </p>
                        <p className="text-sm font-bold text-slate-900">{buyerName}</p>
                        <p className="text-sm text-slate-700">{buyerStreet}</p>
                        <p className="text-sm text-slate-700">{buyerZipCity}</p>
                    </div>
                    <div className="sm:col-span-5 bg-slate-50 rounded-xl p-4 text-xs space-y-1.5 border border-slate-200">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Angebotsnummer:</span>
                            <span className="font-bold text-slate-900">{offerNumber}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Datum:</span>
                            <span className="font-medium">{formatDateDE(issueDate)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Gültig bis:</span>
                            <span className="font-semibold text-indigo-700">
                                {formatDateDE(validUntil)}
                            </span>
                        </div>
                    </div>
                </div>

                <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
                    {docType} Nr. {offerNumber}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mb-6">{introText}</p>

                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-900 text-[11px] font-bold uppercase text-slate-600">
                            <th className="py-2 pr-2 w-10">Pos.</th>
                            <th className="py-2 px-2">Bezeichnung</th>
                            <th className="py-2 px-2 text-right w-24">Menge</th>
                            <th className="py-2 px-2 text-right w-28">Einzelpreis</th>
                            <th className="py-2 pl-2 text-right w-28">Gesamt</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                        {items.map((item, idx) => (
                            <tr key={item.id} className={item.optional ? "text-slate-500 italic" : ""}>
                                <td className="py-3 pr-2">{idx + 1}</td>
                                <td className="py-3 px-2">
                                    <span className="font-medium text-slate-900">
                                        {item.description}
                                    </span>
                                    {item.optional && (
                                        <span className="ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 not-italic">
                                            Eventualposition
                                        </span>
                                    )}
                                </td>
                                <td className="py-3 px-2 text-right">
                                    {item.quantity} {item.unit}
                                </td>
                                <td className="py-3 px-2 text-right font-mono">
                                    {formatEUR(item.unitPrice)}
                                </td>
                                <td className="py-3 pl-2 text-right font-mono font-semibold">
                                    {item.optional
                                        ? `(${formatEUR(item.quantity * item.unitPrice)})`
                                        : formatEUR(item.quantity * item.unitPrice)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-6 flex flex-col sm:flex-row justify-between items-start gap-6 border-t-2 border-slate-900 pt-5">
                    <p className="text-xs text-slate-600 max-w-md leading-relaxed">
                        {closingText}
                    </p>
                    <div className="w-full sm:w-72 space-y-1.5 text-sm">
                        <div className="flex justify-between text-slate-600">
                            <span>Summe Netto:</span>
                            <span className="font-mono">{formatEUR(totals.netTotal)}</span>
                        </div>
                        {taxMode === "standard" && (
                            <div className="flex justify-between text-slate-600">
                                <span>zzgl. Umsatzsteuer:</span>
                                <span className="font-mono">{formatEUR(totals.totalVat)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-300 pt-2">
                            <span>Angebotssumme:</span>
                            <span className="font-mono">{formatEUR(totals.grossTotal)}</span>
                        </div>
                    </div>
                </div>

                {includeSignatureBlock && (
                    <div className="mt-10 pt-6 border-t border-dashed border-slate-300">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            Auftragserteilung / Annahme des Angebots
                        </p>
                        <p className="text-xs text-slate-600 mb-8">
                            Hiermit beauftrage(n) ich/wir die oben aufgeführten Leistungen gemäß {docType} Nr. {offerNumber} vom {formatDateDE(issueDate)}.
                        </p>
                        <div className="grid grid-cols-2 gap-8 text-xs text-slate-500">
                            <div className="border-t border-slate-400 pt-1.5">
                                Ort, Datum
                            </div>
                            <div className="border-t border-slate-400 pt-1.5">
                                Rechtsverbindliche Unterschrift / Firmenstempel Auftraggeber
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
export default AngebotsGenerator;
