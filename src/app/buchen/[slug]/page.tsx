import { notFound } from "next/navigation";
import { resolvePublicBusiness, toPublicBusiness } from "@/lib/termine/public";
import PublicBooking from "@/components/termine/PublicBooking";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const { settings } = await resolvePublicBusiness(slug);
        return {
            title: `${settings.displayName} – Online buchen`,
            description: `Termine bei ${settings.displayName} online buchen.`,
        };
    } catch {
        return { title: "Buchungsseite nicht gefunden" };
    }
}

export default async function BuchenPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const { db, settings } = await (async () => {
        try {
            return await resolvePublicBusiness(slug);
        } catch {
            return notFound() as never;
        }
    })();
    const business = toPublicBusiness(settings);
    const { Query } = await import("node-appwrite");
    const { DATABASE_ID } = await import("@/lib/appwrite-server");
    const { T } = await import("@/lib/termine/store");
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

    const rawStaff = staff.documents.length > 0
        ? staff.documents
        : [
              {
                  $id: `staff-owner-${settings.userId}`,
                  name: settings.displayName || "Inhaber",
                  active: true,
                  bookable: true,
                  serviceIds: [],
              },
          ];

    return (
        <PublicBooking
            business={business}
            services={services.documents.map((s: unknown) => {
                const r = s as Record<string, unknown>;
                return {
                    id: String(r.$id),
                    name: String(r.name ?? ""),
                    description: typeof r.description === "string" ? r.description : undefined,
                    category: typeof r.category === "string" ? r.category : undefined,
                    durationMinutes: Number(r.durationMinutes ?? 30),
                    priceCents: Number(r.priceCents ?? 0),
                    currency: String(r.currency ?? "EUR"),
                    staffIds: Array.isArray(r.staffIds) ? (r.staffIds as string[]) : [],
                };
            })}
            staff={rawStaff.map((s: unknown) => {
                const r = s as Record<string, unknown>;
                return {
                    id: String(r.$id),
                    name: String(r.name ?? ""),
                    description: typeof r.description === "string" ? r.description : undefined,
                    color: typeof r.color === "string" ? r.color : undefined,
                    serviceIds: Array.isArray(r.serviceIds) ? (r.serviceIds as string[]) : [],
                };
            })}
        />
    );
}
