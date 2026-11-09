// Disposable local browser-test data only. Never run against Appwrite.
import assert from "node:assert/strict";
import { getDesktopClients } from "../src/lib/desktop/appwrite-compat";
import { T, DB, recordId } from "../src/lib/termine/store";
async function main() {
    assert.equal(process.env.RECHLY_DATA_DIR, "/tmp/rechly-booking-test");
    const db = getDesktopClients().databases,
        userId = "desktop-local-user";
    for (const collection of Object.values(T)) {
        const rows = await db.listDocuments(DB, collection, []);
        for (const row of rows.documents) await db.deleteDocument(DB, collection, row.$id);
    }
    await db.createDocument(DB, T.SETTINGS, recordId(userId, "settings"), {
        userId,
        slug: "test-studio",
        displayName: "Studio Nord",
        description: "Zeit für gute Beratung. Buchen Sie Ihren persönlichen Termin direkt online.",
        timezone: "Europe/Berlin",
        language: "de",
        slotIntervalMinutes: 30,
        minNoticeMinutes: 60,
        maxHorizonDays: 90,
        cancelNoticeMinutes: 0,
        rescheduleNoticeMinutes: 0,
        confirmationMode: "automatic",
        allowAnyStaff: true,
        showPrices: true,
        enabled: true,
        published: true,
        currency: "EUR",
        address: "Musterstraße 12, Berlin",
    });
    await db.createDocument(DB, T.SLUGS, "test-studio", { userId });
    await db.createDocument(DB, T.SERVICES, "consultation", {
        userId,
        name: "Persönliche Beratung",
        description: "Gemeinsam besprechen wir Ihre Ziele und planen die nächsten Schritte.",
        category: "Beratung",
        durationMinutes: 45,
        priceCents: 9900,
        currency: "EUR",
        prepMinutes: 15,
        cleanupMinutes: 15,
        active: true,
        publicVisible: true,
        staffIds: [],
        sortOrder: 0,
    });
    for (const name of ["Anna", "Ben"])
        await db.createDocument(DB, T.STAFF, name.toLowerCase(), {
            userId,
            name,
            active: true,
            bookable: true,
            serviceIds: ["consultation"],
        });
    for (let day = 0; day < 7; day++)
        await db.createDocument(DB, T.HOURS, "test-day-" + day, {
            userId,
            kind: "week",
            day: String(day),
            closed: false,
            periods: JSON.stringify([{ start: "09:00", end: "17:00" }]),
            breaks: JSON.stringify([{ start: "12:00", end: "13:00" }]),
        });
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
