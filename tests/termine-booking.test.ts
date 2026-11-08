import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Databases } from "node-appwrite";
import { getDesktopClients } from "../src/lib/desktop/appwrite-compat";
import { DB, T, TermineStore, recordId } from "../src/lib/termine/store";
import { createBooking, rescheduleBooking, cancelBooking } from "../src/lib/termine/booking";
import { wallToUtc } from "../src/lib/termine/time";
import { createDraftFromAppointment } from "../src/lib/termine/invoices";
import { confirmationEmail, buildIcs } from "../src/lib/termine/notify";

process.env.RECHLY_DATA_DIR = mkdtempSync(join(tmpdir(), "rechly-termine-"));
const db = getDesktopClients().databases as unknown as Databases;

const TZ = "Europe/Berlin";
let serial = 0;

async function fixture(opts: { confirmationMode?: string; minNoticeMinutes?: number } = {}) {
    const user = `biz-${++serial}`;
    const store = new TermineStore(db, user);
    const perms = store.perms();
    const settings = {
        userId: user,
        slug: `salon-${serial}`,
        displayName: `Salon ${serial}`,
        timezone: TZ,
        language: "de",
        slotIntervalMinutes: 30,
        minNoticeMinutes: opts.minNoticeMinutes ?? 0,
        maxHorizonDays: 60,
        cancelNoticeMinutes: 60,
        rescheduleNoticeMinutes: 60,
        confirmationMode: opts.confirmationMode ?? "automatic",
        allowAnyStaff: true,
        showPrices: true,
        enabled: true,
        published: true,
        currency: "EUR",
    };
    await db.createDocument(DB, T.SETTINGS, recordId(user, "settings"), settings, perms);
    await db.createDocument(DB, T.SLUGS, settings.slug, { userId: user }, perms);
    await db.createDocument(DB, T.SERVICES, `${user}-svc`, {
        userId: user, name: "Haarschnitt", durationMinutes: 30, priceCents: 2500,
        currency: "EUR", prepMinutes: 0, cleanupMinutes: 10, active: true,
        publicVisible: true, staffIds: [`${user}-anna`], sortOrder: 0,
    }, perms);
    await db.createDocument(DB, T.STAFF, `${user}-anna`, {
        userId: user, name: "Anna", active: true, bookable: true, serviceIds: [`${user}-svc`],
    }, perms);
    await db.createDocument(DB, T.HOURS, `${user}-hours-mon`, {
        userId: user, kind: "week", day: "1", closed: false,
        periods: JSON.stringify([{ start: "09:00", end: "12:00" }]), breaks: JSON.stringify([]),
    }, perms);
    return { user, store, settings: settings as never };
}

const MONDAY = "2026-01-12"; // a Monday
const slot = (wall: string) => wallToUtc(MONDAY, wall, TZ)!;
const book = (user: string, startUtc: string, extra = {}) => ({
    serviceId: `${user}-svc`,
    startUtc,
    customerName: "Kim Kunde",
    customerEmail: "kim@example.de",
    source: "public" as const,
    nowUtc: "2026-01-05T00:00:00.000Z",
    ...extra,
});

test("concurrent bookings for the same slot: exactly one wins", async () => {
    const { user, store, settings } = await fixture();
    const results = await Promise.allSettled(
        Array.from({ length: 8 }, (_, i) =>
            createBooking(store, settings, book(user, slot("09:00"), { customerEmail: `k${i}@example.de` })),
        ),
    );
    const won = results.filter((r) => r.status === "fulfilled");
    const lost = results.filter((r) => r.status === "rejected");
    assert.equal(won.length, 1);
    assert.ok(lost.every((r) => (r as PromiseRejectedResult).reason?.status === 409));
    const appts = await store.list(T.APPOINTMENTS);
    assert.equal(appts.length, 1);
});

