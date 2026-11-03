import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/appwrite-server";
import { searchIcd10 } from "@/lib/icd10";
import { loadIcd10Catalog } from "@/lib/server/icd10Catalog";

// GET /api/icd10/search?q=… – search the imported ICD-10-GM catalogue
export async function GET(request: NextRequest) {
    try {
        const { account } = await createSessionClient();
        await account.get();
    } catch {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const catalog = await loadIcd10Catalog();
    if (!catalog) return NextResponse.json({ available: false, results: [] });
    const q = (request.nextUrl.searchParams.get("q") || "").slice(0, 100);
    return NextResponse.json({ available: true, version: catalog.version, results: searchIcd10(catalog.codes, q) });
}
