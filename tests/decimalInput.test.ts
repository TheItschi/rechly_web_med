import test from "node:test";
import assert from "node:assert/strict";
import { parseDecimalInput } from "../src/lib/decimalInput";

test("decimal entry accepts comma, dot and pasted euro prices without multiplying cents", () => {
    for (const [input, expected] of [
        ["1,25", 1.25], ["1.25", 1.25], ["0,05", 0.05], ["0.05", 0.05],
        ["1,", 1], ["1.", 1], [",25", 0.25], [".25", 0.25], ["0", 0],
        ["1.234,56", 1234.56], ["1,234.56", 1234.56], [" 1,25 € ", 1.25],
        ["1234.56", 1234.56], ["1.250", 1.25], ["-1,25", -1.25],
    ] as const) assert.equal(parseDecimalInput(input), expected, input);
});

test("invalid and incomplete amounts are never silently truncated to a valid price", () => {
    for (const input of [undefined, "", " ", "abc", "1,2,3", "1.2.3", "1,25xyz", "1e3", "Infinity", "1.23,45", "1 25", "1/2", ",", "."])
        assert.ok(Number.isNaN(parseDecimalInput(input)), String(input));
});
