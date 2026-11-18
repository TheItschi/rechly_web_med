import test from "node:test";
import assert from "node:assert/strict";
import { CamtParseError, parseCamt } from "../src/lib/bank/camt";
import { decodeXml } from "../src/lib/bank/readCamtFile";

// Sparkasse-style camt.052.001.02 ("CAMT V2")
const camt052v2 = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.052.001.02">
 <BkToCstmrAcctRpt><GrpHdr><MsgId>1</MsgId></GrpHdr>
  <Rpt><Id>R1</Id><Acct><Id><IBAN>DE05711526800030166938</IBAN></Id></Acct>
   <Ntry><Amt Ccy="EUR">163.71</Amt><CdtDbtInd>CRDT</CdtDbtInd><Sts>BOOK</Sts>
    <BookgDt><Dt>2026-11-17</Dt></BookgDt><ValDt><Dt>2026-11-17</Dt></ValDt>
    <AcctSvcrRef>2026111712345</AcctSvcrRef><AddtlNtryInf>GUTSCHR. UEBERWEISUNG</AddtlNtryInf>
    <NtryDtls><TxDtls><Refs><EndToEndId>NOTPROVIDED</EndToEndId></Refs>
     <RltdPties><Dbtr><Nm>Yavuz Icsezer</Nm></Dbtr><DbtrAcct><Id><IBAN>DE89 3704 0044 0532 0130 00</IBAN></Id></DbtrAcct></RltdPties>
     <RmtInf><Ustrd>RE-2026-0005</Ustrd><Ustrd>Laboruntersuchung</Ustrd></RmtInf>
    </TxDtls></NtryDtls></Ntry>
   <Ntry><Amt Ccy="EUR">49.90</Amt><CdtDbtInd>DBIT</CdtDbtInd><Sts>BOOK</Sts>
    <BookgDt><Dt>2026-11-18</Dt></BookgDt><AcctSvcrRef>2026111800001</AcctSvcrRef>
    <NtryDtls><TxDtls><Refs><MndtId>M-77</MndtId></Refs>
     <RltdPties><Cdtr><Nm>Praxisbedarf GmbH</Nm></Cdtr><CdtrAcct><Id><IBAN>DE02120300000000202051</IBAN></Id></CdtrAcct></RltdPties>
     <RmtInf><Ustrd>Kundennr 4711</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>
   <Ntry><Amt Ccy="EUR">10.00</Amt><CdtDbtInd>DBIT</CdtDbtInd><Sts>PDNG</Sts><BookgDt><Dt>2026-11-19</Dt></BookgDt></Ntry>
  </Rpt>
 </BkToCstmrAcctRpt>
</Document>`;

// camt.053.001.08 ("CAMT V8"): status as <Cd>, party below <Pty>, batch booking
const camt053v8 = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08">
 <BkToCstmrStmt><Stmt><Acct><Id><IBAN>DE05711526800030166938</IBAN></Id></Acct>
  <Ntry><Amt Ccy="EUR">300.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><Sts><Cd>BOOK</Cd></Sts>
   <BookgDt><DtTm>2026-11-16T10:00:00+01:00</DtTm></BookgDt><AcctSvcrRef>SAMMLER1</AcctSvcrRef>
   <NtryDtls>
    <TxDtls><AmtDtls><TxAmt><Amt Ccy="EUR">100.00</Amt></TxAmt></AmtDtls>
     <RltdPties><Dbtr><Pty><Nm>Patient A</Nm></Pty></Dbtr></RltdPties>
     <RmtInf><Strd><CdtrRefInf><Ref>RF18RE20260001</Ref></CdtrRefInf></Strd></RmtInf></TxDtls>
    <TxDtls><AmtDtls><TxAmt><Amt Ccy="EUR">200.00</Amt></TxAmt></AmtDtls>
     <RltdPties><Dbtr><Pty><Nm>Patient B</Nm></Pty></Dbtr></RltdPties><RmtInf><Ustrd>RE-2026-0002</Ustrd></RmtInf></TxDtls>
   </NtryDtls></Ntry>
 </Stmt></BkToCstmrStmt>
</Document>`;

test("CAMT V2 (camt.052): booked entries, sign, counterparty, remittance", () => {
    const r = parseCamt(camt052v2);
    assert.equal(r.accountIban, "DE05711526800030166938");
    assert.equal(r.skippedPending, 1);
    assert.equal(r.transactions.length, 2);
    const [credit, debit] = r.transactions;
    assert.deepEqual(
        { d: credit.transactionDate, a: credit.amount, t: credit.description, n: credit.counterpartName, i: credit.counterpartIban, ref: credit.reference, b: credit.bankReference },
        { d: "2026-11-17", a: 163.71, t: "RE-2026-0005 Laboruntersuchung", n: "Yavuz Icsezer", i: "DE89370400440532013000", ref: undefined, b: "2026111712345" },
    );
    assert.equal(debit.amount, -49.9);
    assert.equal(debit.counterpartName, "Praxisbedarf GmbH");
    assert.equal(debit.reference, "M-77");
});

test("CAMT V8 (camt.053): Sammelbuchung split, DtTm, structured reference", () => {
    const r = parseCamt(camt053v8);
    assert.deepEqual(r.transactions.map((t) => [t.transactionDate, t.amount, t.counterpartName, t.bankReference]), [
        ["2026-11-16", 100, "Patient A", "SAMMLER1#1"],
        ["2026-11-16", 200, "Patient B", "SAMMLER1#2"],
    ]);
    assert.equal(r.transactions[0].reference, "RF18RE20260001");
    assert.equal(r.transactions[1].description, "RE-2026-0002");
});

test("CAMT: invalid input and declared encodings", () => {
    assert.throws(() => parseCamt("<Document><Foo/></Document>"), CamtParseError);
    const latin = new Uint8Array([...new TextEncoder().encode('<?xml version="1.0" encoding="ISO-8859-1"?><a>'), 0xfc, ...new TextEncoder().encode("</a>")]);
    assert.ok(decodeXml(latin).includes("ü"));
});
