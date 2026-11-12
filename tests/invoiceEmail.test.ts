import test from "node:test";
import assert from "node:assert/strict";
import { buildEml, invoiceEmailBody, invoiceEmailSubject } from "../src/lib/invoiceEmail";

const invoice = {
    invoice_number: "PL-2026-001", issue_date: "2026-05-21", due_date: "2026-06-04", total_gross: 269.94,
    client: { name: "Bestattungen Brand", email: "info@example.org" },
} as never;
const company = { name: "Dr. med. Sabine Icsezer", professional_title: "Ärztin", bank_iban: "DE02120300000000202051", bank_bic: "BYLADEM1001", bank_name: "Testbank", email: "praxis@example.org" } as never;

test("standard text asks for payment with amount, due date and bank details", () => {
    const body = invoiceEmailBody(invoice, company);
    assert.match(body, /Guten Tag Bestattungen Brand,/);
    assert.match(body, /Rechnung PL-2026-001 vom 21\.05\.2026 über 269,94\s€/);
    assert.match(body, /bis zum 04\.06\.2026/);
    assert.match(body, /IBAN: DE02 1203 0000 0000 2020 51/);
    assert.match(body, /Ärztin/);
    assert.equal(invoiceEmailSubject(invoice, company), "Rechnung PL-2026-001 – Dr. med. Sabine Icsezer");
});

test("eml is an Outlook draft with encoded subject and PDF attachment", () => {
    const eml = buildEml({ to: "info@example.org", subject: "Rechnung – Ärztin", body: "Grüße\n", attachment: { fileName: "Rechnung_1.pdf", base64: "JVBERi0=" } });
    assert.ok(eml.startsWith("X-Unsent: 1\r\nTo: info@example.org\r\nSubject: =?UTF-8?B?"));
    assert.ok(eml.includes('Content-Disposition: attachment; filename="Rechnung_1.pdf"'));
    assert.ok(!/[^\r]\n/.test(eml), "all line breaks are CRLF");
});
