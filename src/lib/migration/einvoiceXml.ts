import { XMLParser } from "fast-xml-parser";
import type {
    MigrationEntityType,
    NormalizedMigrationClient,
    NormalizedMigrationInvoiceItem,
} from "./types";
import { normalizeCountry, parseFlexibleDate, parseFlexibleNumber, addDaysToIsoDate, normalizeTaxRate, normalizeUnitOfMeasure } from "./parseUtils";

function xmlStr(val: unknown): string {
    if (val === null || val === undefined) return "";
    if (typeof val === "string" || typeof val === "number") return String(val).trim();
    if (typeof val === "object" && "#text" in (val as Record<string, unknown>)) {
        return String((val as Record<string, unknown>)["#text"] ?? "").trim();
    }
    return "";
}

function xmlArr(val: unknown): Record<string, unknown>[] {
    if (!val) return [];
    if (Array.isArray(val)) return val as Record<string, unknown>[];
    if (typeof val === "object") return [val as Record<string, unknown>];
    return [];
}

function asRec(val: unknown): Record<string, unknown> {
    if (val && typeof val === "object" && !Array.isArray(val)) {
        return val as Record<string, unknown>;
    }
    return {};
}

export interface ParsedMigrationEInvoice {
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    seller: NormalizedMigrationClient;
    buyer: NormalizedMigrationClient;
    subtotal: number;
    totalVat: number;
    totalGross: number;
    taxRatePercent: number;
    notes?: string;
    buyerReference?: string;
    items: NormalizedMigrationInvoiceItem[];
}

export function parseEInvoiceXmlForMigration(
    xmlContent: string,
): ParsedMigrationEInvoice | null {
    try {
        const parser = new XMLParser({
            ignoreAttributes: false,
            removeNSPrefix: true,
            parseTagValue: false,
        });
        const doc = parser.parse(xmlContent) as Record<string, unknown>;

        if (doc.CrossIndustryInvoice) {
            return parseCiiForMigration(asRec(doc.CrossIndustryInvoice));
        }
        if (doc.Invoice || doc.CreditNote) {
            return parseUblForMigration(asRec(doc.Invoice || doc.CreditNote));
        }
        return null;
    } catch {
        return null;
    }
}

function parseCiiParty(
    partyNode: Record<string, unknown>,
    leitwegId?: string,
): NormalizedMigrationClient {
    const name = xmlStr(partyNode.Name) || "Unbekannt";
    const contact = asRec(partyNode.DefinedTradeContact);
    const contactPerson = xmlStr(contact.PersonName) || undefined;
    const contactEmail =
        xmlStr(asRec(contact.EmailURIUniversalCommunication).URIID) ||
        xmlStr(asRec(partyNode.URIUniversalCommunication).URIID) ||
        undefined;
    const contactPhone =
        xmlStr(asRec(contact.TelephoneUniversalCommunication).CompleteNumber) ||
        undefined;

    const addr = asRec(partyNode.PostalTradeAddress);
    const addressLine1 = xmlStr(addr.LineOne) || "—";
    const addressLine2 = xmlStr(addr.LineTwo) || undefined;
    const postalCode = xmlStr(addr.PostcodeCode) || "00000";
    const city = xmlStr(addr.CityName) || "Unbekannt";
    const country = normalizeCountry(xmlStr(addr.CountryID) || "DE");

    let vatId: string | undefined;
    let taxNumber: string | undefined;
    for (const reg of xmlArr(partyNode.SpecifiedTaxRegistration)) {
        const idNode = reg.ID;
        const scheme =
            typeof idNode === "object" && idNode !== null
                ? String((idNode as Record<string, unknown>)["@_schemeID"] ?? "")
                : "";
        const val = xmlStr(idNode);
        if (scheme === "VA" && val) vatId = val;
        if (scheme === "FC" && val) taxNumber = val;
    }

    return {
        name,
        contact_person: contactPerson,
        client_type: "company",
        address_line1: addressLine1,
        address_line2: addressLine2,
        postal_code: postalCode,
        city,
        country,
        email: contactEmail?.includes("@") ? contactEmail : undefined,
        phone: contactPhone,
        vat_id: vatId,
        tax_number: taxNumber,
        leitweg_id: leitwegId,
    };
}

