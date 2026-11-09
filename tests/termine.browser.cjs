const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { chromium } = require(process.env.RECHLY_PLAYWRIGHT_PATH || "playwright-core");
const origin = "http://127.0.0.1:3106";
(async () => {
    assert.equal(process.env.RECHLY_DATA_DIR, "/tmp/rechly-booking-test");
    assert.equal((await (await fetch(origin + "/api/desktop/health")).json()).storage, "sqlite");
    const seed = spawnSync(process.execPath, ["--import", "tsx", "tests/termine.seed.ts"], {
        encoding: "utf8",
        env: process.env,
    });
    assert.equal(seed.status, 0, seed.stderr);
    const browser = await chromium.launch({
        executablePath: process.env.RECHLY_CHROMIUM || "/usr/bin/chromium",
        args: ["--no-sandbox"],
        headless: true,
    });
    const page = await browser.newPage({
            viewport: { width: 1440, height: 1050 },
            timezoneId: "America/New_York",
        }),
        errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    async function api(path, body, method = "POST") {
        const r = await page.request.fetch(origin + path, { method, ...(body ? { data: body } : {}) });
        const result = await r.json();
        assert.ok(r.ok(), JSON.stringify(result));
        return result;
    }
    async function begin() {
        await page.goto(origin + "/buchen/test-studio");
        await page.getByRole("button", { name: /Persönliche Beratung/ }).click();
        await page.locator(".buchen-time").first().waitFor();
    }
    async function details() {
        await page.locator(".buchen-time").first().click();
        await page.getByRole("button", { name: "Weiter zu Ihren Angaben" }).click();
        await page.getByLabel("Name", { exact: true }).fill("Kim Beispiel");
        await page.getByLabel("E-Mail", { exact: true }).fill("browser-test@example.invalid");
    }
    try {
        await begin();
        await page.getByRole("button", { name: "Nächster Monat" }).click();
        await page.locator(".buchen-time").first().waitFor();
        await page.screenshot({ path: "/tmp/rechly-booking-desktop.png", fullPage: true });
        await details();
        let firstResponse;
        await page.route("**/api/termine/public/test-studio/appointments", async (route) => {
            const response = await route.fetch();
            firstResponse = await response.json();
            await route.abort("failed");
        });
        await page.getByRole("button", { name: "Verbindlich buchen" }).click();
        await page
            .getByRole("alert")
            .filter({ hasText: /fetch|Buchung/ })
            .waitFor();
        assert.ok(firstResponse.manageToken);
        await page.unroute("**/api/termine/public/test-studio/appointments");
        await page.getByRole("button", { name: "Verbindlich buchen" }).click();
        await page.getByRole("heading", { name: "Ihr Termin ist bestätigt" }).waitFor();
        const all = await api("/api/termine/appointments", null, "GET");
        assert.equal(all.appointments.length, 1);
        assert.match(
            await page.getByRole("link", { name: "Termin verwalten", exact: true }).getAttribute("href"),
            new RegExp(firstResponse.manageToken),
        );
        await page.getByRole("link", { name: "Termin verwalten", exact: true }).click();
        await page.getByRole("button", { name: "Termin verschieben", exact: true }).click();
        const dialog = page.getByRole("dialog");
        await dialog.locator(".buchen-time").last().waitFor();
        await dialog.locator(".buchen-time").last().click();
        await dialog.getByRole("button", { name: "Umbuchung bestätigen" }).click();
        await dialog.waitFor({ state: "hidden" });
        await page.getByText("Ihr Termin wurde verschoben.", { exact: true }).waitFor();
        const moved = await api("/api/termine/manage/" + firstResponse.manageToken, null, "GET");
        assert.notEqual(moved.appointment.startUtc, firstResponse.startUtc);
        const ics = await page.request.get(
            origin + "/api/termine/manage/" + firstResponse.manageToken + "/calendar",
        );
        assert.equal(ics.status(), 200);
        assert.match(await ics.text(), /STATUS:CONFIRMED/);
        await page.setViewportSize({ width: 390, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.screenshot({ path: "/tmp/rechly-booking-manage-mobile.png", fullPage: true });
        await page.getByRole("button", { name: "Termin stornieren", exact: true }).click();
        await page
            .getByRole("dialog")
            .getByRole("button", { name: "Ja, Termin stornieren", exact: true })
            .click();
        await page.getByText("Ihr Termin wurde storniert.", { exact: true }).waitFor();
        assert.equal(
            (await api("/api/termine/manage/" + firstResponse.manageToken, null, "GET")).appointment
                .canReschedule,
            false,
        );
        await api("/api/termine/settings", { confirmationMode: "manual" }, "PATCH");
        await begin();
        await page.getByRole("button", { name: "Nächster Monat" }).click();
        await page.locator(".buchen-time").first().waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.screenshot({ path: "/tmp/rechly-booking-mobile.png", fullPage: true });
        await details();
        const created = page.waitForResponse(
            (r) => r.url().endsWith("/public/test-studio/appointments") && r.request().method() === "POST",
        );
        await page.getByRole("button", { name: "Terminanfrage senden" }).click();
        const pending = await (await created).json();
        assert.equal(pending.status, "PENDING");
        await page.getByRole("heading", { name: "Ihre Anfrage ist eingegangen" }).waitFor();
        await api("/api/termine/appointments/" + pending.appointmentId, { status: "CONFIRMED" }, "PATCH");
        assert.equal(
            (await api("/api/termine/manage/" + pending.manageToken, null, "GET")).appointment.status,
            "CONFIRMED",
        );
        for (const query of ["from=2026-02-30", "days=NaN"]) {
            const r = await page.request.get(
                origin + "/api/termine/public/test-studio/availability?serviceId=consultation&" + query,
            );
            assert.equal(r.status(), 400);
        }
        const badOrigin = await page.request.post(
            origin + "/api/termine/manage/" + pending.manageToken + "/cancel",
            { headers: { Origin: "https://untrusted.example" } },
        );
        assert.equal(badOrigin.status(), 403);
        const foreign = await page.request.get(origin + "/api/termine/manage/" + "0".repeat(64));
        assert.equal(foreign.status(), 410);
        const profile = await api("/api/termine/public/test-studio", null, "GET");
        assert.equal("userId" in profile.business, false);
        const health = await api("/api/termine/health", null, "GET");
        assert.equal(health.mailConfigured, false);
        assert.ok(health.pending > 0);
        assert.equal(health.hasServices, true);
        assert.equal(health.hasHours, true);
        const invalidService = await page.request.patch(origin + "/api/termine/services/consultation", { data: { durationMinutes: -5 } });
        assert.equal(invalidService.status(), 400);
        const referencedService = await page.request.delete(origin + "/api/termine/services/consultation");
        assert.equal(referencedService.status(), 409);
        const privatePage = await page.request.get(origin + "/buchen/verwalten/" + pending.manageToken);
        assert.equal(privatePage.headers()["referrer-policy"], "no-referrer");
        assert.match(privatePage.headers()["x-robots-tag"], /noindex/);
        await page.setViewportSize({ width: 1440, height: 1050 });
        await page.goto(origin + "/dashboard/settings?tab=booking");
        await page.getByText("Buchungsseite & Benachrichtigungen", { exact: true }).waitFor();
        await page.getByText(/E-Mail-Versand ist nicht eingerichtet/).waitFor();
        await page.screenshot({ path: "/tmp/rechly-booking-settings.png", fullPage: true });
        assert.deepEqual(errors, []);
        console.log(
            "PASS: public booking, month navigation, response-loss retry, no duplicates, self-service reschedule/cancel, ICS, manual approval, mobile, invalid dates and origin checks.",
        );
    } catch (error) {
        await page.screenshot({ path: "/tmp/rechly-booking-failure.png", fullPage: true });
        console.error((await page.locator("body").innerText()).slice(-2500));
        throw error;
    } finally {
        await browser.close();
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
