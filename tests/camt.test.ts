import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { CamtParseError, parseCamt } from "../src/lib/bank/camt";
import { CAMT_LIMITS, CamtFileError, decodeXml, extractCamtDocuments } from "../src/lib/bank/camtFile";
import { planBankImport } from "../src/lib/bank/importPlan";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", "camt", name), "utf8");

test("camt.052 V2 (Sparkasse layout): booked entries, signs, parties, remittance", () => {
    const result = parseCamt(fixture("camt052_v02_sparkasse.xml"));
    assert.equal(result.accountIban, "DE89370400440532013000");
    assert.equal(result.skippedPending, 1);
    assert.equal(result.transactions.length, 3);

    const [credit, debit] = result.transactions;
    assert.deepEqual(credit, {
        bookingDate: "2026-11-17",
        valueDate: "2026-11-17",
        amount: 163.71,
        currency: "EUR",
        description: "RE-2026-0005 Rechnung vom 16.11.2026",
        reference: undefined,
        counterpartName: "Max Mustermann",
        counterpartIban: "DE02120300000000202051",
        bankReference: "2026111700012345",
        reversal: false,
    });
    assert.equal(debit.amount, -49.9);
    // Predefined and numeric entities are decoded, nothing else
    assert.equal(debit.counterpartName, "Müller & Söhne Praxisbedarf – GmbH");
    assert.equal(debit.description, "Kundennr. 4711 <Nov>");
    assert.equal(debit.counterpartIban, "DE75512108001245126199");
    assert.equal(debit.reference, "E2E-4711");
});

test("reversal (RvslInd): sign follows CdtDbtInd, entry is flagged", () => {
    const reversal = parseCamt(fixture("camt052_v02_sparkasse.xml")).transactions[2];
    // Rücklastschrift: CRDT + RvslInd = the earlier debit is credited back
    assert.equal(reversal.amount, 49.9);
    assert.equal(reversal.reversal, true);
    // The counterparty stays the creditor of the original direct debit
    assert.equal(reversal.counterpartName, "Müller & Söhne Praxisbedarf – GmbH");
    assert.equal(reversal.counterpartIban, "DE75512108001245126199");
    assert.equal(reversal.bankReference, "2026111800000002");
});

test("camt.053 V8 batch: split per detail with own sign and reference", () => {
    const { transactions } = parseCamt(fixture("camt053_v08_batch.xml"));
    assert.deepEqual(
        transactions.map((t) => [t.bookingDate, t.amount, t.counterpartName, t.reference, t.bankReference]),
        [
            ["2026-11-16", 200, "Erika Musterfrau", "RF18RE20260001", "BATCH-20261116-77-A"],
            ["2026-11-16", -50, "Beispielbank AG", undefined, "BATCH-20261116-77#2"],
        ],
    );
    assert.equal(transactions[1].description, "Entgelt Sammelgutschrift");
});

test("camt.054 V8 notification", () => {
    const { transactions, accountIban } = parseCamt(fixture("camt054_v08_notification.xml"));
    assert.equal(accountIban, "DE89370400440532013000");
    assert.equal(transactions.length, 1);
    assert.deepEqual(
        [transactions[0].bookingDate, transactions[0].amount, transactions[0].counterpartName, transactions[0].reference],
        ["2026-11-20", -1234.56, "Beispiel Immobilien KG", "MIETE-2026-11"],
    );
});

test("rejects non-CAMT input and DOCTYPE; no entity expansion", () => {
    assert.throws(() => parseCamt("<Document><Foo/></Document>"), CamtParseError);
    assert.throws(() => parseCamt("not xml at all <<"), CamtParseError);
    const withDtd = `<?xml version="1.0"?><!DOCTYPE Document [<!ENTITY x "xxxxxxxx">]><Document/>`;
    assert.throws(() => parseCamt(withDtd), /DOCTYPE/);
    // An undeclared entity reference stays literal text
    const xml = fixture("camt054_v08_notification.xml").replace("Miete November Praxisraeume", "&lol;");
    assert.equal(parseCamt(xml).transactions[0].description, "&lol;");
});

test("declared encodings are honoured", () => {
    const head = strToU8('<?xml version="1.0" encoding="ISO-8859-1"?><a>');
    const latin1 = new Uint8Array([...head, 0xfc, ...strToU8("</a>")]);
    assert.equal(decodeXml(latin1), '<?xml version="1.0" encoding="ISO-8859-1"?><a>ü</a>');
    const bom = new Uint8Array([0xef, 0xbb, 0xbf, ...strToU8("<a>ü</a>")]);
    assert.equal(decodeXml(bom), "<a>ü</a>");
});

test("ZIP upload: XML files in name order, other files ignored, bounds enforced", () => {
    const zip = zipSync({
        "b_camt053.xml": strToU8(fixture("camt053_v08_batch.xml")),
        "a_camt052.xml": strToU8(fixture("camt052_v02_sparkasse.xml")),
        "readme.txt": strToU8("ignored"),
        "__MACOSX/._a_camt052.xml": strToU8("ignored"),
    });
    const documents = extractCamtDocuments(zip);
    assert.equal(documents.length, 2);
    assert.match(documents[0], /camt\.052/);

    const tooMany = Object.fromEntries(
        Array.from({ length: CAMT_LIMITS.maxFiles + 1 }, (_, i) => [`${i}.xml`, strToU8("<a/>")]),
    );
    assert.throws(() => extractCamtDocuments(zipSync(tooMany)), CamtFileError);

    // Highly compressible content beyond the decompressed limit
    const bomb = zipSync({ "big.xml": new Uint8Array(CAMT_LIMITS.maxTotalBytes + 1).fill(0x20) }, { level: 9 });
    assert.ok(bomb.length < CAMT_LIMITS.maxUploadBytes);
    assert.throws(() => extractCamtDocuments(bomb), /too large/);

    assert.throws(() => extractCamtDocuments(zipSync({ "notes.txt": strToU8("x") })), /no XML/);
    assert.throws(() => extractCamtDocuments(new Uint8Array(CAMT_LIMITS.maxUploadBytes + 1)), /too large/);
});

test("overlapping re-imports: bank reference first, legacy key as fallback", () => {
    const first = parseCamt(fixture("camt052_v02_sparkasse.xml")).transactions;
    const initial = planBankImport([], first);
    assert.equal(initial.toCreate.length, 3);
    assert.equal(initial.duplicates, 0);

    // Second export overlaps: the same three entries plus a new one
    const stored = initial.toCreate.map((t) => ({ ...t }));
    const second = [...first, ...parseCamt(fixture("camt054_v08_notification.xml")).transactions];
    const again = planBankImport(stored, second);
    assert.equal(again.duplicates, 3);
    assert.deepEqual(again.toCreate.map((t) => t.bankReference), ["NTF-20261120-9"]);

    // Two genuinely identical payments with different bank references are both kept
    const twin = { ...first[0], bankReference: "2026111700099999" };
    assert.equal(planBankImport(stored, [twin]).toCreate.length, 1);

    // Rows imported earlier from CSV (no reference, old field name) still match
    const csvRow = { transactionDate: "2026-11-17", amount: 163.71, description: "RE-2026-0005 Rechnung vom 16.11.2026" };
    const overCsv = planBankImport([csvRow], first);
    assert.equal(overCsv.duplicates, 1);
    assert.equal(overCsv.toCreate.length, 2);

    // CSV rows without reference keep the previous date/amount/text behaviour
    const csv = [{ bookingDate: "2026-11-01", amount: -5, description: "Gebühr" }];
    assert.equal(planBankImport([], [...csv, ...csv]).duplicates, 1);
});
