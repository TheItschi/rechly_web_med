import test from "node:test";
import assert from "node:assert/strict";
import { formatDiagnosis, normalizeMedicalData, parseIcd10Catalog, searchIcd10 } from "../src/lib/icd10";

// Synthetic lines in the BfArM "syst_kodes" layout (titles are placeholders).
const SAMPLE = [
    "3;N;X;01;A00;A00.-;A00;A00;Testtitel Dreisteller;Testtitel Dreisteller;;;",
    "4;T;X;01;A00;A00.0;A00.0;A000;Testtitel Alpha;Testtitel Dreisteller;Testtitel Alpha;;",
    "4;T;X;01;A00;A00.1;A00.1;A001;Testtitel Beta links;Testtitel Dreisteller;Testtitel Beta links;;",
    "3;T;X;18;R50;R51;R51;R51;Testtitel Kopf;Testtitel Kopf;;;",
].join("\n");

test("parses terminal codes of the BfArM kodes layout", () => {
    const codes = parseIcd10Catalog(SAMPLE);
    assert.deepEqual(codes.map((c) => c.code), ["A00.0", "A00.1", "R51"]);
    assert.equal(codes[0].title, "Testtitel Alpha");
});

test("falls back to code;title CSV", () => {
    assert.deepEqual(parseIcd10Catalog("X99.9;Freitext Titel\nunsinn"), [{ code: "X99.9", title: "Freitext Titel" }]);
});

test("search ranks exact code, prefix, then title words", () => {
    const codes = parseIcd10Catalog(SAMPLE);
    assert.equal(searchIcd10(codes, "r51")[0].code, "R51");
    assert.deepEqual(searchIcd10(codes, "A00").map((c) => c.code), ["A00.0", "A00.1"]);
    assert.deepEqual(searchIcd10(codes, "beta links").map((c) => c.code), ["A00.1"]);
});

test("diagnosis formatting per display mode", () => {
    const d = { code: "A00.1", text: "Testtitel Beta", certainty: "V" as const, side: "L" as const };
    assert.equal(formatDiagnosis(d, "code"), "A00.1 V L");
    assert.equal(formatDiagnosis(d, "text"), "Verdacht auf: Testtitel Beta (links)");
    assert.equal(formatDiagnosis(d, "both"), "Verdacht auf: Testtitel Beta (links) [A00.1 V L]");
});

test("medical data normalisation rejects malformed codes", () => {
    assert.equal(normalizeMedicalData({ diagnoses: [] }), undefined);
    assert.throws(() => normalizeMedicalData({ diagnoses: [{ code: "ABC", text: "x" }] }));
    assert.deepEqual(normalizeMedicalData({ diagnoses: [{ code: "r51", text: "" }], diagnosis_display: "code" }), {
        diagnoses: [{ code: "R51", text: "R51" }], diagnosis_display: "code",
    });
});
