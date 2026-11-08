import type { Expense, ExpenseFormData, ExpenseOCRResult } from "@/types";
import { apiDelete, apiFetch, apiGet, apiPost, apiPut } from "./apiClient";
import { logger } from "./logger";

export async function getAllExpenses(): Promise<Expense[]> {
    try {
        return await apiGet<Expense[]>("/api/expenses", "Failed to fetch expenses");
    } catch (error) {
        logger.error("Error fetching expenses:", error);
        throw error;
    }
}

export async function getExpenseById(id: string): Promise<Expense | null> {
    try {
        return await apiFetch<Expense | null>(
            `/api/expenses/${id}`,
            { allow404: true },
            "Failed to fetch expense",
        );
    } catch (error) {
        logger.error("Error fetching expense:", error);
        return null;
    }
}

export async function createExpense(data: ExpenseFormData): Promise<string> {
    try {
        const json = await apiPost<{ id: string }>(
            "/api/expenses",
            data,
            "Failed to create expense",
        );
        return json.id;
    } catch (error) {
        logger.error("Error creating expense:", error);
        throw error;
    }
}

export async function updateExpense(
    id: string,
    data: Partial<ExpenseFormData>,
): Promise<void> {
    try {
        await apiPut(`/api/expenses/${id}`, data, "Failed to update expense");
    } catch (error) {
        logger.error("Error updating expense:", error);
        throw error;
    }
}

export async function deleteExpense(id: string): Promise<void> {
    try {
        await apiDelete(`/api/expenses/${id}`, "Failed to delete expense");
    } catch (error) {
        logger.error("Error deleting expense:", error);
        throw error;
    }
}

export async function ocrExpenseReceipt(
    imageBase64: string,
    mimeType: string,
): Promise<ExpenseOCRResult> {
    try {
        return await apiPost<ExpenseOCRResult>(
            "/api/expenses/ocr",
            { imageBase64, mimeType },
            "OCR failed",
        );
    } catch (error) {
        logger.error("Error running OCR:", error);
        throw error;
    }
}

export async function uploadExpenseReceipt(expenseId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/expenses/${expenseId}/receipt`, {
        method: "POST",
        body: formData,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to upload receipt");
    return json.fileId;
}
