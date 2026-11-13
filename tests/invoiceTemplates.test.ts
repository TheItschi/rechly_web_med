import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeTemplatePayload } from "../src/lib/invoiceTemplates";

test("template keeps GOÄ data, drops dates and junk", () => {
    const res = sanitizeTemplatePayload({
        notes: "  Verstorbener: …  ",
        items: [
            { description: "Leichenschau", quantity: 1, price: 165.77, taxRatePercent: 0, goae: { number: " 101 ", factor: 1, feeType: "personal", serviceDate: "2026-05-20" } },
            { description: "Zuschlag nachts", quantity: 1, price: 26.23, goae: { number: "g", factor: 1, feeType: "surcharge" } },
            { description: "Begründet", quantity: 1, price: 0, goae: { number: "3", factor: 3, feeType: "personal", justification: "Erhöhter Zeitaufwand", feeAgreement: true } },
            { description: "", quantity: 1 },
            "kaputt",
        ],
    });
    assert.ok(res.ok);
    if (!res.ok) return;
    assert.equal(res.value.items.length, 3);
    assert.deepEqual(res.value.items[0].goae, { number: "101", factor: 1, feeType: "personal" });
    assert.equal(res.value.items[1].goae?.number, "G");
    assert.equal(res.value.items[2].goae?.justification, "Erhöhter Zeitaufwand");
    assert.equal(res.value.items[2].goae?.feeAgreement, true);
    assert.equal(res.value.notes, "Verstorbener: …");
    assert.equal("serviceDate" in (res.value.items[0].goae ?? {}), false);
});

test("template validation rejects empty templates and invalid diagnoses", () => {
    assert.equal(sanitizeTemplatePayload({ items: [] }).ok, false);
    assert.equal(sanitizeTemplatePayload(null).ok, false);
    assert.equal(sanitizeTemplatePayload({ items: [{ description: "x" }], diagnoses: [{ code: "XYZ", text: "?" }] }).ok, false);
    const ok = sanitizeTemplatePayload({ items: [{ description: "x" }], diagnoses: [{ code: "r51", text: "Kopfschmerz" }], diagnosisDisplay: "code" });
    assert.ok(ok.ok && ok.value.diagnoses?.[0].code === "R51" && ok.value.diagnosisDisplay === "code");
});
