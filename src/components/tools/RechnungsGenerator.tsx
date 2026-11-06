"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import {
    Plus,
    Trash2,
    Printer,
    FileCode2,
    Sparkles,
    CheckCircle2,
    AlertTriangle,
    QrCode,
    Building2,
    User,
    FileText,
    RotateCcw,
} from "lucide-react";
import { buildGirocodePayload } from "@/lib/girocode";
import { escapeXml } from "@/lib/eRechnung/xrechnung";
import {
    VORLAGEN_CATALOG,
    getVorlageBySlug,
    type TaxMode,
    type VorlagePresetItem,
} from "@/lib/tools/vorlagenCatalog";

interface LineItem extends VorlagePresetItem {
    id: string;
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

function RechnungsGeneratorInner() {
    const searchParams = useSearchParams();
    const templateParam = searchParams.get("template") || "";
    const fromParam = searchParams.get("from") || "";

    const [selectedTemplate, setSelectedTemplate] = useState<string>(
        templateParam || "it-freelancer",
    );

    // Seller
    const [sellerName, setSellerName] = useState("Mustermann Digital Solutions");
    const [sellerStreet, setSellerStreet] = useState("Friedrichstraße 120");
    const [sellerZipCity, setSellerZipCity] = useState("10117 Berlin");
    const [sellerTaxId, setSellerTaxId] = useState("DE123456789");
    const [sellerEmail, setSellerEmail] = useState("rechnung@mustermann-digital.de");
    const [sellerPhone, setSellerPhone] = useState("+49 30 1234567");
    const [sellerIban, setSellerIban] = useState("DE89 3704 0044 0532 0130 00");
    const [sellerBic, setSellerBic] = useState("COBADEFFXXX");
    const [sellerBank, setSellerBank] = useState("Commerzbank Berlin");

    // Buyer
    const [buyerName, setBuyerName] = useState("TechVenture GmbH");
    const [buyerStreet, setBuyerStreet] = useState("Maximilianstraße 45");
    const [buyerZipCity, setBuyerZipCity] = useState("80539 München");
    const [buyerEmail, setBuyerEmail] = useState("buchhaltung@techventure.de");
    const [buyerVatId, setBuyerVatId] = useState("");
    const [leitwegId, setLeitwegId] = useState("");

    // Meta
    const [invoiceTitle, setInvoiceTitle] = useState("Rechnung");
    const [invoiceNumber, setInvoiceNumber] = useState("RE-2026-1042");
    const [issueDate, setIssueDate] = useState(() =>
        new Date().toISOString().slice(0, 10),
    );
    const [deliveryDate, setDeliveryDate] = useState("Leistungsmonat Oktober 2026");
    const [dueDate, setDueDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d.toISOString().slice(0, 10);
    });
    const [taxMode, setTaxMode] = useState<TaxMode>("standard");
    const [showLabor35a, setShowLabor35a] = useState(false);
    const [showGiroCode, setShowGiroCode] = useState(true);

    // Texts
    const [introText, setIntroText] = useState(
        "Vielen Dank für Ihren Auftrag und die gute Zusammenarbeit. Für die erbrachten Leistungen berechnen wir Ihnen wie folgt:",
    );
    const [footerText, setFooterText] = useState(
        "Zahlbar innerhalb von 14 Tagen ab Rechnungsdatum ohne Abzug unter Angabe der Rechnungsnummer.",
    );

    // Line items
    const [items, setItems] = useState<LineItem[]>([
        {
            id: "1",
            description: "Full-Stack Webentwicklung (Next.js / TypeScript) gemäß Sprint-Protokoll",
            quantity: 32,
            unit: "Std.",
            unitPrice: 105,
            taxRate: 19,
            isLabor35a: false,
        },
        {
            id: "2",
            description: "Technisches SEO-Audit & Core Web Vitals Optimierung",
            quantity: 1,
            unit: "Psch.",
            unitPrice: 850,
            taxRate: 19,
            isLabor35a: false,
        },
    ]);