function parseCiiForMigration(
    cii: Record<string, unknown>,
): ParsedMigrationEInvoice {
    const docHeader = asRec(cii.ExchangedDocument);
    const invoiceNumber = xmlStr(docHeader.ID) || `XR-${Date.now()}`;
    const issueDate = parseFlexibleDate(
        xmlStr(asRec(docHeader.IssueDateTime).DateTimeString),
    );

    const transaction = asRec(cii.SupplyChainTradeTransaction);
    const agreement = asRec(transaction.ApplicableHeaderTradeAgreement);
    const settlement = asRec(transaction.ApplicableHeaderTradeSettlement);

    const buyerReference = xmlStr(agreement.BuyerReference) || undefined;
    const seller = parseCiiParty(asRec(agreement.SellerTradeParty));
    const buyer = parseCiiParty(asRec(agreement.BuyerTradeParty), buyerReference);

    const paymentTerms = asRec(settlement.SpecifiedTradePaymentTerms);
    const dueDate = parseFlexibleDate(
        xmlStr(asRec(paymentTerms.DueDateDateTime).DateTimeString),
        addDaysToIsoDate(issueDate, 14),
    );

    const monetary = asRec(
        settlement.SpecifiedTradeSettlementHeaderMonetarySummation,
    );
    const subtotal = parseFlexibleNumber(
        xmlStr(monetary.TaxBasisTotalAmount) || xmlStr(monetary.LineTotalAmount),
    );
    const totalVat = parseFlexibleNumber(xmlStr(monetary.TaxTotalAmount));
    const totalGross = parseFlexibleNumber(
        xmlStr(monetary.GrandTotalAmount) || xmlStr(monetary.DuePayableAmount),
    );

    const taxNodes = xmlArr(settlement.ApplicableTradeTax);
    const headerTaxRate =
        taxNodes.length > 0
            ? normalizeTaxRate(xmlStr(taxNodes[0].RateApplicablePercent), 19)
            : 19;

    const rawLines = xmlArr(transaction.IncludedSupplyChainTradeLineItem);
    const items: NormalizedMigrationInvoiceItem[] = rawLines.map((line) => {
        const prod = asRec(line.SpecifiedTradeProduct);
        const lineAgree = asRec(line.SpecifiedLineTradeAgreement);
        const lineDeliv = asRec(line.SpecifiedLineTradeDelivery);
        const lineSettle = asRec(line.SpecifiedLineTradeSettlement);

        const desc =
            [xmlStr(prod.Name), xmlStr(prod.Description)]
                .filter(Boolean)
                .join(" – ") || "Position";
        const billedQtyNode = lineDeliv.BilledQuantity;
        const quantity =
            parseFlexibleNumber(xmlStr(billedQtyNode)) || 1;
        const unitCode =
            typeof billedQtyNode === "object" && billedQtyNode !== null
                ? String((billedQtyNode as Record<string, unknown>)["@_unitCode"] ?? "")
                : "";
        const price = parseFlexibleNumber(
            xmlStr(asRec(lineAgree.NetPriceProductTradePrice).ChargeAmount),
        );
        const lineTaxes = xmlArr(lineSettle.ApplicableTradeTax);
        const lineTaxRate =
            lineTaxes.length > 0
                ? normalizeTaxRate(xmlStr(lineTaxes[0].RateApplicablePercent), headerTaxRate)
                : headerTaxRate;

        return {
            description: desc,
            quantity,
            unit_of_measure: normalizeUnitOfMeasure(unitCode),
            price,
            tax_rate_percent: lineTaxRate,
        };
    });

    if (items.length === 0) {
        items.push({
            description: `Rechnung ${invoiceNumber}`,
            quantity: 1,
            unit_of_measure: "Pauschale",
            price: subtotal,
            tax_rate_percent: headerTaxRate,
        });
    }

    return {
        invoiceNumber,
        issueDate,
        dueDate,
        seller,
        buyer,
        subtotal,
        totalVat,
        totalGross: totalGross || Math.round((subtotal + totalVat) * 100) / 100,
        taxRatePercent: headerTaxRate,
        buyerReference,
        items,
    };
}

