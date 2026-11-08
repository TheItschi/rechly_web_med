import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { DATABASE_ID } from "@/lib/appwrite-server";
import { T, TermineError } from "@/lib/termine/store";
import { resolvePublicBusiness, toPublicBusiness } from "@/lib/termine/public";
import type { ServiceRow, StaffRow } from "@/lib/termine/booking";

function fail(error: unknown) {
    if (error instanceof TermineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Buchungsseite ist derzeit nicht verfügbar." }, { status: 500 });
}

/** Public business profile + bookable services + bookable staff roster. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const { db, settings, companyDefaults } = await resolvePublicBusiness(slug);
        const [services, staff] = await Promise.all([
            db.listDocuments(DATABASE_ID, T.SERVICES, [
                Query.equal("userId", settings.userId),
                Query.equal("active", true),
                Query.equal("publicVisible", true),
                Query.orderAsc("sortOrder"),
                Query.limit(100),
            ]),
            db.listDocuments(DATABASE_ID, T.STAFF, [
                Query.equal("userId", settings.userId),
                Query.equal("active", true),
                Query.equal("bookable", true),
                Query.limit(100),
            ]),
        ]);
        const pubServices = (services.documents as unknown as ServiceRow[]).map((s) => ({
            id: s.$id,
            name: s.name,
            description: s.description,
            category: s.category,
            durationMinutes: s.durationMinutes,
            priceCents: settings.showPrices ? s.priceCents : undefined,
            currency: s.currency,
            staffIds: settings.allowAnyStaff ? s.staffIds : s.staffIds,
        }));
        const pubStaff = (staff.documents as unknown as StaffRow[]).map((s) => ({
            id: s.$id,
            name: s.name,
            description: s.description,
            color: s.color,
            serviceIds: s.serviceIds,
        }));
        return NextResponse.json({ business: toPublicBusiness(settings, companyDefaults), services: pubServices, staff: pubStaff });
    } catch (error) {
        return fail(error);
    }
}
