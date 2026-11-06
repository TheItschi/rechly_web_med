import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/appwrite-server";
import { extractXmlFromPdf } from "@/lib/eInvoiceParser";
import {
    parseEInvoiceXmlForMigration,
    type ParsedMigrationEInvoice,
} from "@/lib/migration/importer";

export async function POST(request: NextRequest) {
    try {
        try {
            const sessionClient = await createSessionClient();
            const user = await sessionClient.account.get();
            if (!user) {
                return NextResponse.json(
                    { error: "Not authenticated" },
                    { status: 401 },
                );
            }
        } catch {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 },
            );
        }

        const formData = await request.formData();
        const files = formData.getAll("files") as File[];

        if (!files || files.length === 0) {
            return NextResponse.json(
                { error: "No files provided" },
                { status: 400 },
            );
        }

        const parsedInvoices: ParsedMigrationEInvoice[] = [];
        const failedFiles: Array<{ fileName: string; reason: string }> = [];

        for (const file of files) {
            try {
                const buffer = Buffer.from(await file.arrayBuffer());
                const lowerName = file.name.toLowerCase();

                let xmlContent: string | null = null;
                if (
                    lowerName.endsWith(".pdf") ||
                    file.type === "application/pdf"
                ) {
                    xmlContent = extractXmlFromPdf(buffer);
                    if (!xmlContent) {
                        failedFiles.push({
                            fileName: file.name,
                            reason: "Kein eingebettetes ZUGFeRD/Factur-X XML in dieser PDF gefunden.",
                        });
                        continue;
                    }
                } else {
                    xmlContent = buffer.toString("utf-8");
                }

                const parsed = parseEInvoiceXmlForMigration(xmlContent);
                if (!parsed) {
                    failedFiles.push({
                        fileName: file.name,
                        reason: "Unbekanntes XML-Format (weder XRechnung UBL noch CII/ZUGFeRD).",
                    });
                    continue;
                }

                parsedInvoices.push(parsed);
            } catch (err) {
                failedFiles.push({
                    fileName: file.name,
                    reason:
                        err instanceof Error
                            ? err.message
                            : "Fehler beim Lesen der Datei",
                });
            }
        }

        return NextResponse.json({
            invoices: parsedInvoices,
            failedFiles,
        });
    } catch (error) {
        console.error("Error parsing e-invoices for migration:", error);
        return NextResponse.json(
            { error: "Failed to parse e-invoice files" },
            { status: 500 },
        );
    }
}
