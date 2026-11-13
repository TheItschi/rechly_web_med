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

        const [templatesRes, clientsRes] = await Promise.all([
            databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.RECURRING_INVOICES,
                [
                    Query.equal("userId", user.$id),
                    Query.orderDesc("$createdAt"),
                    Query.limit(500),
                ],
            ),
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
                    email: c.email ?? undefined,
                    city: c.city,
                    country: c.country || "Deutschland",
                    address_line1: c.addressLine1,
                    postal_code: c.postalCode,
                    created_at: new Date(c.$createdAt).getTime(),
                    updated_at: new Date(c.$updatedAt).getTime(),
                },
            ]),
        );

        const templates = await Promise.all(
            templatesRes.documents.map(async (doc) => {
                const itemsRes = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.RECURRING_INVOICE_ITEMS,
                    [
                        Query.equal("recurringInvoiceId", doc.$id),
                        Query.limit(200),
                    ],
                );
                return {
                    id: doc.$id,
                    template_name: doc.templateName,
                    client_id: doc.clientId,
                    interval: doc.interval,
                    next_due_date: doc.nextDueDate,
                    end_date: doc.endDate ?? null,
                    is_active: doc.isActive ?? true,
                    last_created_invoice_id: doc.lastCreatedInvoiceId ?? null,
                    notes: doc.notes ?? undefined,
                    payment_terms: doc.paymentTerms ?? undefined,
                    subtotal: doc.subtotal ?? 0,
                    total_vat: doc.totalVat ?? 0,
                    total_gross: doc.totalGross ?? 0,
                    created_at: new Date(doc.$createdAt).getTime(),
                    updated_at: new Date(doc.$updatedAt).getTime(),
                    client: clientsMap.get(doc.clientId) || undefined,
                    items: itemsRes.documents.map((item) => ({
                        id: item.$id,
                        recurring_invoice_id: item.recurringInvoiceId,
                        product_id: item.productId ?? undefined,
                        description: item.description,
                        quantity: item.quantity,
                        unit_of_measure: item.unitOfMeasure || "Stück",
                        price: item.price,
                        tax_rate_percent: item.taxRatePercent ?? 19,
                        discount_percent: item.discountPercent ?? 0,
                        subtotal: item.subtotal ?? 0,
                        tax_amount: item.taxAmount ?? 0,
                        total: item.total ?? 0,
                    })),
                };
            }),
        );

        return NextResponse.json(templates);
    } catch (error) {
        console.error("Error fetching recurring invoices:", error);
        return NextResponse.json(
            { error: "Failed to fetch recurring invoices" },
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

        const templateId = ID.unique();
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
            COLLECTIONS.RECURRING_INVOICES,
            templateId,
            {
                userId: user.$id,
                templateName: body.template_name,
                clientId: body.client_id,
                interval: body.interval || "monthly",
                nextDueDate: body.next_due_date,
                endDate: body.end_date || null,
                isActive: true,
                lastCreatedInvoiceId: null,
                notes: body.notes || null,
                paymentTerms: body.payment_terms || null,
                subtotal: totals.netAfterDiscount,
                totalVat: totals.totalVAT,
                totalGross: totals.totalGross,
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
                COLLECTIONS.RECURRING_INVOICE_ITEMS,
                nextItemId(),
                {
                    recurringInvoiceId: templateId,
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

        return NextResponse.json({ id: templateId });
    } catch (error) {
        console.error("Error creating recurring invoice:", error);
        return NextResponse.json(
            { error: "Failed to create recurring invoice" },
            { status: 500 },
        );
    }
}
