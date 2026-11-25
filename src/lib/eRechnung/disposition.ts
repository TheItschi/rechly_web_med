/**
 * Build a safe HTTP Content-Disposition attachment header for invoice exports.
 * Ensures ASCII-only fallback in `filename="..."` (preventing Node Fetch/Response
 * ByteString TypeErrors and path separator issues) plus RFC 5987 `filename*`.
 */
export function buildAttachmentDisposition(
    prefix: string,
    invoiceNumber: string | undefined | null,
    extension: string,
): string {
    const rawNumber = String(invoiceNumber || "invoice").trim() || "invoice";
    const safeExt = extension.replace(/^\.+/, "").replace(/[^A-Za-z0-9]/g, "") || "bin";
    const safePrefix = prefix.replace(/[^A-Za-z0-9_-]/g, "") || "export";

    const asciiPart = rawNumber
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9._-]+/g, "_")
        .replace(/^_+|_+$/g, "") || "invoice";

    const asciiFilename = `${safePrefix}-${asciiPart}.${safeExt}`;
    const utf8Clean = rawNumber.replace(/[\\/:*?"<>|\r\n\t]+/g, "_");
    const utf8Filename = `${safePrefix}-${utf8Clean}.${safeExt}`;
    const encodedUtf8 = encodeURIComponent(utf8Filename).replace(
        /['()*]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
    );

    return `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedUtf8}`;
}
