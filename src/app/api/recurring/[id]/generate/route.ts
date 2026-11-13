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
    calculateLineItemTotals,
    calculateInvoiceTotals,
} from "@/lib/currencyUtils";
import dayjs from "dayjs";
import { invoiceIdentifierDefaults } from "@/lib/server/invoiceIdentifiers";

function getNextDueDate(currentDate: string, interval: string): string {
    const d = dayjs(currentDate);
    switch (interval) {
        case "weekly":
            return d.add(1, "week").format("YYYY-MM-DD");
        case "quarterly":
            return d.add(3, "month").format("YYYY-MM-DD");
        case "annually":
            return d.add(1, "year").format("YYYY-MM-DD");
        default:
            return d.add(1, "month").format("YYYY-MM-DD");
    }
}

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
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

        const [templateDoc, itemsRes] = await Promise.all([
            databases.getDocument(
                DATABASE_ID,
                COLLECTIONS.RECURRING_INVOICES,
                id,
            ),
            databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.RECURRING_INVOICE_ITEMS,
                [Query.equal("recurringInvoiceId", id), Query.limit(200)],
            ),
        ]);

        if (templateDoc.userId !== user.$id) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const identifiers = await invoiceIdentifierDefaults(databases, user.$id, templateDoc.clientId);
        if (!identifiers) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const items = itemsRes.documents;
        const totals = calculateInvoiceTotals(
            items.map((item) => ({
                quantity: item.quantity,
                price: item.price,
                tax_rate_percent: item.taxRatePercent ?? 19,
                discount_percent: item.discountPercent ?? 0,
            })),
        );

        const now = new Date();
        const yyyyMM = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
        const suffix = Math.floor(Math.random() * 9000 + 1000);
        const invoiceNumber = `RE-${yyyyMM}-${suffix}`;
        const invoiceId = ID.unique();
        const today = dayjs().format("YYYY-MM-DD");

        const permissions = [
            Permission.read(Role.user(user.$id)),
            Permission.update(Role.user(user.$id)),
            Permission.delete(Role.user(user.$id)),
        ];

        await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.INVOICES,
            invoiceId,
            {
                ...identifiers,
                userId: user.$id,
                clientId: templateDoc.clientId,
                invoiceNumber,
                issueDate: today,
                dueDate: dayjs(today).add(14, "day").format("YYYY-MM-DD"),
                status: "draft",
                notes: templateDoc.notes || null,
                paymentTerms: templateDoc.paymentTerms || null,
                subtotal: totals.netAfterDiscount,
                totalVat: totals.totalVAT,
                totalGross: totals.totalGross,
                correctionType: null,
                correctsInvoiceId: null,
            },
            permissions,
        );

        const nextItemId = orderedIds(); // keeps the position order
        for (const item of items) {
            const itemCalc = calculateLineItemTotals(
                item.quantity,
                item.price,
                item.taxRatePercent ?? 19,
                item.discountPercent ?? 0,
            );
            await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.INVOICE_ITEMS,
                nextItemId(),
                {
                    invoiceId,
                    productId: item.productId || null,
                    description: item.description,
                    quantity: item.quantity,
                    unitOfMeasure: item.unitOfMeasure || "Stück",
                    price: item.price,
                    taxRatePercent: item.taxRatePercent ?? 19,
                    discountPercent: item.discountPercent ?? 0,
                    subtotal: itemCalc.subtotal,
                    taxAmount: itemCalc.taxAmount,
                    total: itemCalc.total,
                },
                permissions,
            );
        }

        const nextDueDate = getNextDueDate(
            templateDoc.nextDueDate,
            templateDoc.interval,
        );
        await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.RECURRING_INVOICES,
            id,
            {
                lastCreatedInvoiceId: invoiceId,
                nextDueDate,
            },
        );

        return NextResponse.json({ invoiceId });
    } catch (error) {
        console.error(
            "Error generating invoice from recurring template:",
            error,
        );
        return NextResponse.json(
            { error: "Failed to generate invoice" },
            { status: 500 },
        );
    }
}
