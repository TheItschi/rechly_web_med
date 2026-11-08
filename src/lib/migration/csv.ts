import Papa from "papaparse";
import type {
    MigrationClientType,
    MigrationEntityType,
    MigrationSourceId,
    NormalizedMigrationClient,
    NormalizedMigrationExpense,
    NormalizedMigrationInvoice,
    NormalizedMigrationInvoiceItem,
    NormalizedMigrationProduct,
} from "./types";
import {
    normalizeCountry,
    normalizeExpenseCategory,
    normalizeInvoiceStatus,
    normalizeTaxRate,
    normalizeUnitOfMeasure,
    parseFlexibleDate,
    parseFlexibleNumber,
    addDaysToIsoDate,
} from "./parseUtils";
import { getFieldDefinitions } from "./types";

function normalizeHeaderKey(header: string): string {
    return header
        .toLowerCase()
        .replace(/[\uFEFF"']/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Automatically detect whether a CSV header set represents:
 * - clients (Kunden / Kontakte)
 * - products (Artikel / Leistungen)
 * - invoices (Ausgangsrechnungen)
 * - expenses (Ausgaben / Eingangsrechnungen)
 */
export function detectEntityTypeFromHeaders(
    headers: string[],
): Exclude<MigrationEntityType, "full_backup"> {
    const normHeaders = headers.map(normalizeHeaderKey);
    const joined = normHeaders.join(" | ");

    // Expenses indicators
    if (
        normHeaders.some((h) =>
            [
                "lieferant",
                "händler",
                "kreditor",
                "ausgabenkategorie",
                "vorsteuer",
                "vendor",
                "vendor_name",
            ].includes(h),
        )
    ) {
        return "expenses";
    }

    // Invoices indicators
    if (
        normHeaders.some((h) =>
            [
                "rechnungsnummer",
                "rechnungs-nr.",
                "rechnungs-nr",
                "rechnungsdatum",
                "fälligkeitsdatum",
                "faelligkeitsdatum",
                "invoice_number",
                "belegfeld 1",
            ].includes(h),
        )
    ) {
        return "invoices";
    }

    // Products indicators
    if (
        normHeaders.some((h) =>
            [
                "artikelnummer",
                "artikelname",
                "artikelbezeichnung",
                "verkaufspreis netto",
                "preis (netto)",
                "nettopreis",
                "einheit",
                "mengeneinheit",
                "unit_of_measure",
            ].includes(h),
        ) ||
        (joined.includes("preis") && !joined.includes("plz") && !joined.includes("postleitzahl"))
    ) {
        return "products";
    }

    // Default to clients if PLZ/Ort/Straße/E-Mail/Kundennummer present
    return "clients";
}

/**
 * Detect likely source competitor from CSV headers for helpful UI badge display.
 */
export function detectSourceFromHeaders(headers: string[]): MigrationSourceId {
    const joined = headers.map(normalizeHeaderKey).join(" | ");
    if (joined.includes("extf") || joined.includes("belegfeld 1") || joined.includes("soll/haben-kz")) {
        return "datev";
    }
    if (
        joined.includes("xrechnung leitweg-id") ||
        joined.includes("verkaufspreis netto") ||
        (joined.includes("kundennummer") && joined.includes("ansprechpartner") && joined.includes("adresszusatz"))
    ) {
        return "lexoffice";
    }
    if (joined.includes("familienname") || joined.includes("organisation")) {
        return "sevdesk";
    }
    if (joined.includes("kunden-nr.") || joined.includes("leistungszeitraum")) {
        return "fastbill";
    }
    return "generic";
}

/**
 * Automatically maps target entity fields to CSV column names.
 */
export function autoDetectColumnMapping(
    headers: string[],
    entityType: Exclude<MigrationEntityType, "full_backup">,
): Record<string, string> {
    const defs = getFieldDefinitions(entityType);
    const mapping: Record<string, string> = {};
    const normalizedMap = new Map<string, string>();
    const usedHeaders = new Set<string>();

    for (const h of headers) {
        normalizedMap.set(normalizeHeaderKey(h), h);
    }

    // Pass 1: Exact alias match across all fields first
    for (const def of defs) {
        for (const alias of def.aliases) {
            const match = normalizedMap.get(alias.toLowerCase());
            if (match && !usedHeaders.has(match)) {
                mapping[def.key] = match;
                usedHeaders.add(match);
                break;
            }
        }
    }

    // Pass 2: Substring fallback only on unclaimed headers
    for (const def of defs) {
        if (mapping[def.key]) continue;
        for (const alias of def.aliases) {
            if (alias.length < 4) continue;
            const found = headers.find((h) => {
                if (usedHeaders.has(h)) return false;
                const normH = normalizeHeaderKey(h);
                // Prevent net price / net amount fields from matching gross columns
                if (
                    (def.key === "price" ||
                        def.key === "subtotal" ||
                        def.key === "amount_net") &&
                    normH.includes("brutto")
                ) {
                    return false;
                }
                // Prevent VAT amount fields from matching tax rate/percentage columns
                if (
                    (def.key === "total_vat" || def.key === "vat_amount") &&
                    (normH.includes("satz") || normH.includes("%"))
                ) {
                    return false;
                }
                return normH.includes(alias.toLowerCase());
            });
            if (found) {
                mapping[def.key] = found;
                usedHeaders.add(found);
                break;
            }
        }
    }

    return mapping;
}

/**
 * Parse CSV text into headers + row objects, automatically handling:
 * - DATEV metadata rows (EXTF header in row 1)
 * - Semicolon, comma, or tab delimiters
 * - Empty trailing lines
 */
export function parseCsvTextToRows(csvText: string): {
    headers: string[];
    rows: Record<string, string>[];
    detectedSource: MigrationSourceId;
    detectedEntityType: Exclude<MigrationEntityType, "full_backup">;
} {
    const lines = csvText
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .filter((l) => l.trim().length > 0);

    if (lines.length === 0) {
        return {
            headers: [],
            rows: [],
            detectedSource: "generic",
            detectedEntityType: "clients",
        };
    }

    // Check if first line is a DATEV EXTF metadata line
    let cleanedText = lines.join("\n");
    if (
        lines.length >= 2 &&
        (lines[0].startsWith('"EXTF"') ||
            lines[0].startsWith("EXTF;") ||
            lines[0].startsWith('"DTVF"'))
    ) {
        cleanedText = lines.slice(1).join("\n");
    }

    const parsed = Papa.parse<Record<string, string>>(cleanedText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.replace(/^\uFEFF/, "").trim(),
    });

    const headers = (parsed.meta.fields || []).filter((h) => h.length > 0);
    const rows = (parsed.data || []).filter((row) =>
        Object.values(row).some((val) => String(val ?? "").trim().length > 0),
    );

    const detectedEntityType = detectEntityTypeFromHeaders(headers);
    const detectedSource = detectSourceFromHeaders(headers);

    return {
        headers,
        rows,
        detectedSource,
        detectedEntityType,
    };
}

function getValue(
    row: Record<string, string>,
    mapping: Record<string, string>,
    key: string,
): string {
    const col = mapping[key];
    if (!col) return "";
    return String(row[col] ?? "").trim();
}

/**
 * Convert raw CSV rows + column mapping into normalized Clients.
 */
export function mapRowsToClients(
    rows: Record<string, string>[],
    mapping: Record<string, string>,
): NormalizedMigrationClient[] {
    const results: NormalizedMigrationClient[] = [];

    for (const row of rows) {
        const companyName = getValue(row, mapping, "name");
        const firstName = getValue(row, mapping, "first_name");
        const lastName = getValue(row, mapping, "last_name");
        const contactPerson = getValue(row, mapping, "contact_person");

        const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
        const resolvedName = companyName || fullName || contactPerson;
        if (!resolvedName) continue;

        const street = getValue(row, mapping, "address_line1");
        const houseNo = getValue(row, mapping, "house_number");
        const addressLine1 =
            [street, houseNo].filter(Boolean).join(" ").trim() || "—";

        const postalCode = getValue(row, mapping, "postal_code") || "00000";
        const city = getValue(row, mapping, "city") || "Unbekannt";
        const country = normalizeCountry(getValue(row, mapping, "country"));
        const email = getValue(row, mapping, "email") || undefined;
        const phone = getValue(row, mapping, "phone") || undefined;
        const vatId = getValue(row, mapping, "vat_id") || undefined;
        const taxNumber = getValue(row, mapping, "tax_number") || undefined;
        const leitwegId = getValue(row, mapping, "leitweg_id") || undefined;
        const addressLine2 = getValue(row, mapping, "address_line2") || undefined;

        const resolvedContact =
            contactPerson || (companyName && fullName ? fullName : undefined);

        const clientType: MigrationClientType =
            !companyName && fullName && !vatId && !leitwegId
                ? "person"
                : "company";

        results.push({
            name: resolvedName,
            contact_person: resolvedContact,
            client_type: clientType,
            address_line1: addressLine1,
            address_line2: addressLine2,
            postal_code: postalCode,
            city,
            country,
            email,
            phone,
            vat_id: vatId,
            tax_number: taxNumber,
            leitweg_id: leitwegId,
        });
    }

    return results;
}

/**
 * Convert raw CSV rows + column mapping into normalized Products.
 */
export function mapRowsToProducts(
    rows: Record<string, string>[],
    mapping: Record<string, string>,
): NormalizedMigrationProduct[] {
    const results: NormalizedMigrationProduct[] = [];

    for (const row of rows) {
        const name = getValue(row, mapping, "name");
        const description = getValue(row, mapping, "description") || undefined;
        const resolvedName = name || description;
        if (!resolvedName) continue;

        const taxRate = normalizeTaxRate(
            getValue(row, mapping, "tax_rate_percent"),
            19,
        );
        const netRaw = getValue(row, mapping, "price");
        const grossRaw = getValue(row, mapping, "gross_price");

        let netPrice = parseFlexibleNumber(netRaw);
        if (netPrice === 0 && grossRaw) {
            const grossPrice = parseFlexibleNumber(grossRaw);
            netPrice =
                taxRate > 0
                    ? Math.round((grossPrice / (1 + taxRate / 100)) * 100) / 100
                    : grossPrice;
        }

        const unit = normalizeUnitOfMeasure(
            getValue(row, mapping, "unit_of_measure"),
        );

        results.push({
            name: resolvedName,
            description: name && description && description !== name ? description : undefined,
            price: Math.max(0, netPrice),
            tax_rate_percent: taxRate,
            unit_of_measure: unit,
        });
    }

    return results;
}

/**
 * Convert raw CSV rows + column mapping into normalized Outgoing Invoices.
 * Groups multi-row invoices with identical `invoice_number` automatically.
 */
export function mapRowsToInvoices(
    rows: Record<string, string>[],
    mapping: Record<string, string>,
): NormalizedMigrationInvoice[] {
    const byNumber = new Map<string, NormalizedMigrationInvoice>();
    let autoCounter = 1;

    for (const row of rows) {
        const rawNumber = getValue(row, mapping, "invoice_number");
        const clientName =
            getValue(row, mapping, "client_name") || "Importierter Kunde";
        const issueDate = parseFlexibleDate(getValue(row, mapping, "issue_date"));
        const dueDateRaw = getValue(row, mapping, "due_date");
        const dueDate = dueDateRaw
            ? parseFlexibleDate(dueDateRaw, addDaysToIsoDate(issueDate, 14))
            : addDaysToIsoDate(issueDate, 14);

        const subtotalRaw = parseFlexibleNumber(getValue(row, mapping, "subtotal"));
        const vatRaw = parseFlexibleNumber(getValue(row, mapping, "total_vat"));
        const grossRaw = parseFlexibleNumber(getValue(row, mapping, "total_gross"));
        const taxRate = normalizeTaxRate(
            getValue(row, mapping, "tax_rate_percent"),
            19,
        );

        // Skip rows with no invoice number and zero amounts
        if (!rawNumber && subtotalRaw === 0 && grossRaw === 0) {
            continue;
        }

        const invoiceNumber =
            rawNumber || `IMP-${issueDate.slice(0, 4)}-${String(autoCounter++).padStart(4, "0")}`;

        let subtotal = subtotalRaw;
        let totalVat = vatRaw;
        let totalGross = grossRaw;

        if (subtotal === 0 && totalGross > 0) {
            if (totalVat > 0) {
                subtotal = Math.round((totalGross - totalVat) * 100) / 100;
            } else {
                subtotal =
                    taxRate > 0
                        ? Math.round((totalGross / (1 + taxRate / 100)) * 100) / 100
                        : totalGross;
                totalVat = Math.round((totalGross - subtotal) * 100) / 100;
            }
        } else if (totalGross === 0 && subtotal > 0) {
            if (totalVat === 0 && taxRate > 0) {
                totalVat = Math.round(subtotal * (taxRate / 100) * 100) / 100;
            }
            totalGross = Math.round((subtotal + totalVat) * 100) / 100;
        }

        const itemDescription =
            getValue(row, mapping, "item_description") ||
            `Rechnung ${invoiceNumber}`;

        const lineItem: NormalizedMigrationInvoiceItem = {
            description: itemDescription,
            quantity: 1,
            unit_of_measure: "Pauschale",
            price: subtotal,
            tax_rate_percent: taxRate,
        };

        const existing = byNumber.get(invoiceNumber);
        if (existing) {
            existing.items.push(lineItem);
            existing.subtotal =
                Math.round((existing.subtotal + subtotal) * 100) / 100;
            existing.total_vat =
                Math.round((existing.total_vat + totalVat) * 100) / 100;
            existing.total_gross =
                Math.round((existing.total_gross + totalGross) * 100) / 100;
        } else {
            byNumber.set(invoiceNumber, {
                invoice_number: invoiceNumber,
                issue_date: issueDate,
                due_date: dueDate,
                status: normalizeInvoiceStatus(getValue(row, mapping, "status")),
                client_name: clientName,
                client_email: getValue(row, mapping, "client_email") || undefined,
                subtotal,
                total_vat: totalVat,
                total_gross: totalGross,
                notes: getValue(row, mapping, "notes") || undefined,
                items: [lineItem],
            });
        }
    }

    return Array.from(byNumber.values());
}

/**
 * Convert raw CSV rows + column mapping into normalized Expenses.
 */
export function mapRowsToExpenses(
    rows: Record<string, string>[],
    mapping: Record<string, string>,
): NormalizedMigrationExpense[] {
    const results: NormalizedMigrationExpense[] = [];

    for (const row of rows) {
        const vendorName = getValue(row, mapping, "vendor_name");
        const description = getValue(row, mapping, "description");
        const netRaw = parseFlexibleNumber(getValue(row, mapping, "amount_net"));
        const vatRaw = parseFlexibleNumber(getValue(row, mapping, "vat_amount"));
        const grossRaw = parseFlexibleNumber(getValue(row, mapping, "amount_gross"));

        if (!vendorName && !description && netRaw === 0 && grossRaw === 0) {
            continue;
        }

        const date = parseFlexibleDate(getValue(row, mapping, "date"));
        const vatRate = normalizeTaxRate(
            getValue(row, mapping, "vat_rate_percent"),
            19,
        );

        let amountNet = Math.abs(netRaw);
        let vatAmount = Math.abs(vatRaw);
        let amountGross = Math.abs(grossRaw);

        if (amountNet === 0 && amountGross > 0) {
            if (vatAmount > 0) {
                amountNet = Math.round((amountGross - vatAmount) * 100) / 100;
            } else {
                amountNet =
                    vatRate > 0
                        ? Math.round((amountGross / (1 + vatRate / 100)) * 100) / 100
                        : amountGross;
                vatAmount = Math.round((amountGross - amountNet) * 100) / 100;
            }
        } else if (amountGross === 0 && amountNet > 0) {
            if (vatAmount === 0 && vatRate > 0) {
                vatAmount = Math.round(amountNet * (vatRate / 100) * 100) / 100;
            }
            amountGross = Math.round((amountNet + vatAmount) * 100) / 100;
        }

        const invoiceNumber = getValue(row, mapping, "invoice_number") || undefined;
        const resolvedVendor = vendorName || description || "Lieferant";
        const resolvedDesc =
            description ||
            (invoiceNumber ? `Beleg ${invoiceNumber} – ${resolvedVendor}` : resolvedVendor);

        results.push({
            date,
            vendor_name: resolvedVendor,
            description: resolvedDesc,
            category: normalizeExpenseCategory(
                getValue(row, mapping, "category"),
                resolvedDesc,
            ),
            amount_net: amountNet,
            vat_rate_percent: vatRate,
            vat_amount: vatAmount,
            amount_gross: amountGross,
            payment_method: "bank_transfer",
            invoice_number: invoiceNumber,
        });
    }

    return results;
}

// ---------------------------------------------------------------------------
// Full E-Invoice XML Parser (XRechnung UBL & CII / ZUGFeRD XML) for Migration
// Extracts BOTH Seller and Buyer + Line Items so it works for Outgoing Invoices
// (where Buyer = Client) AND Incoming Expenses (where Seller = Vendor)!
// ---------------------------------------------------------------------------

