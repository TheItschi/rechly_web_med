import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeAvailability, type EngineInput } from "../src/lib/termine/availability";
import { wallToUtc } from "../src/lib/termine/time";

const TZ = "Europe/Berlin";
const SERVICE = {
    id: "svc1",
    name: "Haarschnitt",
    durationMinutes: 30,
    priceCents: 2500,
    currency: "EUR",
    prepMinutes: 0,
    cleanupMinutes: 10,
    active: true,
    publicVisible: true,
    staffIds: ["anna", "bob"],
    sortOrder: 0,
};
const STAFF = [
    { id: "anna", name: "Anna", active: true, bookable: true, serviceIds: ["svc1"] },
    { id: "bob", name: "Bob", active: true, bookable: true, serviceIds: ["svc1"] },
];
const WEEK = {
    "1": { periods: [{ start: "09:00", end: "12:00" }], breaks: [] },
};

function base(over: Partial<EngineInput> = {}): EngineInput {
    return {
        service: SERVICE,
        staff: STAFF,
        week: WEEK,
        overrides: [],
        blocks: [],
        appointments: [],
        settings: { timezone: TZ, slotIntervalMinutes: 30, minNoticeMinutes: 0, maxHorizonDays: 30 },
        ...over,
    };
}

const Q = { serviceId: "svc1", fromDate: "2026-01-12", days: 1, nowUtc: "2026-01-05T00:00:00.000Z" }; // Monday

describe("availability engine", () => {
    it("generates slots for a simple morning (30min service + 10min cleanup in 30min grid)", () => {
        const slots = computeAvailability(base(), Q).filter((s) => s.staffId === "anna");
        const times = slots.map((s) => s.startUtc);
        assert.deepEqual(times, [
            wallToUtc("2026-01-12", "09:00", TZ)!,
            wallToUtc("2026-01-12", "09:30", TZ)!,
            wallToUtc("2026-01-12", "10:00", TZ)!,
            wallToUtc("2026-01-12", "10:30", TZ)!,
            wallToUtc("2026-01-12", "11:00", TZ)!,
        ]);
    });

    it("excludes booked intervals including cleanup buffers", () => {
        const booked = wallToUtc("2026-01-12", "09:30", TZ)!!;
        const slots = computeAvailability(
            base({ appointments: [{ staffId: "anna", startUtc: booked, endUtc: wallToUtc("2026-01-12", "10:10", TZ)!!, status: "CONFIRMED" }] }),
            Q,
        ).filter((s) => s.staffId === "anna");
        const times = slots.map((s) => s.startUtc);
        // 09:00 overlaps (needs until 09:40 incl cleanup) and 09:30 is taken; 10:00 needs 10:00-10:40, busy until 10:10 -> out
        assert.deepEqual(times, [wallToUtc("2026-01-12", "10:30", TZ)!, wallToUtc("2026-01-12", "11:00", TZ)!]);
    });

    it("any-staff mode returns one slot per start with deterministic staff", () => {
        const slots = computeAvailability(base(), Q);
        const byStart = new Map<string, string[]>();
        for (const s of slots) byStart.set(s.startUtc, [...(byStart.get(s.startUtc) ?? []), s.staffId]);
        for (const [, ids] of byStart) assert.deepEqual(ids, ["anna"]);
    });

    it("respects breaks, overrides, blocks and notice", () => {
        const withBreak = base({
            week: { "1": { periods: [{ start: "09:00", end: "12:00" }], breaks: [{ start: "10:00", end: "10:30" }] } },
        });
        const times = computeAvailability(withBreak, Q).filter((s) => s.staffId === "anna").map((s) => s.startUtc);
        assert.ok(!times.includes(wallToUtc("2026-01-12", "09:30", TZ)!));
        assert.ok(times.includes(wallToUtc("2026-01-12", "10:30", TZ)!));

        const closed = computeAvailability(base({ overrides: [{ date: "2026-01-12", closed: true }] }), Q);
        assert.equal(closed.length, 0);

        const blocked = computeAvailability(
            base({ blocks: [{ id: "b1", staffId: "anna", startUtc: wallToUtc("2026-01-12", "09:00", TZ)!!, endUtc: wallToUtc("2026-01-12", "12:00", TZ)!! }] }),
            Q,
        );
        assert.ok(blocked.every((s) => s.staffId !== "anna"));

        const notice = computeAvailability(base(), {
            ...Q,
            nowUtc: "2026-01-12T07:50:00.000Z", // 08:50 Berlin, 10min before 09:00 with 60min notice
        });
        const withNotice = base();
        withNotice.settings = { ...withNotice.settings, minNoticeMinutes: 60 };
        const times2 = computeAvailability(withNotice, { ...Q, nowUtc: "2026-01-12T07:50:00.000Z" })
            .filter((s) => s.staffId === "anna")
            .map((s) => s.startUtc);
        assert.ok(!times2.includes(wallToUtc("2026-01-12", "09:00", TZ)!));
        assert.ok(notice.length >= 0);
    });

    it("handles inactive staff and services with no eligible staff", () => {
        const noStaff = computeAvailability(
            base({ staff: STAFF.map((s) => ({ ...s, active: false })) }),
            Q,
        );
        assert.equal(noStaff.length, 0);
        const other = computeAvailability(base(), { ...Q, staffId: "carol" });
        assert.equal(other.length, 0);
    });
});
