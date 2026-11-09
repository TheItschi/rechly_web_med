const assert = require("node:assert/strict");
const { chromium } = require(process.env.RECHLY_PLAYWRIGHT_PATH || "playwright-core");
const origin = process.env.RECHLY_NAV_URL || "http://127.0.0.1:3111";
(async () => {
    const browser = await chromium.launch({ executablePath: process.env.RECHLY_CHROMIUM || "/usr/bin/chromium", args: ["--no-sandbox"] });
    try {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        await context.route("**/api/auth/user", (route) => route.fulfill({ status: 200, json: null }));
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        async function fits() {
            const overflow = await page.locator("header").first().evaluate((header) => [...header.querySelectorAll("a, select, summary")].filter((el) => {
                if (!el.checkVisibility()) return false;
                const r = el.getBoundingClientRect();
                return r.left < 0 || r.right > innerWidth + 1;
            }).map((el) => el.textContent));
            assert.deepEqual(overflow, []);
        }
        let baseline;
        for (const path of ["/", "/features", "/tools", "/tools/e-rechnung-viewer", "/open-source", "/desktop", "/vorlagen/reinigungsgewerbe"]) {
            assert.equal((await page.goto(origin + path)).status(), 200);
            const header = page.locator("header").first();
            const style = await header.evaluate((node) => {
                const cta = node.querySelector('a[href="/register"]');
                const brand = node.querySelector('a[href="/"]');
                return [getComputedStyle(node).height, getComputedStyle(node).backgroundColor, getComputedStyle(cta).backgroundColor, getComputedStyle(cta).color, getComputedStyle(brand).fontSize];
            });
            if (!baseline) baseline = style;
            assert.deepEqual(style, baseline, "Consistent header styling: " + path);
            const hrefs = await header.locator('nav').first().locator('a').evaluateAll((links) => links.map((link) => link.getAttribute("href")));
            for (const href of ["/features", "/#termine", "/desktop", "/tools", "/open-source", "/register"]) assert.ok(hrefs.includes(href), path);
            for (const width of [1440, 1100, 1099, 1024, 768, 390, 320]) {
                await page.setViewportSize({ width, height: 900 });
                await fits();
            }
            await page.setViewportSize({ width: 1440, height: 900 });
        }
        await page.goto(origin + "/tools");
        const resources = page.getByRole("button", { name: "Ressourcen", exact: true });
        await resources.click();
        await page.getByRole("button", { name: "Ressourcen", exact: true, expanded: true }).waitFor();
        await page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("link", { name: "Tools & Rechner", exact: true }).waitFor();
        assert.equal(await page.locator('header a[href="/tools"]').first().getAttribute("aria-current"), "page");
        await page.keyboard.press("Escape");
        assert.equal(await resources.evaluate((el) => el.parentElement.open), false);
        assert.equal(await resources.evaluate((el) => el === document.activeElement), true);
        await resources.click();
        await page.mouse.click(30, 350);
        assert.equal(await resources.evaluate((el) => el.parentElement.open), false);
        await page.screenshot({ path: "/tmp/rechly-nav-tools-desktop.png" });
        await page.goto(origin + "/");
        await page.screenshot({ path: "/tmp/rechly-nav-home-desktop.png" });

        await page.setViewportSize({ width: 320, height: 568 });
        const toggle = page.getByRole("button", { name: "Menü", exact: true });
        await toggle.click();
        await page.getByRole("button", { name: "Menü", exact: true, expanded: true }).waitFor();
        await fits();
        const panel = page.locator("#public-mobile-navigation");
        assert.equal(await panel.evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight + 1), true);
        const cta = panel.getByRole("link", { name: "Kostenlos starten" });
        await cta.scrollIntoViewIfNeeded();
        assert.equal(await cta.evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight), true);
        await panel.evaluate((el) => el.scrollTo(0, 0));
        await page.screenshot({ path: "/tmp/rechly-nav-mobile.png" });
        await page.keyboard.press("Escape");
        assert.equal(await toggle.evaluate((el) => el.parentElement.open), false);
        assert.equal(await toggle.evaluate((el) => el === document.activeElement), true);
        await toggle.click();
        await panel.getByRole("link", { name: "Funktionen", exact: true }).click();
        await page.waitForURL("**/features");
        assert.equal(await toggle.evaluate((el) => el.parentElement.open), false);
        await toggle.click();
        await panel.getByRole("link", { name: "Terminbuchung", exact: true }).click();
        await page.waitForURL("**/#termine");
        await page.waitForFunction(() => {
            const y = document.querySelector("#termine")?.getBoundingClientRect().top;
            return y >= 72 && y <= 120;
        });
        assert.equal(await toggle.evaluate((el) => el.parentElement.open), false);
        await toggle.click();
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.setViewportSize({ width: 320, height: 568 });
        assert.equal(await toggle.evaluate((el) => el.parentElement.open), false);
        await toggle.click();
        await page.getByRole("combobox", { name: "Sprache" }).selectOption("en");
        await page.getByRole("button", { name: "Menu", exact: true }).waitFor();
        await page.reload();
        await page.getByRole("button", { name: "Menu", exact: true }).waitFor();
        await page.getByRole("button", { name: "Menu", exact: true }).click();
        await fits();
        await page.setViewportSize({ width: 1100, height: 900 });
        await fits();
        for (const path of ["/login", "/register"]) {
            await page.goto(origin + path);
            assert.equal(await page.locator('header a[href="/register"]').count(), 0);
            assert.equal(await page.locator('header a[href="/login"]').count(), 0);
        }
        assert.deepEqual(errors, []);

        const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 568 } });
        const staticPage = await noJs.newPage();
        await staticPage.goto(origin + "/");
        await staticPage.getByRole("button", { name: "Menü", exact: true }).click();
        await staticPage.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("link", { name: "Funktionen", exact: true }).click();
        await staticPage.waitForURL("**/features");
        console.log("PASS: consistent public navigation, active links, 320–1440 widths, keyboard/outside dismissal, mobile scrolling, cross-page anchors, language persistence, auth pages and no-JS menu.");
    } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
