import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    autoDetectColumnMapping,
    mapRowsToClients,
    mapRowsToExpenses,
    mapRowsToInvoices,
    mapRowsToProducts,
    parseCsvTextToRows,
    parseEInvoiceXmlForMigration,
    parseFlexibleDate,
    parseFlexibleNumber,
} from "../src/lib/migration/importer";
import { generateXRechnungXML } from "../src/lib/eRechnung/xrechnung";

describe("Migration Importer & Competitor Format Detection", () => {
    it("parses German and international numbers and dates accurately", () => {
        assert.equal(parseFlexibleNumber("1.234,56 €"), 1234.56);
        assert.equal(parseFlexibleNumber("120,50"), 120.5);
        assert.equal(parseFlexibleNumber("1,234.56"), 1234.56);
        assert.equal(parseFlexibleNumber("19 %"), 19);

        assert.equal(parseFlexibleDate("24.10.2026"), "2026-10-24");
        assert.equal(parseFlexibleDate("5.3.26"), "2026-03-05");
        assert.equal(parseFlexibleDate("20261024"), "2026-10-24");
        assert.equal(parseFlexibleDate("2026-11-06"), "2026-11-06");
    });

    it("detects and maps Lexware Office (lexoffice) client CSV export", () => {
        const lexofficeCsv = [
            "Kundennummer;Firmenname;Ansprechpartner;Straße;Adresszusatz;PLZ;Ort;Land;E-Mail 1;Telefon 1;USt-IdNr.;XRechnung Leitweg-ID",
            "10001;TechNova GmbH;Julia Weber;Friedrichstraße 120;3. OG;10117;Berlin;DE;buchhaltung@technova.de;+49 30 998877;DE123456789;",
            "10002;Stadtverwaltung Musterstadt;Herr Amtmann;Rathausplatz 1;;50667;Köln;Deutschland;rechnung@musterstadt.de;;DE999888777;05315-0000-11",
        ].join("\n");

        const parsed = parseCsvTextToRows(lexofficeCsv);
        assert.equal(parsed.detectedEntityType, "clients");
        assert.equal(parsed.detectedSource, "lexoffice");

        const mapping = autoDetectColumnMapping(parsed.headers, "clients");
        const clients = mapRowsToClients(parsed.rows, mapping);

        assert.equal(clients.length, 2);
        assert.equal(clients[0].name, "TechNova GmbH");
        assert.equal(clients[0].contact_person, "Julia Weber");
        assert.equal(clients[0].address_line1, "Friedrichstraße 120");
        assert.equal(clients[0].address_line2, "3. OG");
        assert.equal(clients[0].postal_code, "10117");
        assert.equal(clients[0].city, "Berlin");
        assert.equal(clients[0].country, "Deutschland");
        assert.equal(clients[0].email, "buchhaltung@technova.de");
        assert.equal(clients[0].vat_id, "DE123456789");
        assert.equal(clients[0].client_type, "company");

        assert.equal(clients[1].client_type, "company");
        assert.equal(clients[1].leitweg_id, "05315-0000-11");
    });

    it("detects and maps sevdesk contacts (both organizations and private individuals)", () => {
        const sevdeskCsv = [
            "Kundennummer;Organisation;Vorname;Familienname;Straße;Hausnummer;PLZ;Stadt;Land;E-Mail",
            "K-100; Kreativ Agentur AG;Lukas;Meyer;blücherstr.;14;20095;Hamburg;DE;lukas@kreativ.de",
            "K-101;;Anna;Schmidt;Gartenweg;7a;80331;München;AT;anna@example.at",
        ].join("\n");

        const parsed = parseCsvTextToRows(sevdeskCsv);
        assert.equal(parsed.detectedEntityType, "clients");
        assert.equal(parsed.detectedSource, "sevdesk");

        const mapping = autoDetectColumnMapping(parsed.headers, "clients");
        const clients = mapRowsToClients(parsed.rows, mapping);

        assert.equal(clients.length, 2);
        assert.equal(clients[0].name, "Kreativ Agentur AG");
        assert.equal(clients[0].contact_person, "Lukas Meyer");
        assert.equal(clients[0].address_line1, "blücherstr. 14");

        assert.equal(clients[1].name, "Anna Schmidt");
        assert.equal(clients[1].client_type, "person");
        assert.equal(clients[1].country, "Österreich");
    });

    it("maps products and converts gross-only prices to net automatically", () => {
        const productsCsv = [
            "Artikelnummer;Bezeichnung;Beschreibung;Preis (Brutto);Umsatzsteuer in %;Einheit",
            "A-01;Consulting Stunde;IT-Beratung remote;119,00 €;19%;Std.",
            "A-02;Fachbuch;E-Book Lizenz;107,00;7;Stk.",
        ].join("\n");

        const parsed = parseCsvTextToRows(productsCsv);
        assert.equal(parsed.detectedEntityType, "products");

        const mapping = autoDetectColumnMapping(parsed.headers, "products");
        const products = mapRowsToProducts(parsed.rows, mapping);

        assert.equal(products.length, 2);
        assert.equal(products[0].name, "Consulting Stunde");
        assert.equal(products[0].price, 100);
        assert.equal(products[0].tax_rate_percent, 19);
        assert.equal(products[0].unit_of_measure, "Stunde");

        assert.equal(products[1].price, 100);
        assert.equal(products[1].tax_rate_percent, 7);
        assert.equal(products[1].unit_of_measure, "Stück");
    });

    it("groups multi-line invoice CSV rows by invoice_number and skips DATEV EXTF metadata rows", () => {
        const invoiceCsv = [
            '"EXTF";700;21;"Buchungsstapel";13;20261106',
            "Rechnungsnummer;Rechnungsdatum;Fälligkeitsdatum;Kunde;Position;Nettobetrag;Steuerbetrag;Bruttobetrag;Status",
            "RE-2026-500;01.10.2026;15.10.2026;Alpha GmbH;Konzeption;1.000,00;190,00;1.190,00;Bezahlt",
            "RE-2026-500;01.10.2026;15.10.2026;Alpha GmbH;Entwicklung;500,00;95,00;595,00;Bezahlt",
            "RE-2026-501;05.10.2026;;Beta UG;Hosting Paket;;;238,00;Offen",
        ].join("\n");

        const parsed = parseCsvTextToRows(invoiceCsv);
        assert.equal(parsed.detectedEntityType, "invoices");

        const mapping = autoDetectColumnMapping(parsed.headers, "invoices");
        const invoices = mapRowsToInvoices(parsed.rows, mapping);

        assert.equal(invoices.length, 2);
        assert.equal(invoices[0].invoice_number, "RE-2026-500");
        assert.equal(invoices[0].items.length, 2);
        assert.equal(invoices[0].subtotal, 1500);
        assert.equal(invoices[0].total_vat, 285);
        assert.equal(invoices[0].total_gross, 1785);
        assert.equal(invoices[0].status, "paid");

        assert.equal(invoices[1].invoice_number, "RE-2026-501");
        assert.equal(invoices[1].subtotal, 200);
        assert.equal(invoices[1].total_vat, 38);
        assert.equal(invoices[1].total_gross, 238);
        assert.equal(invoices[1].status, "sent");
    });

    it("maps expenses and auto-categorizes German vendor/descriptions", () => {
        const expensesCsv = [
            "Belegdatum;Lieferant;Verwendungszweck;Bruttobetrag;Steuersatz",
            "12.10.2026;Hetzner Online GmbH;Cloud Server Hosting;119,00;19",
            "14.10.2026;Deutsche Bahn;ICE Fahrt Berlin;53,50;7",
        ].join("\n");

        const parsed = parseCsvTextToRows(expensesCsv);
        assert.equal(parsed.detectedEntityType, "expenses");

        const mapping = autoDetectColumnMapping(parsed.headers, "expenses");
        const expenses = mapRowsToExpenses(parsed.rows, mapping);

        assert.equal(expenses.length, 2);
        assert.equal(expenses[0].category, "software");
        assert.equal(expenses[0].amount_net, 100);
        assert.equal(expenses[0].vat_amount, 19);

        assert.equal(expenses[1].category, "travel");
        assert.equal(expenses[1].amount_net, 50);
        assert.equal(expenses[1].vat_amount, 3.5);
    });

    it("extracts full seller, buyer, line items, and totals from XRechnung XML for migration", () => {
        const xml = generateXRechnungXML(
            {
                id: "inv-1",
                client_id: "cli-1",
                invoice_number: "XR-2026-099",
                issue_date: "2026-10-20",
                due_date: "2026-11-03",
                subtotal: 800,
                total_vat: 152,
                total_gross: 952,
                status: "sent",
                created_at: Date.now(),
                updated_at: Date.now(),
                client: {
                    id: "cli-1",
                    name: "Käufer Behörde Berlin",
                    address_line1: "Pariser Platz 1",
                    postal_code: "10117",
                    city: "Berlin",
                    country: "Deutschland",
                    email: "poststelle@behoerde.de",
                    vat_id: "DE111222333",
                    leitweg_id: "11000000-0000-83",
                    created_at: Date.now(),
                    updated_at: Date.now(),
                },
                items: [
                    {
                        id: "item-1",
                        invoice_id: "inv-1",
                        description: "Architektur-Workshop",
                        quantity: 8,
                        unit_of_measure: "Stunde",
                        price: 100,
                        tax_rate_percent: 19,
                        discount_percent: 0,
                        subtotal: 800,
                        tax_amount: 152,
                        total: 952,
                    },
                ],
            },
            {
                id: "comp-1",
                name: "Rechly Studio GmbH",
                address_line1: "Torstraße 10",
                postal_code: "10119",
                city: "Berlin",
                country: "Deutschland",
                email: "hello@rechly.de",
                vat_id: "DE888777666",
                bank_iban: "DE89370400440532013000",
                payment_terms_default: "Zahlbar innerhalb von 14 Tagen",
                is_small_business: false,
                created_at: Date.now(),
                updated_at: Date.now(),
            },
        );

        const migrated = parseEInvoiceXmlForMigration(xml);
        assert.ok(migrated);
        assert.equal(migrated.invoiceNumber, "XR-2026-099");
        assert.equal(migrated.issueDate, "2026-10-20");
        assert.equal(migrated.dueDate, "2026-11-03");
        assert.equal(migrated.buyer.name, "Käufer Behörde Berlin");
        assert.equal(migrated.buyer.leitweg_id, "11000000-0000-83");
        assert.equal(migrated.buyer.email, "poststelle@behoerde.de");
        assert.equal(migrated.seller.name, "Rechly Studio GmbH");
        assert.equal(migrated.subtotal, 800);
        assert.equal(migrated.totalVat, 152);
        assert.equal(migrated.totalGross, 952);
        assert.equal(migrated.items.length, 1);
        assert.equal(migrated.items[0].quantity, 8);
        assert.equal(migrated.items[0].price, 100);
    });
});
