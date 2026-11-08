import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeSlug, validateSlug, slugFromHost, RESERVED_SLUGS } from "../src/lib/termine/slug";
import { canTransition } from "../src/lib/termine/types";
import {
    addMinutesUtc,
    dateInTz,
    intervalsOverlap,
    minutesBetweenUtc,
    wallToMinutes,
    wallToUtc,
} from "../src/lib/termine/time";

describe("slug", () => {
    it("normalizes umlauts, spaces and case", () => {
        assert.equal(normalizeSlug("Marias Schönheits-Salon!"), "marias-schoenheits-salon");
        assert.equal(normalizeSlug("  Barbershop  "), "barbershop");
        assert.equal(normalizeSlug("Friseur Müller & Söhne"), "friseur-mueller-soehne");
    });

    it("rejects reserved and invalid slugs", () => {
        assert.equal(validateSlug(""), "empty");
        assert.equal(validateSlug("api"), "reserved");
        assert.equal(validateSlug("termine"), "reserved");
        assert.equal(validateSlug("UPPER"), "invalid");
        assert.equal(validateSlug("-lead"), "invalid");
        assert.equal(validateSlug("ok-slug-1"), null);
        assert.ok(RESERVED_SLUGS.has("www"));
    });

    it("extracts tenant slug from Host", () => {
        assert.equal(slugFromHost("maria.rechly.de", "rechly.de"), "maria");
        assert.equal(slugFromHost("maria.rechly.de:3000", "rechly.de"), "maria");
        assert.equal(slugFromHost("rechly.de", "rechly.de"), null);
        assert.equal(slugFromHost("api.rechly.de", "rechly.de"), null);
        assert.equal(slugFromHost("a.b.rechly.de", "rechly.de"), null);
        assert.equal(slugFromHost("evil.com", "rechly.de"), null);
        assert.equal(slugFromHost(null, "rechly.de"), null);
    });
});

describe("time", () => {
    it("parses wall times", () => {
        assert.equal(wallToMinutes("09:00"), 540);
        assert.equal(wallToMinutes("9:30"), 570);
        assert.throws(() => wallToMinutes("24:00"));
        assert.throws(() => wallToMinutes("abc"));
    });

    it("converts wall to UTC in Europe/Berlin (winter +1)", () => {
        assert.equal(wallToUtc("2026-01-15", "09:00", "Europe/Berlin"), "2026-01-15T08:00:00.000Z");
    });

    it("converts wall to UTC in summer (+2)", () => {
        assert.equal(wallToUtc("2026-07-15", "09:00", "Europe/Berlin"), "2026-07-15T07:00:00.000Z");
    });

    it("returns null for the spring-forward gap (2026-03-29 02:30 does not exist)", () => {
        assert.equal(wallToUtc("2026-03-29", "02:30", "Europe/Berlin"), null);
        assert.ok(wallToUtc("2026-03-29", "03:30", "Europe/Berlin"));
    });

    it("resolves the autumn overlap deterministically (2026-10-25 02:30 occurs twice)", () => {
        // dayjs picks the second occurrence (+01:00); what matters is stability,
        // not which fold half wins. The engine always maps the same input to the same instant.
        const first = wallToUtc("2026-10-25", "02:30", "Europe/Berlin");
        const second = wallToUtc("2026-10-25", "02:30", "Europe/Berlin");
        assert.ok(first);
        assert.equal(first, second);
        assert.equal(dateInTz(first!, "Europe/Berlin"), "2026-10-25");
    });

    it("adds minutes across midnight", () => {
        assert.equal(addMinutesUtc("2026-01-15T23:30:00.000Z", 60), "2026-01-16T00:30:00.000Z");
        assert.equal(minutesBetweenUtc("2026-01-15T08:00:00.000Z", "2026-01-15T09:30:00.000Z"), 90);
    });

    it("detects overlaps, touching edges excluded", () => {
        assert.equal(intervalsOverlap("2026-01-01T09:00:00Z", "2026-01-01T10:00:00Z", "2026-01-01T09:30:00Z", "2026-01-01T10:30:00Z"), true);
        assert.equal(intervalsOverlap("2026-01-01T09:00:00Z", "2026-01-01T10:00:00Z", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z"), false);
        assert.equal(intervalsOverlap("2026-01-01T09:00:00Z", "2026-01-01T10:00:00Z", "2026-01-01T08:00:00Z", "2026-01-01T09:00:00Z"), false);
    });
});

describe("status machine", () => {
    it("allows legal transitions only", () => {
        assert.equal(canTransition("PENDING", "CONFIRMED"), true);
        assert.equal(canTransition("CONFIRMED", "COMPLETED"), true);
        assert.equal(canTransition("CONFIRMED", "CANCELLED_BY_CUSTOMER"), true);
        assert.equal(canTransition("COMPLETED", "CONFIRMED"), false);
        assert.equal(canTransition("CANCELLED_BY_BUSINESS", "CONFIRMED"), false);
        assert.equal(canTransition("PENDING", "COMPLETED"), false);
    });
});