test("overlapping starts with different times and buffers conflict", async () => {
    const { user, store, settings } = await fixture();
    await createBooking(store, settings, book(user, slot("09:00")));
    // 09:30 overlaps the 09:00-09:40 occupied window (30min + 10 cleanup)
    await assert.rejects(createBooking(store, settings, book(user, slot("09:30"), { customerEmail: "b@example.de" })), /nicht verfügbar|belegt|leider nicht/);
    // 10:00 needs 10:00-10:40, busy until 09:40 -> wait no: 09:00 booking occupies until 09:40. 10:00 start is fine
    const ok = await createBooking(store, settings, book(user, slot("10:00"), { customerEmail: "c@example.de" }));
    assert.ok(ok.appointment.$id);
});

test("cancel frees the slot; reschedule conflict keeps the original", async () => {
    const { user, store, settings } = await fixture();
    const a = await createBooking(store, settings, book(user, slot("09:00")));
    const b = await createBooking(store, settings, book(user, slot("10:30"), { customerEmail: "b@example.de" }));
    // reschedule a onto b's slot -> conflict, a unchanged
    await assert.rejects(
        rescheduleBooking(store, settings, { appointmentId: a.appointment.$id, newStartUtc: slot("10:30"), actor: "business", nowUtc: "2026-01-05T00:00:00.000Z" }),
        /nicht verfügbar|belegt/,
    );
    const kept = (await store.own(T.APPOINTMENTS, a.appointment.$id)) as unknown as { startUtc: string };
    assert.equal(kept.startUtc, slot("09:00"));
    // cancel b -> its slot becomes bookable
    await cancelBooking(store, settings, b.appointment.$id, "business", "2026-01-05T00:00:00.000Z");
    const c = await createBooking(store, settings, book(user, slot("10:30"), { customerEmail: "c@example.de" }));
    assert.equal(c.appointment.status, "CONFIRMED");
    // double cancel is rejected
    await assert.rejects(cancelBooking(store, settings, b.appointment.$id, "business", "2026-01-05T00:00:00.000Z"), /storniert/);
});

test("completed appointment creates exactly one draft invoice", async () => {
    const { user, store, settings } = await fixture();
    const a = await createBooking(store, settings, book(user, slot("09:00")));
    await assert.rejects(createDraftFromAppointment(store, a.appointment.$id), /abgeschlossene/);
    await db.updateDocument(DB, T.APPOINTMENTS, a.appointment.$id, { status: "COMPLETED" });
    const first = await createDraftFromAppointment(store, a.appointment.$id);
    assert.ok(first.invoiceId);
    assert.match(first.invoiceNumber, /^TN-\d{8}-\d{4}$/);
    const second = await createDraftFromAppointment(store, a.appointment.$id);
    assert.equal(second.invoiceId, first.invoiceId);
    assert.equal(second.existed, true);
});

test("confirmation email and ICS are well-formed", () => {
    const appt = {
        $id: "a1", serviceId: "s", staffId: "st", customerName: "Kim",
        customerEmail: "kim@example.de", startUtc: "2026-01-12T08:00:00.000Z",
        endUtc: "2026-01-12T08:40:00.000Z", businessTimezone: TZ, durationMinutes: 30,
        businessId: "u", serviceNameSnapshot: "Haarschnitt", servicePriceCents: 2500,
        currency: "EUR", status: "CONFIRMED", source: "public",
    } as unknown as Parameters<typeof confirmationEmail>[0];
    const msg = confirmationEmail(appt, "Salon 1", "https://maria.rechly.de/buchen/verwalten/tok", "de");
    assert.ok(msg.subject.includes("Haarschnitt"));
    assert.ok(msg.text.includes("Verwalten"));
    assert.ok(msg.ics?.content.includes("BEGIN:VCALENDAR"));
    const ics = buildIcs({ uid: "x1", startUtc: appt.startUtc, endUtc: appt.endUtc, summary: "Test" });
    assert.ok(ics.includes("DTSTART:20260112T080000Z"));
});
