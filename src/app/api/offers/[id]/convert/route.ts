import { NextRequest, NextResponse } from "next/server";
import { orderedIds } from "@/lib/server/orderedIds";
import { Query, ID, Permission, Role } from "node-appwrite";
import { invoiceIdentifierDefaults } from "@/lib/server/invoiceIdentifiers";
import {
    createSessionClient,
    createAdminClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
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

        // Fetch the offer
        const offerDoc = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.OFFERS,
            id,
        );
        if (offerDoc.userId !== user.$id) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // Prevent double conversion
        if (offerDoc.status === "converted" && offerDoc.convertedInvoiceId) {
            return NextResponse.json({ invoiceId: offerDoc.convertedInvoiceId });
        }

        const identifiers = await invoiceIdentifierDefaults(databases, user.$id, offerDoc.clientId);
        if (!identifiers) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Fetch offer items
        const itemsRes = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.OFFER_ITEMS,
            [Query.equal("offerId", id), Query.limit(200)],
        );

        const invoiceId = ID.unique();
        const permissions = [
            Permission.read(Role.user(user.$id)),
            Permission.update(Role.user(user.$id)),
            Permission.delete(Role.user(user.$id)),
        ];

        // Generate invoice number from offer number (RE- prefix instead of AN-)
        const now = new Date();
        const yyyyMM = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
        const suffix = Math.floor(Math.random() * 900 + 100);
        const invoiceNumber = `RE-${yyyyMM}-${suffix}`;

        // Create invoice document
        const invoiceData: Record<string, unknown> = {
            ...identifiers,
            userId: user.$id,
            clientId: offerDoc.clientId,
            invoiceNumber,
            issueDate: new Date().toISOString().split("T")[0],
            dueDate: null,
            subtotal: offerDoc.subtotal,
            totalVat: offerDoc.totalVat,
            totalGross: offerDoc.totalGross,
            status: "draft",
            notes: offerDoc.notes || null,
            purchaseOrderRef: offerDoc.purchaseOrderRef || null,
            deliveryDate: null,
            paymentTerms: offerDoc.paymentTerms || null,
        };

        try {
            await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.INVOICES,
                invoiceId,
                { ...invoiceData, correctionType: null, correctsInvoiceId: null },
                permissions,
            );
        } catch (firstErr) {
            const msg = (firstErr as { message?: string })?.message || "";
            if (msg.includes("Unknown attribute")) {
                await databases.createDocument(
                    DATABASE_ID,
                    COLLECTIONS.INVOICES,
                    invoiceId,
                    invoiceData,
                    permissions,
                );
            } else {
                throw firstErr;
            }
        }

        // Copy offer items to invoice items
        const nextItemId = orderedIds(); // keeps the position order
        for (const item of itemsRes.documents) {
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
                    taxRatePercent: item.taxRatePercent,
                    discountPercent: item.discountPercent || 0,
                    subtotal: item.subtotal,
                    taxAmount: item.taxAmount,
                    total: item.total,
                },
                permissions,
            );
        }

        // Mark offer as converted
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.OFFERS, id, {
            status: "converted",
            convertedInvoiceId: invoiceId,
        });

        return NextResponse.json({ invoiceId });
    } catch (error) {
        console.error("Error converting offer:", error);
        return NextResponse.json(
            { error: "Failed to convert offer" },
            { status: 500 },
        );
    }
}
