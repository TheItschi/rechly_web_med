import type { GoaeLineData } from "@/lib/goae/line";
import type { InvoiceMedicalData } from "@/lib/icd10";
import type { EInvoiceData } from "@/lib/eRechnung/identifiers";
// Database entity types - Shared with mobile app

export interface UserCompany {
    e_invoice?: EInvoiceData;
    id?: string;
    name: string;
    legal_form?: string;
    address_line1: string;
    address_line2?: string;
    postal_code: string;
    city: string;
    country: string;
    vat_id?: string;
    tax_number?: string;
    commercial_register_number?: string;
    registry_court?: string;
    managing_directors?: string;
    bank_name?: string;
    bank_iban: string;
    bank_bic?: string;
    payment_terms_default: string;
    email: string;
    phone?: string;
    website?: string;
    logo_base64?: string;
    is_small_business?: boolean; // §19 UStG Kleinunternehmer
    datev_chart_of_accounts?: "SKR03" | "SKR04";
    datev_consultant_number?: string;
    datev_client_number?: string;
    created_at: number;
    updated_at: number;
}

export interface Client {
    e_invoice?: EInvoiceData;
    id?: string;
    client_type?: "company" | "person";
    name: string;
    contact_person?: string;
    address_line1: string;
    address_line2?: string;
    postal_code: string;
    city: string;
    country: string;
    email?: string;
    phone?: string;
    vat_id?: string;
    tax_number?: string;
    leitweg_id?: string;
    created_at: number;
    updated_at: number;
}

export interface Product {
    id?: string;
    name: string;
    description?: string;
    price: number;
    tax_rate_percent: number;
    unit_of_measure: string;
    created_at: number;
    updated_at: number;
}

export interface Invoice {
    e_invoice?: EInvoiceData;
    /** Diagnosen (ICD-10-GM) for Privatliquidation */
    medical?: InvoiceMedicalData;
    id?: string;
    client_id: string;
    invoice_number: string;
    issue_date: string; // YYYY-MM-DD
    due_date?: string; // YYYY-MM-DD
    subtotal: number;
    total_vat: number;
    total_gross: number;
    status: "draft" | "sent" | "paid" | "cancelled";
    notes?: string;
    purchase_order_ref?: string;
    delivery_date?: string;
    payment_terms?: string;
    correction_type?: "credit_note" | "correction" | null;
    corrects_invoice_id?: string | null;
    created_at: number;
    updated_at: number;
}

export interface InvoiceItem {
    gtin?: string;
    /** GOÄ-Ziffer, Steigerungssatz, Leistungsdatum, Begründung */
    goae?: GoaeLineData;
    id?: string;
    invoice_id: string;
    product_id?: string;
    description: string;
    quantity: number;
    unit_of_measure: string;
    price: number;
    tax_rate_percent: number;
    discount_percent: number;
    subtotal: number;
    tax_amount: number;
    total: number;
}

// Extended types with joined data
export interface InvoiceWithClient extends Invoice {
    client?: Client;
}

export interface InvoiceWithDetails extends Invoice {
    client?: Client;
    items: InvoiceItem[];
}

// Form input types
export interface ClientFormData {
    e_invoice?: EInvoiceData;
    client_type?: "company" | "person";
    name: string;
    contact_person?: string;
    address_line1: string;
    address_line2?: string;
    postal_code: string;
    city: string;
    country: string;
    email?: string;
    phone?: string;
    vat_id?: string;
    tax_number?: string;
    leitweg_id?: string;
}

export interface ProductFormData {
    name: string;
    description?: string;
    price: number;
    tax_rate_percent: number;
    unit_of_measure: string;
}

export interface ProductCsvPreviewRow {
    row: number;
    name: string;
    description?: string;
    price: number;
    tax_rate_percent: number;
    unit_of_measure: string;
    errors: string[];
}

export interface ProductBulkUploadResult {
    processedRows: number;
    insertedRows: number;
    failedRows: number;
    errors: Array<{
        row: number;
        message: string;
    }>;
    mlTrigger?: {
        attempted: boolean;
        success: boolean;
        details?: string;
    };
}

export interface InvoiceItemFormData {
    gtin?: string;
    goae?: GoaeLineData;
    product_id?: string;
    description: string;
    quantity: number;
    unit_of_measure: string;
    price: number;
    tax_rate_percent: number;
    discount_percent: number;
}

export interface InvoiceFormData {
    e_invoice?: EInvoiceData;
    medical?: InvoiceMedicalData;
    client_id: string;
    invoice_number: string;
    issue_date: string;
    due_date?: string;
    notes?: string;
    purchase_order_ref?: string;
    delivery_date?: string;
    payment_terms?: string;
    items: InvoiceItemFormData[];
}

export interface RevenueForecast {
    next30Days: number;
    next90Days: number;
    confidence: number;
}

export interface ClientRiskScore {
    clientId: string;
    clientName: string;
    riskScore: number;
    riskLevel: "low" | "medium" | "high";
    lateRate: number;
    averageDaysLate: number;
    overdueOpenInvoices: number;
}

export interface CustomerSegment {
    clientId: string;
    clientName: string;
    recencyDays: number;
    frequency: number;
    monetary: number;
    segment: "champions" | "loyal" | "at_risk" | "new" | "needs_attention";
}

export interface AnalyticsAnomaly {
    type: "amount_outlier" | "client_dropoff" | "duplicate_pattern";
    severity: "low" | "medium" | "high";
    message: string;
    invoiceId?: string;
    clientId?: string;
}

export interface KPIInsight {
    key: string;
    value: string;
    importance: "low" | "medium" | "high";
}

