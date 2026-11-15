"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Printer, Truck, ArrowRight } from "lucide-react";

interface DeliveryItem {
    id: string;
    articleNo: string;
    description: string;
    quantity: number;
    unit: string;
    unitPriceForInvoice: number;
}

const formatDateDE = (iso: string) => {
    if (!iso) return "";
    const parts = iso.split("-");
    if (parts.length !== 3) return iso;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
};

export function LieferscheinGenerator() {
    const router = useRouter();
    const todayIso = new Date().toISOString().slice(0, 10);

    const [deliveryNo, setDeliveryNo] = useState("LS-2026-0812");
    const [orderRef, setOrderRef] = useState("Bestellung #4920");
    const [deliveryDate, setDeliveryDate] = useState(todayIso);
    const [shippingMethod, setShippingMethod] = useState("DHL Paket / Spedition");
    const [packagesCount, setPackagesCount] = useState("2 Pakete (14,5 kg)");

    const [sellerName, setSellerName] = useState("Mustermann Handel & Technik GmbH");
    const [sellerStreet, setSellerStreet] = useState("Siemensstraße 24");
    const [sellerZipCity, setSellerZipCity] = useState("70469 Stuttgart");

    const [buyerName, setBuyerName] = useState("Maschinenbau Südwest AG");
    const [buyerStreet, setBuyerStreet] = useState("Werkstraße 8 – Tor 3 (Warenannahme)");
    const [buyerZipCity, setBuyerZipCity] = useState("76133 Karlsruhe");

    const [items, setItems] = useState<DeliveryItem[]>([
        {
            id: "1",
            articleNo: "ART-1040",
            description: "Industrie-Steuermodul 24V DC Hutschiene inkl. Prüfzertifikat",
            quantity: 10,
            unit: "Stk.",
            unitPriceForInvoice: 89,
        },
        {
            id: "2",
            articleNo: "ART-2085",
            description: "Sensorleitung M12 geschirmt, 5m PUR-Mantel",
            quantity: 20,
            unit: "Stk.",
            unitPriceForInvoice: 18.5,
        },
    ]);

    const addItem = () => {
        setItems((prev) => [
            ...prev,
            {
                id: `${Date.now()}`,
                articleNo: `ART-${1000 + prev.length + 1}`,
                description: "Weiterer Lieferartikel",
                quantity: 1,
                unit: "Stk.",
                unitPriceForInvoice: 50,
            },
        ]);
    };

    const updateItem = (id: string, patch: Partial<DeliveryItem>) => {
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
            sessionStorage.setItem(
                "rechly_doc_to_invoice",
                JSON.stringify({
                    sellerName,
                    sellerStreet,
                    sellerZipCity,
                    buyerName,
                    buyerStreet,
                    buyerZipCity,
                    taxMode: "standard",
                    items: items.map((i) => ({
                        description: `${i.articleNo ? `[${i.articleNo}] ` : ""}${i.description}`,
                        quantity: i.quantity,
                        unit: i.unit,
                        unitPrice: i.unitPriceForInvoice,
                        taxRate: 19,
                    })),
                }),
            );
        } catch {
            // ignore
        }
        router.push("/tools/rechnungsgenerator?from=delivery");
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
                <div className="lg:col-span-7 space-y-5">
                    <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                            <Truck className="w-4 h-4 text-[#2855d9]" />
                            Lieferschein-Kopfdaten (DIN 5008)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Lieferschein-Nr.
                                </label>
                                <input
                                    type="text"
                                    value={deliveryNo}
                                    onChange={(e) => setDeliveryNo(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Auftrags-/Bestell-Nr.
                                </label>
                                <input
                                    type="text"
                                    value={orderRef}
                                    onChange={(e) => setOrderRef(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Lieferdatum
                                </label>
                                <input
                                    type="date"
                                    value={deliveryDate}
                                    onChange={(e) => setDeliveryDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Versandart
                                </label>
                                <input
                                    type="text"
                                    value={shippingMethod}
                                    onChange={(e) => setShippingMethod(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Packstücke / Gewicht
                                </label>
                                <input
                                    type="text"
                                    value={packagesCount}
                                    onChange={(e) => setPackagesCount(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                            <p className="text-xs font-bold uppercase text-slate-700">Absender</p>
                            <input
                                type="text"
                                value={sellerName}
                                onChange={(e) => setSellerName(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                            <input
                                type="text"
                                value={sellerStreet}
                                onChange={(e) => setSellerStreet(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                            <input
                                type="text"
                                value={sellerZipCity}
                                onChange={(e) => setSellerZipCity(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                        </div>
                        <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                            <p className="text-xs font-bold uppercase text-slate-700">
                                Lieferadresse (Empfänger)
                            </p>
                            <input
                                type="text"
                                value={buyerName}
                                onChange={(e) => setBuyerName(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                            <input
                                type="text"
                                value={buyerStreet}
                                onChange={(e) => setBuyerStreet(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                            <input
                                type="text"
                                value={buyerZipCity}
                                onChange={(e) => setBuyerZipCity(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                                Gelieferte Artikel (ohne Preis auf Lieferschein)
                            </h3>
                            <button
                                type="button"
                                onClick={addItem}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#eef3fd] text-[#1e43b3] text-xs font-bold"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Artikel
                            </button>
                        </div>

                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2"
                            >
                                <div className="grid grid-cols-12 gap-2">
                                    <input
                                        type="text"
                                        placeholder="Art.-Nr."
                                        value={item.articleNo}
                                        onChange={(e) =>
                                            updateItem(item.id, { articleNo: e.target.value })
                                        }
                                        className="col-span-3 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Artikelbeschreibung"
                                        value={item.description}
                                        onChange={(e) =>
                                            updateItem(item.id, { description: e.target.value })
                                        }
                                        className="col-span-8 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeItem(item.id)}
                                        className="col-span-1 flex items-center justify-center text-slate-400 hover:text-rose-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-[10px] text-slate-500">Menge</label>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) =>
                                                updateItem(item.id, {
                                                    quantity: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500">Einheit</label>
                                        <input
                                            type="text"
                                            value={item.unit}
                                            onChange={(e) =>
                                                updateItem(item.id, { unit: e.target.value })
                                            }
                                            className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500">
                                            Preis (nur für Rechnungs-Übernahme)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={item.unitPriceForInvoice}
                                            onChange={(e) =>
                                                updateItem(item.id, {
                                                    unitPriceForInvoice:
                                                        parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-5 space-y-5">
                    <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#9db8f5]">
                            Lieferschein drucken & weiterverarbeiten
                        </p>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Auf dem gedruckten Lieferschein werden <strong>keine Preise</strong> ausgewiesen (perfekt für Lager, Baustelle & Warenannahme). Mit 1 Klick übernehmen Sie alle Positionen direkt in die Rechnung.
                        </p>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#2855d9] hover:bg-[#7ea2f8] text-white font-bold text-sm cursor-pointer"
                        >
                            <Printer className="w-4 h-4" />
                            Lieferschein als PDF drucken
                        </button>
                        <button
                            type="button"
                            onClick={convertToInvoice}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 font-bold text-sm cursor-pointer"
                        >
                            1-Klick: Aus Lieferschein Rechnung erstellen
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
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
                        <p className="font-bold text-slate-900 uppercase">Warenversand</p>
                        <p>{shippingMethod}</p>
                        <p>{packagesCount}</p>
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
                            <span className="text-slate-500">Lieferschein-Nr.:</span>
                            <span className="font-bold text-slate-900">{deliveryNo}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Auftragsreferenz:</span>
                            <span className="font-medium">{orderRef}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Lieferdatum:</span>
                            <span className="font-medium">{formatDateDE(deliveryDate)}</span>
                        </div>
                    </div>
                </div>

                <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
                    Lieferschein {deliveryNo}
                </h2>

                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-900 text-[11px] font-bold uppercase text-slate-600">
                            <th className="py-2 pr-2 w-12">Pos.</th>
                            <th className="py-2 px-2 w-28">Art.-Nr.</th>
                            <th className="py-2 px-2">Artikelbezeichnung</th>
                            <th className="py-2 pl-2 text-right w-28">Liefermenge</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                        {items.map((item, idx) => (
                            <tr key={item.id}>
                                <td className="py-3 pr-2">{idx + 1}</td>
                                <td className="py-3 px-2 font-mono text-xs">{item.articleNo}</td>
                                <td className="py-3 px-2 font-medium text-slate-900">
                                    {item.description}
                                </td>
                                <td className="py-3 pl-2 text-right font-bold">
                                    {item.quantity} {item.unit}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <p className="mt-6 text-xs text-slate-600">
                    Die gelieferte Ware bleibt bis zur vollständigen Bezahlung unser Eigentum (§ 449 BGB Eigentumsvorbehalt). Bitte prüfen Sie die Sendung sofort bei Empfang auf Transportschäden (§ 377 HGB).
                </p>

                <div className="mt-10 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-500">
                    <div>
                        <p className="font-bold text-slate-800 mb-8">
                            Ware vollständig & unbeschädigt übernommen:
                        </p>
                        <div className="border-t border-slate-400 pt-1">
                            Ort, Datum & Uhrzeit der Übergabe
                        </div>
                    </div>
                    <div className="pt-12">
                        <div className="border-t border-slate-400 pt-1">
                            Unterschrift & Name in Druckbuchstaben (Empfänger)
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default LieferscheinGenerator;
