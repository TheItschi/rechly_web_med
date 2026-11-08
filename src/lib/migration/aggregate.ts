import {
    mapRowsToClients,
    mapRowsToExpenses,
    mapRowsToInvoices,
    mapRowsToProducts,
} from "./csv";
import { normalizeExpenseCategory } from "./parseUtils";
import type {
    NormalizedMigrationClient,
    NormalizedMigrationExpense,
    NormalizedMigrationInvoice,
    NormalizedMigrationProduct,
    ParsedCsvFileEntry,
    RechlyBackupBundle,
} from "./types";
import type { ParsedMigrationEInvoice } from "./einvoiceXml";

export interface AggregatedMigration {
    clients: NormalizedMigrationClient[];
    products: NormalizedMigrationProduct[];
    invoices: NormalizedMigrationInvoice[];
    expenses: NormalizedMigrationExpense[];
    offersCount: number;
    hasCompany: boolean;
    totalItems: number;
}

/**
 * Combine normalized entities from all loaded sources (CSV files,
 * E-Invoice XML files, full backup JSON) into a single preview.
 * Pure function — extracted from MigrationWizard for testability.
 */
export function aggregateMigrationInputs(
    csvFiles: ParsedCsvFileEntry[],
    eInvoices: ParsedMigrationEInvoice[],
    eInvoiceMode: "outgoing" | "incoming",
    backupBundle: RechlyBackupBundle | null,
): AggregatedMigration {
    const clients: NormalizedMigrationClient[] = [];
    const products: NormalizedMigrationProduct[] = [];
    const invoices: NormalizedMigrationInvoice[] = [];
    const expenses: NormalizedMigrationExpense[] = [];

    // 1. From CSV files
    for (const csv of csvFiles) {
        if (csv.entityType === "clients") {
            clients.push(...mapRowsToClients(csv.rows, csv.mapping));
        } else if (csv.entityType === "products") {
            products.push(...mapRowsToProducts(csv.rows, csv.mapping));
        } else if (csv.entityType === "invoices") {
            invoices.push(...mapRowsToInvoices(csv.rows, csv.mapping));
        } else if (csv.entityType === "expenses") {
            expenses.push(...mapRowsToExpenses(csv.rows, csv.mapping));
        }
    }

    // 2. From E-Invoice XML / ZUGFeRD PDF files
    for (const einv of eInvoices) {
        if (eInvoiceMode === "outgoing") {
            if (einv.buyer?.name && einv.buyer.name !== "Unbekannt") {
                clients.push(einv.buyer);
            }
            invoices.push({
                invoice_number: einv.invoiceNumber,
                issue_date: einv.issueDate,
                due_date: einv.dueDate,
                status: "paid",
                client_name: einv.buyer?.name || "Importierter Kunde",
                client_email: einv.buyer?.email,
                client_address: einv.buyer?.address_line1,
                client_postal_code: einv.buyer?.postal_code,
                client_city: einv.buyer?.city,
                client_country: einv.buyer?.country,
                client_vat_id: einv.buyer?.vat_id,
                client_leitweg_id: einv.buyer?.leitweg_id,
                subtotal: einv.subtotal,
                total_vat: einv.totalVat,
                total_gross: einv.totalGross,
                items: einv.items,
            });
        } else {
            const desc =
                einv.items.map((i) => i.description).join(", ") ||
                `Rechnung ${einv.invoiceNumber}`;
            expenses.push({
                date: einv.issueDate,
                vendor_name: einv.seller?.name || "Lieferant",
                description: desc.slice(0, 240),
                category: normalizeExpenseCategory("", desc),
                amount_net: einv.subtotal,
                vat_rate_percent: einv.taxRatePercent,
                vat_amount: einv.totalVat,
                amount_gross: einv.totalGross,
                payment_method: "bank_transfer",
                invoice_number: einv.invoiceNumber,
            });
        }
    }

    // 3. From Rechly Full Backup JSON
    if (backupBundle) {
        if (Array.isArray(backupBundle.clients)) {
            clients.push(...backupBundle.clients);
        }
        if (Array.isArray(backupBundle.products)) {
            products.push(...backupBundle.products);
        }
        if (Array.isArray(backupBundle.invoices)) {
            invoices.push(...backupBundle.invoices);
        }
        if (Array.isArray(backupBundle.expenses)) {
            expenses.push(...backupBundle.expenses);
        }
    }

    const offersCount = backupBundle?.offers?.length || 0;

    return {
        clients,
        products,
        invoices,
        expenses,
        offersCount,
        hasCompany: Boolean(backupBundle?.company?.name),
        totalItems:
            clients.length +
            products.length +
            invoices.length +
            expenses.length +
            offersCount,
    };
}
