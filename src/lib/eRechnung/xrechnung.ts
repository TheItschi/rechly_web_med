import { parseEInvoiceData, parseGTIN, type PartyIdentifier } from "./identifiers";
/**
 * XRechnung 3.0 / EN 16931 XML generation (UN/CEFACT CII D16B)
 */

import type { InvoiceWithDetails, UserCompany } from "@/types";

export function escapeXml(str: string): string {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/** Rechly units → UN/ECE Recommendation 20 codes (BR-CL-23) */
const UNIT_CODES: Record<string, string> = {
    stück: "H87", piece: "H87", c62: "C62", h87: "H87",
    stunde: "HUR", stunden: "HUR", hour: "HUR", std: "HUR", hur: "HUR",
    tag: "DAY", tage: "DAY", day: "DAY",
    monat: "MON", monate: "MON", month: "MON",
    pauschal: "LS", pauschale: "LS", flat: "LS", ls: "LS",
    kg: "KGM", liter: "LTR", l: "LTR", "m²": "MTK", m2: "MTK", m: "MTR",
    pack: "PK", box: "BX",
};
export function unitCode(unit?: string): string {
    const key = (unit || "").trim().replace(/\.$/, "").toLowerCase();
    return UNIT_CODES[key] || "C62";
}

/** Country names → ISO 3166-1 alpha-2 (BR-CL-14) */
const COUNTRY_CODES: Record<string, string> = {
    deutschland: "DE", germany: "DE", schweiz: "CH", switzerland: "CH",
    österreich: "AT", austria: "AT", frankreich: "FR", france: "FR",
    luxemburg: "LU", luxembourg: "LU", niederlande: "NL", belgien: "BE",
    italien: "IT", spanien: "ES", polen: "PL", dänemark: "DK",
    "vereinigtes königreich": "GB", großbritannien: "GB", usa: "US",
};
export function countryCode(country?: string): string {
    const c = (country || "").trim();
    if (/^[A-Za-z]{2}$/.test(c)) return c.toUpperCase();
    return COUNTRY_CODES[c.toLowerCase()] || "DE";
}

/**
 * Validate whether the invoice + company data is ready for XRechnung export.
 * Returns array of error strings (empty = valid).
 */
export function validateXRechnung(
    invoice: InvoiceWithDetails,
    company: UserCompany,
): string[] {
    const errors: string[] = [];

    // Company checks
    if (!company.name) errors.push("Firmenname fehlt");
    if (!company.address_line1) errors.push("Firmenadresse fehlt");
    if (!company.postal_code) errors.push("Postleitzahl der Firma fehlt");
    if (!company.city) errors.push("Stadt der Firma fehlt");
    if (!company.vat_id && !company.tax_number) {
        errors.push("USt-IdNr. oder Steuernummer der Firma fehlt");
    }
    if (!company.phone) errors.push("Telefonnummer der Firma fehlt");
    if (!company.email) errors.push("E-Mail-Adresse der Firma fehlt");

    // Client checks
    if (!invoice.client) {
        errors.push("Kundendaten fehlen");
    } else {
        if (!invoice.client.name) errors.push("Kundenname fehlt");
        if (!invoice.client.address_line1) errors.push("Kundenadresse fehlt");
        if (!invoice.client.postal_code)
            errors.push("Postleitzahl des Kunden fehlt");
        if (!invoice.client.city) errors.push("Stadt des Kunden fehlt");
        if (!invoice.client.email) errors.push("E-Mail-Adresse des Kunden fehlt");
    }

    // Invoice checks
    if (!invoice.invoice_number) errors.push("Rechnungsnummer fehlt");
    if (!invoice.issue_date) errors.push("Rechnungsdatum fehlt");
    if (!invoice.items || invoice.items.length === 0)
        errors.push("Keine Positionen vorhanden");

    // Leitweg-ID for B2G (optional but recommended)
    // Format: digits-digits-2digits e.g. 991-12345-03
    if (invoice.client?.leitweg_id) {
        const leitwegPattern = /^\d+-\d+-\d{2}$/;
        if (!leitwegPattern.test(invoice.client.leitweg_id)) {
            errors.push(
                "Leitweg-ID hat ein ungültiges Format (erwartet: Z.B. 991-12345-03)",
            );
        }
    }

    try {
        parseEInvoiceData(invoice.e_invoice);
        for (const item of invoice.items || []) parseGTIN(item.gtin);
    } catch (error) { errors.push(error instanceof Error ? error.message : "Ungültige Kennung"); }
    return errors;
}

/**
 * Generate XRechnung 3.0 (CII / Cross Industry Invoice) XML string.
 */
export function generateXRechnungXML(
    invoice: InvoiceWithDetails,
    company: UserCompany,
    profile: "xrechnung" | "en16931" = "xrechnung",
): string {
    const invIdentifiers = parseEInvoiceData(invoice.e_invoice);
    const compIdentifiers = parseEInvoiceData(company.e_invoice);
    const identifiers = {
        ...compIdentifiers,
        ...invIdentifiers,
        seller_identifier:
            invIdentifiers.seller_identifier ||
            compIdentifiers.seller_identifier,
        buyer_identifier:
            invIdentifiers.buyer_identifier ||
            compIdentifiers.buyer_identifier,
        delivery: invIdentifiers.delivery || compIdentifiers.delivery,
    };
    const partyId = (id?: PartyIdentifier) => !id ? "" : id.scheme
        ? `<ram:GlobalID schemeID="${id.scheme}">${escapeXml(id.value)}</ram:GlobalID>`
        : `<ram:ID>${escapeXml(id.value)}</ram:ID>`;
    const delivery = identifiers.delivery;
    const client = invoice.client!;
    const sellerEmail = (company.email || "").trim();
    const sellerPhone = (company.phone || "").trim();
    const clientEmail = (client.email || "").trim();
    // Appwrite datetime attributes come back as timestamps
    // (2026-10-09T00:00:00.000+00:00); format 102 needs YYYYMMDD.
    const issueDate = invoice.issue_date.slice(0, 10).replace(/-/g, "");
    const dueDate = invoice.due_date?.slice(0, 10).replace(/-/g, "") ?? "";
    const deliveryDate =
        (invoice.delivery_date || invoice.issue_date).slice(0, 10).replace(/-/g, "");

    // BG-16: SEPA credit transfer (58) with the seller's bank account
    const iban = (company.bank_iban || "").replace(/\s+/g, "");
    const bic = (company.bank_bic || "").replace(/\s+/g, "");
    const paymentMeansXml = iban
        ? `<ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${escapeXml(iban)}</ram:IBANID>
          <ram:AccountName>${escapeXml(company.name)}</ram:AccountName>
        </ram:PayeePartyCreditorFinancialAccount>
        ${bic ? `<ram:PayeeSpecifiedCreditorFinancialInstitution><ram:BICID>${escapeXml(bic)}</ram:BICID></ram:PayeeSpecifiedCreditorFinancialInstitution>` : ""}
      </ram:SpecifiedTradeSettlementPaymentMeans>`
        : `<ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>1</ram:TypeCode></ram:SpecifiedTradeSettlementPaymentMeans>`;

    // BT-20/BT-9: payment terms and due date.
    // In CII this element must come after ApplicableTradeTax.
    const termsText = invoice.payment_terms || "";
    const paymentTermsXml =
        dueDate || termsText
            ? `<ram:SpecifiedTradePaymentTerms>${termsText ? `<ram:Description>${escapeXml(termsText)}</ram:Description>` : ""}${dueDate ? `<ram:DueDateDateTime><udt:DateTimeString format="102">${dueDate}</udt:DateTimeString></ram:DueDateDateTime>` : ""}</ram:SpecifiedTradePaymentTerms>`
            : "";

    const sellerVatId = company.vat_id || "";
    const sellerTaxNum = company.tax_number || "";

    // Build line items
    const lineItems = invoice.items
        .map((item, index) => {
            const lineNet =
                item.quantity *
                item.price *
                (1 - (item.discount_percent || 0) / 100);
            const vatRate = item.tax_rate_percent;
            const vatCode = vatRate === 0 ? "E" : "S";

            return `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${index + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        ${item.gtin ? `<ram:GlobalID schemeID="0160">${escapeXml(parseGTIN(item.gtin)!)}</ram:GlobalID>` : ""}
        <ram:Name>${escapeXml(item.description.split(/\r?\n/)[0])}</ram:Name>
        ${item.description.includes("\n") ? `<ram:Description>${escapeXml(item.description.split(/\r?\n/).slice(1).join("\n"))}</ram:Description>` : ""}
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${(item.price * (1 - (item.discount_percent || 0) / 100)).toFixed(4)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="${unitCode(item.unit_of_measure)}">${item.quantity}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${vatCode}</ram:CategoryCode>
          <ram:RateApplicablePercent>${vatRate}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${lineNet.toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
        })
        .join("\n");

    // Collect unique VAT rates for tax breakdown
    const vatBreakdown = new Map<number, { net: number; vat: number }>();
    for (const item of invoice.items) {
        const net =
            item.quantity *
            item.price *
            (1 - (item.discount_percent || 0) / 100);
        const vatAmt = (net * item.tax_rate_percent) / 100;
        const existing = vatBreakdown.get(item.tax_rate_percent) || {
            net: 0,
            vat: 0,
        };
        vatBreakdown.set(item.tax_rate_percent, {
            net: existing.net + net,
            vat: existing.vat + vatAmt,
        });
    }

    const taxEntries = Array.from(vatBreakdown.entries())
        .map(([rate, amounts]) => {
            const vatCode = rate === 0 ? "E" : "S";
            // BR-E-10: an exempt (E) breakdown needs an exemption reason
            const exemption =
                rate === 0
                    ? `<ram:ExemptionReason>${
                          company.is_small_business
                              ? "Kein Ausweis von Umsatzsteuer, da Kleinunternehmer gemäß § 19 UStG"
                              : "Steuerbefreite Leistung"
                      }</ram:ExemptionReason>`
                    : "";
            return `
    <ram:ApplicableTradeTax>
      <ram:CalculatedAmount>${amounts.vat.toFixed(2)}</ram:CalculatedAmount>
      <ram:TypeCode>VAT</ram:TypeCode>
      ${exemption}
      <ram:BasisAmount>${amounts.net.toFixed(2)}</ram:BasisAmount>
      <ram:CategoryCode>${vatCode}</ram:CategoryCode>
      <ram:RateApplicablePercent>${rate}</ram:RateApplicablePercent>
    </ram:ApplicableTradeTax>`;
        })
        .join("\n");

    const buyerReference = client.leitweg_id
        ? `<ram:BuyerReference>${escapeXml(client.leitweg_id)}</ram:BuyerReference>`
        : "<ram:BuyerReference>XRECHNUNG</ram:BuyerReference>";

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">

  <rsm:ExchangedDocumentContext>
    <ram:BusinessProcessSpecifiedDocumentContextParameter>
      <ram:ID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</ram:ID>
    </ram:BusinessProcessSpecifiedDocumentContextParameter>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>${profile === "xrechnung" ? "urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0" : "urn:cen.eu:en16931:2017"}</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(invoice.invoice_number)}</ram:ID>
    <ram:TypeCode>${invoice.correction_type === "credit_note" ? "381" : invoice.correction_type === "correction" ? "384" : "380"}</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${issueDate}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>

  <rsm:SupplyChainTradeTransaction>
    ${lineItems}

    <ram:ApplicableHeaderTradeAgreement>
      ${buyerReference}

      <ram:SellerTradeParty>
        ${!identifiers.seller_identifier && !sellerVatId && sellerTaxNum ? `<ram:ID>${escapeXml(sellerTaxNum)}</ram:ID>` : ""}
        ${partyId(identifiers.seller_identifier)}
        <ram:Name>${escapeXml(company.name)}</ram:Name>
        <ram:DefinedTradeContact>
          <ram:PersonName>${escapeXml(company.managing_directors || company.name)}</ram:PersonName>
          ${sellerPhone ? `<ram:TelephoneUniversalCommunication><ram:CompleteNumber>${escapeXml(sellerPhone)}</ram:CompleteNumber></ram:TelephoneUniversalCommunication>` : ""}
          ${sellerEmail ? `<ram:EmailURIUniversalCommunication><ram:URIID>${escapeXml(sellerEmail)}</ram:URIID></ram:EmailURIUniversalCommunication>` : ""}
        </ram:DefinedTradeContact>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(company.postal_code || "")}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(company.address_line1 || "")}</ram:LineOne>
          <ram:CityName>${escapeXml(company.city || "")}</ram:CityName>
          <ram:CountryID>${countryCode(company.country)}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${sellerEmail ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${escapeXml(sellerEmail)}</ram:URIID></ram:URIUniversalCommunication>` : ""}
        <ram:SpecifiedTaxRegistration>
          ${sellerVatId ? `<ram:ID schemeID="VA">${escapeXml(sellerVatId)}</ram:ID>` : ""}
          ${!sellerVatId && sellerTaxNum ? `<ram:ID schemeID="FC">${escapeXml(sellerTaxNum)}</ram:ID>` : ""}
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>

      <ram:BuyerTradeParty>
        ${partyId(identifiers.buyer_identifier)}
        <ram:Name>${escapeXml(client.name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(client.postal_code || "")}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(client.address_line1 || "")}</ram:LineOne>
          <ram:CityName>${escapeXml(client.city || "")}</ram:CityName>
          <ram:CountryID>${countryCode(client.country)}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${clientEmail ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${escapeXml(clientEmail)}</ram:URIID></ram:URIUniversalCommunication>` : (client.leitweg_id ? `<ram:URIUniversalCommunication><ram:URIID schemeID="0204">${escapeXml(client.leitweg_id)}</ram:URIID></ram:URIUniversalCommunication>` : "")}
        ${client.vat_id ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${escapeXml(client.vat_id)}</ram:ID></ram:SpecifiedTaxRegistration>` : ""}
      </ram:BuyerTradeParty>
      ${invoice.purchase_order_ref ? `<ram:BuyerOrderReferencedDocument><ram:IssuerAssignedID>${escapeXml(invoice.purchase_order_ref)}</ram:IssuerAssignedID></ram:BuyerOrderReferencedDocument>` : ""}
    </ram:ApplicableHeaderTradeAgreement>

    <ram:ApplicableHeaderTradeDelivery>
      ${delivery ? `<ram:ShipToTradeParty>
        ${partyId(delivery.identifier)}
        <ram:Name>${escapeXml(delivery.name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(delivery.postal_code)}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(delivery.street)}</ram:LineOne>
          <ram:CityName>${escapeXml(delivery.city)}</ram:CityName>
          <ram:CountryID>${escapeXml(delivery.country)}</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:ShipToTradeParty>` : ""}
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${deliveryDate}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>

    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${escapeXml(invoice.invoice_number)}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      ${paymentMeansXml}
      ${taxEntries}
      ${paymentTermsXml}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${invoice.subtotal.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${invoice.subtotal.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${invoice.total_vat.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${invoice.total_gross.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${invoice.total_gross.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

    return xml;
}
