// Run against a local dev/production WEB server; no accounts are created.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require(process.env.RECHLY_PLAYWRIGHT_PATH || "playwright-core");
const origin = process.env.RECHLY_LANDING_URL || "http://127.0.0.1:3107";
const canonical = process.env.RECHLY_CANONICAL_URL || origin;

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.RECHLY_CHROMIUM || "/usr/bin/chromium",
        headless: true,
        args: ["--no-sandbox"],
    });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.route("**/api/auth/user", (route) => route.fulfill({ status: 200, json: null }));
    const page = await context.newPage(),
        errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
        if (message.type() === "error" && /hydrat|did not match/i.test(message.text()))
            errors.push(message.text());
    });
    async function noOverflow() {
        const overflow = await page.evaluate(() =>
            [...document.querySelectorAll("main *, header *, footer *")]
                .filter((e) => {
                    if (!e.checkVisibility()) return false;
                    const rect = e.getBoundingClientRect();
                    return (
                        rect.width > 0 &&
                        (rect.right > innerWidth + 1 || rect.left < -1) &&
                        !e.closest('[aria-hidden="true"]')
                    );
                })
                .map((e) => e.tagName + ":" + e.textContent.slice(0, 50)),
        );
        assert.deepEqual(overflow, []);
    }
    async function screenshot(name) {
        await page.locator("footer").scrollIntoViewIfNeeded();
        await page.locator("footer img").evaluate((img) => img.decode());
        await page.evaluate(() => {
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
            window.scrollTo({ top: 0, behavior: "instant" });
        });
        await page.screenshot({ path: "/tmp/rechly-home-" + name + ".png", fullPage: true });
    }
    try {
        const response = await page.goto(origin + "/");
        assert.equal(response.status(), 200);
        assert.equal(await page.locator("h1").count(), 1);
        assert.match(await page.locator("h1").innerText(), /Rechnungen schreiben/);
        assert.equal((await page.title()).match(/Rechly/g).length, 1);
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), canonical);
        const description = await page.locator('meta[name="description"]').getAttribute("content");
        assert.ok(description.length >= 100 && description.length <= 170);
        assert.match(description, /Terminbuchung/);
        assert.equal(await page.locator("main section").count(), 7);
        const graph = await page
            .locator('script[type="application/ld+json"]')
            .evaluateAll((nodes) => nodes.flatMap((n) => JSON.parse(n.textContent)["@graph"] || []));
        const app = graph.find((n) => n["@type"] === "SoftwareApplication");
        assert.equal(app.offers.price, "0");
        assert.ok(app.featureList.some((f) => f.includes("Online-Terminbuchung")));
        const faq = graph.find((n) => n["@type"] === "FAQPage");
        const questions = await page.locator("main details summary").allTextContents();
        assert.deepEqual(
            questions,
            faq.mainEntity.map((q) => q.name),
        );
        const answers = await page.locator("main details p").allTextContents();
        assert.deepEqual(
            answers,
            faq.mainEntity.map((q) => q.acceptedAnswer.text),
        );
        assert.equal(graph.find((n) => n["@type"] === "WebSite").potentialAction, undefined);
        await page.locator("main details summary").first().click();
        assert.equal(await page.locator("main details").first().getAttribute("open"), "");
        await page.locator("main details summary").first().click();
        await page.keyboard.press("Tab");
        for (const width of [1440, 1024, 768, 390, 320]) {
            await page.setViewportSize({ width, height: 900 });
            await noOverflow();
        }
        await page.setViewportSize({ width: 1440, height: 1000 });
        await screenshot("desktop");
        await page.setViewportSize({ width: 390, height: 844 });
        const menu = page.getByRole("button", { name: "Menü", exact: true });
        await menu.click();
        assert.equal(await menu.evaluate((e) => e.parentElement.open), true);
        await page.keyboard.press("Escape");
        assert.equal(await menu.evaluate((e) => e.parentElement.open), false);
        assert.equal(await menu.evaluate((e) => e === document.activeElement), true);
        await menu.click();
        await page
            .getByRole("navigation", { name: "Hauptnavigation" })
            .getByRole("link", { name: "Terminbuchung", exact: true })
            .click();
        assert.equal(await menu.evaluate((e) => e.parentElement.open), false);
        await page.waitForFunction(() => {
            const y = document.querySelector("#termine").getBoundingClientRect().top;
            return y >= 60 && y < 120;
        });
        await screenshot("mobile");
        await menu.click();
        await page.getByRole("combobox", { name: "Sprache" }).selectOption("en");
        await page.getByRole("button", { name: "Menu", exact: true }).click();
        assert.match(await page.locator("h1").innerText(), /Invoicing sorted/);
        await page.reload();
        await page.waitForFunction(() =>
            document.querySelector("h1").textContent.includes("Invoicing sorted"),
        );
        assert.equal(await page.locator("main").evaluate((e) => e.parentElement.lang), "en");
        await noOverflow();
        await screenshot("english-mobile");
        await page.addScriptTag({ path: process.env.RECHLY_AXE_PATH || require.resolve("axe-core") });
        const accessibility = await page.evaluate(
            async () =>
                await axe.run(document.querySelector("main").parentElement, {
                    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
                }),
        );
        fs.writeFileSync("/tmp/rechly-home-accessibility.json", JSON.stringify(accessibility, null, 2));
        assert.deepEqual(
            accessibility.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
            [],
        );
        await page.emulateMedia({ reducedMotion: "reduce" });
        assert.equal(
            await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
            "auto",
        );
        const robots = await (await page.request.get(origin + "/robots.txt")).text();
        assert.match(robots, /Disallow: \/dashboard\//);
        assert.ok(robots.includes(canonical + "/sitemap.xml"));
        const sitemap = await (await page.request.get(origin + "/sitemap.xml")).text();
        assert.ok(sitemap.includes("<loc>" + canonical + "</loc>"));
        const social = await page.request.get(origin + "/opengraph-image");
        assert.equal(social.status(), 200);
        assert.match(social.headers()["content-type"], /image\/png/);
        fs.writeFileSync("/tmp/rechly-home-social.png", await social.body());
        const noJs = await browser.newContext({ javaScriptEnabled: false });
        const crawler = await noJs.newPage();
        await crawler.goto(origin + "/");
        assert.match(await crawler.locator("h1").innerText(), /Rechnungen schreiben/);
        assert.equal(await crawler.locator("main details").count(), 6);
        assert.ok((await crawler.locator("main").textContent()).includes("Online-Terminbuchung"));
        await noJs.close();
        assert.deepEqual(errors, []);
        console.log(
            "PASS: responsive layouts (320–1440), mobile menu and Escape, FAQ, persisted English without hydration errors, no-JS content, canonical/metadata/schema agreement, robots/sitemap, social image and axe WCAG checks.",
        );
    } catch (error) {
        await page.screenshot({ path: "/tmp/rechly-home-failure.png", fullPage: true });
        throw error;
    } finally {
        await browser.close();
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
