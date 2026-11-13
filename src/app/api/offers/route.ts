import { NextRequest, NextResponse } from "next/server";
import { orderedIds } from "@/lib/server/orderedIds";
import { Query, ID, Permission, Role } from "node-appwrite";
import {
    createSessionClient,
    createAdminClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";
import {
    calculateInvoiceTotals,
    calculateLineItemTotals,
} from "@/lib/currencyUtils";

export async function GET() {
    try {
        let account;
        try {
            const sessionClient = await createSessionClient();
            account = sessionClient.account;
        } catch {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 },
            );
        }

        const { databases } = await createAdminClient();
        const user = await account.get();

        const [offersRes, clientsRes] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTIONS.OFFERS, [
                Query.equal("userId", user.$id),
                Query.orderDesc("$createdAt"),
                Query.limit(1000),
            ]),
            databases.listDocuments(DATABASE_ID, COLLECTIONS.CLIENTS, [
                Query.equal("userId", user.$id),
                Query.limit(1000),
            ]),
        ]);

        const clientsMap = new Map(
            clientsRes.documents.map((c) => [
                c.$id,
                {
                    id: c.$id,
                    name: c.name,
                    contact_person: c.contactPerson ?? undefined,
                    address_line1: c.addressLine1,
                    address_line2: c.addressLine2 ?? undefined,
                    postal_code: c.postalCode,
                    city: c.city,
                    country: c.country || "Deutschland",
                    email: c.email ?? undefined,
                    phone: c.phone ?? undefined,
                    vat_id: c.vatId ?? undefined,
                    tax_number: c.taxNumber ?? undefined,
                    leitweg_id: c.leitwegId ?? undefined,
                    created_at: new Date(c.$createdAt).getTime(),
                    updated_at: new Date(c.$updatedAt).getTime(),
                },
            ]),
        );

        const offers = offersRes.documents.map((doc) => ({
            id: doc.$id,
            client_id: doc.clientId,
            offer_number: doc.offerNumber,
            issue_date: doc.issueDate,
            valid_until: doc.validUntil ?? undefined,
            subtotal: doc.subtotal ?? 0,
            total_vat: doc.totalVat ?? 0,
            total_gross: doc.totalGross ?? 0,
            status: doc.status || "draft",
            notes: doc.notes ?? undefined,
            purchase_order_ref: doc.purchaseOrderRef ?? undefined,
            payment_terms: doc.paymentTerms ?? undefined,
            converted_invoice_id: doc.convertedInvoiceId ?? null,
            created_at: new Date(doc.$createdAt).getTime(),
            updated_at: new Date(doc.$updatedAt).getTime(),
            client: clientsMap.get(doc.clientId) || undefined,
        }));

        return NextResponse.json(offers);
    } catch (error) {
        console.error("Error fetching offers:", error);
        return NextResponse.json(
            { error: "Failed to fetch offers" },
            { status: 500 },
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        let account;
        try {
            const sessionClient = await createSessionClient();
            account = sessionClient.account;
        } catch {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 },
            );
        }

        const { databases } = await createAdminClient();
        const user = await account.get();
        const body = await request.json();

        const offerId = ID.unique();
        const totals = calculateInvoiceTotals(
            body.items.map(
                (item: {
                    quantity: number;
                    price: number;
                    tax_rate_percent: number;
                    discount_percent?: number;
                }) => ({
                    quantity: item.quantity,
                    price: item.price,
                    tax_rate_percent: item.tax_rate_percent,
                    discount_percent: item.discount_percent || 0,
                }),
            ),
        );

        const permissions = [
            Permission.read(Role.user(user.$id)),
            Permission.update(Role.user(user.$id)),
            Permission.delete(Role.user(user.$id)),
        ];

        await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.OFFERS,
            offerId,
            {
                userId: user.$id,
                clientId: body.client_id,
                offerNumber: body.offer_number,
                issueDate: body.issue_date,
                validUntil: body.valid_until || null,
                subtotal: totals.netAfterDiscount,
                totalVat: totals.totalVAT,
                totalGross: totals.totalGross,
                status: "draft",
                notes: body.notes || null,
                purchaseOrderRef: body.purchase_order_ref || null,
                paymentTerms: body.payment_terms || null,
                convertedInvoiceId: null,
            },
            permissions,
        );

        const nextItemId = orderedIds(); // keeps the position order
        for (const item of body.items) {
            const itemCalc = calculateLineItemTotals(
                item.quantity,
                item.price,
                item.tax_rate_percent,
                item.discount_percent || 0,
            );
            await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.OFFER_ITEMS,
                nextItemId(),
                {
                    offerId,
                    productId: item.product_id || null,
                    description: item.description,
                    quantity: item.quantity,
                    unitOfMeasure: item.unit_of_measure || "Stück",
                    price: item.price,
                    taxRatePercent: item.tax_rate_percent,
                    discountPercent: item.discount_percent || 0,
                    subtotal: itemCalc.subtotal,
                    taxAmount: itemCalc.taxAmount,
                    total: itemCalc.total,
                },
                permissions,
            );
        }

        return NextResponse.json({ id: offerId });
    } catch (error) {
        console.error("Error creating offer:", error);
        return NextResponse.json(
            { error: "Failed to create offer" },
            { status: 500 },
        );
    }
}
