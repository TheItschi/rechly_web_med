import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import {
    createSessionClient,
    createAdminClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";
import { isCollectionNotFound } from "@/lib/appwrite-errors";

export async function GET(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");

        const filters = [
            Query.equal("userId", user.$id),
            Query.orderDesc("bookingDate"),
            Query.limit(1000),
        ];
        if (status) filters.push(Query.equal("status", status));

        const res = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.BANK_TRANSACTIONS,
            filters,
        );

        const transactions = res.documents.map((doc) => ({
            id: doc.$id,
            // bookingDate is canonical; transactionDate was written by older imports
            transaction_date: doc.bookingDate ?? doc.transactionDate,
            value_date: doc.valueDate ?? undefined,
            amount: doc.amount ?? 0,
            currency: doc.currency || "EUR",
            description: doc.description ?? "",
            reference: doc.reference ?? undefined,
            counterpart_name: doc.counterpartName ?? undefined,
            counterpart_iban: doc.counterpartIban ?? undefined,
            status: doc.status || "unmatched",
            matched_invoice_id: doc.matchedInvoiceId ?? undefined,
            bank_reference: doc.bankReference ?? undefined,
            created_at: new Date(doc.$createdAt).getTime(),
            updated_at: new Date(doc.$updatedAt).getTime(),
        }));

        // Rows from older imports have no bookingDate: order on the effective date.
        transactions.sort((a, b) =>
            String(b.transaction_date ?? "").localeCompare(
                String(a.transaction_date ?? ""),
            ),
        );

        return NextResponse.json(transactions);
    } catch (error) {
        console.error("Error fetching bank transactions:", error);
        if (isCollectionNotFound(error)) {
            return NextResponse.json([]);
        }
        return NextResponse.json(
            { error: "Failed to fetch bank transactions" },
            { status: 500 },
        );
    }
}
