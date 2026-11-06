import test from "node:test";
import assert from "node:assert/strict";
import { XMLParser } from "fast-xml-parser";
import { validGTIN, parseGTIN, parseEInvoiceData, parseIdentifier, readEInvoiceData, snapshotIdentifiers, eInvoiceWrite } from "../src/lib/eRechnung/identifiers";
import { generateXRechnungXML, validateXRechnung } from "../src/lib/eRechnung/xrechnung";
import { allDocuments } from "../src/lib/server/pagination";
import { defaultVatRate } from "../src/lib/vatDefaults";
import { invoice, company } from "./fixtures/identifier-invoice";
import { complianceCases } from "./fixtures/compliance-cases";

test("GTIN lengths, leading zeros and check digits", () => {
    for (const gtin of ["96385074", "036000291452", "4006381333931", "10012345000017"]) {
        assert.equal(validGTIN(gtin), true, gtin);
        assert.equal(parseGTIN(gtin), gtin);
        assert.equal(validGTIN(gtin.slice(0, -1) + ((Number(gtin.at(-1)) + 1) % 10)), false);
    }
    for (const bad of ["123", "4006381333932", "400638133393A", "12345678901"]) assert.throws(() => parseGTIN(bad));
    assert.throws(() => parseGTIN(4006381333931));
    assert.equal(parseGTIN(""), undefined);
});
test("optional identifiers validate GLN without confusing tax/reference fields", () => {
    assert.deepEqual(parseIdentifier({ value: "internal-42" }), { value: "internal-42" });
    assert.throws(() => parseIdentifier({ value: "96385074", scheme: "0088" }));
    assert.throws(() => parseIdentifier({ value: "4006381333932", scheme: "0088" }));
    assert.throws(() => parseIdentifier({ value: "abc", scheme: '0088" injected="yes' }));
    assert.deepEqual(readEInvoiceData(null), {});
    assert.deepEqual(eInvoiceWrite(undefined), {});
});
test("multiple branches round trip and invoice overrides are independent snapshots", () => {
    const data = parseEInvoiceData({ buyer_identifier: invoice.e_invoice!.buyer_identifier,
        delivery_locations: [invoice.e_invoice!.delivery, { ...invoice.e_invoice!.delivery, name: "South" }] });
    const persisted = readEInvoiceData(eInvoiceWrite(data).eInvoiceData);
    assert.equal(persisted.delivery_locations!.length, 2);
    const snapshot = snapshotIdentifiers(persisted, { seller_identifier: invoice.e_invoice!.seller_identifier },
        { buyer_identifier: { value: "override" }, delivery: persisted.delivery_locations![1] });
    persisted.delivery_locations![1].name = "Changed later";
    assert.equal(snapshot.delivery!.name, "South");
    assert.equal(snapshot.buyer_identifier!.value, "override");
    assert.equal(snapshot.seller_identifier!.scheme, "0088");
    assert.equal(snapshotIdentifiers(data, {}, { buyer_identifier: null }).buyer_identifier, undefined);
    assert.equal(snapshotIdentifiers(data, {}, { buyer_identifier: { value: "" } }).buyer_identifier, undefined);
    assert.throws(() => parseEInvoiceData({ delivery: { ...invoice.e_invoice!.delivery, country: "ZZ" } }));
});
test("CII fixture maps BT-46, BT-29, BT-71 and BT-157 independently", () => {
    assert.deepEqual(validateXRechnung(invoice, company), []);
    for (const profile of ["xrechnung", "en16931"] as const) {
        const xml = generateXRechnungXML(invoice, company, profile);
        const parsed = new XMLParser({ ignoreAttributes: false, parseTagValue: false }).parse(xml);
        const transaction = parsed["rsm:CrossIndustryInvoice"]["rsm:SupplyChainTradeTransaction"];
        const agreement = transaction["ram:ApplicableHeaderTradeAgreement"];
        assert.equal(agreement["ram:BuyerTradeParty"]["ram:GlobalID"]["#text"], "4006381333931");
        assert.equal(agreement["ram:SellerTradeParty"]["ram:GlobalID"]["@_schemeID"], "0088");
        assert.equal(agreement["ram:SellerTradeParty"]["ram:GlobalID"]["#text"], "9501101530003");
        assert.equal(agreement["ram:BuyerReference"], "XRECHNUNG");
        const ship = transaction["ram:ApplicableHeaderTradeDelivery"]["ram:ShipToTradeParty"];
        assert.equal(ship["ram:Name"], "Branch <North>");
        assert.equal(ship["ram:GlobalID"]["@_schemeID"], "0088");
        assert.equal(ship["ram:GlobalID"]["#text"], invoice.e_invoice!.delivery!.identifier!.value);
        assert.equal(ship["ram:PostalTradeAddress"]["ram:CityName"], "Bremen");
        const product = transaction["ram:IncludedSupplyChainTradeLineItem"]["ram:SpecifiedTradeProduct"];
        assert.equal(product["ram:GlobalID"]["@_schemeID"], "0160");
        assert.equal(product["ram:GlobalID"]["#text"], invoice.items[0].gtin);
        assert.match(xml, /<ram:GrandTotalAmount>119.00<\/ram:GrandTotalAmount>/);
        assert.equal(xml.includes("xrechnung_3.0"), profile === "xrechnung");
    }
});
test("legacy invoices emit no identifiers or delivery location; invalid GTIN fails export", () => {
    const old = { ...invoice, e_invoice: undefined, items: invoice.items.map(item => ({ ...item, gtin: undefined })) };
    assert.doesNotMatch(generateXRechnungXML(old, company), /GlobalID|ShipToTradeParty/);
    assert.throws(() => generateXRechnungXML({ ...invoice, items: [{ ...invoice.items[0], gtin: "123" }] }, company));
});
test("customer pagination returns all 260 records and passes tenant filter to every page", async () => {
    const records = Array.from({ length: 260 }, (_, i) => ({ $id: String(i).padStart(4, "0") }));
    let calls = 0;
    const result = await allDocuments(async queries => {
        calls++;
        assert.equal(queries[0], "tenant-filter");
        const cursor = queries.slice(1).map(q => JSON.parse(q)).find(q => q.method === "cursorAfter")?.values[0];
        const start = cursor ? records.findIndex(r => r.$id === cursor) + 1 : 0;
        return { documents: records.slice(start, start + 100) };
    }, ["tenant-filter"]);
    assert.equal(result.length, 260);
    assert.equal(new Set(result.map(r => r.$id)).size, 260);
    assert.equal(calls, 3);
});
test("small-business defaults and explicit zero-rated products", () => {
    assert.equal(defaultVatRate(true, 19), 0);
    assert.equal(defaultVatRate(false, 0), 0);
    assert.equal(defaultVatRate(false, 7), 7);
    assert.equal(defaultVatRate(false), 19);
});

