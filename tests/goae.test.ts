import test from "node:test";
import assert from "node:assert/strict";
import {
    assignTreatmentCases,
    baseFeeFromPoints,
    checkGoaeLines,
    goaeUnitAmount,
    normalizeGoaeLine,
    GoaeValidationError,
    type GoaeCheckLine,
} from "../src/lib/goae";

const line = (key: string, number: string, serviceDate = "2026-11-02", extra: Partial<GoaeCheckLine> = {}): GoaeCheckLine => ({
    key, number, serviceDate, factor: 2.3, quantity: 1, ...extra,
});
const codes = (lines: GoaeCheckLine[], opts = {}) => checkGoaeLines(lines, opts).filter((f) => f.severity !== "info").map((f) => f.code);

test("fees: Punktwert 5,82873 Cent, rounding on the final amount", () => {
    assert.equal(baseFeeFromPoints(80), 4.66); // Nr. 1 Einfachsatz
    assert.equal(goaeUnitAmount(2.3, { points: 80 }), 10.72); // Nr. 1 2,3-fach
    assert.equal(goaeUnitAmount(2.3, { points: 150 }), 20.11); // Nr. 3
    assert.equal(goaeUnitAmount(1.8, { points: 40 }), 4.2); // Nr. 250 technisch
});

test("clean standard consultation produces no errors", () => {
    assert.deepEqual(codes([line("a", "1"), line("b", "5")], { diagnosisCount: 1 }), []);
});

test("Nr. 5–8 are mutually exclusive on the same day", () => {
    assert.ok(codes([line("a", "5"), line("b", "7")]).includes("exclusion"));
    assert.ok(!codes([line("a", "5"), line("b", "7", "2026-11-03")]).includes("exclusion"));
});

test("Nr. 3 only alone or with 5–8; surcharges do not count", () => {
    assert.ok(codes([line("a", "3"), line("b", "250")]).includes("only-with"));
    assert.ok(!codes([line("a", "3"), line("b", "7"), line("c", "A", undefined, { factor: 1, feeType: "surcharge" })]).includes("only-with"));
});

test("Nr. 2 must stand alone", () => {
    assert.ok(codes([line("a", "2", undefined, { factor: 1.8 }), line("b", "1")]).includes("alone"));
});

test("factor above Schwellenwert requires a reason, above Höchstsatz an agreement", () => {
    assert.ok(codes([line("a", "1", undefined, { factor: 3.5 })]).includes("justification-missing"));
    assert.ok(!codes([line("a", "1", undefined, { factor: 3.5, justification: "Überdurchschnittlicher Zeitaufwand wegen Sprachbarriere" })]).includes("justification-missing"));
    assert.ok(codes([line("a", "1", undefined, { factor: 4, justification: "Sehr hoher Aufwand im Einzelfall" })]).includes("factor-above-max"));
    assert.ok(!codes([line("a", "1", undefined, { factor: 4, justification: "Sehr hoher Aufwand im Einzelfall", feeAgreement: true })]).includes("factor-above-max"));
    // Technical services: threshold 1.8
    assert.ok(codes([line("a", "250", undefined, { factor: 2.3 })]).includes("justification-missing"));
    // Surcharges only at the simple rate
    assert.ok(codes([line("a", "1"), line("b", "A", undefined, { factor: 2.3, feeType: "surcharge" })]).includes("surcharge-factor"));
});

test("Nr. 1 and/or 5 alongside C–O only once per Behandlungsfall (incl. history)", () => {
    const history = [{ number: "1", serviceDate: "2026-10-20", quantity: 1, invoiceNumber: "RE-1" }, { number: "250", serviceDate: "2026-10-20", quantity: 1 }];
    assert.ok(codes([line("a", "1"), line("b", "250", undefined, { factor: 1.8 })], { history }).includes("nr1-5-with-sonderleistung"));
    // New Behandlungsfall after one month
    const old = history.map((h) => ({ ...h, serviceDate: "2026-09-01" }));
    assert.ok(!codes([line("a", "1"), line("b", "250", undefined, { factor: 1.8 })], { history: old }).includes("nr1-5-with-sonderleistung"));
});

