import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/appwrite-server";
import { Icd10ImportError, importIcd10Catalog, loadIcd10Catalog } from "@/lib/server/icd10Catalog";

const authenticated = async () => {
    try {
        const { account } = await createSessionClient();
        await account.get();
        return true;
    } catch {
        return false;
    }
};

/** GET → status of the imported catalogue */
export async function GET() {
    if (!(await authenticated())) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const catalog = await loadIcd10Catalog();
    return NextResponse.json(catalog
        ? { available: true, version: catalog.version, count: catalog.codes.length, importedAt: catalog.importedAt, source: catalog.source }
        : { available: false });
}

/** POST multipart: file (…syst_kodes.txt or BfArM ZIP), optional year */
export async function POST(request: NextRequest) {
    if (!(await authenticated())) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 400 });
    if (file.size > 100 * 1024 * 1024) return NextResponse.json({ error: "Datei zu groß (max. 100 MB)" }, { status: 400 });
    const year = String(form.get("year") || "").trim() || undefined;
    try {
        const result = await importIcd10Catalog(file.name, new Uint8Array(await file.arrayBuffer()), year);
        return NextResponse.json(result);
    } catch (error) {
        if (error instanceof Icd10ImportError) return NextResponse.json({ error: error.message }, { status: 400 });
        console.error("ICD-10 import failed:", error);
        return NextResponse.json({ error: "Import fehlgeschlagen" }, { status: 500 });
    }
}
