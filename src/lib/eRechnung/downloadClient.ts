export type EInvoiceFormat = "zugferd" | "xrechnung";

export class EInvoiceDownloadError extends Error {
    readonly errors: string[];
    readonly status: number;

    constructor(message: string, errors: string[] = [], status = 500) {
        super(message);
        this.name = "EInvoiceDownloadError";
        this.errors = errors;
        this.status = status;
    }
}

function parseDispositionFilename(header: string | null): string | null {
    if (!header) return null;
    const utf8Match = /filename\*\s*=\s*UTF-8''([^;\s]+)/i.exec(header);
    if (utf8Match?.[1]) {
        try {
            return decodeURIComponent(utf8Match[1]);
        } catch {
            // Fall back to plain filename parameter
        }
    }
    const asciiMatch = /filename\s*=\s*"([^"]+)"/i.exec(header) ?? /filename\s*=\s*([^;\s]+)/i.exec(header);
    return asciiMatch?.[1]?.trim() || null;
}

/**
 * Download an invoice as ZUGFeRD 2.3 PDF/A-3 or XRechnung 3.0 XML via fetch,
 * surfacing structured validation errors instead of opening a raw JSON tab.
 */
export async function downloadEInvoiceFile(
    invoiceId: string,
    format: EInvoiceFormat,
    invoiceNumber?: string,
): Promise<void> {
    const res = await fetch(
        `/api/invoices/${encodeURIComponent(invoiceId)}/${format}`,
        { credentials: "same-origin" },
    );

    if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            errors?: unknown;
        };
        const errors = Array.isArray(body.errors)
            ? body.errors.filter((e): e is string => typeof e === "string" && e.trim().length > 0)
            : [];
        const fallbackMsg =
            body.error ||
            (format === "zugferd"
                ? "ZUGFeRD-PDF konnte nicht erstellt werden."
                : "XRechnung-XML konnte nicht erstellt werden.");
        throw new EInvoiceDownloadError(
            errors.length > 0 ? errors.join(" • ") : fallbackMsg,
            errors,
            res.status,
        );
    }

    const blob = await res.blob();
    const ext = format === "zugferd" ? "pdf" : "xml";
    const safeNumber = (invoiceNumber || invoiceId).replace(/[\\/:*?"<>|]+/g, "_");
    const filename =
        parseDispositionFilename(res.headers.get("Content-Disposition")) ||
        `${format}-${safeNumber}.${ext}`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
