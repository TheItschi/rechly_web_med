// Run against an isolated local SQLite server; never customer data.
const {chromium} = require(process.env.RECHLY_PLAYWRIGHT_PATH || 'playwright-core');
const assert = require('node:assert/strict');
const origin = process.env.RECHLY_DECIMAL_URL || 'http://127.0.0.1:3121';
(async () => {
    assert.equal(process.env.RECHLY_DATA_DIR, '/tmp/rechly-price-test');
    assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
    const browser = await chromium.launch({executablePath: process.env.RECHLY_CHROMIUM || '/usr/bin/chromium',args:['--no-sandbox']});
    try {
        const page = await browser.newPage();
        assert.equal((await (await page.request.get(origin + '/api/desktop/health')).json()).storage,'sqlite');
        const company = {name:'Decimal Test GmbH',address_line1:'Musterstraße 1',postal_code:'10115',city:'Berlin',email:'test@example.invalid',bank_iban:'DE89370400440532013000'};
        assert.equal((await page.request.post(origin + '/api/company',{data:company})).status(),200);
        const clientName = 'Decimal Customer ' + Date.now();
        assert.equal((await page.request.post(origin + '/api/clients',{data:{...company,name:clientName}})).status(),200);
        const errors = [];
        page.on('pageerror',e => errors.push(e.message));
        const productName = 'Decimal Product ' + Date.now();
        await page.goto(origin + '/dashboard/products');
        await page.getByRole('button',{name:/Neues Produkt/}).first().click();
        await page.locator('#name').fill(productName);
        const price = page.locator('#price');
        for (const [raw, formatted] of [['1,25','1,25'],['1.25','1,25'],['0,05','0,05'],['1.234,56 €','1234,56']]) {
            await price.fill(''); await price.pressSequentially(raw); await price.press('Tab');
            assert.equal(await price.inputValue(),formatted,raw);
        }
        await price.fill(''); await price.pressSequentially('1,25');
        const [saved] = await Promise.all([
            page.waitForResponse(r => r.url().endsWith('/api/products') && r.request().method() === 'POST'),
            page.getByRole('dialog').getByRole('button',{name:'Erstellen',exact:true}).click(),
        ]);
        assert.equal(saved.status(),200); assert.equal(saved.request().postDataJSON().price,1.25);
        const product = await saved.json();
        await page.reload();
        const row = page.getByRole('row').filter({hasText:productName});
        await row.waitFor(); assert.match(await row.innerText(),/1,25/);
        // Changing language must not change the numeric value; dot input still works.
        await page.evaluate(() => localStorage.setItem('language','en'));
        await page.reload();
        await page.getByRole('button',{name:/New Product/}).first().click();
        await page.locator('#name').fill(productName + ' EN');
        await price.fill(''); await price.pressSequentially('0,05'); await price.press('Tab');
        assert.equal(await price.inputValue(),'0.05');
        await page.evaluate(() => localStorage.setItem('language','de'));

        for (const kind of ['invoices','offers','recurring']) {
            console.log('Checking',kind);
            await page.goto(origin + '/dashboard/' + kind + '/create');
            await page.locator('.ant-select').filter({hasText:/Kunden? suchen/}).getByRole('combobox').click();
            await page.locator('.ant-select-item-option-content').filter({hasText:clientName}).click();
            await page.getByRole('heading',{level:4}).first().click();
            await page.getByRole('button',{name:/Weiter/}).click();
            await page.getByRole('button',{name:kind === 'invoices' ? /Freie Position/ : /Leere Zeile/}).click();
            const row = page.locator('tbody tr').filter({has:page.getByRole('spinbutton')}).first();
            await row.locator('textarea').first().fill('Decimal line');
            const numbers = row.getByRole('spinbutton');
            await numbers.nth(0).fill('2,5');
            await numbers.nth(1).fill(''); await numbers.nth(1).pressSequentially('1,25'); await numbers.nth(1).press('Tab');
            assert.equal(Number((await numbers.nth(1).inputValue()).replace(',','.')),1.25);
            await page.getByRole('button',{name:/Weiter/}).click();
            await page.locator('.ant-card input.ant-input').first().fill('DECIMAL-' + kind + '-' + Date.now());
            const [response] = await Promise.all([
                page.waitForResponse(r => r.url().endsWith('/api/' + kind) && r.request().method() === 'POST'),
                page.getByRole('button',{name: kind === 'invoices' ? /Rechnung erstellen/ : kind === 'offers' ? /Angebot erstellen/ : /Vorlage speichern|recurringCreate.create/}).click(),
            ]);
            const body = response.request().postDataJSON();
            assert.equal(body.items[0].price,1.25); assert.equal(body.items[0].quantity,2.5);
            assert.ok(response.ok(), kind + ': ' + await response.text());
        }
        assert.equal((await (await page.request.get(origin + '/api/products')).json()).find(p => p.id === product.id).price,1.25);
        assert.deepEqual(errors,[]);
        console.log('PASS: German/English decimal typing, dot/comma cents, product save/reload, invoice/offer/recurring UI and API saves.');
    } finally { await browser.close(); }
})().catch(e => {console.error(e);process.exitCode=1;});
