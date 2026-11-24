import test from "node:test";
import assert from "node:assert/strict";
import { EU_COUNTRIES, euCountryOptions, isEuCountryName } from "../src/lib/euCountries";

test("EU country list covers all 27 member states with Germany first", () => {
    assert.equal(EU_COUNTRIES.length, 27);
    assert.equal(EU_COUNTRIES[0].code, "DE");
    assert.equal(EU_COUNTRIES[0].de, "Deutschland");
    const codes = new Set(EU_COUNTRIES.map((c) => c.code));
    for (const code of ["AT", "FR", "PL", "NL", "IE", "ES", "IT", "SE", "GR", "HR"]) {
        assert.ok(codes.has(code), code);
    }
    // No third countries.
    for (const code of ["CH", "GB", "US", "NO", "TR"]) {
        assert.equal(codes.has(code), false, code);
    }
});

test("options are localized, store the German canonical name, Germany first", () => {
    const de = euCountryOptions("de");
    assert.deepEqual(de[0], { value: "Deutschland", label: "Deutschland" });
    const en = euCountryOptions("en");
    assert.deepEqual(en[0], { value: "Deutschland", label: "Germany" });
    assert.ok(en.some((o) => o.value === "Österreich" && o.label === "Austria"));
});

test("legacy non-EU values stay visible as a preserved option", () => {
    const options = euCountryOptions("de", "Schweiz");
    assert.equal(options.length, 28);
    assert.equal(options[0].value, "Schweiz");
    // EU values are not duplicated, name or code alike.
    assert.equal(euCountryOptions("de", "Österreich").length, 27);
    assert.equal(isEuCountryName("Deutschland"), true);
    assert.equal(isEuCountryName("DE"), true);
    assert.equal(isEuCountryName("Schweiz"), false);
    assert.equal(isEuCountryName(""), false);
});
