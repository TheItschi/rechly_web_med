import { TermineError } from "./store";
export function bookingOrigin(request: Request) {
    const origin = request.headers.get("origin");
    const expected = new URL(request.url).origin;
    const actualHost = request.headers.get("host");
    const sameHost = actualHost ? new URL(request.url).protocol + "//" + actualHost : expected;
    if (
        request.headers.get("sec-fetch-site") === "cross-site" ||
        (origin && origin !== expected && origin !== sameHost)
    )
        throw new TermineError("Anfrage von dieser Website nicht erlaubt.", 403);
}
export async function bookingJson(request: Request): Promise<Record<string, unknown>> {
    bookingOrigin(request);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
        throw new TermineError("JSON-Anfrage erforderlich.", 415);
    const reader = request.body?.getReader();
    if (!reader) throw new TermineError("Leere Anfrage.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 32768) {
            await reader.cancel();
            throw new TermineError("Anfrage zu groß.", 413);
        }
        chunks.push(value);
    }
    try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
        return body;
    } catch {
        throw new TermineError("Ungültige Anfrage.");
    }
}
