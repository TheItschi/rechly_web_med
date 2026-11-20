// Run against a web-mode development server: BASE_URL=http://127.0.0.1:3126 node tests/email-verification.browser.cjs
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:3126';
(async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
    try {
        for (const width of [1280, 390]) {
            const context = await browser.newContext({ viewport: { width, height: 900 } });
            await context.route('**/api/auth/user', route => route.fulfill({ status: 401, json: { error: 'Not authenticated' } }));
            await context.route('http://127.0.0.1:3999/**', route => route.fulfill({ status: 401, json: { message: 'Not authenticated', code: 401 } }));
            const page = await context.newPage();
            let calls = 0;
            let status = 503;
            let code = 'verification_unavailable';
            await page.route('**/api/auth/verification/confirm', async route => {
                calls++;
                assert.deepEqual(route.request().postDataJSON(), { userId: 'test-user', secret: 'synthetic+secret/value' });
                await route.fulfill({ status, json: status === 200 ? { success: true } : { code } });
            });
            const link = base + '/verify?userId=test-user&secret=synthetic%2Bsecret%2Fvalue&expire=2026-11-20T14%3A43%3A27.412%2B00%3A00';
            await page.goto(link);
            await page.getByText('Bestätigung derzeit nicht möglich', { exact: true }).waitFor();
            assert.equal(calls, 1, 'React effect replay must not submit a one-time token twice');
            status = 200;
            await page.getByRole('button', { name: 'Erneut versuchen' }).click();
            await page.getByText('E-Mail bestätigt', { exact: true }).waitFor();
            assert.equal(calls, 2);
            await page.getByRole('button', { name: 'Jetzt anmelden' }).waitFor();
            status = 429; code = 'rate_limited';
            await page.goto(link);
            await page.getByText('Bitte kurz warten', { exact: true }).waitFor();
            status = 400; code = 'invalid_link';
            await page.goto(link);
            await page.getByText('Link nicht mehr gültig', { exact: true }).waitFor();
            assert.equal(await page.getByText(/gültig 7 Tage/).count(), 0);
            const beforeMissing = calls;
            await page.goto(base + '/verify?expire=2026-11-20T14%3A43%3A27.412%2B00%3A00');
            await page.getByText('Link ungültig', { exact: true }).waitFor();
            assert.equal(calls, beforeMissing);
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
            await context.close();
        }
        console.log('PASS: desktop/mobile logged-out verification, encoded token, single submission, retry, rate limit, invalid and incomplete link states.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