function parseUblParty(
    partyWrapper: Record<string, unknown>,
    leitwegId?: string,
): NormalizedMigrationClient {
    const party = asRec(partyWrapper.Party || partyWrapper);
    const partyNames = xmlArr(party.PartyName);
    const legalEntities = xmlArr(party.PartyLegalEntity);

    const name =
        (legalEntities[0] ? xmlStr(legalEntities[0].RegistrationName) : "") ||
        (partyNames[0] ? xmlStr(partyNames[0].Name) : "") ||
        "Unbekannt";

    const contact = asRec(party.Contact);
    const contactPerson = xmlStr(contact.Name) || undefined;
    const contactEmail =
        xmlStr(contact.ElectronicMail) ||
        xmlStr(party.EndpointID) ||
        undefined;
    const contactPhone = xmlStr(contact.Telephone) || undefined;

    const addr = asRec(party.PostalAddress);
    const addressLine1 = xmlStr(addr.StreetName) || "—";
    const addressLine2 = xmlStr(addr.AdditionalStreetName) || undefined;
    const postalCode = xmlStr(addr.PostalZone) || "00000";
    const city = xmlStr(addr.CityName) || "Unbekannt";
    const country = normalizeCountry(
        xmlStr(asRec(addr.Country).IdentificationCode) || "DE",
    );

    const taxSchemes = xmlArr(party.PartyTaxScheme);
    let vatId: string | undefined;
    for (const ts of taxSchemes) {
        const cid = xmlStr(ts.CompanyID);
        if (cid && /^[A-Z]{2}/i.test(cid)) {
            vatId = cid;
        }
    }

    return {
        name,
        contact_person: contactPerson,
        client_type: "company",
        address_line1: addressLine1,
        address_line2: addressLine2,
        postal_code: postalCode,
        city,
        country,
        email: contactEmail?.includes("@") ? contactEmail : undefined,
        phone: contactPhone,
        vat_id: vatId,
        leitweg_id: leitwegId,
    };
}

function parseUblForMigration(
    inv: Record<string, unknown>,
): ParsedMigrationEInvoice {
    const invoiceNumber = xmlStr(inv.ID) || `XR-${Date.now()}`;
    const issueDate = parseFlexibleDate(xmlStr(inv.IssueDate));
    const dueDate = parseFlexibleDate(
        xmlStr(inv.DueDate),
        addDaysToIsoDate(issueDate, 14),
    );
    const buyerReference = xmlStr(inv.BuyerReference) || undefined;

    const seller = parseUblParty(asRec(inv.AccountingSupplierParty));
    const buyer = parseUblParty(
        asRec(inv.AccountingCustomerParty),
        buyerReference,
    );

    const monetary = asRec(inv.LegalMonetaryTotal);
    const subtotal = parseFlexibleNumber(
        xmlStr(monetary.TaxExclusiveAmount) || xmlStr(monetary.LineExtensionAmount),
    );
    const taxTotal = asRec(
        Array.isArray(inv.TaxTotal) ? inv.TaxTotal[0] : inv.TaxTotal,
    );
    const totalVat = parseFlexibleNumber(xmlStr(taxTotal.TaxAmount));
    const totalGross = parseFlexibleNumber(
        xmlStr(monetary.TaxInclusiveAmount) || xmlStr(monetary.PayableAmount),
    );

    const taxSubtotals = xmlArr(taxTotal.TaxSubtotal);
    const headerTaxRate =
        taxSubtotals.length > 0
            ? normalizeTaxRate(
                  xmlStr(asRec(taxSubtotals[0].TaxCategory).Percent),
                  19,
              )
            : 19;

    const rawLines = xmlArr(inv.InvoiceLine || inv.CreditNoteLine);
    const items: NormalizedMigrationInvoiceItem[] = rawLines.map((line) => {
        const itemNode = asRec(line.Item);
        const priceNode = asRec(line.Price);
        const qtyNode = line.InvoicedQuantity || line.CreditedQuantity;
        const quantity = parseFlexibleNumber(xmlStr(qtyNode)) || 1;
        const unitCode =
            typeof qtyNode === "object" && qtyNode !== null
                ? String((qtyNode as Record<string, unknown>)["@_unitCode"] ?? "")
                : "";
        const desc =
            [xmlStr(itemNode.Name), xmlStr(itemNode.Description)]
                .filter(Boolean)
                .join(" – ") || "Position";
        const price = parseFlexibleNumber(xmlStr(priceNode.PriceAmount));
        const lineTax = asRec(itemNode.ClassifiedTaxCategory);
        const taxRate = normalizeTaxRate(xmlStr(lineTax.Percent), headerTaxRate);

        return {
            description: desc,
            quantity,
            unit_of_measure: normalizeUnitOfMeasure(unitCode),
            price,
            tax_rate_percent: taxRate,
        };
    });

    if (items.length === 0) {
        items.push({
            description: `Rechnung ${invoiceNumber}`,
            quantity: 1,
            unit_of_measure: "Pauschale",
            price: subtotal,
            tax_rate_percent: headerTaxRate,
        });
    }

    return {
        invoiceNumber,
        issueDate,
        dueDate,
        seller,
        buyer,
        subtotal,
        totalVat,
        totalGross: totalGross || Math.round((subtotal + totalVat) * 100) / 100,
        taxRatePercent: headerTaxRate,
        buyerReference,
        items,
    };
}

