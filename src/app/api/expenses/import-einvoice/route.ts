import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/appwrite-server";
import {
    extractXmlFromPdf,
    parseEInvoiceXml,
} from "@/lib/eInvoiceParser";
import { isOversizedBase64, MAX_UPLOAD_BYTES } from "@/lib/server/security";

/**
 * Parse an incoming e-invoice (XRechnung XML in UBL/CII syntax, or a
 * ZUGFeRD/Factur-X PDF) and return prefill data for an expense. Nothing
 * is stored — the user reviews and saves the expense explicitly.
 */
export async function POST(request: NextRequest) {
    try {
        try {
            const { account } = await createSessionClient();
            await account.get();
        } catch {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { fileBase64, filename } = body as {
            fileBase64: string;
            filename?: string;
        };
        if (!fileBase64) {
            return NextResponse.json(
                { error: "fileBase64 required" },
                { status: 400 }
            );
        }
        if (typeof fileBase64 !== "string" || isOversizedBase64(fileBase64, MAX_UPLOAD_BYTES)) {
            return NextResponse.json(
                { error: "file_too_large" },
                { status: 413 }
            );
        }

        const buffer = Buffer.from(fileBase64, "base64");
        let xml: string | null = null;

        if (buffer.subarray(0, 5).toString() === "%PDF-") {
            xml = extractXmlFromPdf(buffer);
            if (!xml) {
                return NextResponse.json(
                    { error: "no_embedded_xml" },
                    { status: 422 }
                );
            }
        } else {
            xml = buffer.toString("utf8");
        }

        try {
            const parsed = parseEInvoiceXml(xml);
            return NextResponse.json({
                ...parsed,
                source_filename: filename,
            });
        } catch {
            return NextResponse.json(
                { error: "unsupported_format" },
                { status: 422 }
            );
        }
    } catch (error) {
        console.error("E-invoice import failed:", error);
        return NextResponse.json(
            { error: "import_failed" },
            { status: 500 }
        );
    }
}
