import test from "node:test";
import assert from "node:assert/strict";
import ICAL from "ical.js";
import { canonicalInstant, wallToUtc } from "../src/lib/termine/time";
import { validateSettingsPatch } from "../src/lib/termine/settings-validation";
import { buildIcs } from "../src/lib/termine/notify";

test("booking instants reject invalid dates and normalize explicit offsets", () => {
    for (const value of ["2026-02-30T10:00Z", "2026-01-01T24:00Z", "2026-01-01T10:00", "nonsense"])
        assert.throws(() => canonicalInstant(value));
    assert.equal(canonicalInstant("2026-01-12T09:30+01:00"), "2026-01-12T08:30:00.000Z");
    assert.equal(wallToUtc("2026-10-25", "02:30", "Europe/Berlin"), "2026-10-25T00:30:00.000Z");
    assert.equal(wallToUtc("2026-03-29", "02:30", "Europe/Berlin"), null);
});

test("booking settings reject unsafe links, invalid zones and misleading boolean strings", () => {
    for (const patch of [
        { website: "javascript:alert(1)" },
        { website: "https://user:password@example.com" },
        { timezone: "Europe/Fake" },
        { enabled: "false" },
        { maxHorizonDays: 0 },
        { minNoticeMinutes: "30" },
        { confirmationMode: "maybe" },
    ])
        assert.throws(() => validateSettingsPatch(patch));
    assert.equal(validateSettingsPatch({ timezone: "UTC", maxHorizonDays: 365 }).timezone, "UTC");
    assert.equal(
        validateSettingsPatch({ timezone: "America/Argentina/Buenos_Aires" }).timezone,
        "America/Argentina/Buenos_Aires",
    );
});

test("calendar export escapes customer text without injecting additional events", () => {
    const text = "Beratung, groß; freundlich\r\nEND:VEVENT\r\nBEGIN:VEVENT";
    const content = buildIcs({
        uid: "sample",
        startUtc: "2026-01-12T09:00:00Z",
        endUtc: "2026-01-12T09:30:00Z",
        summary: text,
        description: "Mehrzeilig\nZweite Zeile",
        cancelled: true,
    });
    const cal = new ICAL.Component(ICAL.parse(content));
    assert.equal(cal.getAllSubcomponents("vevent").length, 1);
    assert.equal(
        cal.getFirstSubcomponent("vevent")!.getFirstPropertyValue("summary"),
        text.replace(/\r/g, ""),
    );
    assert.equal(cal.getFirstSubcomponent("vevent")!.getFirstPropertyValue("status"), "CANCELLED");
});
