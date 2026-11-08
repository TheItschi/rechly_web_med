// Run against the disposable server described in docs/FEATURE_PARITY.md. No production data.
const { chromium } = require(process.env.RECHLY_PLAYWRIGHT_PATH || 'playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = 'http://127.0.0.1:3104';
(async () => {
    assert.equal(process.env.RECHLY_DATA_DIR, '/tmp/rechly-parity-web-test');
    assert.equal((await (await fetch(origin + '/api/desktop/health')).json()).storage, 'sqlite');
    const browser = await chromium.launch({ executablePath: process.env.RECHLY_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox'], headless: true });
    const page = await browser.newPage({ viewport: { width: 1400, height: 1050 }, timezoneId: 'Europe/Berlin' });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    async function api(path, body, method = 'POST') {
        const response = await page.request.fetch(origin + path, { method, ...(body ? { data: body } : {}) });
        const result = await response.json(); assert.ok(response.ok(), JSON.stringify(result)); return result;
    }
    async function choose(label, name, scope = page) {
        await scope.getByRole('combobox', { name: new RegExp('^(?:\\* )?' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }).click();
        await page.locator('.ant-select-dropdown:visible').getByTitle(name, { exact: true }).click();
        // Dismiss the popup by moving focus outside the select before the next action.
        const modalTitle = page.locator('.ant-modal-title:visible');
        if (await modalTitle.count()) await modalTitle.click();
        else await page.getByRole('heading', { level: 2 }).first().click();
    }
    const suffix = String(Date.now()), projectName = 'Portal ' + suffix, work = 'Design review ' + suffix, timerWork = 'Implementation ' + suffix, meeting = 'Planning ' + suffix;
    try {
        const initial = await api('/api/workspace/work', null, 'GET');
        if (initial.timer) await api('/api/workspace/work', { action: 'cancel', token: initial.timer.token });
        const client = await api('/api/clients', { name: 'Test client ' + suffix, country: 'DE' });
        const { record: project } = await api('/api/workspace', { action: 'save', collection: 'projects', record: { name: projectName, description: '', status: 'active', client_id: client.id, due_date: '', budget: 3000 } });
        await page.goto(origin + '/dashboard/workspace/time');
        await page.getByRole('button', { name: 'Zeit erfassen / Timer', exact: true }).click();
        let dialog = page.getByRole('dialog');
        await choose('Projekt', projectName, dialog);
        await dialog.getByLabel('Tätigkeit', { exact: true }).fill(work);
        await dialog.getByLabel('Dauer in Minuten', { exact: true }).fill('45');
        await dialog.getByLabel('Stundensatz (netto, EUR)', { exact: true }).fill('120');
        await dialog.getByText('Optional: interne Kosten', { exact: true }).click();
        await dialog.getByLabel('Interne Kosten pro Stunde (EUR)', { exact: true }).fill('40');
        await dialog.getByRole('button', { name: 'Speichern', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' }); await page.getByRole('row').filter({ hasText: work }).waitFor();
        await page.getByRole('button', { name: 'Zeit erfassen / Timer', exact: true }).click();
        dialog = page.getByRole('dialog'); await choose('Projekt', projectName, dialog);
        await dialog.getByLabel('Tätigkeit', { exact: true }).fill(timerWork);
        await dialog.getByLabel('Stundensatz (netto, EUR)', { exact: true }).fill('120');
        await dialog.getByRole('button', { name: 'Timer starten', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
        await page.goto(origin + '/dashboard/clients');
        await page.getByRole('link', { name: new RegExp('Timer läuft: ' + timerWork) }).waitFor();
        await page.reload(); await page.getByRole('link', { name: new RegExp('Timer läuft: ' + timerWork) }).waitFor();
        await page.goto(origin + '/dashboard/workspace/time');
        await page.getByRole('button', { name: 'Stoppen & prüfen', exact: true }).click();
        dialog = page.getByRole('dialog'); await dialog.getByLabel('Minuten', { exact: true }).fill('13');
        await dialog.getByRole('button', { name: 'Zeit speichern', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
        await choose('Projekt filtern', projectName);
        await page.getByRole('row').filter({ hasText: work }).getByRole('checkbox').check();
        await page.getByRole('button', { name: 'Auswahl abrechnen', exact: true }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Entwurf erstellen', exact: true }).click();
        await page.waitForURL(/\/dashboard\/invoices\/[^/]+$/);
        const invoiceId = page.url().split('/').pop(); const invoice = await api('/api/invoices/' + invoiceId, null, 'GET');
        assert.equal(invoice.total_gross, 107.1);
        await page.goto(origin + '/dashboard/workspace/time'); await choose('Projekt filtern', projectName);
        assert.equal(await page.getByRole('row').filter({ hasText: work }).getByRole('button', { name: 'Bearbeiten', exact: true }).isDisabled(), true);
        await page.goto(origin + '/dashboard/workspace/reports');
        await page.getByRole('button', { name: 'Projektkosten erfassen', exact: true }).click();
        dialog = page.getByRole('dialog'); await choose('Projekt', projectName, dialog);
        await dialog.getByLabel('Lieferant', { exact: true }).fill('Test printing');
        await dialog.getByLabel('Bruttobetrag (EUR)', { exact: true }).fill('119');
        await dialog.getByRole('button', { name: 'Speichern', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
        await choose('Projekt filtern', projectName);
        await page.getByText('Test printing', { exact: true }).waitFor();
        const snapshot = await api('/api/workspace/work', null, 'GET'); assert.equal(snapshot.reports.find(r => r.project.id === project.id).costs, 100);
        await page.getByRole('heading', { name: 'Projektcontrolling', exact: true }).click();
        await page.screenshot({ path: '/tmp/rechly-project-reports.png', fullPage: true });
        await page.goto(origin + '/dashboard/workspace/calendar');
        await page.getByLabel('Kalenderdatum', { exact: true }).fill('2026-11-08');
        await page.getByRole('button', { name: 'Termin anlegen', exact: true }).click();
        dialog = page.getByRole('dialog'); await dialog.getByLabel('Titel', { exact: true }).fill(meeting);
        await dialog.getByLabel('Beginn', { exact: true }).fill('2026-11-08T09:00');
        await dialog.getByLabel('Ende', { exact: true }).fill('2026-11-08T10:00');
        await choose('Wiederholung', 'Wöchentlich', dialog);
        await dialog.getByLabel('Notizen', { exact: true }).fill('<script>window.injected=true</script>');
        await dialog.getByRole('button', { name: 'Speichern', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
        await page.getByLabel('Termine suchen', { exact: true }).fill(suffix);
        await page.getByRole('button', { name: new RegExp(meeting) }).first().waitFor();
        for (const mode of ['Woche','Tag','Agenda','Monat']) { await page.getByText(mode, { exact: true }).click(); await page.getByRole('button', { name: new RegExp(meeting) }).first().waitFor(); }
        assert.equal(await page.evaluate(() => window.injected), undefined);
        await page.screenshot({ path: '/tmp/rechly-calendar.png', fullPage: true });
        const downloaded = page.waitForEvent('download'); await page.getByRole('link', { name: 'ICS exportieren', exact: true }).click();
        const path = '/tmp/rechly-calendar-export.ics'; await (await downloaded).saveAs(path);
        assert.match(fs.readFileSync(path, 'utf8'), /RRULE:FREQ=WEEKLY/);
        await page.locator('input[type=file]').setInputFiles(path);
        await page.getByRole('dialog', { name: 'Kalenderimport prüfen' }).waitFor();
        assert.equal(await page.getByRole('dialog').getByRole('button', { name: 'Termine importieren', exact: true }).isDisabled(), true);
        await page.getByRole('dialog').getByRole('button', { name: 'Abbrechen', exact: true }).click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        await page.setViewportSize({ width: 390, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.screenshot({ path: '/tmp/rechly-calendar-mobile.png', fullPage: true });
        await page.goto(origin + '/dashboard/workspace/overview');
        await page.getByRole('heading', { name: 'Business-Übersicht', exact: true }).waitFor();
        await page.evaluate(() => localStorage.setItem('language', 'en')); await page.reload();
        await page.getByRole('heading', { name: 'Business overview', exact: true }).waitFor();
        const backup = await api('/api/workspace/backup', null, 'GET');
        for (const kind of ['timeEntries','calendar','billings','expenseLinks']) assert.ok(backup.records.some(r => r.kind === kind), kind);
        await page.evaluate(() => localStorage.setItem('language', 'de'));
        await page.setViewportSize({ width: 1400, height: 1050 });
        await page.goto(origin + '/dashboard/workspace');
        await page.getByLabel('Arbeitsbereich durchsuchen').fill(projectName);
        await page.getByRole('button', { name: 'Aufgabe anlegen', exact: true }).click();
        dialog = page.getByRole('dialog');
        await dialog.getByLabel('Titel', { exact: true }).fill('Follow up ' + suffix);
        await dialog.getByRole('button', { name: 'Speichern', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
        await page.getByRole('heading', { name: 'Follow up ' + suffix, exact: true }).waitFor();
        const changed = page.waitForResponse(r => r.url().endsWith('/api/workspace') && r.request().method() === 'POST');
        await choose('Status: Follow up ' + suffix, 'Erledigt'); await changed;
        await page.getByRole('heading', { name: 'Follow up ' + suffix, exact: true }).waitFor();
        const business = await api('/api/workspace', null, 'GET');
        assert.ok(business.data.tasks.some(t => t.title === 'Follow up ' + suffix && t.status === 'done' && t.project_id === project.id));
        await api('/api/invoices/' + invoiceId, null, 'DELETE');
        const released = await api('/api/workspace/work', null, 'GET');
        assert.equal(released.entries.find(e => e.description === work).invoice_id, '');
        for (const path of ['/api/workspace/work', '/api/workspace/calendar']) {
            const denied = await page.request.post(origin + path, { headers: { Origin: 'https://untrusted.example' }, data: {} });
            assert.equal(denied.status(), 403);
        }
        assert.deepEqual(errors, []);
        console.log('PASS: manual time, persistent timer across screens/reload, bill-to-invoice, locked entries, project costs/reports, recurring calendar, four views, ICS deduplication, mobile layout, overview, English UI and full workspace export.');
    } catch (error) { await page.screenshot({ path: '/tmp/rechly-parity-failure.png', fullPage: true }); console.error((await page.locator('body').innerText()).slice(-2500)); throw error; }
    finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
