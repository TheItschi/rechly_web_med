import type {
    AIChatResponse,
    AIInvoiceDraftParseResult,
    AISettings,
    AISettingsUpdate,
} from "@/types";

type InvoiceAssistantAction =
    | "invoice_note"
    | "payment_terms"
    | "payment_reminder"
    | "line_item_description"
    | "overdue_client_reply"
    | "parse_invoice_draft";

type InvoiceAssistantPayload = {
    action: InvoiceAssistantAction;
    companyName?: string;
    clientName?: string;
    clientEmail?: string;
    invoiceNumber?: string;
    issueDate?: string;
    dueDate?: string;
    totalGross?: number;
    currency?: string;
    notes?: string;
    paymentTerms?: string;
    serviceSummary?: string;
    promptText?: string;
    isSmallBusiness?: boolean;
    isFlatRateFarming?: boolean;
    availableClients?: Array<{ id: string; name: string }>;
    lineItems?: Array<{
        description: string;
        quantity: number;
        unit_of_measure?: string;
        price: number;
    }>;
    invoices?: Array<{
        invoiceNumber?: string;
        issueDate?: string;
        dueDate?: string;
        totalGross?: number;
        status?: string;
    }>;
};

export async function getAISettings(): Promise<AISettings | null> {
    const response = await fetch("/api/ai/settings");

    if (!response.ok) {
        if (response.status === 401) {
            return null;
        }
        throw new Error("Failed to fetch AI settings");
    }

    return response.json();
}

export async function saveAISettings(
    payload: AISettingsUpdate,
): Promise<AISettings> {
    const response = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save AI settings");
    }

    return response.json();
}

export async function testAI(prompt: string): Promise<AIChatResponse> {
    const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to test AI");
    }

    return response.json();
}

export async function runInvoiceAssistant(
    payload: InvoiceAssistantPayload,
): Promise<AIChatResponse> {
    const response = await fetch("/api/ai/invoice-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            error.error || "Failed to generate invoice assistant text",
        );
    }

    return response.json();
}

export async function parseInvoiceDraftWithAI(payload: {
    promptText: string;
    isSmallBusiness?: boolean;
    isFlatRateFarming?: boolean;
    availableClients?: Array<{ id: string; name: string }>;
}): Promise<{
    parsed: AIInvoiceDraftParseResult;
    provider: string;
    model: string;
}> {
    const response = await fetch("/api/ai/invoice-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "parse_invoice_draft",
            ...payload,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            error.error || "Failed to parse invoice draft from text",
        );
    }

    return response.json();
}
