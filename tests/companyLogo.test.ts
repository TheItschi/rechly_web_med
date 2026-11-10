import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPdfSafeLogo } from "../src/lib/companyLogo";

describe("company logo helpers", () => {
    it("accepts PNG and JPEG data URLs (incl. jpg alias and params)", () => {
        assert.equal(isPdfSafeLogo("data:image/png;base64,iVBORw0KGgo="), true);
        assert.equal(isPdfSafeLogo("data:image/jpeg;base64,/9j/"), true);
        assert.equal(isPdfSafeLogo("data:image/jpg;base64,/9j/"), true);
        assert.equal(isPdfSafeLogo("data:image/PNG;base64,iVBORw0KGgo="), true);
        assert.equal(isPdfSafeLogo("data:image/png;name=logo.png;base64,iVBORw0KGgo="), true);
    });

    it("rejects vector/unsupported formats and non-data URLs", () => {
        assert.equal(isPdfSafeLogo("data:image/webp;base64,UklGRg=="), false);
        assert.equal(isPdfSafeLogo("data:image/gif;base64,R0lGODlh"), false);
        assert.equal(isPdfSafeLogo("data:image/svg+xml;base64,PHN2Zz4="), false);
        assert.equal(isPdfSafeLogo("data:image/svg+xml;utf8,<svg/>"), false);
        assert.equal(isPdfSafeLogo("https://example.com/logo.png"), false);
        assert.equal(isPdfSafeLogo(undefined), false);
        assert.equal(isPdfSafeLogo(null), false);
        assert.equal(isPdfSafeLogo(""), false);
        assert.equal(isPdfSafeLogo("data:image/png,iVBORw0KGgo="), false);
    });
});
