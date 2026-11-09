// Local production web server; no accounts or real invoices are used.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { chromium } = require(process.env.RECHLY_PLAYWRIGHT_PATH || "playwright-core");
const origin = process.env.RECHLY_SEO_URL || "http://127.0.0.1:3110";
const canonical = process.env.RECHLY_CANONICAL_URL || "https://rechly.de";
const pages = [
    "/tools/e-rechnung-viewer",
    "/tools/girocode-generator",
    "/tools/mehrwertsteuer-rechner",
    "/vorlagen/reinigungsgewerbe",
];

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.RECHLY_CHROMIUM || "/usr/bin/chromium",
        args: ["--no-sandbox"],
    });
    try {
        // Crawlers and visitors without JavaScript receive the useful copy and schema.
        const staticContext = await browser.newContext({ javaScriptEnabled: false });
        const staticPage = await staticContext.newPage();
        for (const path of pages) {
            assert.equal((await staticPage.goto(origin + path)).status(), 200);
            assert.equal(await staticPage.locator("h1").count(), 1);
            assert.equal(await staticPage.locator('link[rel="canonical"]').getAttribute("href"), canonical + path);
            const description = await staticPage.locator('meta[name="description"]').getAttribute("content");
            assert.ok(description.length >= 100 && description.length <= 170, path);
            const graph = await staticPage.locator('script[type="application/ld+json"]').evaluateAll((nodes) =>
                nodes.flatMap((node) => {
                    const data = JSON.parse(node.textContent);
                    return data["@graph"] || [data];
                }),
            );
            const faq = graph.find((item) => item["@type"] === "FAQPage");
            assert.ok(faq, path);
            for (const question of faq.mainEntity) {
                assert.ok((await staticPage.locator("body").textContent()).includes(question.name), path);
                assert.ok((await staticPage.locator("body").innerText()).includes(question.name), path);
                // Answers can be inside closed native details, so use textContent.
                assert.ok((await staticPage.locator("main").textContent()).includes(question.acceptedAnswer.text), path);
            }
        }
        await staticContext.close();

        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        await context.route("**/api/auth/user", (route) => route.fulfill({ status: 200, json: null }));
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(origin + pages[0]);
        const file = page.locator('input[type="file"]');
        const xml = '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"><ID>SEO-TEST-042</ID><IssueDate>2026-11-09</IssueDate><AccountingSupplierParty><Party><PartyLegalEntity><RegistrationName>Test Studio</RegistrationName></PartyLegalEntity></Party></AccountingSupplierParty><LegalMonetaryTotal><TaxExclusiveAmount>100.00</TaxExclusiveAmount><TaxInclusiveAmount>119.00</TaxInclusiveAmount></LegalMonetaryTotal><TaxTotal><TaxAmount>19.00</TaxAmount></TaxTotal></Invoice>';
        const uploads = [];
        page.on("request", (request) => {
            if ((request.postData() || "").includes("SEO-TEST-042")) uploads.push(request.url());
        });
        await file.setInputFiles({ name: "example.xml", mimeType: "application/xml", buffer: Buffer.from(xml) });
        await page.getByText("Rechnungsdaten erfolgreich gelesen:", { exact: true }).waitFor();
        await page.getByText("SEO-TEST-042", { exact: true }).waitFor();
        await page.getByText("Test Studio", { exact: true }).waitFor();
        await page.getByText("Datenansicht, keine Konformitätsprüfung", { exact: true }).waitFor();
        const downloadEvent = page.waitForEvent("download");
        await page.getByRole("button", { name: "Als CSV exportieren" }).click();
        const download = await downloadEvent;
        assert.match(await fs.readFile(await download.path(), "utf8"), /SEO-TEST-042/);
        assert.deepEqual(uploads, []);

        await page.setViewportSize({ width: 320, height: 844 });
        const overflow = await page.locator("main").evaluate((main) =>
            [...main.querySelectorAll("*")].filter((element) => {
                const box = element.getBoundingClientRect();
                return box.width > 0 && box.right > innerWidth + 1;
            }).map((element) => element.tagName + ":" + element.textContent.slice(0, 45)),
        );
        assert.deepEqual(overflow, [], "Viewer results must fit a small phone");
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.screenshot({ path: "/tmp/rechly-seo-viewer-mobile.png", fullPage: true });

        await file.setInputFiles({ name: "unsupported.xml", mimeType: "application/xml", buffer: Buffer.from("<unsupported />") });
        await page.getByText("Datei konnte nicht gelesen werden", { exact: true }).waitFor();
        assert.equal(await page.getByText("SEO-TEST-042", { exact: true }).count(), 0);
        await file.setInputFiles("tests/fixtures/identifiers-xrechnung.xml");
        await page.getByText("TEST-2026-001", { exact: true }).waitFor();
        assert.equal(await page.getByText("Datei konnte nicht gelesen werden", { exact: true }).count(), 0);

        const sitemap = await (await page.request.get(origin + "/sitemap.xml")).text();
        for (const path of pages) {
            assert.ok(sitemap.includes(`<loc>${canonical}${path}</loc>\n<lastmod>2026-11-09`), path);
        }
        assert.deepEqual(errors, []);
        console.log("PASS: crawlable metadata/FAQ, canonical URLs, sitemap dates, UBL/CII results, CSV download, no file upload, error recovery and mobile layout.");
    } finally {
        await browser.close();
    }
})().catch((error) => { console.error(error); process.exitCode = 1; });
