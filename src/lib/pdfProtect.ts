/**
 * Password protection for invoice PDFs (AES-256, PDF 2.0 security handler
 * V5/R6). Runs in the browser; the library is loaded on demand.
 */

const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Random, readable password (no 0/O, 1/l/I) for transmission by phone or SMS. */
export function generatePdfPassword(length = 10): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    // 256 % 54 bias is negligible for this purpose but avoid it anyway
    let out = "";
    for (let i = 0; out.length < length; i++) {
        if (i >= bytes.length) {
            crypto.getRandomValues(bytes);
            i = 0;
        }
        const b = bytes[i];
        if (b < 256 - (256 % PASSWORD_ALPHABET.length)) out += PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length];
    }
    return out;
}

export const MIN_PDF_PASSWORD_LENGTH = 6;

/** Encrypts a PDF with a user password; printing and copying stay allowed. */
export async function protectPdf(bytes: Uint8Array, password: string): Promise<Uint8Array> {
    if (password.length < MIN_PDF_PASSWORD_LENGTH) throw new Error(`Das Passwort muss mindestens ${MIN_PDF_PASSWORD_LENGTH} Zeichen lang sein.`);
    const { PDFDocument } = await import("@cantoo/pdf-lib");
    const doc = await PDFDocument.load(bytes);
    doc.encrypt({
        userPassword: password,
        // Random owner password: nobody can lift the restrictions below.
        ownerPassword: generatePdfPassword(32),
        algorithm: "AES-256",
        permissions: { printing: "highResolution", copying: true, contentAccessibility: true, modifying: false, annotating: false, documentAssembly: false },
    });
    return doc.save({ useObjectStreams: false });
}
