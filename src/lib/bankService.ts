import type { BankTransaction } from "@/types";

export async function getAllBankTransactions(
    status?: string,
): Promise<BankTransaction[]> {
    const url = status
        ? `/api/bank-transactions?status=${status}`
        : "/api/bank-transactions";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch bank transactions");
    return res.json();
}

export async function importBankTransactions(
    csvText: string,
    format: string,
    xmlFiles?: string[],
): Promise<{ imported: number; duplicates: number; skippedPending?: number }> {
    const res = await fetch("/api/bank-transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(format === "camt" ? { format, xmlFiles } : { csvText, format }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to import bank transactions");
    }
    return res.json();
}

export async function matchTransaction(
    transactionId: string,
    invoiceId: string,
): Promise<void> {
    const res = await fetch(`/api/bank-transactions/${transactionId}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
    });
    if (!res.ok) throw new Error("Failed to match transaction");
}

export async function ignoreTransaction(transactionId: string): Promise<void> {
    const res = await fetch(`/api/bank-transactions/${transactionId}/ignore`, {
        method: "POST",
    });
    if (!res.ok) throw new Error("Failed to ignore transaction");
}
