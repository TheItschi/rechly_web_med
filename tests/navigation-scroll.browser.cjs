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
        async function clickFooter(href) {
            const link = page.locator(`footer a[href="${href}"]`).first();
            // Start at a stable scrolled position, as after a user's wheel/touch scroll.
            await link.evaluate((el) => el.scrollIntoView({ behavior: "instant", block: "center" }));
            assert.ok(await page.evaluate(() => scrollY > 500));
            await link.click();
            try {
                await page.waitForURL(origin + href);
            } catch (error) {
                throw new Error(`Expected ${href}, remained at ${page.url()}`, { cause: error });
            }
        }
        async function atTop() {
            await page.waitForFunction(() => scrollY < 2);
            const top = await page.locator("h1").first().evaluate((el) => el.getBoundingClientRect().top);
            assert.ok(top >= 72 && top < 700, "Heading should appear below the navbar, not above the viewport");
        }
        async function atAnchor(id) {
            await page.waitForFunction((id) => {
                const top = document.getElementById(id)?.getBoundingClientRect().top;
                return top >= 72 && top <= 120;
            }, id);
        }
        for (const [from, to] of [["/", "/desktop"], ["/features", "/tools"], ["/tools", "/rechnung-schreiben"], ["/tools/e-rechnung-viewer", "/"], ["/", "/impressum"]]) {
            await page.goto(origin + from);
            await clickFooter(to);
            await atTop();
        }
        // Back/forward should still restore intentional reading positions.
        await page.goto(origin + "/");
        const desktop = page.locator('footer a[href="/desktop"]').first();
        await desktop.evaluate((el) => el.scrollIntoView({ behavior: "instant", block: "center" }));
        const oldPosition = await page.evaluate(() => scrollY);
        await desktop.click();
        await page.waitForURL(origin + "/desktop");
        await atTop();
        await page.goBack();
        await page.waitForFunction((position) => Math.abs(scrollY - position) < 5, oldPosition);
        await page.goForward();
        await atTop();

        await page.goto(origin + "/features");
        await page.locator('a[href="/desktop#download"]').click();
        await page.waitForURL(origin + "/desktop#download");
        await atAnchor("download");
        await page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("link", { name: "Terminbuchung", exact: true }).click();
        await page.waitForURL(origin + "/#termine");
        await atAnchor("termine");
        await page.locator('footer a[href="#funktionen"]').click();
        await atAnchor("funktionen");

        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(origin + "/");
        await page.locator("footer").evaluate((el) => el.scrollIntoView({ behavior: "instant" }));
        await page.getByRole("button", { name: "Menü", exact: true }).click();
        await page.locator("#public-mobile-navigation").getByRole("link", { name: "Desktop", exact: true }).click();
        await page.waitForURL(origin + "/desktop");
        await atTop();
        await page.emulateMedia({ reducedMotion: "reduce" });
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), "auto");
        assert.deepEqual(errors, []);
        console.log("PASS: new pages open at top from footer/mobile menu; history restores position; homepage and desktop anchors clear the navbar; reduced motion is respected.");
    } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