    const applyPreset = (slug: string) => {
        const vorlage = getVorlageBySlug(slug);
        if (!vorlage) return;
        const p = vorlage.presetData;
        const [street = "", zipCity = ""] = p.senderAddress.split(",").map((s) => s.trim());
        const [bStreet = "", bZipCity = ""] = p.recipientAddress.split(",").map((s) => s.trim());
        setSelectedTemplate(slug);
        setInvoiceTitle(p.invoiceTitle);
        setSellerName(p.senderName);
        setSellerStreet(street || p.senderAddress);
        setSellerZipCity(zipCity);
        setSellerTaxId(p.senderTaxId);
        setBuyerName(p.recipientName);
        setBuyerStreet(bStreet || p.recipientAddress);
        setBuyerZipCity(bZipCity);
        setTaxMode(p.taxMode === "reverse_charge_13b" ? "reverse_charge" : p.taxMode);
        setShowLabor35a(p.show35aHighlight);
        setFooterText(p.legalNote);
        setItems(
            p.items.map((item, idx) => ({
                id: `${Date.now()}-${idx}`,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                unitPrice: item.price,
                taxRate: (item.vatRate === 7 ? 7 : item.vatRate === 0 ? 0 : 19) as 0 | 7 | 19,
                isLabor35a: item.isLabor35a,
            })),
        );
    };

