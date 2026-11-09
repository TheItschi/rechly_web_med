import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Databases } from "node-appwrite";
import { getDesktopClients } from "../src/lib/desktop/appwrite-compat";
import { DB, T, TermineStore, recordId } from "../src/lib/termine/store";
import {
    createBooking,
    rescheduleBooking,
    cancelBooking,
    updateBooking,
    type SettingsRow,
} from "../src/lib/termine/booking";
import { wallToUtc } from "../src/lib/termine/time";
import { createDraftFromAppointment } from "../src/lib/termine/invoices";
import {
    confirmationEmail,
    bookingRequestEmail,
    newBookingRequestOwnerNotification,
    buildIcs,
} from "../src/lib/termine/notify";
import { WorkspaceStore } from "../src/lib/workspace/store";
import { calendarSnapshot } from "../src/lib/workspace/calendar-service";
import { deliverAppointment, deliverJob } from "../src/lib/termine/delivery";
import type { EmailMessage, OutboxRow } from "../src/lib/termine/notify";
import type { Row } from "../src/lib/termine/store";
import ICAL from "ical.js";
import { availableSlots } from "../src/lib/termine/slots";

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
    await db.createDocument(
        DB,
        T.SERVICES,
        `${user}-svc`,
        {
            userId: user,
            name: "Haarschnitt",
            durationMinutes: 30,
            priceCents: 2500,
            currency: "EUR",
            prepMinutes: 0,
            cleanupMinutes: 10,
            active: true,
            publicVisible: true,
            staffIds: [`${user}-anna`],
            sortOrder: 0,
        },
        perms,
    );
    await db.createDocument(
        DB,
        T.STAFF,
        `${user}-anna`,
        {
            userId: user,
            name: "Anna",
            active: true,
            bookable: true,
            serviceIds: [`${user}-svc`],
        },
        perms,
    );
    await db.createDocument(
        DB,
        T.HOURS,
        `${user}-hours-mon`,
        {
            userId: user,
            kind: "week",
            day: "1",
            closed: false,
            periods: JSON.stringify([{ start: "09:00", end: "12:00" }]),
            breaks: JSON.stringify([]),
        },
        perms,
    );
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

test("pausing the public booking page keeps manual scheduling available", async () => {
    const { user, store, settings } = await fixture();
    const paused = { ...(settings as SettingsRow), enabled: false, published: false };
    await assert.rejects(createBooking(store, paused, book(user, slot("09:00"))), /deaktiviert/);
    const result = await createBooking(store, paused, book(user, slot("09:00"), { source: "manual" }));
    assert.equal(result.appointment.status, "CONFIRMED");
});

test("rescheduling extends the original private link and repeating the move is a no-op", async () => {
    const { user, store, settings } = await fixture();
    const a = await createBooking(store, settings, book(user, slot("09:00")));
    const token = (await store.list<Row & { expiresAt: string }>(T.TOKENS))[0];
    const input = {
        appointmentId: a.appointment.$id,
        newStartUtc: wallToUtc("2026-02-02", "10:00", TZ)!,
        actor: "customer" as const,
        nowUtc: "2026-01-05T00:00:00.000Z",
    };
    await rescheduleBooking(store, settings, input);
    const extended = await store.own<Row & { expiresAt: string }>(T.TOKENS, token.$id);
    assert.ok(Date.parse(extended.expiresAt) > Date.parse(token.expiresAt));
    const jobs = (await store.list(T.OUTBOX)).length;
    await rescheduleBooking(store, settings, input);
    assert.equal((await store.list(T.OUTBOX)).length, jobs);
});

