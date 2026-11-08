import type { BankTransaction } from "@/types";
import { apiGet, apiPost } from "./apiClient";
import { logger } from "./logger";

export async function getAllBankTransactions(status?: string): Promise<BankTransaction[]> {
    const url = status ? `/api/bank-transactions?status=${status}` : "/api/bank-transactions";
    try {
        return await apiGet<BankTransaction[]>(url, "Failed to fetch bank transactions");
    } catch (error) {
        logger.error("Error fetching bank transactions:", error);
        throw error;
    }
}

export async function importBankTransactions(
    csvText: string,
    format: string,
): Promise<{ imported: number; duplicates: number }> {
    try {
        return await apiPost(
            "/api/bank-transactions/import",
            { csvText, format },
            "Failed to import bank transactions",
        );
    } catch (error) {
        logger.error("Error importing bank transactions:", error);
        throw error;
    }
}

export async function matchTransaction(
    transactionId: string,
    invoiceId: string,
): Promise<void> {
    try {
        await apiPost(
            `/api/bank-transactions/${transactionId}/match`,
            { invoiceId },
            "Failed to match transaction",
        );
    } catch (error) {
        logger.error("Error matching transaction:", error);
        throw error;
    }
}

export async function ignoreTransaction(transactionId: string): Promise<void> {
    try {
        await apiPost(
            `/api/bank-transactions/${transactionId}/ignore`,
            {},
            "Failed to ignore transaction",
        );
    } catch (error) {
        logger.error("Error ignoring transaction:", error);
        throw error;
    }
}