test("discounted XML net unit price reconciles with the unchanged line total", () => {
    const { invoice, company } = complianceCases().discount;
    const xml = generateXRechnungXML(invoice, company);
    assert.match(xml, /<ram:ChargeAmount>90.0000<\/ram:ChargeAmount>/);
    assert.match(xml, /<ram:LineTotalAmount>90.00<\/ram:LineTotalAmount>/);
    assert.match(xml, /<ram:GrandTotalAmount>107.10<\/ram:GrandTotalAmount>/);
});

test("PEPPOL-EN16931-R020: Seller electronic address BT-34 and Buyer BT-49 are present with schemeID EM", () => {
    const { invoice, company } = complianceCases().identifiers;
    const xml = generateXRechnungXML(invoice, company);
    assert.match(
        xml,
        /<ram:SellerTradeParty>[\s\S]*?<ram:URIUniversalCommunication><ram:URIID schemeID="EM">seller@example\.invalid<\/ram:URIID><\/ram:URIUniversalCommunication>[\s\S]*?<\/ram:SellerTradeParty>/
    );
    assert.match(
        xml,
        /<ram:BuyerTradeParty>[\s\S]*?<ram:URIUniversalCommunication><ram:URIID schemeID="EM">buyer@example\.invalid<\/ram:URIID><\/ram:URIUniversalCommunication>[\s\S]*?<\/ram:BuyerTradeParty>/
    );
});
