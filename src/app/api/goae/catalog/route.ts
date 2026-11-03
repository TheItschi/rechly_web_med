import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/appwrite-server";
import { listGoaeCatalog } from "@/lib/goae/catalog";
import { goaeCatalogToCsv, parseGoaeCsv } from "@/lib/goae/csv";
import { loadGoaeCatalog, resetGoaeCatalog, saveGoaeCatalog } from "@/lib/server/goaeCatalogStore";

const authenticated = async () => {
    try {
        const { account } = await createSessionClient();
        await account.get();
        return true;
    } catch {
        return false;
    }
};
const unauthorized = () => NextResponse.json({ error: "Not authenticated" }, { status: 401 });

/** GET → active custom catalogue (JSON) or ?format=csv → effective catalogue as CSV template */
export async function GET(request: NextRequest) {
    if (!(await authenticated())) return unauthorized();
    const stored = await loadGoaeCatalog();
    if (request.nextUrl.searchParams.get("format") === "csv") {
        return new NextResponse(goaeCatalogToCsv(listGoaeCatalog()), {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": 'attachment; filename="goae-katalog.csv"',
            },
        });
    }
    return NextResponse.json({
        custom: stored ? { mode: stored.mode, importedAt: stored.importedAt, source: stored.source, count: stored.entries.length, entries: stored.entries } : null,
        effectiveCount: listGoaeCatalog().length,
    });
}

/** POST multipart: file (CSV), mode=merge|replace */
export async function POST(request: NextRequest) {
    if (!(await authenticated())) return unauthorized();
    const form = await request.formData();
    const file = form.get("file");
    const mode = form.get("mode") === "replace" ? "replace" : "merge";
    if (!(file instanceof File)) return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Datei zu groß (max. 5 MB)" }, { status: 400 });

    const { entries, errors } = parseGoaeCsv(await file.text());
    if (!entries.length) {
        return NextResponse.json({ error: "Keine gültigen Ziffern gefunden", errors: errors.slice(0, 50) }, { status: 400 });
    }
    await saveGoaeCatalog({ mode, entries, importedAt: new Date().toISOString(), source: file.name });
    return NextResponse.json({ imported: entries.length, errors: errors.slice(0, 50), effectiveCount: listGoaeCatalog().length });
}

/** DELETE → back to the built-in excerpt */
export async function DELETE() {
    if (!(await authenticated())) return unauthorized();
    await resetGoaeCatalog();
    return NextResponse.json({ effectiveCount: listGoaeCatalog().length });
}