test("concurrent overlapping different starts share an interval guard", async () => {
    const { user, store, settings } = await fixture();
    const results = await Promise.allSettled([
        createBooking(store, settings, book(user, slot("09:00"))),
        createBooking(store, settings, book(user, slot("09:30"), { customerEmail: "other@example.de" })),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal((await store.list(T.APPOINTMENTS)).length, 1);
});

test("any staff selects an available colleague and retries return the original private link", async () => {
    const { user, store, settings } = await fixture();
    await db.updateDocument(DB, T.SERVICES, `${user}-svc`, { staffIds: [] });
    await db.createDocument(
        DB,
        T.STAFF,
        `${user}-bob`,
        { userId: user, name: "Bob", active: true, bookable: true, serviceIds: [] },
        store.perms(),
    );
    await createBooking(store, settings, book(user, slot("09:00"), { staffId: `${user}-anna` }));
    const request = book(user, slot("09:00"), {
        customerEmail: "next@example.de",
        idempotencyKey: "test-retry-key",
    });
    const a = await createBooking(store, settings, request),
        b = await createBooking(store, settings, request);
    assert.equal(a.appointment.staffId, `${user}-bob`);
    assert.equal(a.appointment.$id, b.appointment.$id);
    assert.equal(a.manageToken, b.manageToken);
    await assert.rejects(
        createBooking(store, settings, { ...request, customerName: "Different customer" }),
        /Buchungsschlüssel/,
    );
});

test("closed weekdays and existing preparation buffers block availability", async () => {
    const { user, store, settings } = await fixture();
    await db.updateDocument(DB, T.HOURS, `${user}-hours-mon`, { closed: true });
    await assert.rejects(createBooking(store, settings, book(user, slot("09:00"))), /verfügbar/);
    await db.updateDocument(DB, T.HOURS, `${user}-hours-mon`, { closed: false });
    await db.updateDocument(DB, T.SERVICES, `${user}-svc`, { prepMinutes: 20, cleanupMinutes: 0 });
    await assert.rejects(createBooking(store, settings, book(user, slot("09:00"))), /verfügbar/);
    await createBooking(store, settings, book(user, slot("10:00")));
    await db.updateDocument(DB, T.SERVICES, `${user}-svc`, { prepMinutes: 0 });
    await assert.rejects(createBooking(store, settings, book(user, slot("09:30"))), /verfügbar/);
});

test("rescheduling preserves booked duration and enforces destination notice", async () => {
    const { user, store, settings } = await fixture();
    const a = await createBooking(store, settings, book(user, slot("09:00")));
    await db.updateDocument(DB, T.SERVICES, `${user}-svc`, { durationMinutes: 90, cleanupMinutes: 0 });
    await assert.rejects(
        rescheduleBooking(
            store,
            { ...(settings as SettingsRow), minNoticeMinutes: 180 },
            {
                appointmentId: a.appointment.$id,
                newStartUtc: slot("10:00"),
                actor: "customer",
                nowUtc: "2026-01-12T07:00:00.000Z",
            },
        ),
        /verfügbar/,
    );
    const changed = await rescheduleBooking(store, settings, {
        appointmentId: a.appointment.$id,
        newStartUtc: slot("10:00"),
        actor: "customer",
        nowUtc: "2026-01-05T00:00:00.000Z",
    });
    assert.equal((Date.parse(changed.endUtc) - Date.parse(changed.startUtc)) / 60000, 40);
    assert.equal(changed.durationMinutes, 30);
});

test("notification leases, confirmation retry and cancellation messages are truthful", async () => {
    const { user, store, settings } = await fixture({ confirmationMode: "manual" });
    const a = await createBooking(store, settings, book(user, slot("09:00")));
    await updateBooking(store, a.appointment.$id, { status: "CONFIRMED" });
    const jobs = await store.list<Row & OutboxRow>(T.OUTBOX),
        confirmation = jobs.find((j) => j.kind === "booking_confirm")!;
    let calls = 0;
    const messages: EmailMessage[] = [];
    const sender = {
        send: async (message: EmailMessage) => {
            calls++;
            messages.push(message);
        },
    };
    const delivered = await Promise.all([
        deliverJob(store, confirmation.$id, sender),
        deliverJob(store, confirmation.$id, sender),
    ]);
    assert.equal(delivered.filter((r) => r === "sent").length, 1);
    assert.equal(calls, 1);
    assert.match(messages[0].text, /\/buchen\/verwalten\/[0-9a-f]{64}/);
    assert.doesNotMatch(messages[0].text, /https:\/\/https:/);
    const event = new ICAL.Component(ICAL.parse(messages[0].ics!.content)).getFirstSubcomponent("vevent")!;
    assert.equal(
        (event.getFirstPropertyValue("dtend") as ICAL.Time).toJSDate().getTime() -
            Date.parse(a.appointment.startUtc),
        30 * 60000,
    );
    await cancelBooking(store, settings, a.appointment.$id, "business");
    await deliverAppointment(store, a.appointment.$id, sender);
    assert.match(messages.at(-1)!.subject, /storniert/);
    assert.match(messages.at(-1)!.ics!.content, /STATUS:CANCELLED/);
    await assert.rejects(updateBooking(store, a.appointment.$id, { status: "CONFIRMED" }), /Statuswechsel/);
});

test("provider failure leaves durable retry with the same idempotency key", async () => {
    const { user, store, settings } = await fixture();
    const a = await createBooking(store, settings, book(user, slot("09:00")));
    const keys: string[] = [];
    const sender = {
        send: async (_message: EmailMessage, key?: string) => {
            keys.push(key!);
            if (keys.length === 1) throw new Error("offline");
        },
    };
    assert.equal(await deliverAppointment(store, a.appointment.$id, sender), "queued");
    const job = (await store.list<Row & OutboxRow>(T.OUTBOX))[0];
    assert.equal(job.attempts, 1);
    assert.equal(job.status, "pending");
    await db.updateDocument(DB, T.OUTBOX, job.$id, { nextAttemptAt: null });
    assert.equal(await deliverJob(store, job.$id, sender), "sent");
    assert.equal(keys[0], keys[1]);
});

test("a prepared confirmation is discarded after cancellation instead of being retried", async () => {
    const { user, store, settings } = await fixture();
    const booking = await createBooking(store, settings, book(user, slot("09:00")));
    await deliverAppointment(store, booking.appointment.$id, {
        send: async () => {
            throw new Error("connection lost");
        },
    });
    const job = (await store.list<Row & OutboxRow>(T.OUTBOX))[0];
    assert.ok(JSON.parse(job.payload).message);
    await cancelBooking(store, settings, booking.appointment.$id, "business");
    await db.updateDocument(DB, T.OUTBOX, job.$id, { nextAttemptAt: null });
    let sent = 0;
    assert.equal(
        await deliverJob(store, job.$id, {
            send: async () => {
                sent++;
            },
        }),
        "skipped",
    );
    assert.equal(sent, 0);
});

test("availability includes the neighbouring business day in the customer's time zone", async () => {
    const { user, store, settings } = await fixture();
    await db.updateDocument(DB, T.HOURS, `${user}-hours-mon`, {
        periods: JSON.stringify([{ start: "00:00", end: "02:00" }]),
    });
    const nextMonday = new Date();
    nextMonday.setUTCDate(nextMonday.getUTCDate() + ((8 - nextMonday.getUTCDay()) % 7) + 7);
    const monday = nextMonday.toISOString().slice(0, 10);
    nextMonday.setUTCDate(nextMonday.getUTCDate() - 1);
    const sunday = nextMonday.toISOString().slice(0, 10);
    const result = await availableSlots(
        store,
        settings,
        new URLSearchParams({
            serviceId: `${user}-svc`,
            from: sunday,
            days: "1",
            timezone: "America/Los_Angeles",
        }),
    );
    assert.ok(result.slots[sunday]?.some((s) => s.startUtc === wallToUtc(monday, "00:00", TZ)));
    assert.deepEqual(Object.keys(result.slots), [sunday]);
    await assert.rejects(
        availableSlots(
            store,
            settings,
            new URLSearchParams({ serviceId: `${user}-svc`, from: "2026-02-30" }),
        ),
        /Ungültiger/,
    );
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
    await assert.rejects(
        createBooking(store, settings, book(user, slot("09:30"), { customerEmail: "b@example.de" })),
        /nicht verfügbar|belegt|leider nicht/,
    );
    // 10:00 needs 10:00-10:40, busy until 09:40 -> wait no: 09:00 booking occupies until 09:40. 10:00 start is fine
    const ok = await createBooking(
        store,
        settings,
        book(user, slot("10:00"), { customerEmail: "c@example.de" }),
    );
    assert.ok(ok.appointment.$id);
});

test("cancel frees the slot; reschedule conflict keeps the original", async () => {
    const { user, store, settings } = await fixture();
    const a = await createBooking(store, settings, book(user, slot("09:00")));
    const b = await createBooking(
        store,
        settings,
        book(user, slot("10:30"), { customerEmail: "b@example.de" }),
    );
    // reschedule a onto b's slot -> conflict, a unchanged
    await assert.rejects(
        rescheduleBooking(store, settings, {
            appointmentId: a.appointment.$id,
            newStartUtc: slot("10:30"),
            actor: "business",
            nowUtc: "2026-01-05T00:00:00.000Z",
        }),
        /nicht verfügbar|belegt/,
    );
    const kept = (await store.own(T.APPOINTMENTS, a.appointment.$id)) as unknown as { startUtc: string };
    assert.equal(kept.startUtc, slot("09:00"));
    // cancel b -> its slot becomes bookable
    await cancelBooking(store, settings, b.appointment.$id, "business", "2026-01-05T00:00:00.000Z");
    const c = await createBooking(
        store,
        settings,
        book(user, slot("10:30"), { customerEmail: "c@example.de" }),
    );
    assert.equal(c.appointment.status, "CONFIRMED");
    // double cancel is rejected
    await assert.rejects(
        cancelBooking(store, settings, b.appointment.$id, "business", "2026-01-05T00:00:00.000Z"),
        /storniert/,
    );
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
        $id: "a1",
        serviceId: "s",
        staffId: "st",
        customerName: "Kim",
        customerEmail: "kim@example.de",
        startUtc: "2026-01-12T08:00:00.000Z",
        endUtc: "2026-01-12T08:40:00.000Z",
        businessTimezone: TZ,
        durationMinutes: 30,
        businessId: "u",
        serviceNameSnapshot: "Haarschnitt",
        servicePriceCents: 2500,
        currency: "EUR",
        status: "CONFIRMED",
        source: "public",
    } as unknown as Parameters<typeof confirmationEmail>[0];
    const msg = confirmationEmail(appt, "Salon 1", "https://maria.rechly.de/buchen/verwalten/tok", "de");
    assert.ok(msg.subject.includes("Haarschnitt"));
    assert.ok(msg.text.includes("Verwalten"));
    assert.ok(msg.ics?.content.includes("BEGIN:VCALENDAR"));
    const ics = buildIcs({ uid: "x1", startUtc: appt.startUtc, endUtc: appt.endUtc, summary: "Test" });
    assert.ok(ics.includes("DTSTART:20260112T080000Z"));
});

test("booking request email notifies customer without ICS and notifies business owner", () => {
    const appt = {
        $id: "a2",
        serviceId: "s",
        staffId: "st",
        customerName: "Sarah",
        customerEmail: "sarah@example.de",
        customerPhone: "+4912345678",
        customerNote: "Bitte ruhig arbeiten",
        startUtc: "2026-01-12T09:00:00.000Z",
        endUtc: "2026-01-12T09:30:00.000Z",
        businessTimezone: TZ,
        durationMinutes: 30,
        serviceNameSnapshot: "Massage",
        servicePriceCents: 5000,
        currency: "EUR",
        status: "PENDING",
        source: "public",
    } as unknown as Parameters<typeof bookingRequestEmail>[0];

    const customerMsg = bookingRequestEmail(
        appt,
        "Wellness Studio",
        "https://wellness.rechly.de/buchen/verwalten/tok2",
        "de",
    );
    assert.equal(customerMsg.to, "sarah@example.de");
    assert.ok(customerMsg.subject.includes("Buchungsanfrage erhalten"));
    assert.ok(customerMsg.text.includes("Massage"));
    assert.ok(customerMsg.text.includes("wird derzeit geprüft"));
    assert.equal(customerMsg.ics, undefined, "Pending booking request must not include calendar .ics");

    const ownerMsg = newBookingRequestOwnerNotification(
        appt,
        "owner@wellness.de",
        "Wellness Studio",
        "https://rechly.de/dashboard/calendar",
        "de",
    );
    assert.equal(ownerMsg.to, "owner@wellness.de");
    assert.ok(ownerMsg.subject.includes("Neue Terminanfrage von Sarah"));
    assert.ok(ownerMsg.text.includes("Massage"));
    assert.ok(ownerMsg.text.includes("Bitte ruhig arbeiten"));
});

test("booking links to Rechly clients CRM and reuses existing customer by email", async () => {
    const { user, store, settings } = await fixture();
    const first = await createBooking(
        store,
        settings,
        book(user, slot("09:00"), { customerName: "Max Mustermann", customerEmail: "MAX@example.de" }),
    );
    assert.ok(first.appointment.customerId, "booking should populate customerId");
    const client = (await db.getDocument(DB, "clients", first.appointment.customerId!)) as unknown as Record<
        string,
        unknown
    >;
    assert.equal(client.userId, user);
    assert.equal(client.name, "Max Mustermann");
    assert.equal(client.clientType, "person");
    assert.ok(typeof client.addressLine1 === "string" && client.addressLine1.length > 0);
    assert.ok(typeof client.postalCode === "string" && client.postalCode.length > 0);

    const second = await createBooking(
        store,
        settings,
        book(user, slot("10:00"), { customerName: "Max Mustermann", customerEmail: "max@example.de" }),
    );
    assert.equal(second.appointment.customerId, first.appointment.customerId);
});

test("invoice draft honors Kleinunternehmer (§19 UStG) and linked product VAT rate", async () => {
    const { user, store, settings } = await fixture();
    await db.createDocument(
        DB,
        "user_company",
        `${user}-company`,
        {
            userId: user,
            companyName: "Atelier Klein",
            isSmallBusiness: true,
            paymentTermsDefault: 7,
        },
        store.perms(),
    );

    const smallBizBooking = await createBooking(store, settings, book(user, slot("09:00")));
    await db.updateDocument(DB, T.APPOINTMENTS, smallBizBooking.appointment.$id, { status: "COMPLETED" });
    const draftZero = await createDraftFromAppointment(store, smallBizBooking.appointment.$id);
    const invZero = (await db.getDocument(DB, "invoices", draftZero.invoiceId)) as unknown as Record<
        string,
        unknown
    >;
    assert.equal(invZero.totalVat, 0);
    assert.equal(invZero.totalGross, 25);

    // Switch off small-business mode and link service to a 7% VAT product
    await db.updateDocument(DB, "user_company", `${user}-company`, { isSmallBusiness: false });
    await db.createDocument(
        DB,
        "products",
        `${user}-prod-7`,
        {
            userId: user,
            name: "Kulturleistung",
            unitPriceNet: 25,
            taxRatePercent: 7,
            unitOfMeasure: "Stunde",
            isActive: true,
        },
        store.perms(),
    );
    await db.updateDocument(DB, T.SERVICES, `${user}-svc`, { productId: `${user}-prod-7` });

    const reducedVatBooking = await createBooking(
        store,
        settings,
        book(user, slot("10:00"), { customerEmail: "vat7@example.de" }),
    );
    await db.updateDocument(DB, T.APPOINTMENTS, reducedVatBooking.appointment.$id, { status: "COMPLETED" });
    const draftSeven = await createDraftFromAppointment(store, reducedVatBooking.appointment.$id);
    const invSeven = (await db.getDocument(DB, "invoices", draftSeven.invoiceId)) as unknown as Record<
        string,
        unknown
    >;
    assert.equal(invSeven.totalVat, 1.75);
    assert.equal(invSeven.totalGross, 26.75);
});

test("unified calendarSnapshot merges Termine bookings and blocks in business wall-clock time", async () => {
    const { user, store, settings } = await fixture();
    const booked = await createBooking(
        store,
        settings,
        book(user, slot("09:00"), { customerName: "Clara Kalender" }),
    );
    await db.createDocument(
        DB,
        T.BLOCKS,
        `${user}-blk`,
        {
            userId: user,
            staffId: `${user}-anna`,
            startUtc: slot("11:00"),
            endUtc: slot("11:30"),
            reason: "Team-Pause",
        },
        store.perms(),
    );

    const wsStore = new WorkspaceStore(db, user);
    const snap = await calendarSnapshot(wsStore, `${MONDAY}T00:00`, "2026-01-19T00:00");
    assert.equal(snap.termineConfigured, true);
    assert.equal(snap.bookings.length, 1);
    assert.equal(snap.bookings[0].id, booked.appointment.$id);
    assert.equal(snap.bookings[0].wallStart, `${MONDAY}T09:00`);
    assert.equal(snap.bookings[0].wallEnd, `${MONDAY}T09:40`);
    assert.equal(snap.bookings[0].staffName, "Anna");
    assert.equal(snap.blocks.length, 1);
    assert.equal(snap.blocks[0].reason, "Team-Pause");
    assert.equal(snap.blocks[0].wallStart, `${MONDAY}T11:00`);
});
