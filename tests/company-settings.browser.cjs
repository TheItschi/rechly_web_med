// Only run against an isolated local SQLite server, never against customer data.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.RECHLY_PLAYWRIGHT_PATH || "playwright-core");
const origin = process.env.RECHLY_COMPANY_URL || "http://127.0.0.1:3117";
(async () => {
    assert.equal(process.env.RECHLY_DATA_DIR, "/tmp/rechly-company-settings-test");
    assert.ok(/^http:\/\/127\.0\.0\.1:\d+$/.test(origin));
    const browser = await chromium.launch({ executablePath: process.env.RECHLY_CHROMIUM || "/usr/bin/chromium", args: ["--no-sandbox"] });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        const health = await page.request.get(origin + "/api/desktop/health");
        assert.equal((await health.json()).storage, "sqlite");
        const seed = { name: "Test Flächenwerbung GmbH", address_line1: "Musterstraße 10", postal_code: "50667", city: "Köln", email: "test@example.invalid", bank_iban: "DE89370400440532013000", bank_bic: "COBADEFFXXX", payment_terms_default: "Zahlbar innerhalb von 14 Tagen.", logo_base64: "", e_invoice: {} };
        assert.equal((await page.request.post(origin + "/api/company", { data: seed })).status(), 200);
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(origin + "/dashboard/settings");
        const name = page.locator('input[id="name"]');
        await page.waitForFunction(() => document.getElementById("name")?.value === "Test Flächenwerbung GmbH");
        await name.fill("Test Flächenwerbung GmbH – aktualisiert");
        await page.locator('input[id="bank_iban"]').fill("de89 3704 0044 0532 0130 00");
        const save = page.getByRole("button", { name: /Speichern$/ });
        const response = page.waitForResponse((r) => r.url().endsWith("/api/company") && r.request().method() === "POST");
        await save.click(); assert.equal((await response).status(), 200);
        await page.reload();
        await page.waitForFunction(() => document.getElementById("name")?.value === "Test Flächenwerbung GmbH – aktualisiert");
        assert.equal(await page.locator('input[id="bank_iban"]').inputValue(), "DE89370400440532013000");

        // The same API validates schema limits and keeps unsaved input visible.
        await page.locator('textarea[id="payment_terms_default"]').fill("x".repeat(501));
        const rejected = page.waitForResponse((r) => r.url().endsWith("/api/company") && r.request().method() === "POST");
        await save.click(); assert.equal((await rejected).status(), 400);
        await page.getByText("Zahlungsbedingungen: Höchstens 500 Zeichen erlaubt.", { exact: true }).waitFor();
        assert.equal((await page.locator('textarea[id="payment_terms_default"]').inputValue()).length, 501);
        assert.equal((await (await page.request.get(origin + "/api/company")).json()).payment_terms_default, seed.payment_terms_default);
        await page.locator('textarea[id="payment_terms_default"]').fill("Zahlbar innerhalb von 30 Tagen.");
        const corrected = page.waitForResponse((r) => r.url().endsWith("/api/company") && r.request().method() === "POST");
        await save.click(); assert.equal((await corrected).status(), 200);

        // Failed reads must not become an empty, writable company form.
        await page.route("**/api/company", (route) => route.request().method() === "GET"
            ? route.fulfill({ status: 503, json: { error: "Temporary failure" } }) : route.continue());
        await page.reload();
        await page.getByText("Die Firmendaten konnten nicht geladen werden. Bitte erneut laden, bevor Sie Änderungen speichern.", { exact: true }).waitFor();
        assert.equal(await save.isDisabled(), true);
        await page.unroute("**/api/company");
        await page.getByRole("button", { name: "Erneut laden", exact: true }).click();
        await page.waitForFunction(() => document.getElementById("name")?.value === "Test Flächenwerbung GmbH – aktualisiert");
        assert.equal(await save.isEnabled(), true);

        await page.route("**/api/company", (route) => route.request().method() === "POST"
            ? route.fulfill({ status: 401, json: { error: "Not authenticated" } }) : route.continue());
        await name.fill("Unsaved edit");
        await save.click();
        await page.getByText("Ihre Sitzung ist abgelaufen. Bitte erneut anmelden.", { exact: true }).waitFor();
        assert.equal(await name.inputValue(), "Unsaved edit");
        await page.screenshot({ path: "/tmp/rechly-company-settings.png", fullPage: true });
        assert.deepEqual(errors, []);
        console.log("PASS: real isolated API save/reload, normalized bank details, actionable validation with input preservation, load-failure save guard/retry and expired-session feedback.");
    } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
