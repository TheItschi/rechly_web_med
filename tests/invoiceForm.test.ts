import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    buildInvoiceFormData,
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
});