export interface DashboardAnalytics {
    forecast: RevenueForecast;
    latePaymentRisk: ClientRiskScore[];
    customerSegments: CustomerSegment[];
    anomalies: AnalyticsAnomaly[];
    kpiInsights: KPIInsight[];
    generatedAt: string;
}

export type AIProvider = "openai" | "anthropic" | "openrouter" | "ollama";

export interface AISettings {
    provider: AIProvider;
    model: string;
    base_url?: string;
    system_prompt?: string;
    api_key_configured: boolean;
    daily_usage?: {
        used: number;
        limit: number;
        remaining: number;
    };
    model_presets?: Record<AIProvider, string[]>;
}

export interface AISettingsUpdate {
    provider: AIProvider;
    model: string;
    base_url?: string;
    system_prompt?: string;
    api_key?: string;
}

export interface AIChatRequest {
    prompt: string;
}

export interface AIChatResponse {
    content: string;
    provider: AIProvider;
    model: string;
}

export interface AIInvoiceDraftParseResult {
    client_id?: string | null;
    client_name?: string | null;
    due_days?: number | null;
    notes?: string | null;
    payment_terms?: string | null;
    items: Array<{
        description: string;
        quantity: number;
        unit_of_measure: string;
        price: number;
        tax_rate_percent: number;
    }>;
}

// ─── Offers / Quotations ─────────────────────────────────────────────────────

export type OfferStatus =
    | "draft"
    | "sent"
    | "accepted"
    | "rejected"
    | "expired"
    | "converted";

export interface Offer {
    id?: string;
    client_id: string;
    offer_number: string;
    issue_date: string;
    valid_until?: string;
    subtotal: number;
    total_vat: number;
    total_gross: number;
    status: OfferStatus;
    notes?: string;
    purchase_order_ref?: string;
    payment_terms?: string;
    converted_invoice_id?: string | null;
    created_at: number;
    updated_at: number;
}

export interface OfferItem {
    id?: string;
    offer_id: string;
    product_id?: string;
    description: string;
    quantity: number;
    unit_of_measure: string;
    price: number;
    tax_rate_percent: number;
    discount_percent: number;
    subtotal: number;
    tax_amount: number;
    total: number;
}

export interface OfferWithClient extends Offer {
    client?: Client;
}

export interface OfferWithDetails extends Offer {
    client?: Client;
    items: OfferItem[];
}

export interface OfferItemFormData {
    product_id?: string;
    description: string;
    quantity: number;
    unit_of_measure: string;
    price: number;
    tax_rate_percent: number;
    discount_percent: number;
}

export interface OfferFormData {
    client_id: string;
    offer_number: string;
    issue_date: string;
    valid_until?: string;
    notes?: string;
    purchase_order_ref?: string;
    payment_terms?: string;
    items: OfferItemFormData[];
}

// ─── Recurring Invoices ───────────────────────────────────────────────────────

export type RecurringInterval = "weekly" | "monthly" | "quarterly" | "annually";

export interface RecurringInvoice {
    id?: string;
    template_name: string;
    client_id: string;
    interval: RecurringInterval;
    next_due_date: string;
    end_date?: string | null;
    is_active: boolean;
    last_created_invoice_id?: string | null;
    notes?: string;
    payment_terms?: string;
    subtotal: number;
    total_vat: number;
    total_gross: number;
    created_at: number;
    updated_at: number;
}

export interface RecurringInvoiceItem {
    id?: string;
    recurring_invoice_id: string;
    product_id?: string;
    description: string;
    quantity: number;
    unit_of_measure: string;
    price: number;
    tax_rate_percent: number;
    discount_percent: number;
    subtotal: number;
    tax_amount: number;
    total: number;
}

export interface RecurringInvoiceWithDetails extends RecurringInvoice {
    client?: Client;
    items: RecurringInvoiceItem[];
}

export interface RecurringFormData {
    template_name: string;
    client_id: string;
    interval: RecurringInterval;
    next_due_date: string;
    end_date?: string;
    notes?: string;
    payment_terms?: string;
    items: OfferItemFormData[];
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export type ExpenseCategory =
    | "office"
    | "travel"
    | "software"
    | "hardware"
    | "marketing"
    | "consulting"
    | "utilities"
    | "rent"
    | "insurance"
    | "other";

export type PaymentMethod =
    | "bank_transfer"
    | "cash"
    | "credit_card"
    | "paypal"
    | "other";

export interface Expense {
    id?: string;
    date: string;
    vendor_name: string;
    description?: string;
    amount_net: number;
    vat_amount: number;
    amount_gross: number;
    vat_rate_percent: number;
    category: ExpenseCategory;
    payment_method: PaymentMethod;
    receipt_file_id?: string | null;
    status: "pending" | "approved";
    created_at: number;
    updated_at: number;
}

export interface ExpenseFormData {
    date: string;
    vendor_name: string;
    description?: string;
    amount_net: number;
    vat_amount: number;
    amount_gross: number;
    vat_rate_percent: number;
    category: ExpenseCategory;
    payment_method: PaymentMethod;
}

export interface ExpenseOCRResult {
    vendor_name?: string;
    date?: string;
    amount_gross?: number;
    vat_rate?: number;
    description?: string;
}

// ─── Bank Transactions ────────────────────────────────────────────────────────

export type BankTransactionStatus = "unmatched" | "matched" | "ignored";

export interface BankTransaction {
    id?: string;
    transaction_date: string;
    amount: number;
    currency: string;
    description: string;
    reference?: string;
    counterpart_name?: string;
    counterpart_iban?: string;
    status: BankTransactionStatus;
    matched_invoice_id?: string | null;
    raw_data?: string | null;
    created_at: number;
    updated_at: number;
}

export interface AutoMatchSuggestion {
    transaction: BankTransaction;
    invoice: InvoiceWithClient;
    confidence: number;
    reason: string;
}
