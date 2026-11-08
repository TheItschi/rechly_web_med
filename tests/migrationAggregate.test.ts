import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    aggregateMigrationInputs,
    parseCsvTextToRows,
    autoDetectColumnMapping,
    type ParsedCsvFileEntry,
    type ParsedMigrationEInvoice,
} from "../src/lib/migration/importer";

const einvoice = (
    overrides: Partial<ParsedMigrationEInvoice> = {},
): ParsedMigrationEInvoice => ({
    invoiceNumber: "RE-2026-001",
    issueDate: "2026-10-24",
    dueDate: "2026-11-07",
    seller: { name: "Lieferant GmbH", address_line1: "Lieferweg 2", postal_code: "80331", city: "München", country: "DE" },
    buyer: {
        name: "Kunde AG",
        address_line1: "Straße 1",
        postal_code: "10115",
        city: "Berlin",
        country: "DE",
        vat_id: "DE123456789",
        leitweg_id: "123-456",
    },
    subtotal: 100,
    totalVat: 19,
    totalGross: 119,
    taxRatePercent: 19,
    items: [
        {
            description: "Beratung",
            quantity: 1,
            unit_of_measure: "Stück",
            price: 100,
            tax_rate_percent: 19,
            discount_percent: 0,
        },
    ],
    ...overrides,
});

const csvEntry = (
    overrides: Partial<ParsedCsvFileEntry> = {},
): ParsedCsvFileEntry => ({
    id: "csv-1",
    fileName: "clients.csv",
    headers: ["Firmenname", "E-Mail 1"],
    rows: [{ Firmenname: "TechNova GmbH", "E-Mail 1": "a@b.de" }],
    detectedSource: "generic",
    entityType: "clients",
    mapping: autoDetectColumnMapping(["Firmenname", "E-Mail 1"], "clients"),
    ...overrides,
});

describe("aggregateMigrationInputs", () => {
    it("returns empty aggregation for no inputs", () => {
        const result = aggregateMigrationInputs([], [], "outgoing", null);
        assert.deepEqual(result, {
            clients: [],
            products: [],
            invoices: [],
            expenses: [],
            offersCount: 0,
            hasCompany: false,
            totalItems: 0,
        });
    });

    it("maps CSV client rows", () => {
        const entry = csvEntry();
        // sanity: mapping actually resolves the name column
        assert.equal(entry.mapping["name"], "Firmenname");
        const result = aggregateMigrationInputs([entry], [], "outgoing", null);
        assert.equal(result.clients.length, 1);
        assert.equal(result.clients[0].name, "TechNova GmbH");
        assert.equal(result.totalItems, 1);
    });

    it("creates client + invoice snapshots for outgoing e-invoices", () => {
        const result = aggregateMigrationInputs([], [einvoice()], "outgoing", null);
        assert.equal(result.clients.length, 1);
        assert.equal(result.clients[0].name, "Kunde AG");
        assert.equal(result.invoices.length, 1);
        assert.equal(result.invoices[0].invoice_number, "RE-2026-001");
        assert.equal(result.invoices[0].status, "paid");
        assert.equal(result.invoices[0].total_gross, 119);
        assert.equal(result.expenses.length, 0);
        assert.equal(result.totalItems, 2);
    });

    it("skips unknown buyers in outgoing mode", () => {
        const inv = einvoice({
            buyer: {
                name: "Unbekannt",
                address_line1: "",
                postal_code: "",
                city: "",
                country: "DE",
            },
        });
        const result = aggregateMigrationInputs([], [inv], "outgoing", null);
        assert.equal(result.clients.length, 0);
        assert.equal(result.invoices.length, 1);
    });

    it("creates expenses for incoming e-invoices", () => {
        const result = aggregateMigrationInputs([], [einvoice()], "incoming", null);
        assert.equal(result.clients.length, 0);
        assert.equal(result.invoices.length, 0);
        assert.equal(result.expenses.length, 1);
        assert.equal(result.expenses[0].vendor_name, "Lieferant GmbH");
        assert.equal(result.expenses[0].amount_gross, 119);
    });

    it("merges backup bundle entities and counts offers", () => {
        const result = aggregateMigrationInputs(
            [],
            [],
            "outgoing",
            {
                rechlyBackupVersion: 1,
                exportedAt: "2026-10-24",
                company: { name: "Meine Firma" },
                clients: [
                    {
                        name: "Backup-Kunde",
                        address_line1: "Weg 3",
                        postal_code: "20095",
                        city: "Hamburg",
                        country: "DE",
                    },
                ],
                products: [],
                invoices: [],
                offers: [
                    {
                        offer_number: "A-1",
                        issue_date: "2026-10-01",
                        status: "sent",
                        client_name: "Backup-Kunde",
                        subtotal: 10,
                        total_vat: 1.9,
                        total_gross: 11.9,
                        items: [],
                    },
                ],
                expenses: [],
            },
        );
        assert.equal(result.clients.length, 1);
        assert.equal(result.offersCount, 1);
        assert.equal(result.hasCompany, true);
        assert.equal(result.totalItems, 2);
    });

    it("round-trips a parsed CSV through parse + aggregate", () => {
        const text = [
            "Firmenname;E-Mail 1",
            "TechNova GmbH;buchhaltung@technova.de",
        ].join("\n");
        const parsed = parseCsvTextToRows(text);
        const result = aggregateMigrationInputs(
            [
                csvEntry({
                    headers: parsed.headers,
                    rows: parsed.rows,
                    mapping: autoDetectColumnMapping(parsed.headers, "clients"),
                }),
            ],
            [],
            "outgoing",
            null,
        );
        assert.equal(result.clients[0].name, "TechNova GmbH");
    });
});
