import PDFDocument from "pdfkit";
import path from "node:path";
import type { BusinessDocument } from "./domain";

/** Plain text is rendered as text, never interpreted as HTML. Long bodies paginate. */
export function workspaceDocumentPdf(document: BusinessDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const pdf = new PDFDocument({ size: "A4", margin: 60, info: { Title: document.title } });
        const chunks: Buffer[] = [];
        pdf.on("data", chunk => chunks.push(chunk));
        pdf.on("end", () => resolve(Buffer.concat(chunks)));
        pdf.on("error", reject);
        pdf.font(path.join(process.cwd(), "public/fonts/liberation/LiberationSans-Regular.ttf"));
        if (document.recipient) pdf.fontSize(11).text(document.recipient).moveDown(2);
        pdf.fontSize(22).text(document.title).moveDown();
        pdf.fontSize(11).text(document.body, { lineGap: 4 });
        pdf.end();
    });
}
