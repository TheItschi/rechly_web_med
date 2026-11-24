import test from "node:test";
import assert from "node:assert/strict";
import { computeUstva } from "../src/lib/taxReports";

const period = { from: "2026-01-01", to: "2026-12-31" };

test("§ 24 flat-rate lines are bucketed separately and never remitted", () => {
    const report = computeUstva(
        [
            { issue_date: "2026-03-01", status: "paid", tax_rate_percent: 7.8, net: 1000, tax: 78 },
            { issue_date: "2026-03-02", status: "sent", tax_rate_percent: 5.5, net: 200, tax: 11 },
            { issue_date: "2026-03-03", status: "paid", tax_rate_percent: 19, net: 100, tax: 19 },
        ],
        [{ date: "2026-03-05", vat_rate_percent: 19, amount_net: 50, vat_amount: 9.5, amount_gross: 59.5, category: "other" }],
        period,
    );
    assert.equal(report.flatRate24Net, 1200);
    assert.equal(report.flatRate24Tax, 89);
    assert.equal(report.taxFreeNet, 0);
    assert.equal(report.kz81Net, 100);
    // Zahllast contains only regular-taxed VAT minus Vorsteuer; § 24 tax is kept by the farmer.
    assert.equal(report.kz83Zahllast, 9.5);
});

test("reports without § 24 lines keep their previous figures", () => {
    const report = computeUstva(
        [{ issue_date: "2026-01-15", status: "paid", tax_rate_percent: 7, net: 100, tax: 7 }],
        [],
        period,
    );
    assert.equal(report.flatRate24Net, 0);
    assert.equal(report.flatRate24Tax, 0);
    assert.equal(report.kz86Net, 100);
    assert.equal(report.kz83Zahllast, 7);
});
