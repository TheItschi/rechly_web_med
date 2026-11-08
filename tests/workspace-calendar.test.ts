import test from "node:test";
import assert from "node:assert/strict";
import { validateEvent, occurrences, exportCalendar, importCalendar } from "../src/lib/workspace/calendar";
const event = () => ({ title: "Planung", start: "2026-01-31T09:00", end: "2026-01-31T10:00", allDay: false, category: "work", location: "Büro", notes: "Grüße\nZeile 2; Köln", repeat: "none", interval: 1, until: "", exceptions: [], reminder: 15 });
test("calendar validates real dates, exclusive all-day bounds, duration and recurrence inputs", () => {
    for (const patch of [{ start: "2026-02-30T09:00" }, { end: "2026-01-31T08:00" }, { interval: 0 }, { interval: 31 }, { allDay: true }, { title: "" }, { reminder: 7 }, { exceptions: ["bad"] }, { until: "2025-01-01" }]) assert.throws(() => validateEvent({ ...event(), ...patch }, []));
    const e = validateEvent({ ...event(), start: "2026-02-01T00:00", end: "2026-02-04T00:00", allDay: true }, []);
    assert.equal(occurrences([e], "2026-02-03T00:00", "2026-02-04T00:00").length, 1);
    assert.equal(occurrences([e], "2026-02-04T00:00", "2026-02-05T00:00").length, 0);
});
test("monthly/leap-year recurrences skip missing dates and weekly rules respect exceptions", () => {
    const monthly = validateEvent({ ...event(), repeat: "monthly" }, []);
    assert.deepEqual(occurrences([monthly], "2026-02-01T00:00", "2026-04-02T00:00").map(e => e.occurrenceStart), ["2026-03-31T09:00"]);
    const weekly = validateEvent({ ...event(), repeat: "weekly", interval: 2, until: "2026-03-14", exceptions: ["2026-02-14"] }, []);
    assert.deepEqual(occurrences([weekly], "2026-01-01T00:00", "2026-04-01T00:00").map(e => e.occurrenceStart), ["2026-01-31T09:00", "2026-02-28T09:00", "2026-03-14T09:00"]);
    const leap = validateEvent({ ...event(), start: "2024-02-29T09:00", end: "2024-02-29T10:00", repeat: "yearly" }, []);
    assert.equal(occurrences([leap], "2026-02-01T00:00", "2026-03-01T00:00").length, 0);
});
test("calendar wall times stay stable across daylight-saving changes regardless of server zone", () => {
    const e = validateEvent({ ...event(), start: "2026-03-27T09:00", end: "2026-03-27T10:00", repeat: "daily" }, []);
    const result = occurrences([e], "2026-03-27T00:00", "2026-03-31T00:00");
    assert.equal(result.length, 4); assert.ok(result.every(e => e.occurrenceStart.endsWith("T09:00") && e.occurrenceEnd.endsWith("T10:00")));
});
test("ICS round trip preserves text, recurrence, exclusions, reminders, and all-day dates", () => {
    for (const patch of [{ repeat: "weekly", until: "2026-03-01", exceptions: ["2026-02-07"] }, { allDay: true, start: "2026-01-31T00:00", end: "2026-02-02T00:00" }]) {
        const e = validateEvent({ ...event(), ...patch }, []), imported = importCalendar(exportCalendar([e]), [], "Europe/Berlin")[0];
        for (const key of ["title","start","end","allDay","repeat","until","exceptions","reminder","notes","location"] as const) assert.deepEqual(imported[key], e[key], key);
    }
});
test("UTC one-off events use the requested browser zone, not the server zone", () => {
    const source = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:utc\r\nDTSTART:20260101T120000Z\r\nDTEND:20260101T130000Z\r\nSUMMARY:UTC\r\nEND:VEVENT\r\nEND:VCALENDAR";
    assert.equal(importCalendar(source, [], "Europe/Berlin")[0].start, "2026-01-01T13:00");
    assert.equal(importCalendar(source, [], "America/New_York")[0].start, "2026-01-01T07:00");
});
test("unsupported ICS semantics are refused before writing anything", () => {
    const source = exportCalendar([validateEvent({ ...event(), repeat: "weekly", until: "2026-03-01", exceptions: ["2026-02-07"] }, [])]);
    for (const invalid of [source.replace("FREQ=WEEKLY", "FREQ=WEEKLY;BYDAY=MO,WE"), source.replace("FREQ=WEEKLY", "FREQ=WEEKLY;COUNT=2"), source.replace("DTEND:", "DTEND;TZID=Europe/Berlin:"), source.replace("T235959", "T080000"), source.replace("EXDATE:20260207T090000", "EXDATE:20260207T120000"), source.replace("ACTION:DISPLAY", "ACTION:AUDIO")]) assert.throws(() => importCalendar(invalid, []));
    assert.throws(() => occurrences([], "2026-01-01T00:00", "2027-01-01T00:00"));
    assert.throws(() => importCalendar(source.replace(/^UID:.*\r?\n/m, ""), []), /UID/);
});