    // Load template from URL or transferred offer/delivery note
    useEffect(() => {
        if (templateParam) {
            Promise.resolve().then(() => applyPreset(templateParam));
            return;
        }
        if (fromParam === "offer" || fromParam === "delivery") {
            try {
                const raw = sessionStorage.getItem("rechly_doc_to_invoice");
                if (raw) {
                    const parsed = JSON.parse(raw);
                    Promise.resolve().then(() => {
                        if (parsed.sellerName) setSellerName(parsed.sellerName);
                        if (parsed.sellerStreet) setSellerStreet(parsed.sellerStreet);
                        if (parsed.sellerZipCity) setSellerZipCity(parsed.sellerZipCity);
                        if (parsed.sellerTaxId) setSellerTaxId(parsed.sellerTaxId);
                        if (parsed.sellerIban) setSellerIban(parsed.sellerIban);
                        if (parsed.buyerName) setBuyerName(parsed.buyerName);
                        if (parsed.buyerStreet) setBuyerStreet(parsed.buyerStreet);
                        if (parsed.buyerZipCity) setBuyerZipCity(parsed.buyerZipCity);
                        if (parsed.taxMode) setTaxMode(parsed.taxMode);
                        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
                            setItems(
                                parsed.items.map((it: VorlagePresetItem, i: number) => ({
                                    ...it,
                                    id: `${Date.now()}-${i}`,
                                })),
                            );
                        }
                    });
                }
            } catch {
                // ignore storage errors
            }
        }
    }, [templateParam, fromParam]);

    const totals = useMemo(() => {
        let netTotal = 0;
        let vat19 = 0;
        let vat7 = 0;
        let laborNet = 0;
        let laborGross = 0;

        for (const item of items) {
            const lineNet = item.quantity * item.unitPrice;
            netTotal += lineNet;
            const effectiveRate = taxMode === "standard" ? item.taxRate : 0;
            const lineVat = lineNet * (effectiveRate / 100);
            if (effectiveRate === 19) vat19 += lineVat;
            if (effectiveRate === 7) vat7 += lineVat;

            if (item.isLabor35a) {
                laborNet += lineNet;
                laborGross += lineNet + lineVat;
            }
        }

        const totalVat = vat19 + vat7;
        const grossTotal = netTotal + totalVat;

        return {
            netTotal,
            vat19,
            vat7,
            totalVat,
            grossTotal,
            laborNet,
            laborGross,
        };
    }, [items, taxMode]);

    // Compliance Check (§ 14 UStG)
    const complianceChecks = useMemo(() => {
        const checks = [
            {
                label: "Vollständiger Name & Anschrift des Leistenden",
                ok: Boolean(sellerName.trim() && sellerStreet.trim() && sellerZipCity.trim()),
            },
            {
                label: "Vollständiger Name & Anschrift des Empfängers",
                ok: Boolean(buyerName.trim() && buyerStreet.trim() && buyerZipCity.trim()),
            },
            {
                label: "Steuernummer oder USt-IdNr.",
                ok: Boolean(sellerTaxId.trim()),
            },
            {
                label: "Ausstellungsdatum & fortlaufende Rechnungsnummer",
                ok: Boolean(issueDate && invoiceNumber.trim()),
            },
            {
                label: "Leistungszeitpunkt / Lieferdatum",
                ok: Boolean(deliveryDate.trim()),
            },
            {
                label: "Bezeichnung, Menge & Entgelt der Leistungen",
                ok: items.length > 0 && items.every((i) => i.description.trim() !== ""),
            },
            {
                label: "Elektronische Adresse & Kontakt (BT-34 / PEPPOL-EN16931-R020)",
                ok: Boolean(sellerEmail.trim() && sellerEmail.includes("@")),
            },
            {
                label:
                    taxMode === "reverse_charge"
                        ? "USt-IdNr. des Leistungsempfängers (§ 13b UStG)"
                        : "Steuersatz bzw. Steuerbefreiungshinweis",
                ok:
                    taxMode === "reverse_charge"
                        ? Boolean(buyerVatId.trim())
                        : true,
            },
        ];
        return checks;
    }, [
        sellerName,
        sellerStreet,
        sellerZipCity,
        sellerEmail,
        buyerName,
        buyerStreet,
        buyerZipCity,
        sellerTaxId,
        issueDate,
        invoiceNumber,
        deliveryDate,
        items,
        taxMode,
        buyerVatId,
    ]);

    const allChecksPassed = complianceChecks.every((c) => c.ok);

    // GiroCode EPC QR Code generation
    const giroPayload = useMemo(() => {
        if (!showGiroCode || totals.grossTotal <= 0) return null;
        return buildGirocodePayload({
            name: sellerName,
            iban: sellerIban,
            bic: sellerBic,
            amount: totals.grossTotal,
            reference: `${invoiceNumber} ${buyerName}`.trim(),
        });
    }, [showGiroCode, sellerName, sellerIban, sellerBic, totals.grossTotal, invoiceNumber, buyerName]);

    const [qrDataUrl, setQrDataUrl] = useState<string>("");

    useEffect(() => {
        let active = true;
        if (!giroPayload) {
            Promise.resolve().then(() => {
                if (active) setQrDataUrl("");
            });
            return () => {
                active = false;
            };
        }
        QRCode.toDataURL(giroPayload, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 140,
            color: { dark: "#0f172a", light: "#ffffff" },
        })
            .then((url) => {
                if (active) setQrDataUrl(url);
            })
            .catch(() => {
                if (active) setQrDataUrl("");
            });
        return () => {
            active = false;
        };
    }, [giroPayload]);

    const addItem = () => {
        setItems((prev) => [
            ...prev,
            {
                id: `${Date.now()}`,
                description: "Weitere Leistungsposition",
                quantity: 1,
                unit: "Psch.",
                unitPrice: 100,
                taxRate: taxMode === "standard" ? 19 : 0,
                isLabor35a: false,
            },
        ]);
    };

    const updateItem = (id: string, patch: Partial<LineItem>) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        );
    };

    const removeItem = (id: string) => {
        if (items.length <= 1) return;
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const handleDownloadXRechnung = () => {
        const issueCompact = issueDate.replace(/-/g, "");
        const dueCompact = dueDate.replace(/-/g, "");
        const [sellerZip = "", ...sellerCityParts] = sellerZipCity.trim().split(" ");
        const sellerCity = sellerCityParts.join(" ") || sellerZipCity;
        const [buyerZip = "", ...buyerCityParts] = buyerZipCity.trim().split(" ");
        const buyerCity = buyerCityParts.join(" ") || buyerZipCity;

        const lineItemsXml = items
            .map((item, idx) => {
                const lineNet = item.quantity * item.unitPrice;
                const rate = taxMode === "standard" ? item.taxRate : 0;
                const catCode =
                    taxMode === "reverse_charge"
                        ? "AE"
                        : rate === 0
                          ? "E"
                          : "S";
                return `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${idx + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escapeXml(item.description)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${item.unitPrice.toFixed(4)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${item.quantity}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${catCode}</ram:CategoryCode>
          <ram:RateApplicablePercent>${rate}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${lineNet.toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
            })
            .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(invoiceNumber)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${escapeXml(issueCompact)}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    ${lineItemsXml}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>${escapeXml(leitwegId || "XRECHNUNG")}</ram:BuyerReference>
      <ram:SellerTradeParty>
        <ram:Name>${escapeXml(sellerName)}</ram:Name>
        <ram:DefinedTradeContact>
          <ram:PersonName>${escapeXml(sellerName)}</ram:PersonName>
          ${sellerPhone ? `<ram:TelephoneUniversalCommunication><ram:CompleteNumber>${escapeXml(sellerPhone)}</ram:CompleteNumber></ram:TelephoneUniversalCommunication>` : ""}
          ${sellerEmail ? `<ram:EmailURIUniversalCommunication><ram:URIID>${escapeXml(sellerEmail)}</ram:URIID></ram:EmailURIUniversalCommunication>` : ""}
        </ram:DefinedTradeContact>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(sellerZip)}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(sellerStreet)}</ram:LineOne>
          <ram:CityName>${escapeXml(sellerCity)}</ram:CityName>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
        ${sellerEmail ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${escapeXml(sellerEmail)}</ram:URIID></ram:URIUniversalCommunication>` : ""}
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="${sellerTaxId.startsWith("DE") ? "VA" : "FC"}">${escapeXml(sellerTaxId)}</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${escapeXml(buyerName)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(buyerZip)}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(buyerStreet)}</ram:LineOne>
          <ram:CityName>${escapeXml(buyerCity)}</ram:CityName>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
        ${buyerEmail ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${escapeXml(buyerEmail)}</ram:URIID></ram:URIUniversalCommunication>` : (leitwegId ? `<ram:URIUniversalCommunication><ram:URIID schemeID="0204">${escapeXml(leitwegId)}</ram:URIID></ram:URIUniversalCommunication>` : "")}
        ${buyerVatId ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${escapeXml(buyerVatId)}</ram:ID></ram:SpecifiedTaxRegistration>` : ""}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery />
    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${escapeXml(invoiceNumber)}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      ${dueCompact ? `<ram:SpecifiedTradePaymentTerms><ram:DueDateDateTime><udt:DateTimeString format="102">${escapeXml(dueCompact)}</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradePaymentTerms>` : ""}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${totals.netTotal.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${totals.netTotal.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${totals.totalVat.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${totals.grossTotal.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${totals.grossTotal.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

        const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${invoiceNumber || "XRechnung"}.xml`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const taxLawNotice = useMemo(() => {
        if (taxMode === "kleinunternehmer") {
            return "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).";
        }
        if (taxMode === "reverse_charge") {
            return "Steuerschuldnerschaft des Leistungsempfängers gemäß § 13b UStG (Reverse-Charge-Verfahren).";
        }
        if (taxMode === "tax_exempt_4") {
            return "Umsatzsteuerfreie Leistung gemäß § 4 UStG.";
        }
        return "";
    }, [taxMode]);

    return (
        <div className="space-y-8">
            {/* Preset Selector Bar */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                            Branchen-Vorlage laden (14 Muster)
                        </p>
                        <p className="text-sm text-slate-600">
                            Wählen Sie eine Branche – Positionen und Pflichthinweise (§ 19, § 13b, § 35a) passen sich sofort an.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <select
                        value={selectedTemplate}
                        onChange={(e) => applyPreset(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {VORLAGEN_CATALOG.map((v) => (
                            <option key={v.slug} value={v.slug}>
                                {v.category}: {v.shortTitle}
                            </option>
                        ))}
                    </select>
                    <Link
                        href="/vorlagen"
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    >
                        Alle Vorlagen ansehen →
                    </Link>
                </div>
            </div>

            {/* Editor Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
                {/* Left Column: Form Controls */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Tax Mode & Document Options */}
                    <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-600" />
                                1. Besteuerungsart & Dokumenttyp
                            </h3>
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                                DIN 5008 & § 14 UStG
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Steuer-Modus
                                </label>
                                <select
                                    value={taxMode}
                                    onChange={(e) => setTaxMode(e.target.value as TaxMode)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="standard">Regelbesteuerung (19% / 7% MwSt.)</option>
                                    <option value="kleinunternehmer">Kleinunternehmer (§ 19 UStG – 0% USt.)</option>
                                    <option value="reverse_charge">Reverse Charge (§ 13b UStG Bau / EU)</option>
                                    <option value="tax_exempt_4">Steuerfreie Leistung (§ 4 UStG Heilberuf/Dozent)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Dokumententitel
                                </label>
                                <input
                                    type="text"
                                    value={invoiceTitle}
                                    onChange={(e) => setInvoiceTitle(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-1">
                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showGiroCode}
                                    onChange={(e) => setShowGiroCode(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                SEPA GiroCode QR-Code auf Rechnung einbetten
                            </label>
                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showLabor35a}
                                    onChange={(e) => setShowLabor35a(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                § 35a EStG Handwerker-Lohnanteil separat ausweisen
                            </label>
                        </div>
                    </div>

                    {/* Seller & Buyer */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <Building2 className="w-4 h-4 text-indigo-600" />
                                2. Absender (Ihr Unternehmen)
                            </h3>
                            <input
                                type="text"
                                placeholder="Firmenname / Vor- & Nachname"
                                value={sellerName}
                                onChange={(e) => setSellerName(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                            <input
                                type="text"
                                placeholder="Straße & Hausnummer"
                                value={sellerStreet}
                                onChange={(e) => setSellerStreet(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                            <input
                                type="text"
                                placeholder="PLZ & Ort"
                                value={sellerZipCity}
                                onChange={(e) => setSellerZipCity(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                            <input
                                type="text"
                                placeholder="Steuernummer oder USt-IdNr."
                                value={sellerTaxId}
                                onChange={(e) => setSellerTaxId(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                            <input
                                type="text"
                                placeholder="IBAN (für Überweisung & QR)"
                                value={sellerIban}
                                onChange={(e) => setSellerIban(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    placeholder="BIC"
                                    value={sellerBic}
                                    onChange={(e) => setSellerBic(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                                />
                                <input
                                    type="text"
                                    placeholder="Bankname"
                                    value={sellerBank}
                                    onChange={(e) => setSellerBank(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    placeholder="E-Mail"
                                    value={sellerEmail}
                                    onChange={(e) => setSellerEmail(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                                />
                                <input
                                    type="text"
                                    placeholder="Telefon"
                                    value={sellerPhone}
                                    onChange={(e) => setSellerPhone(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                                />
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <User className="w-4 h-4 text-indigo-600" />
                                3. Rechnungsempfänger (Kunde)
                            </h3>
                            <input
                                type="text"
                                placeholder="Kundenname / Firma"
                                value={buyerName}
                                onChange={(e) => setBuyerName(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                            <input
                                type="text"
                                placeholder="Straße & Hausnummer"
                                value={buyerStreet}
                                onChange={(e) => setBuyerStreet(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                            <input
                                type="text"
                                placeholder="PLZ & Ort"
                                value={buyerZipCity}
                                onChange={(e) => setBuyerZipCity(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                            <input
                                type="email"
                                placeholder="E-Mail des Kunden (für XRechnung BT-49)"
                                value={buyerEmail}
                                onChange={(e) => setBuyerEmail(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                            <input
                                type="text"
                                placeholder="Kunden USt-IdNr. (Pflicht bei § 13b)"
                                value={buyerVatId}
                                onChange={(e) => setBuyerVatId(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            />
                            <div className="pt-1 border-t border-slate-100 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-500">
                                            Rechnungs-Nr.
                                        </label>
                                        <input
                                            type="text"
                                            value={invoiceNumber}
                                            onChange={(e) => setInvoiceNumber(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-500">
                                            Rechnungsdatum
                                        </label>
                                        <input
                                            type="date"
                                            value={issueDate}
                                            onChange={(e) => setIssueDate(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-500">
                                            Leistungszeitraum
                                        </label>
                                        <input
                                            type="text"
                                            value={deliveryDate}
                                            onChange={(e) => setDeliveryDate(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-500">
                                            Fällig am
                                        </label>
                                        <input
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500">
                                        Leitweg-ID (optional für Behörden / XRechnung)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="z.B. 991-12345-03"
                                        value={leitwegId}
                                        onChange={(e) => setLeitwegId(e.target.value)}
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                                4. Rechnungspositionen
                            </h3>
                            <button
                                type="button"
                                onClick={addItem}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Position hinzufügen
                            </button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <div
                                    key={item.id}
                                    className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/70 space-y-2.5"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-bold text-slate-500">
                                            Pos. {idx + 1}
                                        </span>
                                        {showLabor35a && (
                                            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(item.isLabor35a)}
                                                    onChange={(e) =>
                                                        updateItem(item.id, {
                                                            isLabor35a: e.target.checked,
                                                        })
                                                    }
                                                    className="rounded border-slate-300 text-indigo-600"
                                                />
                                                Arbeits-/Fahrtkosten (§ 35a EStG)
                                            </label>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
                                            disabled={items.length <= 1}
                                            className="text-slate-400 hover:text-rose-600 disabled:opacity-30"
                                            title="Position löschen"
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
                                        placeholder="Leistungsbeschreibung..."
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                                    />
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500">
                                                Menge
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    updateItem(item.id, {
                                                        quantity: parseFloat(e.target.value) || 0,
                                                    })
                                                }
                                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500">
                                                Einheit
                                            </label>
                                            <input
                                                type="text"
                                                value={item.unit}
                                                onChange={(e) =>
                                                    updateItem(item.id, { unit: e.target.value })
                                                }
                                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500">
                                                Einzelpreis (Netto €)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={item.unitPrice}
                                                onChange={(e) =>
                                                    updateItem(item.id, {
                                                        unitPrice: parseFloat(e.target.value) || 0,
                                                    })
                                                }
                                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500">
                                                MwSt.-Satz
                                            </label>
                                            <select
                                                disabled={taxMode !== "standard"}
                                                value={taxMode === "standard" ? item.taxRate : 0}
                                                onChange={(e) =>
                                                    updateItem(item.id, {
                                                        taxRate: Number(e.target.value) as 0 | 7 | 19,
                                                    })
                                                }
                                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs disabled:bg-slate-100"
                                            >
                                                <option value={19}>19 %</option>
                                                <option value={7}>7 %</option>
                                                <option value={0}>0 %</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Einleitungstext
                                </label>
                                <textarea
                                    rows={2}
                                    value={introText}
                                    onChange={(e) => setIntroText(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Zahlungsbedingungen / Fußtext
                                </label>
                                <textarea
                                    rows={2}
                                    value={footerText}
                                    onChange={(e) => setFooterText(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Compliance & Actions */}
                <div className="lg:col-span-5 space-y-5">
                    <div className="p-5 rounded-2xl border border-slate-200 bg-slate-900 text-white space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                                Live-Summen & Export
                            </span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200">
                                100 % kostenlos
                            </span>
                        </div>
                        <div className="space-y-1.5 text-sm border-b border-white/10 pb-3">
                            <div className="flex justify-between text-slate-300">
                                <span>Nettobetrag:</span>
                                <span className="font-mono">{formatEUR(totals.netTotal)}</span>
                            </div>
                            {taxMode === "standard" && totals.vat19 > 0 && (
                                <div className="flex justify-between text-slate-300">
                                    <span>zzgl. 19 % USt.:</span>
                                    <span className="font-mono">{formatEUR(totals.vat19)}</span>
                                </div>
                            )}
                            {taxMode === "standard" && totals.vat7 > 0 && (
                                <div className="flex justify-between text-slate-300">
                                    <span>zzgl. 7 % USt.:</span>
                                    <span className="font-mono">{formatEUR(totals.vat7)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-extrabold text-white pt-1">
                                <span>Rechnungsbetrag:</span>
                                <span className="font-mono text-emerald-400">
                                    {formatEUR(totals.grossTotal)}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm transition-colors cursor-pointer"
                            >
                                <Printer className="w-4 h-4" />
                                Als PDF drucken / speichern
                            </button>
                            <button
                                type="button"
                                onClick={handleDownloadXRechnung}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors cursor-pointer"
                            >
                                <FileCode2 className="w-4 h-4 text-indigo-300" />
                                XRechnung 3.0 XML
                            </button>
                        </div>
                    </div>

                    {/* § 14 UStG Live Check */}
                    <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                § 14 UStG Pflichtangaben-Prüfung
                            </h3>
                            <span
                                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                    allChecksPassed
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-amber-50 text-amber-700"
                                }`}
                            >
                                {allChecksPassed ? "Vollständig" : "Angaben prüfen"}
                            </span>
                        </div>
                        <ul className="space-y-2 text-xs">
                            {complianceChecks.map((c) => (
                                <li key={c.label} className="flex items-start gap-2">
                                    {c.ok ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                    )}
                                    <span className={c.ok ? "text-slate-700" : "text-amber-800 font-semibold"}>
                                        {c.label}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Reset helper */}
                    <button
                        type="button"
                        onClick={() => applyPreset(selectedTemplate)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Musterdaten der Vorlage zurücksetzen
                    </button>
                </div>
            </div>

            {/* Printable DIN 5008 Invoice Sheet */}
            <div className="bg-white border border-slate-300 shadow-lg rounded-2xl p-4 sm:p-8 md:p-12 max-w-4xl mx-auto print:shadow-none print:border-none print:p-0 print:max-w-none text-slate-900">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-6">
                    <div>
                        <p className="text-xl font-extrabold tracking-tight text-slate-900">
                            {sellerName}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            {sellerStreet} · {sellerZipCity}
                        </p>
                    </div>
                    <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5">
                        <p className="font-semibold text-slate-900">{sellerName}</p>
                        <p>{sellerStreet}</p>
                        <p>{sellerZipCity}</p>
                        {sellerEmail && <p>{sellerEmail}</p>}
                        {sellerPhone && <p>{sellerPhone}</p>}
                        {sellerTaxId && <p className="font-medium mt-1">St.-Nr. / USt-IdNr.: {sellerTaxId}</p>}
                    </div>
                </div>

                {/* Recipient & Meta Block (DIN 5008 Form B style) */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 py-8">
                    <div className="sm:col-span-7 space-y-1">
                        <p className="text-[10px] underline text-slate-400 mb-2">
                            {sellerName} · {sellerStreet} · {sellerZipCity}
                        </p>
                        <p className="text-sm font-bold text-slate-900">{buyerName}</p>
                        <p className="text-sm text-slate-700">{buyerStreet}</p>
                        <p className="text-sm text-slate-700">{buyerZipCity}</p>
                        {buyerVatId && (
                            <p className="text-xs text-slate-500 pt-1">
                                USt-IdNr. Empfänger: {buyerVatId}
                            </p>
                        )}
                    </div>
                    <div className="sm:col-span-5 bg-slate-50 rounded-xl p-4 text-xs space-y-1.5 border border-slate-200/70">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Rechnungsnummer:</span>
                            <span className="font-bold text-slate-900">{invoiceNumber}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Rechnungsdatum:</span>
                            <span className="font-medium">{formatDateDE(issueDate)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Leistungszeitraum:</span>
                            <span className="font-medium text-right">{deliveryDate}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Zahlungsziel:</span>
                            <span className="font-medium">{formatDateDE(dueDate)}</span>
                        </div>
                        {leitwegId && (
                            <div className="flex justify-between">
                                <span className="text-slate-500">Leitweg-ID:</span>
                                <span className="font-mono font-semibold">{leitwegId}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Title & Intro */}
                <div className="space-y-2 mb-6">
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        {invoiceTitle} Nr. {invoiceNumber}
                    </h2>
                    {introText && (
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            {introText}
                        </p>
                    )}
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-900 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                <th className="py-2.5 pr-2 w-10">Pos.</th>
                                <th className="py-2.5 px-2">Bezeichnung</th>
                                <th className="py-2.5 px-2 text-right w-24">Menge</th>
                                <th className="py-2.5 px-2 text-right w-28">Einzelpreis</th>
                                {taxMode === "standard" && (
                                    <th className="py-2.5 px-2 text-right w-16">USt.</th>
                                )}
                                <th className="py-2.5 pl-2 text-right w-28">Gesamt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                            {items.map((item, idx) => {
                                const lineTotal = item.quantity * item.unitPrice;
                                return (
                                    <tr key={item.id}>
                                        <td className="py-3 pr-2 text-slate-500 font-medium align-top">
                                            {idx + 1}
                                        </td>
                                        <td className="py-3 px-2 align-top">
                                            <p className="font-medium text-slate-900">
                                                {item.description}
                                            </p>
                                            {showLabor35a && item.isLabor35a && (
                                                <span className="inline-block text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded mt-1">
                                                    Begünstigte Arbeits-/Fahrtkosten gem. § 35a EStG
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-2 text-right align-top whitespace-nowrap">
                                            {item.quantity} {item.unit}
                                        </td>
                                        <td className="py-3 px-2 text-right font-mono align-top whitespace-nowrap">
                                            {formatEUR(item.unitPrice)}
                                        </td>
                                        {taxMode === "standard" && (
                                            <td className="py-3 px-2 text-right align-top whitespace-nowrap">
                                                {item.taxRate} %
                                            </td>
                                        )}
                                        <td className="py-3 pl-2 text-right font-mono font-semibold text-slate-900 align-top whitespace-nowrap">
                                            {formatEUR(lineTotal)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Totals Block */}
                <div className="mt-6 flex flex-col sm:flex-row justify-between items-start gap-6 border-t-2 border-slate-900 pt-5">
                    <div className="space-y-2 max-w-md text-xs text-slate-600">
                        {taxLawNotice && (
                            <p className="font-semibold text-slate-900 bg-slate-100 px-3 py-2 rounded-lg">
                                {taxLawNotice}
                            </p>
                        )}
                        {showLabor35a && totals.laborGross > 0 && (
                            <p className="text-indigo-950 bg-indigo-50/80 border border-indigo-200 px-3 py-2 rounded-lg">
                                <strong>Bescheinigung gemäß § 35a EStG:</strong> Im Rechnungsbetrag sind{" "}
                                <strong>{formatEUR(totals.laborNet)} Netto</strong> ({formatEUR(totals.laborGross)} Brutto) an begünstigten Arbeits- und Fahrtkosten enthalten.
                            </p>
                        )}
                        {footerText && <p className="leading-relaxed">{footerText}</p>}
                    </div>

                    <div className="w-full sm:w-72 space-y-1.5 text-sm">
                        <div className="flex justify-between text-slate-600">
                            <span>Summe Netto:</span>
                            <span className="font-mono">{formatEUR(totals.netTotal)}</span>
                        </div>
                        {taxMode === "standard" && totals.vat19 > 0 && (
                            <div className="flex justify-between text-slate-600">
                                <span>zzgl. 19 % USt.:</span>
                                <span className="font-mono">{formatEUR(totals.vat19)}</span>
                            </div>
                        )}
                        {taxMode === "standard" && totals.vat7 > 0 && (
                            <div className="flex justify-between text-slate-600">
                                <span>zzgl. 7 % USt.:</span>
                                <span className="font-mono">{formatEUR(totals.vat7)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-300 pt-2">
                            <span>Gesamtbetrag:</span>
                            <span className="font-mono">{formatEUR(totals.grossTotal)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer with Bank Details & GiroCode QR */}
                <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="text-xs text-slate-600 space-y-1">
                        <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                            Bankverbindung für SEPA-Überweisung
                        </p>
                        <p>
                            Kontoinhaber: <strong>{sellerName}</strong>
                        </p>
                        <p className="font-mono">
                            IBAN: <strong>{sellerIban}</strong> {sellerBic && `· BIC: ${sellerBic}`}
                        </p>
                        {sellerBank && <p>Bank: {sellerBank}</p>}
                        <p>
                            Verwendungszweck: <strong>{invoiceNumber}</strong>
                        </p>
                    </div>

                    {showGiroCode && qrDataUrl && (
                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={qrDataUrl}
                                alt="SEPA GiroCode QR-Code"
                                className="w-20 h-20 rounded bg-white p-1 border border-slate-200"
                            />
                            <div className="text-[11px] text-slate-600 max-w-[140px]">
                                <p className="font-bold text-slate-900 flex items-center gap-1">
                                    <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                                    GiroCode
                                </p>
                                <p className="leading-snug mt-0.5">
                                    Mit Banking-App scannen & direkt überweisen.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function RechnungsGenerator() {
    return (
        <Suspense
            fallback={
                <div className="p-8 text-center text-sm text-slate-500">
                    Rechnungsgenerator wird geladen…
                </div>
            }
        >
            <RechnungsGeneratorInner />
        </Suspense>
    );
}
export default RechnungsGenerator;
