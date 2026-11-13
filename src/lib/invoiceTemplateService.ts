import type { InvoiceTemplate, InvoiceTemplatePayload } from "@/lib/invoiceTemplates";

const errorOf = async (res: Response, fallback: string) => {
    const body = await res.json().catch(() => ({}));
    return new Error(body.error || fallback);
};

export const getAllInvoiceTemplates = async (): Promise<InvoiceTemplate[]> => {
    const res = await fetch("/api/invoice-templates");
    if (!res.ok) throw await errorOf(res, "Vorlagen konnten nicht geladen werden");
    return (await res.json()).templates;
};

export const createInvoiceTemplate = async (name: string, payload: InvoiceTemplatePayload): Promise<InvoiceTemplate> => {
    const res = await fetch("/api/invoice-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, payload }),
    });
    if (!res.ok) throw await errorOf(res, "Vorlage konnte nicht gespeichert werden");
    return (await res.json()).template;
};

export const deleteInvoiceTemplate = async (id: string): Promise<void> => {
    const res = await fetch(`/api/invoice-templates/${id}`, { method: "DELETE" });
    if (!res.ok) throw await errorOf(res, "Vorlage konnte nicht gelöscht werden");
};
