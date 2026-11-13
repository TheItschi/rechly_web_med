import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { generatePdfPassword, protectPdf } from "../src/lib/pdfProtect";

test("generated passwords are readable and random", () => {
    const a = generatePdfPassword();
    assert.equal(a.length, 10);
    assert.match(a, /^[a-km-np-zA-HJ-NP-Z2-9]+$/);
    assert.notEqual(a, generatePdfPassword());
});

test("protectPdf encrypts with AES-256 and the user password", async (t) => {
    const { PDFDocument } = await import("@cantoo/pdf-lib");
    const doc = await PDFDocument.create();
    doc.addPage().drawText("Rechnung PL-2026-001");
    const encrypted = await protectPdf(await doc.save(), "geheim123");
    await assert.rejects(protectPdf(encrypted, "kurz"), /mindestens/);
    const file = path.join(mkdtempSync(path.join(tmpdir(), "pdfprot-")), "x.pdf");
    writeFileSync(file, encrypted);
    let qpdf = true;
    try { execFileSync("qpdf", ["--version"]); } catch { qpdf = false; }
    if (!qpdf) return t.skip("qpdf not installed");
    const info = execFileSync("qpdf", ["--show-encryption", `--password=geheim123`, file]).toString();
    assert.match(info, /AESv3/);
    assert.throws(() => execFileSync("qpdf", ["--check", "--password=falsch", file], { stdio: "pipe" }));
});
