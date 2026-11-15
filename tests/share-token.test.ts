import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateShareToken, isValidShareToken } from "../src/lib/shareToken";

describe("share token", () => {
    it("generates 32-char URL-safe tokens that validate", () => {
        for (let i = 0; i < 50; i++) {
            const token = generateShareToken();
            assert.equal(token.length, 32);
            assert.equal(isValidShareToken(token), true);
        }
    });

    it("generates unique tokens", () => {
        const seen = new Set(Array.from({ length: 200 }, () => generateShareToken()));
        assert.equal(seen.size, 200);
    });

    it("rejects malformed tokens", () => {
        for (const bad of ["", "short", "a".repeat(31), "a".repeat(33), "a".repeat(31) + "!", "a".repeat(31) + "/", null, undefined, 42, {}]) {
            assert.equal(isValidShareToken(bad), false, String(bad));
        }
    });
});
