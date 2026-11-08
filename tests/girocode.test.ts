import test from "node:test";
import assert from "node:assert/strict";
import QRCode from "qrcode";
import { buildGirocodePayload, GirocodeInput } from "../src/lib/girocode";

test("builds valid EPC069-12 payload with all fields", () => {
    const input: GirocodeInput = {
        name: "Acme Corp GmbH",
        iban: "DE89370400440532013000",
        bic: "COBADEFFXXX",
        amount: 119.5,
        reference: "Rechnung RE-2026-001",
    };

    const payload = buildGirocodePayload(input);
    assert.ok(payload);

    const lines = payload.split("\n");
    assert.equal(lines.length, 11);
    assert.equal(lines[0], "BCD"); // Service tag
    assert.equal(lines[1], "002"); // Version
    assert.equal(lines[2], "1");   // UTF-8
    assert.equal(lines[3], "SCT"); // SEPA credit transfer
    assert.equal(lines[4], "COBADEFFXXX"); // BIC
    assert.equal(lines[5], "Acme Corp GmbH"); // Name
    assert.equal(lines[6], "DE89370400440532013000"); // IBAN
    assert.equal(lines[7], "EUR119.50"); // Amount
    assert.equal(lines[8], ""); // Purpose
    assert.equal(lines[9], ""); // Structured reference
    assert.equal(lines[10], "Rechnung RE-2026-001"); // Unstructured reference
});

test("builds valid payload without BIC (optional in v002)", () => {
    const input: GirocodeInput = {
        name: "Freelance Designer",
        iban: "DE89 3704 0044 0532 0130 00",
        amount: 50,
        reference: "Design Services",
    };

    const payload = buildGirocodePayload(input);
    assert.ok(payload);

    const lines = payload.split("\n");
    assert.equal(lines[4], ""); // Empty BIC
    assert.equal(lines[6], "DE89370400440532013000"); // Sanitized IBAN
    assert.equal(lines[7], "EUR50.00");
});

test("handles IBAN with lowercase and spaces", () => {
    const input: GirocodeInput = {
        name: "Max Mustermann",
        iban: "  de89 3704 0044 0532 0130 00  ",
        amount: 100,
        reference: "RE-100",
    };

    const payload = buildGirocodePayload(input);
    assert.ok(payload);
    assert.ok(payload.includes("DE89370400440532013000"));
});

test("rejects invalid amounts and incomplete data", () => {
    const validBase: GirocodeInput = {
        name: "Valid Name",
        iban: "DE89370400440532013000",
        amount: 10,
        reference: "Ref",
    };

    // Missing/empty name
    assert.equal(buildGirocodePayload({ ...validBase, name: "" }), null);
    assert.equal(buildGirocodePayload({ ...validBase, name: "   " }), null);

    // Missing/incomplete IBAN
    assert.equal(buildGirocodePayload({ ...validBase, iban: "" }), null);
    assert.equal(buildGirocodePayload({ ...validBase, iban: "DE123" }), null);

    // Non-positive or excessive amounts
    assert.equal(buildGirocodePayload({ ...validBase, amount: 0 }), null);
    assert.equal(buildGirocodePayload({ ...validBase, amount: -10 }), null);
    assert.equal(buildGirocodePayload({ ...validBase, amount: 1_000_000_000 }), null);
    assert.equal(buildGirocodePayload({ ...validBase, amount: NaN }), null);
});

test("handles missing or empty reference gracefully without crashing", () => {
    const payload = buildGirocodePayload({
        name: "Test Name",
        iban: "DE89370400440532013000",
        amount: 25,
        reference: undefined as unknown as string,
    });
    assert.ok(payload);
    const lines = payload.split("\n");
    assert.equal(lines[10], "");
});

test("generates valid QR code data URL from GiroCode payload", async () => {
    const payload = buildGirocodePayload({
        name: "Julius Mustermann",
        iban: "DE89370400440532013000",
        amount: 299.99,
        reference: "Rechnung RE-2026-0042",
    });
    assert.ok(payload);

    const dataUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 256,
    });

    assert.ok(dataUrl.startsWith("data:image/png;base64,"));
    assert.ok(dataUrl.length > 500);
});

test("rejects checksum errors, control characters, overflow and malformed BIC", () => {
    const valid = { name: "Müller GmbH", iban: "DE89370400440532013000", amount: 119, reference: "RE-1" };
    for (const patch of [{ iban: "DE00370400440532013000" }, { bic: "bad" }, { name: "Alice\nSCT" }, { reference: "RE\n1" }, { amount: Infinity }, { amount: 0.001 }, { reference: "a".repeat(141) }, { name: "€".repeat(70), reference: "€".repeat(140) }]) {
        assert.equal(buildGirocodePayload({ ...valid, ...patch }), null);
    }
});
