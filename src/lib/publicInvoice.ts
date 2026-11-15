import { Query } from "node-appwrite";
import { createAdminClient, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite-server";
import { buildGirocodePayload } from "@/lib/girocode";
import { isValidShareToken } from "@/lib/shareToken";

export interface PublicInvoice {
    invoiceNumber: string;
    issueDate: string;
    dueDate?: string;
    status: string;
    subtotal: number;
    totalVat: number;
    totalGross: number;
    notes?: string;
    paymentTerms?: string;
    sellerName: string;
    sellerCity?: string;
    buyerName?: string;
    items: Array<{
        description: string;
        quantity: number;
        unitOfMeasure: string;
        price: number;
        taxRatePercent: number;
        total: number;
    }>;
    /** EPC payload for a GiroCode QR, null when the seller has no usable IBAN. */
    girocodePayload: string | null;
    sellerIban?: string;
}

/**
 * Resolve a public share token to the minimal invoice data a customer needs
 * to view and pay it. Returns null for malformed or unknown tokens. Never
 * exposes internal ids, the owner's user id or email addresses.
 */
export async function getPublicInvoice(token: string): Promise<PublicInvoice | null> {
    if (!isValidShareToken(token)) return null;
    const { databases } = await createAdminClient();

    const found = await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICES, [
        Query.equal("shareToken", token),
        Query.limit(1),
    ]);
    const doc = found.documents[0];
    if (!doc) return null;

    const [itemsRes, companyRes, clientRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, [
            Query.equal("invoiceId", doc.$id),
            Query.limit(100),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.COMPANY_INFO, [
            Query.equal("userId", doc.userId),
            Query.limit(1),
        ]).catch(() => null),
        doc.clientId
            ? databases.getDocument(DATABASE_ID, COLLECTIONS.CLIENTS, doc.clientId).catch(() => null)
            : Promise.resolve(null),
    ]);

    const company = companyRes?.documents?.[0];
    const sellerName: string = company?.name || "Rechly-Nutzer";
    const sellerIban: string | undefined = company?.bankIban || undefined;
    const totalGross = Number(doc.totalGross ?? 0);

    return {
        invoiceNumber: doc.invoiceNumber,
        issueDate: doc.issueDate,
        dueDate: doc.dueDate ?? undefined,
        status: doc.status || "draft",
        subtotal: Number(doc.subtotal ?? 0),
        totalVat: Number(doc.totalVat ?? 0),
        totalGross,
        notes: doc.notes ?? undefined,
        paymentTerms: doc.paymentTerms ?? undefined,
        sellerName,
        sellerCity: company?.city || undefined,
        buyerName: (clientRes as { name?: string } | null)?.name,
        items: itemsRes.documents.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity ?? 0),
            unitOfMeasure: item.unitOfMeasure || "Stück",
            price: Number(item.price ?? 0),
            taxRatePercent: Number(item.taxRatePercent ?? 19),
            total: Number(item.total ?? 0),
        })),
        girocodePayload:
            sellerIban && totalGross > 0 && doc.status !== "paid"
                ? buildGirocodePayload({
                      name: sellerName,
                      iban: sellerIban,
                      bic: company?.bankBic || undefined,
                      amount: totalGross,
                      reference: doc.invoiceNumber,
                  })
                : null,
        sellerIban: doc.status !== "paid" ? sellerIban : undefined,
    };
}
