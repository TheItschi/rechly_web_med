import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    DEFAULT_NUMBER_PATTERN,
    DEFAULT_NUMBER_PREFIX,
    formatInvoiceNumber,
    suggestNextSequence,
    validateNumberPattern,
} from "../src/lib/invoiceNumbering";

describe("validateNumberPattern", () => {
    it("accepts the default pattern", () => {
        assert.equal(validateNumberPattern(DEFAULT_NUMBER_PATTERN), null);
    });

    it("rejects empty and oversized patterns", () => {
        assert.equal(validateNumberPattern(""), "empty");
        assert.equal(validateNumberPattern("   "), "empty");
        assert.equal(validateNumberPattern(undefined), "empty");
        assert.equal(validateNumberPattern("x".repeat(65)), "tooLong");
    });

    it("requires a NUM token", () => {
        assert.equal(validateNumberPattern("{PREFIX}-{YYYY}"), "missingNumber");
    });

    it("rejects unknown tokens and bad widths", () => {
        assert.equal(validateNumberPattern("{PREFIX}-{FOO}"), "unknownToken");
        assert.equal(validateNumberPattern("{NUM:0}"), "invalidWidth");
        assert.equal(validateNumberPattern("{NUM:9}"), "invalidWidth");
        assert.equal(validateNumberPattern("{YYYY:4}"), "widthOnlyOnNum");
    });

    it("rejects unsafe literal characters", () => {
        assert.equal(validateNumberPattern("RE;{NUM}"), "invalidChars");
        assert.equal(validateNumberPattern("RE$<b>{NUM}"), "invalidChars");
        assert.equal(validateNumberPattern("{NUM}$"), "invalidChars");
    });

    it("accepts common German numbering schemes", () => {
        assert.equal(validateNumberPattern("RE-{YYYY}-{NUM:4}"), null);
        assert.equal(validateNumberPattern("{YYYY}-{NUM:3}"), null);
        assert.equal(validateNumberPattern("R-{NUM}/{YY}"), null);
        assert.equal(validateNumberPattern("{NUM}"), null);
    });
});

describe("formatInvoiceNumber", () => {
    it("formats the default pattern", () => {
        assert.equal(
            formatInvoiceNumber({
                pattern: DEFAULT_NUMBER_PATTERN,
                prefix: DEFAULT_NUMBER_PREFIX,
                dateISO: "2026-03-05",
                seq: 42,
            }),
            "RE-2026-0042",
        );
    });

    it("supports all tokens and zero padding", () => {
        assert.equal(
            formatInvoiceNumber({
                pattern: "R-{NUM}/{YY}",
                prefix: "ignored",
                dateISO: "2026-03-05",
                seq: 7,
            }),
            "R-7/26",
        );
        assert.equal(
            formatInvoiceNumber({ pattern: "{YYYY}{MM}{NUM:6}", prefix: "", dateISO: "2026-12-01", seq: 123 }),
            "202612000123",
        );
    });

    it("does not pad beyond the requested width and never produces negative sequences", () => {
        assert.equal(
            formatInvoiceNumber({ pattern: "{NUM:2}", prefix: "", dateISO: "2026-01-01", seq: 123 }),
            "123",
        );
        assert.equal(
            formatInvoiceNumber({ pattern: "{NUM}", prefix: "", dateISO: "2026-01-01", seq: -5 }),
            "0",
        );
    });

    it("keeps unknown tokens verbatim instead of corrupting output", () => {
        assert.equal(
            formatInvoiceNumber({ pattern: "RE-{FOO}-{NUM}", prefix: "RE", dateISO: "2026-01-01", seq: 3 }),
            "RE-{FOO}-3",
        );
    });
});

describe("suggestNextSequence", () => {
    it("continues after the highest trailing number", () => {
        assert.equal(suggestNextSequence(["RE-2025-0041", "RE-2025-0042", "RE-2024-1200"]), 1201);
    });

    it("starts at 1 for empty or numberless history", () => {
        assert.equal(suggestNextSequence([]), 1);
        assert.equal(suggestNextSequence(["Rechnung", ""]), 1);
    });

    it("ignores non-trailing and unsafe numbers", () => {
        assert.equal(suggestNextSequence(["2026 fix", "abc"]), 1);
    });
});