/**
 * Generate clean sample CSV templates for users who want to prepare their own CSV.
 */
export function generateSampleCsvTemplate(
    entityType: Exclude<MigrationEntityType, "full_backup">,
): string {
    switch (entityType) {
        case "clients":
            return [
                "Firmenname;Ansprechpartner;Straße;PLZ;Ort;Land;E-Mail;Telefon;USt-IdNr.;Leitweg-ID",
                "Muster GmbH;Max Mustermann;Musterstraße 12;10115;Berlin;Deutschland;rechnung@muster.de;+49 30 123456;DE123456789;",
                "Design Studio Anna Schmidt;;Hauptstraße 5;80331;München;Deutschland;hallo@schmidt-design.de;;DE987654321;",
            ].join("\n");
        case "products":
            return [
                "Bezeichnung;Beschreibung;Preis (Netto);Steuersatz;Einheit",
                "Webentwicklung & Consulting;Konzeption und Umsetzung nach Aufwand;110,00;19;Stunde",
                "UI/UX Design Paket;Komplettes Screendesign inkl. Design-System;1850,00;19;Pauschale",
            ].join("\n");
        case "invoices":
            return [
                "Rechnungsnummer;Rechnungsdatum;Fälligkeitsdatum;Kunde;Kunden-E-Mail;Position;Nettobetrag;Steuerbetrag;Bruttobetrag;Steuersatz;Status",
                "RE-2026-001;15.01.2026;29.01.2026;Muster GmbH;rechnung@muster.de;Webentwicklung Januar;1000,00;190,00;1190,00;19;Bezahlt",
                "RE-2026-002;01.02.2026;15.02.2026;Design Studio Anna Schmidt;hallo@schmidt-design.de;UI/UX Workshop;500,00;95,00;595,00;19;Offen",
            ].join("\n");
        case "expenses":
            return [
                "Belegdatum;Lieferant;Beschreibung;Kategorie;Nettobetrag;Vorsteuer;Bruttobetrag;Steuersatz;Belegnummer",
                "10.01.2026;Hetzner Online GmbH;Cloud Server Hosting Januar;Software;25,00;4,75;29,75;19;H-2026-991",
                "18.01.2026;Deutsche Bahn AG;ICE Ticket Kundentermin Berlin;Reise;84,03;15,97;100,00;19;DB-8821",
            ].join("\n");
    }
}
