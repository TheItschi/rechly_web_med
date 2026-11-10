/**
 * Company logo handling: what the user uploads in settings must be exactly
 * what ends up on the invoice PDFs. Upload accepts any browser-decodable
 * raster image, but both PDF renderers (@react-pdf/renderer and pdfkit)
 * only embed PNG/JPEG — so every logo is normalized to a PNG data URL
 * (max 600 px wide) right at upload time.
 */

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const MAX_LOGO_WIDTH = 600;

export type LogoErrorCode = "type" | "size" | "decode";

export class LogoError extends Error {
    readonly code: LogoErrorCode;
    constructor(code: LogoErrorCode) {
        super(`logo:${code}`);
        this.name = "LogoError";
        this.code = code;
    }
}

/** RasterFormats the browser can draw to canvas (SVG is excluded: neither PDF renderer supports it). */
function isSupportedType(type: string): boolean {
    if (!type.startsWith("image/")) return false;
    if (type === "image/svg+xml") return false;
    return true;
}

async function decodeToBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
    if (typeof createImageBitmap === "function") {
        try {
            return await createImageBitmap(file);
        } catch {
            // Fall through to <img> fallback below.
        }
    }
    const url = URL.createObjectURL(file);
    try {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("decode"));
            img.src = url;
        });
        return img;
    } catch {
        throw new LogoError("decode");
    } finally {
        URL.revokeObjectURL(url);
    }
}

/**
 * Validate and normalize an uploaded logo file to a PNG data URL.
 * Throws LogoError with code "type" | "size" | "decode".
 */
export async function normalizeLogoFile(file: File): Promise<string> {
    if (!isSupportedType(file.type)) throw new LogoError("type");
    if (file.size > MAX_LOGO_BYTES) throw new LogoError("size");

    let bitmap: ImageBitmap | HTMLImageElement;
    try {
        bitmap = await decodeToBitmap(file);
    } catch (error) {
        if (error instanceof LogoError) throw error;
        throw new LogoError("decode");
    }
    const width = bitmap.width;
    const height = bitmap.height;
    if (!width || !height) throw new LogoError("decode");

    const scale = Math.min(1, MAX_LOGO_WIDTH / width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new LogoError("decode");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if (typeof (bitmap as ImageBitmap).close === "function") {
        (bitmap as ImageBitmap).close();
    }
    return canvas.toDataURL("image/png");
}

/** Mime types both PDF renderers can embed (react-pdf + pdfkit). */
export function isPdfSafeLogo(dataUrl: unknown): dataUrl is string {
    return (
        typeof dataUrl === "string" &&
        /^data:image\/(png|jpe?g)(?:;[^;,]+)*;base64,/i.test(dataUrl)
    );
}
