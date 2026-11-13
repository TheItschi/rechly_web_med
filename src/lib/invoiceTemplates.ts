/**
 * Invoice templates (Rechnungsvorlagen), based on upstream Rechly and
 * extended for GOÄ lines and diagnoses. Templates never store a
 * Leistungsdatum – it is chosen when a template is applied.
 */
import type { GoaeFeeType } from "@/lib/goae/fees";
import { normalizeMedicalData, type DiagnosisDisplay, type InvoiceDiagnosis } from "@/lib/icd10";

export interface InvoiceTemplateGoae {
    number: string;
    factor: number;
    feeType: GoaeFeeType;
    /** Einfachsatz for numbers outside the catalogue */
    baseFee?: number;
    justification?: string;
    feeAgreement?: boolean;
}

export interface InvoiceTemplateItem {
    description: string;
    quantity: number;
    unitOfMeasure: string;
    price: number;
    taxRatePercent: number;
    discount: number;
    productId?: string;
    goae?: InvoiceTemplateGoae;
}

export interface InvoiceTemplatePayload {
    /** Only stored when the user explicitly includes the patient */
    clientId?: string;
    notes?: string;
    paymentTerms?: string;
    diagnoses?: InvoiceDiagnosis[];
    diagnosisDisplay?: DiagnosisDisplay;
    items: InvoiceTemplateItem[];
}

export interface InvoiceTemplate {
    id: string;
    name: string;
    payload: InvoiceTemplatePayload;
    createdAt: number;
}

const MAX_ITEMS = 100;
const FEE_TYPES: GoaeFeeType[] = ["personal", "technical", "lab", "surcharge"];

const record = (value: unknown): Record<string, unknown> | null =>
    typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

export const cleanString = (value: unknown, max: number): string | undefined => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim().slice(0, max);
    return trimmed || undefined;
};

const num = (value: unknown, fallback: number, min = -Infinity): number => {
    const n = Number(value);
    return Number.isFinite(n) && n >= min ? n : fallback;
};

function sanitizeGoae(raw: unknown): InvoiceTemplateGoae | undefined {
    const g = record(raw);
    const number = g ? cleanString(g.number, 12)?.toUpperCase().replace(/\s+/g, "") : undefined;
    if (!g || !number) return undefined;
    const factor = num(g.factor, 0, 0);
    if (!(factor > 0) || factor > 99) return undefined;
    const baseFee = num(g.baseFee, NaN, 0);
    return {
        number,
        factor,
        feeType: FEE_TYPES.includes(g.feeType as GoaeFeeType) ? (g.feeType as GoaeFeeType) : "personal",
        ...(Number.isFinite(baseFee) ? { baseFee } : {}),
        ...(cleanString(g.justification, 1000) ? { justification: cleanString(g.justification, 1000) } : {}),
        ...(g.feeAgreement === true ? { feeAgreement: true } : {}),
    };
}

/** Validates and normalises a template payload from the client. */
export function sanitizeTemplatePayload(raw: unknown): { ok: true; value: InvoiceTemplatePayload } | { ok: false; error: string } {
    const body = record(raw);
    if (!body) return { ok: false, error: "Ungültige Vorlage." };
    const items: InvoiceTemplateItem[] = [];
    for (const entry of (Array.isArray(body.items) ? body.items : []).slice(0, MAX_ITEMS)) {
        const item = record(entry);
        if (!item) continue;
        const goae = sanitizeGoae(item.goae);
        const description = cleanString(item.description, 500);
        if (!description && !goae) continue;
        items.push({
            description: description ?? "",
            quantity: num(item.quantity, 1, 0) || 1,
            unitOfMeasure: cleanString(item.unitOfMeasure, 32) ?? "Stück",
            price: num(item.price, 0, 0),
            taxRatePercent: num(item.taxRatePercent, 0, 0),
            discount: num(item.discount, 0, 0),
            ...(typeof item.productId === "string" && item.productId ? { productId: item.productId.slice(0, 64) } : {}),
            ...(goae ? { goae } : {}),
        });
    }
    if (!items.length) return { ok: false, error: "Die Vorlage enthält keine Positionen." };
    let medical;
    try {
        medical = normalizeMedicalData({ diagnoses: body.diagnoses, diagnosis_display: body.diagnosisDisplay });
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Ungültige Diagnose." };
    }
    return {
        ok: true,
        value: {
            ...(typeof body.clientId === "string" && body.clientId ? { clientId: body.clientId.slice(0, 64) } : {}),
            ...(cleanString(body.notes, 1000) ? { notes: cleanString(body.notes, 1000) } : {}),
            ...(cleanString(body.paymentTerms, 1000) ? { paymentTerms: cleanString(body.paymentTerms, 1000) } : {}),
            ...(medical ? { diagnoses: medical.diagnoses, diagnosisDisplay: medical.diagnosis_display } : {}),
            items,
        },
    };
}
