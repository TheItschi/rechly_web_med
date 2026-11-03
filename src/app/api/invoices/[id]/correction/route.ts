import { NextRequest, NextResponse } from "next/server";
import { Query, ID, Permission, Role } from "node-appwrite";
import {
    createSessionClient,
    createAdminClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";

export async function POST(
    request: NextRequest,
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
        const body = await request.json();
        const type: "credit_note" | "correction" = body.type;

        if (type !== "credit_note" && type !== "correction") {
            return NextResponse.json(
                { error: "Invalid correction type" },
                { status: 400 },
            );
        }

        // Load original invoice
        const original = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.INVOICES,
            id,
        );
        if (original.userId !== user.$id) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const itemsRes = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.INVOICE_ITEMS,
            [Query.equal("invoiceId", id), Query.limit(200)],
        );

        const now = new Date();
        const yyyyMM = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
        const suffix = Math.floor(Math.random() * 9000 + 1000);
        const prefix = type === "credit_note" ? "GS" : "KR";
        const newNumber = `${prefix}-${yyyyMM}-${suffix}`;
        const newId = ID.unique();

        const permissions = [
            Permission.read(Role.user(user.$id)),
            Permission.update(Role.user(user.$id)),
            Permission.delete(Role.user(user.$id)),
        ];

        const today = new Date().toISOString().slice(0, 10);

        // For credit_note: negate all item quantities. For correction: copy as-is (draft).
        const quantityMultiplier = type === "credit_note" ? -1 : 1;

        // Recalculate totals with negated quantities
        let subtotal = 0;
        let totalVat = 0;
        let totalGross = 0;

        const clonedItems = itemsRes.documents.map((item) => {
            const qty = item.quantity * quantityMultiplier;
            const net =
                qty * item.price * (1 - (item.discountPercent ?? 0) / 100);
            const tax = (net * (item.taxRatePercent ?? 19)) / 100;
            subtotal += net;
            totalVat += tax;
            totalGross += net + tax;
            return {
                productId: item.productId || null,
                description: item.description,
                ...(item.gtin ? { gtin: item.gtin } : {}),
                ...(item.goaeData ? { goaeData: item.goaeData } : {}),
                quantity: qty,
                unitOfMeasure: item.unitOfMeasure || "Stück",
                price: item.price,
                taxRatePercent: item.taxRatePercent ?? 19,
                discountPercent: item.discountPercent ?? 0,
                subtotal: net,
                taxAmount: tax,
                total: net + tax,
            };
        });

        await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.INVOICES,
            newId,
            {
                userId: user.$id,
                clientId: original.clientId,
                ...(original.eInvoiceData ? { eInvoiceData: original.eInvoiceData } : {}),
                ...(original.medicalData ? { medicalData: original.medicalData } : {}),
                invoiceNumber: newNumber,
                issueDate: today,
                dueDate: original.dueDate || null,
                subtotal,
                totalVat,
                totalGross,
                status: "draft",
                notes: original.notes || null,
                purchaseOrderRef: original.purchaseOrderRef || null,
                deliveryDate: original.deliveryDate || null,
                paymentTerms: original.paymentTerms || null,
                correctionType: type,
                correctsInvoiceId: id,
            },
            permissions,
        );

        for (const item of clonedItems) {
            await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.INVOICE_ITEMS,
                ID.unique(),
                {
                    invoiceId: newId,
                    ...item,
                },
                permissions,
            );
        }

        return NextResponse.json({ invoiceId: newId });
    } catch (error) {
        console.error("Error creating correction:", error);
        return NextResponse.json(
            { error: "Failed to create correction" },
            { status: 500 },
        );
    }
}
