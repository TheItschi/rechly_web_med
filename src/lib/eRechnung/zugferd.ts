import { identifierSummary } from "./identifierSummary";
/**
 * PDF generation with embedded Factur-X EN 16931 CII XML.
 * PDF/A-3b container; see docs/COMPLIANCE_VALIDATION.md for tested profiles.
 * Uses pdfkit for PDF generation and embeds the CII XML as a file attachment.
 */

import PDFDocument from "pdfkit";
import path from "node:path";
import type { InvoiceWithDetails, UserCompany } from "@/types";
import { isPdfSafeLogo } from "@/lib/companyLogo";

/** Decode a PDF-safe logo data URL to a Buffer for pdfkit. Returns null when unusable. */
function logoToBuffer(dataUrl: unknown): Buffer | null {
    if (!isPdfSafeLogo(dataUrl)) return null;
    const match = /^data:(image\/[a-z+]+);base64,([\s\S]*)$/i.exec(dataUrl);
    if (!match) return null;
    try {
        return Buffer.from(match[2].replace(/\s/g, ""), "base64");
    } catch {
        return null;
    }
}
import {
    generateXRechnungXML,
    validateXRechnung,
} from "./xrechnung";

function formatAmount(n: number): string {    return new Intl.NumberFormat("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n);
}

function formatDate(dateStr: string): string {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.slice(0, 10).split("-");
    return `${d}.${m}.${y}`;
}

/**
 * Generate a PDF/A-3b document with embedded Factur-X XML.
 * Returns a Buffer containing the PDF bytes.
 */
export async function generateZUGFeRDPDF(
    invoice: InvoiceWithDetails,
    company: UserCompany,
): Promise<Buffer> {
    const errors = validateXRechnung(invoice, company);
    if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join("; ")}`);
    }

    const xml = generateXRechnungXML(invoice, company, "en16931");
    const xmlBuffer = Buffer.from(xml, "utf-8");

    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({
            subset: "PDF/A-3b",
            pdfVersion: "1.7",
            font: path.join(process.cwd(), "public/fonts/liberation/LiberationSans-Regular.ttf"),
            autoFirstPage: true,
            size: "A4",
            margins: { top: 50, bottom: 50, left: 60, right: 60 },
        });

        doc.on("data", (chunk: Buffer) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
        doc.registerFont("Invoice-Regular", path.join(process.cwd(), "public/fonts/liberation/LiberationSans-Regular.ttf"));
        doc.registerFont("Invoice-Bold", path.join(process.cwd(), "public/fonts/liberation/LiberationSans-Bold.ttf"));

        const client = invoice.client!;
        const pageWidth = doc.page.width - 120; // margins

        // Header
        doc.fontSize(20).font("Invoice-Bold").text(company.name, 60, 50);
        // Company logo top-right (PNG/JPEG only; failures must never break the compliant PDF).
        try {
            const logo = company.logo_base64 ? logoToBuffer(company.logo_base64) : null;
            if (logo) doc.image(logo, 535 - 110, 45, { fit: [110, 55], align: "right" });
        } catch {
            // Skip unreadable logos silently.
        }
        doc.fontSize(9).font("Invoice-Regular").fillColor("#666666");
        const companyLine = [
            company.address_line1,
            company.postal_code,
            company.city,
            company.country || "Deutschland",
        ]
            .filter(Boolean)
            .join(", ");
        doc.text(companyLine, 60, 75);
        if (company.email) doc.text(company.email, 60, 90);
        if (company.vat_id) doc.text(`USt-IdNr.: ${company.vat_id}`, 60, 105);
        else if (company.tax_number)
            doc.text(`Steuernummer: ${company.tax_number}`, 60, 105);

        // Invoice label
        doc.fillColor("#000000").fontSize(16).font("Invoice-Bold");
        const title =
            invoice.correction_type === "credit_note"
                ? "GUTSCHRIFT"
                : invoice.correction_type === "correction"
                  ? "KORREKTURRECHNUNG"
                  : "RECHNUNG";
        doc.text(title, 60, 150);

        // Billing info columns
        doc.fontSize(9).font("Invoice-Regular");

        // Left: recipient
        doc.fillColor("#666666").text("An:", 60, 190);
        doc.fillColor("#000000")
            .font("Invoice-Bold")
            .text(client.name, 60, 205);
        doc.font("Invoice-Regular");
        if (client.address_line1) doc.text(client.address_line1, 60, 220);
        if (client.address_line2) doc.text(client.address_line2, 60, 235);
        const clientCity =
            `${client.postal_code || ""} ${client.city || ""}`.trim();
        doc.text(clientCity, 60, client.address_line2 ? 250 : 235);
        doc.text(
            client.country || "Deutschland",
            60,
            client.address_line2 ? 265 : 250,
        );

        // Right: invoice details
        const rightX = 340;
        let rightY = 190;
        const addDetail = (label: string, value: string) => {
            const valueWidth = doc.page.width - 60 - (rightX + 100);
            const height = Math.max(15, doc.heightOfString(value, { width: valueWidth }) + 4);
            doc.fillColor("#666666").text(label, rightX, rightY, { width: 95 });
            doc.fillColor("#000000").text(value, rightX + 100, rightY, { width: valueWidth });
            rightY += height;
        };
        addDetail("Rechnungsnummer:", invoice.invoice_number);
        addDetail("Datum:", formatDate(invoice.issue_date));
        if (invoice.due_date)
            addDetail("Fällig:", formatDate(invoice.due_date));
        if (client.leitweg_id) addDetail("Leitweg-ID:", client.leitweg_id);

        // Line items table
        const tableY = Math.max(320, rightY + 25);
        const colPositions = {
            desc: 60,
            qty: 310,
            price: 380,
            vat: 450,
            total: 490,
        };

        // Table header
        doc.fillColor("#f0f0f0")
            .rect(60, tableY - 5, pageWidth, 20)
            .fill();
        doc.fillColor("#000000").font("Invoice-Bold").fontSize(9);
        doc.text("Beschreibung", colPositions.desc, tableY);
        doc.text("Menge", colPositions.qty, tableY, {
            align: "right",
            width: 60,
        });
        doc.text("Einzelpreis", colPositions.price, tableY, {
            align: "right",
            width: 60,
        });
        doc.text("MwSt.", colPositions.vat, tableY, {
            align: "right",
            width: 40,
        });
        doc.text("Gesamt", colPositions.total, tableY, {
            align: "right",
            width: 60,
        });

        let itemY = tableY + 25;
        doc.font("Invoice-Regular").fontSize(9);

        for (const item of invoice.items) {
            const netUnitPrice = item.price * (1 - (item.discount_percent || 0) / 100);
            const description = [item.description,
                item.gtin ? `GTIN: ${item.gtin}` : "",
                item.discount_percent ? `Rabatt: ${item.discount_percent}% (im Einzelpreis enthalten)` : "",
            ].filter(Boolean).join("\n");
            const lineNet =
                item.quantity *
                item.price *
                (1 - (item.discount_percent || 0) / 100);
            const lineGross = lineNet * (1 + item.tax_rate_percent / 100);

            if (itemY > 700) {
                doc.addPage();
                itemY = 60;
            }

            doc.fillColor("#000000").text(
                description,
                colPositions.desc,
                itemY,
                { width: 240 },
            );
            const descHeight = doc.heightOfString(description, {
                width: 240,
            });
            doc.text(
                `${item.quantity} ${item.unit_of_measure}`,
                colPositions.qty,
                itemY,
                { align: "right", width: 60 },
            );
            doc.text(
                `€ ${formatAmount(netUnitPrice)}`,
                colPositions.price,
                itemY,
                { align: "right", width: 60 },
            );
            doc.text(`${item.tax_rate_percent}%`, colPositions.vat, itemY, {
                align: "right",
                width: 40,
            });
            doc.text(
                `€ ${formatAmount(lineGross)}`,
                colPositions.total,
                itemY,
                { align: "right", width: 60 },
            );

            itemY += Math.max(descHeight, 18) + 4;

            // Divider line
            doc.fillColor("#e0e0e0")
                .rect(60, itemY - 2, pageWidth, 1)
                .fill();
        }

        // Totals
        const totalsX = 380;
        let totalsY = itemY + 15;

        doc.fillColor("#000000").font("Invoice-Regular").fontSize(9);
        doc.text("Nettobetrag:", totalsX, totalsY);
        doc.text(
            `€ ${formatAmount(invoice.subtotal)}`,
            totalsX + 120,
            totalsY,
            { align: "right", width: 55 },
        );
        totalsY += 15;
        doc.text("MwSt. gesamt:", totalsX, totalsY);
        doc.text(
            `€ ${formatAmount(invoice.total_vat)}`,
            totalsX + 120,
            totalsY,
            { align: "right", width: 55 },
        );
        totalsY += 5;
        doc.fillColor("#e0e0e0").rect(totalsX, totalsY, 175, 1).fill();
        totalsY += 8;
        doc.fillColor("#000000").font("Invoice-Bold").fontSize(12);
        doc.text("Gesamtbetrag:", totalsX, totalsY);
        doc.text(
            `€ ${formatAmount(invoice.total_gross)}`,
            totalsX + 110,
            totalsY,
            { align: "right", width: 65 },
        );

        // Notes
        if (invoice.notes) {
            totalsY += 40;
            doc.font("Invoice-Bold")
                .fontSize(9)
                .text("Notizen:", 60, totalsY);
            doc.font("Invoice-Regular").text(invoice.notes, 60, totalsY + 15, {
                width: pageWidth,
            });
        }

        // Print the same immutable identifiers and delivery address as the XML.
        const identifiers = identifierSummary(invoice.e_invoice);
        if (identifiers) {
            doc.addPage();
            doc.font("Invoice-Bold").fontSize(12).text("E-Rechnungsangaben / E-invoice details", 60, 50);
            doc.font("Invoice-Regular").fontSize(9).text(identifiers, 60, 80, { width: pageWidth });
        }
        // PDFKit adds the PDF/A identification and ICC output intent. Declare the
        // Factur-X extension schema as well as its values in the XMP packet.
        const properties = [
            ["DocumentType", "Invoice document type"],
            ["DocumentFileName", "Name of the embedded invoice XML"],
            ["Version", "Factur-X version"],
            ["ConformanceLevel", "Factur-X conformance level"],
        ];
        doc.appendXML(`
<rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
  <fx:DocumentType>INVOICE</fx:DocumentType>
  <fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>
  <fx:Version>1.0</fx:Version>
  <fx:ConformanceLevel>EN 16931</fx:ConformanceLevel>
</rdf:Description>
<rdf:Description rdf:about="" xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/"
  xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#" xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">
  <pdfaExtension:schemas><rdf:Bag><rdf:li rdf:parseType="Resource">
    <pdfaSchema:schema>Factur-X PDF/A Extension Schema</pdfaSchema:schema>
    <pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>
    <pdfaSchema:prefix>fx</pdfaSchema:prefix>
    <pdfaSchema:property><rdf:Seq>${properties.map(([name, description]) => `
      <rdf:li rdf:parseType="Resource"><pdfaProperty:name>${name}</pdfaProperty:name>
        <pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category>
        <pdfaProperty:description>${description}</pdfaProperty:description></rdf:li>`).join("")}
    </rdf:Seq></pdfaSchema:property>
  </rdf:li></rdf:Bag></pdfaExtension:schemas>
</rdf:Description>`);

        // PDFKit 0.18 supports `relationship`; @types/pdfkit omits it.
        const attachment = {
            name: "factur-x.xml",
            type: "text/xml",
            description: "Factur-X/ZUGFeRD Invoice Data",
            creationDate: new Date(),
            modifiedDate: new Date(),
            relationship: "Alternative",
        };
        doc.file(xmlBuffer, attachment);

        doc.end();
    });
}