test("Nr. 34 max. twice within 6 months, Nr. 15 once per calendar year", () => {
    const history = [
        { number: "34", serviceDate: "2026-06-10", quantity: 1, invoiceNumber: "RE-7" },
        { number: "34", serviceDate: "2026-08-10", quantity: 1, invoiceNumber: "RE-8" },
    ];
    assert.ok(codes([line("a", "34")], { history }).includes("max-per-period"));
    assert.ok(!codes([line("a", "34", "2026-12-11")], { history: history.slice(1) }).includes("max-per-period"));
    assert.ok(codes([line("a", "15")], { history: [{ number: "15", serviceDate: "2026-01-15", quantity: 1 }] }).includes("max-per-period"));
    assert.ok(!codes([line("a", "15", "2027-01-02")], { history: [{ number: "15", serviceDate: "2026-01-15", quantity: 1 }] }).includes("max-per-period"));
});

test("frequency limits per day and per case", () => {
    assert.ok(codes([line("a", "410"), line("b", "420", undefined, { quantity: 4 })]).includes("max-per-day"));
    assert.ok(codes([line("a", "420")]).includes("requires"));
    assert.ok(codes([line("a", "4"), line("b", "4", "2026-11-10")]).includes("max-per-case"));
});

test("missing date and diagnosis are reported", () => {
    assert.ok(codes([line("a", "1", "")]).includes("missing-date"));
    assert.ok(codes([line("a", "1")], { diagnosisCount: 0 }).includes("no-diagnosis"));
});

test("Behandlungsfall: one month after first contact", () => {
    const cases = assignTreatmentCases(["2026-01-31", "2026-02-27", "2026-02-28", "2026-03-01"]);
    assert.equal(cases.get("2026-01-31"), cases.get("2026-02-27"));
    assert.notEqual(cases.get("2026-01-31"), cases.get("2026-02-28"));
    assert.equal(cases.get("2026-02-28"), cases.get("2026-03-01"));
});

test("server normalisation recomputes the price and enforces § 12", () => {
    const { data, unitPrice } = normalizeGoaeLine({ number: " 3 ", factor: 2.3, service_date: "2026-11-02", base_fee: 999 });
    assert.equal(data.number, "3");
    assert.equal(data.base_fee, 8.74);
    assert.equal(unitPrice, 20.11);
    assert.throws(() => normalizeGoaeLine({ number: "3", factor: 3, service_date: "2026-11-02" }), GoaeValidationError);
    assert.throws(() => normalizeGoaeLine({ number: "3", factor: 2.3 }), GoaeValidationError);
    const custom = normalizeGoaeLine({ number: "9999", factor: 1, base_fee: 12.345, service_date: "2026-11-02" });
    assert.equal(custom.unitPrice, 12.35);
});

test("CSV catalogue round-trip and merge/replace activation", async () => {
    const { parseGoaeCsv, goaeCatalogToCsv, setGoaeCustomCatalog, findGoaeEntry, GOAE_CATALOG } = await import("../src/lib/goae");
    const csv = goaeCatalogToCsv(GOAE_CATALOG);
    const back = parseGoaeCsv(csv);
    assert.equal(back.errors.length, 0);
    assert.deepEqual(back.entries.find((e) => e.number === "34"), GOAE_CATALOG.find((e) => e.number === "34"));

    const custom = parseGoaeCsv("Ziffer;Bezeichnung;Punkte;Gebuehrenart;NichtNeben;MaxTag\n1240;Spaltlampenmikroskopie;74;persönlich;5,6;1\n;fehlt;1\n9;x;abc");
    assert.equal(custom.entries.length, 1);
    assert.equal(custom.errors.length, 2);
    setGoaeCustomCatalog({ mode: "merge", entries: custom.entries });
    assert.ok(findGoaeEntry("1240") && findGoaeEntry("1"));
    setGoaeCustomCatalog({ mode: "replace", entries: custom.entries });
    assert.ok(findGoaeEntry("1240") && !findGoaeEntry("1"));
    setGoaeCustomCatalog(null);
    assert.ok(findGoaeEntry("1") && !findGoaeEntry("1240"));
});
