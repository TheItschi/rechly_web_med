import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    buildInvoiceFormData,
    formatServicePeriod,
    summarizeServicePeriod,
    validateInvoiceDraft,
    type InvoiceLineItem,
} from "../src/lib/invoiceForm";

const item = (overrides: Partial<InvoiceLineItem> = {}): InvoiceLineItem => ({
    key: "1",
    description: "Beratung",
    quantity: 2,
    unit_of_measure: "Stück",
    price: 100,
    tax_rate_percent: 19,
    discount_percent: 0,
    ...overrides,
});

describe("validateInvoiceDraft", () => {
    it("requires a client", () => {
        assert.equal(validateInvoiceDraft(undefined, 1), "missing-client");
        assert.equal(validateInvoiceDraft("", 1), "missing-client");
    });

    it("requires at least one item", () => {
        assert.equal(validateInvoiceDraft("c1", 0), "missing-items");
    });

    it("passes with client and items", () => {
        assert.equal(validateInvoiceDraft("c1", 2), null);
    });
});

describe("buildInvoiceFormData", () => {
    it("maps line items and normalizes GTIN", () => {
        const data = buildInvoiceFormData({
            clientId: "c1",
            eInvoice: undefined,
            invoiceNumber: "RE-202601-001",
            issueDate: "2026-01-05",
            dueDate: "2026-01-19",
            lineItems: [item({ gtin: "4006381333931" }), item({ key: "2" })],
        });
        assert.equal(data.client_id, "c1");
        assert.equal(data.items.length, 2);
        assert.equal(data.items[0].gtin, "4006381333931");
        // empty GTINs are omitted, not sent
        assert.equal(data.items[1].gtin, undefined);
        assert.equal(data.e_invoice, undefined);
        assert.equal(data.issue_date, "2026-01-05");
    });

    it("rejects invalid GTINs with an IdentifierValidationError", () => {
        assert.throws(
            () =>
                buildInvoiceFormData({
                    clientId: "c1",
                    eInvoice: undefined,
                    invoiceNumber: "RE-1",
                    issueDate: "2026-01-05",
                    dueDate: "2026-01-19",
                    lineItems: [item({ gtin: "123" })],
                }),
            /GTIN/,
        );
    });

    it("omits empty notes and payment terms", () => {
        const data = buildInvoiceFormData({
            clientId: "c1",
            eInvoice: undefined,
            invoiceNumber: "RE-1",
            issueDate: "2026-01-05",
            dueDate: "2026-01-19",
            notes: "",
            paymentTerms: "",
            lineItems: [item()],
        });
        assert.equal(data.notes, undefined);
        assert.equal(data.payment_terms, undefined);
    });

    it("keeps an explicitly cleared buyer identifier instead of the customer default", () => {
        const data = buildInvoiceFormData({
            clientId: "c1",
            eInvoice: { buyer_identifier: undefined } as never,
            invoiceNumber: "RE-1",
            issueDate: "2026-01-05",
            dueDate: "2026-01-19",
            lineItems: [item()],
        });
        assert.deepEqual(data.e_invoice?.buyer_identifier, { value: "" });
    });

    it("passes through invoice-level and per-item service periods", () => {
        const data = buildInvoiceFormData({
            clientId: "c1",
            eInvoice: undefined,
            invoiceNumber: "RE-1",
            issueDate: "2026-01-05",
            dueDate: "2026-01-19",
            deliveryDateStart: "2026-01-01",
            deliveryDateEnd: "2026-01-31",
            lineItems: [
                item({ service_date_start: "2026-01-02", service_date_end: "2026-01-10" }),
                item({ key: "2" }),
            ],
        });
        assert.equal(data.delivery_date_start, "2026-01-01");
        assert.equal(data.delivery_date_end, "2026-01-31");
        assert.equal(data.items[0].service_date_start, "2026-01-02");
        assert.equal(data.items[0].service_date_end, "2026-01-10");
        assert.equal(data.items[1].service_date_start, undefined);
        assert.equal(data.items[1].service_date_end, undefined);
    });

    it("omits service periods when unset", () => {
        const data = buildInvoiceFormData({
            clientId: "c1",
            eInvoice: undefined,
            invoiceNumber: "RE-1",
            issueDate: "2026-01-05",
            dueDate: "2026-01-19",
            lineItems: [item()],
        });
        assert.equal(data.delivery_date_start, undefined);
        assert.equal(data.delivery_date_end, undefined);
    });
});

describe("summarizeServicePeriod", () => {
    it("returns min start and max end", () => {
        assert.deepEqual(
            summarizeServicePeriod([
                { service_date_start: "2026-01-05", service_date_end: "2026-01-10" },
                { service_date_start: "2026-01-01", service_date_end: "2026-01-31" },
            ]),
            { start: "2026-01-01", end: "2026-01-31" },
        );
    });

    it("tolerates one-sided dates and swaps inverted ranges", () => {
        assert.deepEqual(
            summarizeServicePeriod([{ service_date_end: "2026-02-01" }]),
            { start: "2026-02-01", end: "2026-02-01" },
        );
        assert.deepEqual(
            summarizeServicePeriod([{ service_date_start: "2026-03-10", service_date_end: "2026-03-01" }]),
            { start: "2026-03-01", end: "2026-03-10" },
        );
    });

    it("returns null when no usable dates exist", () => {
        assert.equal(summarizeServicePeriod([]), null);
        assert.equal(summarizeServicePeriod([{}, { service_date_start: "not-a-date" }]), null);
    });
});

describe("formatServicePeriod", () => {
    it("formats ranges and single days in German format", () => {
        assert.equal(formatServicePeriod("2026-01-05", "2026-01-12"), "05.01.2026 – 12.01.2026");
        assert.equal(formatServicePeriod("2026-01-05", "2026-01-05"), "05.01.2026");
    });

    it("normalizes Appwrite datetime values to the calendar day", () => {
        assert.equal(
            formatServicePeriod("2026-01-05T00:00:00.000Z", "2026-01-12T00:00:00.000Z"),
            "05.01.2026 – 12.01.2026",
        );
    });

    it("falls back to a legacy delivery date and null otherwise", () => {
        assert.equal(formatServicePeriod(undefined, undefined, "2026-01-05"), "05.01.2026");
        assert.equal(formatServicePeriod(undefined, undefined, "2026-01-05T00:00:00.000Z"), "05.01.2026");
        assert.equal(formatServicePeriod(undefined, undefined, undefined), null);
        assert.equal(formatServicePeriod(undefined, undefined, "garbage"), null);
    });
});
