import Papa from "papaparse";
import { XMLParser } from "fast-xml-parser";
import type {
    Expense,
    ExpenseCategory,
    Invoice,
} from "@/types";

export type MigrationClientType = "company" | "person";
export type ExpensePaymentMethod = Expense["payment_method"];
export type InvoiceStatus = Invoice["status"];

export type MigrationSourceId =
    | "lexoffice"
    | "sevdesk"
    | "fastbill"
    | "papierkram"
    | "datev"
    | "einvoice"
    | "rechly_backup"
    | "generic";

export type MigrationEntityType =
    | "clients"
    | "products"
    | "invoices"
    | "expenses"
    | "full_backup";

export interface MigrationSourceGuide {
    id: MigrationSourceId;
    name: string;
    subtitle: string;
    badge: string;
    supportedEntities: MigrationEntityType[];
    stepsDe: string[];
    stepsEn: string[];
    tipsDe: string;
    tipsEn: string;
}

export const MIGRATION_SOURCES: MigrationSourceGuide[] = [
    {
        id: "lexoffice",
        name: "Lexware Office (lexoffice)",
        subtitle: "Kunden, Artikel, Rechnungen & Belege per CSV oder E-Rechnung",
        badge: "Beliebt",
        supportedEntities: ["clients", "products", "invoices", "expenses"],
        stepsDe: [
            "Kunden exportieren: Öffne in Lexware Office »Kontakte« → Klicke oben rechts auf die drei Punkte (⋯) → »Kunden exportieren (CSV)«.",
            "Artikel/Leistungen exportieren: Öffne »Stammdaten« → »Artikel & Leistungen« → Klicke auf »Exportieren (CSV)«.",
            "Rechnungen & Ausgaben exportieren: Öffne »Einstellungen« → »Export« → »Buchungsdaten / Belege« (CSV oder XRechnung/ZUGFeRD-PDFs) und ziehe die Dateien hier hinein.",
        ],
        stepsEn: [
            "Export clients: In Lexware Office open 'Contacts' → click the three dots (⋯) top right → 'Export customers (CSV)'.",
            "Export products/services: Open 'Master data' → 'Products & Services' → click 'Export (CSV)'.",
            "Export invoices & expenses: Open 'Settings' → 'Export' → 'Booking data / Vouchers' (CSV or XRechnung/ZUGFeRD PDFs) and drop the files here.",
        ],
        tipsDe: "Rechly erkennt die Lexware-Office-Spalten (inkl. Kundennummer, Leitweg-ID, USt-IdNr., Netto/Brutto und Windows-1252-Umlaute) vollautomatisch.",
        tipsEn: "Rechly automatically detects Lexware Office columns (including customer numbers, Leitweg-ID, VAT ID, Net/Gross, and German umlauts).",
    },
    {
        id: "sevdesk",
        name: "sevdesk",
        subtitle: "Kontakte, Artikel, Rechnungen & Belege direkt übernehmen",
        badge: "Beliebt",
        supportedEntities: ["clients", "products", "invoices", "expenses"],
        stepsDe: [
            "Kontakte exportieren: Gehe in sevdesk auf »Kontakte« → Klicke oben rechts auf »Export« → »CSV-Export«.",
            "Artikel exportieren: Gehe auf »Stammdaten« → »Artikel« → Klicke oben rechts auf »CSV-Export«.",
            "Rechnungen & Belege exportieren: Gehe auf »Rechnungen« bzw. »Belege« → »Export« → »CSV-Export« (oder unter »Steuern → Datei-Export«).",
        ],
        stepsEn: [
            "Export contacts: In sevdesk go to 'Contacts' → click 'Export' top right → 'CSV Export'.",
            "Export items: Go to 'Master Data' → 'Items' → click 'CSV Export' top right.",
            "Export invoices & receipts: Go to 'Invoices' or 'Receipts' → 'Export' → 'CSV Export'.",
        ],
        tipsDe: "Sowohl sevdesk-Organisationen als auch Personenkontakte (Vorname + Familienname) werden automatisch zusammengeführt.",
        tipsEn: "Both sevdesk organizations and individual contacts (first + last name) are merged automatically.",
    },
    {
        id: "fastbill",
        name: "FastBill",
        subtitle: "Kundenstamm, Produkte & Ausgangsrechnungen migrieren",
        badge: "1-Klick",
        supportedEntities: ["clients", "products", "invoices", "expenses"],
        stepsDe: [
            "Kunden exportieren: Öffne in FastBill »Kunden« → Klicke unten oder oben rechts auf »Daten exportieren (CSV)«.",
            "Artikel exportieren: Öffne »Artikel« → »Exportieren (CSV)«.",
            "Rechnungen & Ausgaben: Öffne »Rechnungen« oder »Ausgaben« → »Export« → »CSV / Excel«.",
        ],
        stepsEn: [
            "Export customers: In FastBill open 'Customers' → click 'Export data (CSV)'.",
            "Export items: Open 'Items' → 'Export (CSV)'.",
            "Invoices & expenses: Open 'Invoices' or 'Expenses' → 'Export' → 'CSV / Excel'.",
        ],
        tipsDe: "Auch mehrzeilige FastBill-Rechnungsexporte mit Einzelpositionen werden automatisch pro Rechnungsnummer gruppiert.",
        tipsEn: "Multi-line FastBill invoice exports with individual line items are automatically grouped by invoice number.",
    },
    {
        id: "papierkram",
        name: "Papierkram / Billomat / WISO",
        subtitle: "Komplett-Übernahme aus Papierkram, Billomat, WISO MeinBüro & SumUp",
        badge: "Flexibel",
        supportedEntities: ["clients", "products", "invoices", "expenses"],
        stepsDe: [
            "Exportiere deine Kundenliste, Artikel/Leistungen und Rechnungen im jeweiligen Programm als CSV-Datei.",
            "Ziehe eine oder mehrere CSV-Dateien gleichzeitig in das Upload-Feld.",
            "Prüfe in der Live-Vorschau die automatisch zugeordneten Spalten und starte den Import mit einem Klick.",
        ],
        stepsEn: [
            "Export your customer list, products/services, and invoices as CSV files from your existing tool.",
            "Drag and drop one or multiple CSV files into the upload zone.",
            "Verify the auto-detected columns in the live preview and start the import with one click.",
        ],
        tipsDe: "Falls eine Spalte bei dir anders heißt, kannst du sie in der Vorschau jederzeit per Dropdown anpassen.",
        tipsEn: "If any column has a custom name, you can adjust it via dropdown in the preview before importing.",
    },
    {
        id: "einvoice",
        name: "XRechnung & ZUGFeRD Batch-Import",
        subtitle: "Bestehende Rechnungen (.xml & .pdf) inkl. Kunden & Positionen importieren",
        badge: "E-Rechnung EN 16931",
        supportedEntities: ["invoices", "expenses"],
        stepsDe: [
            "Wähle beliebig viele XRechnung-Dateien (.xml) oder ZUGFeRD-Rechnungen (.pdf) von deiner Festplatte aus.",
            "Entscheide, ob es sich um deine eigenen Ausgangsrechnungen oder um Eingangsrechnungen (Ausgaben) handelt.",
            "Rechly liest alle Rechnungsnummern, Daten, Positionen, Steuerbeträge und Kundendaten automatisch aus und legt fehlende Kunden direkt an!",
        ],
        stepsEn: [
            "Select any number of XRechnung (.xml) or ZUGFeRD (.pdf) invoice files from your computer.",
            "Choose whether they are outgoing invoices or incoming bills (expenses).",
            "Rechly automatically extracts all invoice numbers, dates, line items, taxes, and customer records!",
        ],
        tipsDe: "Perfekt, wenn du aus einem anderen Programm bereits ZUGFeRD-PDFs oder XRechnungen exportiert hast.",
        tipsEn: "Ideal if you already exported ZUGFeRD PDFs or XRechnung XML files from another software.",
    },
    {
        id: "datev",
        name: "DATEV / Steuerberater CSV",
        subtitle: "EXTF-Buchungsstapel, Debitoren & Kreditoren übernehmen",
        badge: "Steuerberater",
        supportedEntities: ["clients", "invoices", "expenses"],
        stepsDe: [
            "Exportiere aus deinem bisherigen Programm oder DATEV den Buchungsstapel oder die Debitoren-/Kundenliste als CSV.",
            "Lade die CSV-Datei hier hoch – Rechly überspringt automatisch DATEV-Metadatenzeilen (EXTF-Header).",
            "Prüfe die erkannten Rechnungen, Kunden oder Ausgaben in der Vorschau und importiere sie.",
        ],
        stepsEn: [
            "Export the booking batch or debtor/customer list as CSV from your previous tool or DATEV.",
            "Upload the CSV file here — Rechly automatically skips DATEV metadata rows (EXTF headers).",
            "Review the detected invoices, customers, or expenses in the preview and import them.",
        ],
        tipsDe: "Unterstützt deutsche Datumsformate (TT.MM.JJJJ sowie DATEV-Kurzformat) und Soll/Haben-Kennzeichen.",
        tipsEn: "Supports German date formats (DD.MM.YYYY as well as DATEV compact dates) and debit/credit indicators.",
    },
    {
        id: "rechly_backup",
        name: "Rechly Komplett-Backup (Web ⇄ Desktop)",
        subtitle: "100% Datenportabilität zwischen Rechly Cloud und Rechly Desktop App",
        badge: "Web ⇄ Desktop",
        supportedEntities: ["full_backup"],
        stepsDe: [
            "Klicke im bisherigen Rechly (Web oder Desktop) auf »Komplett-Backup herunterladen (.json)«.",
            "Öffne dein neues Rechly (z. B. die lokale Desktop-App) und ziehe die .json-Datei in dieses Feld.",
            "Firmendaten, Kunden, Produkte, Rechnungen, Angebote und Ausgaben werden 1:1 wiederhergestellt.",
        ],
        stepsEn: [
            "In your existing Rechly (Web or Desktop), click 'Download Full Backup (.json)'.",
            "Open your target Rechly instance (e.g., the local Desktop app) and drop the .json file here.",
            "Company profile, clients, products, invoices, offers, and expenses are restored 1:1.",
        ],
        tipsDe: "Ideal für den Umzug von der Cloud in die 100% lokale Desktop-Version oder als regelmäßige Vollsicherung.",
        tipsEn: "Ideal for moving from Cloud to the 100% local Desktop version or for regular full backups.",
    },
    {
        id: "generic",
        name: "Allgemeine CSV / Excel-Tabelle",
        subtitle: "Eigene Kunden-, Produkt-, Rechnungs- oder Ausgabenlisten importieren",
        badge: "Universal",
        supportedEntities: ["clients", "products", "invoices", "expenses"],
        stepsDe: [
            "Speichere deine Excel- oder Numbers-Tabelle als CSV-Datei (.csv).",
            "Ziehe die Datei in das Upload-Feld – Rechly schlägt automatisch die passende Spaltenzuordnung vor.",
            "Passe bei Bedarf einzelne Spalten per Dropdown an und starte den Import.",
        ],
        stepsEn: [
            "Save your Excel or Numbers spreadsheet as a CSV file (.csv).",
            "Drop the file into the upload zone — Rechly automatically suggests matching columns.",
            "Adjust any column mapping via dropdown if needed and start the import.",
        ],
        tipsDe: "Du kannst unten auch jederzeit eine saubere CSV-Musterdatei herunterladen.",
        tipsEn: "You can also download a clean sample CSV template below at any time.",
    },
];

export interface NormalizedMigrationClient {
    name: string;
    contact_person?: string;
    client_type?: MigrationClientType;
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
    customer_number?: string;
}

export interface NormalizedMigrationProduct {
    name: string;
    description?: string;
    price: number;
    tax_rate_percent: number;
    unit_of_measure: string;
    article_number?: string;
    ean_gtin?: string;
}

export interface NormalizedMigrationInvoiceItem {
    description: string;
    quantity: number;
    unit_of_measure: string;
    price: number;
    tax_rate_percent: number;
    discount_percent?: number;
}

export interface NormalizedMigrationInvoice {
    invoice_number: string;
    issue_date: string;
    due_date: string;
    delivery_date?: string;
    status: InvoiceStatus;
    client_name: string;
    client_email?: string;
    client_address?: string;
    client_postal_code?: string;
    client_city?: string;
    client_country?: string;
    client_vat_id?: string;
    client_leitweg_id?: string;
    subtotal: number;
    total_vat: number;
    total_gross: number;
    notes?: string;
    purchase_order_ref?: string;
    payment_terms?: string;
    items: NormalizedMigrationInvoiceItem[];
}

export interface NormalizedMigrationExpense {
    date: string;
    vendor_name: string;
    description: string;
    category: ExpenseCategory;
    amount_net: number;
    vat_rate_percent: number;
    vat_amount: number;
    amount_gross: number;
    payment_method: ExpensePaymentMethod;
    invoice_number?: string;
    notes?: string;
}

export interface RechlyBackupBundle {
    rechlyBackupVersion: number;
    exportedAt: string;
    sourceApp?: string;
    company?: Record<string, unknown> | null;
    clients: NormalizedMigrationClient[];
    products: NormalizedMigrationProduct[];
    invoices: NormalizedMigrationInvoice[];
    offers?: Array<{
        offer_number: string;
        issue_date: string;
        valid_until?: string;
        status: string;
        client_name: string;
        client_email?: string;
        subtotal: number;
        total_vat: number;
        total_gross: number;
        notes?: string;
        purchase_order_ref?: string;
        payment_terms?: string;
        items: NormalizedMigrationInvoiceItem[];
    }>;
    expenses: NormalizedMigrationExpense[];
}

export interface MigrationFieldDefinition {
    key: string;
    labelDe: string;
    labelEn: string;
    required?: boolean;
    aliases: string[];
}

export const CLIENT_FIELD_DEFINITIONS: MigrationFieldDefinition[] = [
    {
        key: "name",
        labelDe: "Firmenname / Name *",
        labelEn: "Company / Name *",
        required: true,
        aliases: [
            "name",
            "firmenname",
            "firma",
            "company",
            "company name",
            "organisation",
            "organization",
            "kundenname",
            "kunde",
            "rechnungsempfänger",
            "empfänger",
            "bezeichnung",
            "debitor",
            "geschäftspartner",
        ],
    },
    {
        key: "first_name",
        labelDe: "Vorname (falls getrennt)",
        labelEn: "First Name (if split)",
        aliases: ["vorname", "first name", "firstname", "given name"],
    },
    {
        key: "last_name",
        labelDe: "Nachname (falls getrennt)",
        labelEn: "Last Name (if split)",
        aliases: [
            "nachname",
            "familienname",
            "last name",
            "lastname",
            "surname",
            "family name",
        ],
    },
    {
        key: "contact_person",
        labelDe: "Ansprechpartner",
        labelEn: "Contact Person",
        aliases: [
            "ansprechpartner",
            "kontaktperson",
            "contact person",
            "contact",
            "z.hd.",
            "zu händen",
        ],
    },
    {
        key: "address_line1",
        labelDe: "Straße & Hausnummer",
        labelEn: "Street & Number",
        required: true,
        aliases: [
            "straße",
            "strasse",
            "straße und hausnummer",
            "strasse und hausnummer",
            "anschrift",
            "adresse",
            "address",
            "address_line1",
            "address line 1",
            "street",
            "rechnungsadresse",
            "straße 1",
        ],
    },
    {
        key: "house_number",
        labelDe: "Hausnummer (falls getrennt)",
        labelEn: "House Number (if split)",
        aliases: ["hausnummer", "hausnr", "hausnr.", "nr.", "house number", "street number"],
    },
    {
        key: "address_line2",
        labelDe: "Adresszusatz",
        labelEn: "Address Line 2",
        aliases: [
            "adresszusatz",
            "address_line2",
            "address line 2",
            "zusatz",
            "postfach",
            "c/o",
        ],
    },
    {
        key: "postal_code",
        labelDe: "PLZ",
        labelEn: "Postal Code",
        required: true,
        aliases: [
            "plz",
            "postleitzahl",
            "postal_code",
            "postal code",
            "zip",
            "zip code",
            "postcode",
        ],
    },
    {
        key: "city",
        labelDe: "Ort / Stadt",
        labelEn: "City",
        required: true,
        aliases: ["ort", "stadt", "city", "town", "wohnort", "sitz"],
    },
    {
        key: "country",
        labelDe: "Land",
        labelEn: "Country",
        aliases: ["land", "country", "staat", "ländercode", "laendercode", "country code"],
    },
    {
        key: "email",
        labelDe: "E-Mail",
        labelEn: "Email",
        aliases: [
            "e-mail",
            "email",
            "e-mail-adresse",
            "email-adresse",
            "e-mail 1",
            "email 1",
            "mail",
            "rechnungs-e-mail",
        ],
    },
    {
        key: "phone",
        labelDe: "Telefon",
        labelEn: "Phone",
        aliases: [
            "telefon",
            "telefonnummer",
            "telefon 1",
            "phone",
            "tel",
            "tel.",
            "mobil",
            "mobile",
            "handy",
        ],
    },
    {
        key: "vat_id",
        labelDe: "USt-IdNr.",
        labelEn: "VAT ID",
        aliases: [
            "ust-idnr.",
            "ust-idnr",
            "ust-id",
            "ustid",
            "umsatzsteuer-id",
            "umsatzsteuer-identifikationsnummer",
            "vat_id",
            "vat id",
            "vat",
            "uid",
        ],
    },
    {
        key: "tax_number",
        labelDe: "Steuernummer",
        labelEn: "Tax Number",
        aliases: ["steuernummer", "steuernr", "steuernr.", "tax_number", "tax number", "tax id"],
    },
    {
        key: "leitweg_id",
        labelDe: "Leitweg-ID (XRechnung)",
        labelEn: "Leitweg-ID (XRechnung)",
        aliases: [
            "leitweg-id",
            "leitweg id",
            "leitweg_id",
            "xrechnung leitweg-id",
            "käuferreferenz",
            "buyer reference",
            "bt-10",
        ],
    },
];

export const PRODUCT_FIELD_DEFINITIONS: MigrationFieldDefinition[] = [
    {
        key: "name",
        labelDe: "Bezeichnung / Name *",
        labelEn: "Product / Service Name *",
        required: true,
        aliases: [
            "name",
            "bezeichnung",
            "artikelname",
            "artikelbezeichnung",
            "artikel",
            "leistung",
            "produkt",
            "product",
            "product name",
            "title",
            "titel",
        ],
    },
    {
        key: "description",
        labelDe: "Beschreibung",
        labelEn: "Description",
        aliases: [
            "beschreibung",
            "description",
            "leistungsbeschreibung",
            "artikelbeschreibung",
            "details",
            "notiz",
            "bemerkung",
            "text",
        ],
    },
    {
        key: "price",
        labelDe: "Nettopreis (€) *",
        labelEn: "Net Price (€) *",
        required: true,
        aliases: [
            "preis",
            "price",
            "nettopreis",
            "preis (netto)",
            "preis netto",
            "verkaufspreis netto",
            "vk netto",
            "vk-preis",
            "einzelpreis",
            "unit price",
            "net price",
            "betrag netto",
            "standardpreis",
        ],
    },
    {
        key: "gross_price",
        labelDe: "Bruttopreis (falls kein Nettopreis)",
        labelEn: "Gross Price (if no net price)",
        aliases: [
            "bruttopreis",
            "preis (brutto)",
            "preis brutto",
            "verkaufspreis brutto",
            "vk brutto",
            "gross price",
        ],
    },
    {
        key: "tax_rate_percent",
        labelDe: "Steuersatz (%)",
        labelEn: "Tax Rate (%)",
        aliases: [
            "steuersatz",
            "mwst",
            "mwst.",
            "mwst-%",
            "ust",
            "ust.",
            "umsatzsteuer",
            "umsatzsteuer in %",
            "steuer",
            "tax_rate_percent",
            "tax rate",
            "tax",
            "vat",
            "vat rate",
        ],
    },
    {
        key: "unit_of_measure",
        labelDe: "Einheit (Stück, Stunde, ...)",
        labelEn: "Unit (Piece, Hour, ...)",
        aliases: [
            "einheit",
            "unit",
            "unit_of_measure",
            "mengeneinheit",
            "abrechnungseinheit",
        ],
    },
];

export const INVOICE_FIELD_DEFINITIONS: MigrationFieldDefinition[] = [
    {
        key: "invoice_number",
        labelDe: "Rechnungsnummer *",
        labelEn: "Invoice Number *",
        required: true,
        aliases: [
            "rechnungsnummer",
            "rechnungs-nr.",
            "rechnungs-nr",
            "rechnungsnr",
            "rechnungsnr.",
            "belegnummer",
            "beleg-nr.",
            "belegfeld 1",
            "nummer",
            "invoice_number",
            "invoice number",
            "invoice no",
            "number",
        ],
    },
    {
        key: "issue_date",
        labelDe: "Rechnungsdatum *",
        labelEn: "Issue Date *",
        required: true,
        aliases: [
            "rechnungsdatum",
            "datum",
            "belegdatum",
            "ausstellungsdatum",
            "issue_date",
            "issue date",
            "invoice date",
            "date",
        ],
    },
    {
        key: "due_date",
        labelDe: "Fälligkeitsdatum",
        labelEn: "Due Date",
        aliases: [
            "fälligkeitsdatum",
            "faelligkeitsdatum",
            "fällig am",
            "faellig am",
            "fälligkeit",
            "zahlungsziel",
            "due_date",
            "due date",
        ],
    },
    {
        key: "client_name",
        labelDe: "Kunde / Empfänger *",
        labelEn: "Client / Recipient *",
        required: true,
        aliases: [
            "kunde",
            "kundenname",
            "firma",
            "firmenname",
            "empfänger",
            "rechnungsempfänger",
            "kontakt",
            "client",
            "client_name",
            "customer",
            "customer name",
            "buchungstext",
            "geschäftspartner",
        ],
    },
    {
        key: "client_email",
        labelDe: "Kunden-E-Mail",
        labelEn: "Client Email",
        aliases: ["e-mail", "email", "kunden-email", "client_email", "customer email"],
    },
    {
        key: "subtotal",
        labelDe: "Nettobetrag (€)",
        labelEn: "Net Amount (€)",
        aliases: [
            "netto",
            "nettobetrag",
            "betrag netto",
            "summe netto",
            "gesamt netto",
            "net",
            "subtotal",
            "net amount",
        ],
    },
    {
        key: "total_vat",
        labelDe: "Steuerbetrag / MwSt. (€)",
        labelEn: "VAT Amount (€)",
        aliases: [
            "steuer",
            "steuerbetrag",
            "mwst",
            "mwst-betrag",
            "umsatzsteuer",
            "ust-betrag",
            "total_vat",
            "vat",
            "tax amount",
        ],
    },
    {
        key: "total_gross",
        labelDe: "Bruttobetrag / Gesamt (€) *",
        labelEn: "Gross Amount / Total (€) *",
        required: true,
        aliases: [
            "brutto",
            "bruttobetrag",
            "betrag brutto",
            "gesamtbetrag",
            "gesamt",
            "summe",
            "betrag",
            "umsatz",
            "umsatz (ohne soll/haben-kz)",
            "total_gross",
            "total",
            "gross",
            "gross amount",
            "amount",
        ],
    },
    {
        key: "tax_rate_percent",
        labelDe: "Steuersatz (%)",
        labelEn: "Tax Rate (%)",
        aliases: ["steuersatz", "mwst-%", "ust-%", "tax_rate_percent", "tax rate", "steuerschlüssel"],
    },
    {
        key: "status",
        labelDe: "Status (bezahlt, offen, ...)",
        labelEn: "Status (paid, sent, ...)",
        aliases: ["status", "zahlungsstatus", "belegstatus", "state", "payment status"],
    },
    {
        key: "item_description",
        labelDe: "Position / Beschreibung",
        labelEn: "Line Item / Description",
        aliases: [
            "position",
            "beschreibung",
            "leistungsbeschreibung",
            "betreff",
            "verwendungszweck",
            "titel",
            "description",
            "subject",
        ],
    },
    {
        key: "notes",
        labelDe: "Notizen / Bemerkung",
        labelEn: "Notes",
        aliases: ["notiz", "notizen", "bemerkung", "kommentar", "notes"],
    },
];

export const EXPENSE_FIELD_DEFINITIONS: MigrationFieldDefinition[] = [
    {
        key: "date",
        labelDe: "Belegdatum *",
        labelEn: "Receipt Date *",
        required: true,
        aliases: [
            "datum",
            "belegdatum",
            "rechnungsdatum",
            "buchungsdatum",
            "ausgabedatum",
            "date",
            "receipt date",
        ],
    },
    {
        key: "vendor_name",
        labelDe: "Lieferant / Händler *",
        labelEn: "Vendor / Supplier *",
        required: true,
        aliases: [
            "lieferant",
            "händler",
            "haendler",
            "verkäufer",
            "kreditor",
            "geschäftspartner",
            "empfänger",
            "firma",
            "vendor",
            "vendor_name",
            "supplier",
            "merchant",
        ],
    },
    {
        key: "description",
        labelDe: "Beschreibung / Verwendungszweck *",
        labelEn: "Description / Purpose *",
        required: true,
        aliases: [
            "beschreibung",
            "verwendungszweck",
            "buchungstext",
            "bezeichnung",
            "betreff",
            "zweck",
            "description",
            "purpose",
        ],
    },
    {
        key: "amount_net",
        labelDe: "Nettobetrag (€)",
        labelEn: "Net Amount (€)",
        aliases: [
            "netto",
            "nettobetrag",
            "betrag netto",
            "amount_net",
            "net amount",
            "net",
        ],
    },
    {
        key: "vat_amount",
        labelDe: "Vorsteuer / MwSt. (€)",
        labelEn: "VAT Amount (€)",
        aliases: [
            "vorsteuer",
            "steuer",
            "steuerbetrag",
            "mwst",
            "ust",
            "vat_amount",
            "vat amount",
            "tax",
        ],
    },
    {
        key: "amount_gross",
        labelDe: "Bruttobetrag (€) *",
        labelEn: "Gross Amount (€) *",
        required: true,
        aliases: [
            "brutto",
            "bruttobetrag",
            "betrag brutto",
            "gesamtbetrag",
            "betrag",
            "summe",
            "amount_gross",
            "gross amount",
            "total",
            "amount",
        ],
    },
    {
        key: "vat_rate_percent",
        labelDe: "Steuersatz (%)",
        labelEn: "VAT Rate (%)",
        aliases: [
            "steuersatz",
            "mwst-%",
            "vorsteuer-%",
            "ust-%",
            "vat_rate_percent",
            "vat rate",
            "tax rate",
        ],
    },
    {
        key: "category",
        labelDe: "Kategorie / Konto",
        labelEn: "Category / Account",
        aliases: [
            "kategorie",
            "ausgabenkategorie",
            "konto",
            "sachkonto",
            "kostenart",
            "category",
            "account",
        ],
    },
    {
        key: "invoice_number",
        labelDe: "Belegnummer / Rechnungs-Nr.",
        labelEn: "Receipt / Invoice No.",
        aliases: [
            "belegnummer",
            "beleg-nr.",
            "rechnungsnummer",
            "rechnungs-nr.",
            "referenz",
            "invoice_number",
            "receipt number",
        ],
    },
];

export function getFieldDefinitions(
    entityType: Exclude<MigrationEntityType, "full_backup">,
): MigrationFieldDefinition[] {
    switch (entityType) {
        case "clients":
            return CLIENT_FIELD_DEFINITIONS;
        case "products":
            return PRODUCT_FIELD_DEFINITIONS;
        case "invoices":
            return INVOICE_FIELD_DEFINITIONS;
        case "expenses":
            return EXPENSE_FIELD_DEFINITIONS;
    }
}

/**
 * Decode an ArrayBuffer or Uint8Array that might be UTF-8 or Windows-1252 (Latin1).
 * Competitor exports from Lexware Office, DATEV, or German Excel often use Windows-1252.
 */
export function decodeFileBuffer(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    // Strip UTF-8 BOM if present
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        return new TextDecoder("utf-8").decode(bytes.subarray(3));
    }

    const utf8Text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    // If replacement character U+FFFD appears, it's Windows-1252 / ISO-8859-1
    if (utf8Text.includes("\uFFFD")) {
        return new TextDecoder("windows-1252").decode(bytes);
    }
    return utf8Text;
}

/**
 * Parse German or international number strings into a clean JS number.
 * Examples:
 * - "1.234,56 €" -> 1234.56
 * - "120,50" -> 120.5
 * - "1,234.56" -> 1234.56
 * - "19 %" -> 19
 */
export function parseFlexibleNumber(raw: unknown): number {
    if (typeof raw === "number") {
        return Number.isFinite(raw) ? raw : 0;
    }
    if (typeof raw !== "string") return 0;

    const cleaned = raw
        .replace(/[€$£%\s\u00A0]/g, "")
        .replace(/EUR/gi, "")
        .trim();
    if (!cleaned) return 0;

    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");

    let normalized = cleaned;
    if (lastComma > -1 && lastDot > -1) {
        if (lastComma > lastDot) {
            // German format: 1.234,56
            normalized = cleaned.replace(/\./g, "").replace(",", ".");
        } else {
            // English format: 1,234.56
            normalized = cleaned.replace(/,/g, "");
        }
    } else if (lastComma > -1) {
        // Only comma present: 120,50 -> 120.50
        normalized = cleaned.replace(",", ".");
    }

    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Parse German (`24.10.2026`, `24.10.26`), ISO (`2026-10-24`), compact (`20261024`),
 * or slash (`24/10/2026`) dates into `YYYY-MM-DD`.
 */
export function parseFlexibleDate(raw: unknown, fallbackDate?: string): string {
    const fallback = fallbackDate || new Date().toISOString().slice(0, 10);
    if (typeof raw !== "string" && typeof raw !== "number") return fallback;
    const str = String(raw).trim();
    if (!str) return fallback;

    // ISO YYYY-MM-DD (or YYYY-MM-DDTHH:mm...)
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    // German DD.MM.YYYY or DD.MM.YY
    const deMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
    if (deMatch) {
        const day = deMatch[1].padStart(2, "0");
        const month = deMatch[2].padStart(2, "0");
        const year = deMatch[3].length === 2 ? `20${deMatch[3]}` : deMatch[3];
        return `${year}-${month}-${day}`;
    }

    // Compact YYYYMMDD (e.g. XRechnung CII or DATEV)
    const compactMatch = str.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (compactMatch) {
        return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
    }

    // Slash DD/MM/YYYY
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
        const day = slashMatch[1].padStart(2, "0");
        const month = slashMatch[2].padStart(2, "0");
        const year = slashMatch[3];
        return `${year}-${month}-${day}`;
    }

    return fallback;
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
    const parts = isoDate.split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        return isoDate;
    }
    const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days));
    return dt.toISOString().slice(0, 10);
}

export function normalizeCountry(raw: unknown): string {
    const val = String(raw ?? "").trim();
    if (!val) return "Deutschland";
    const upper = val.toUpperCase();
    if (upper === "DE" || upper === "DEU" || upper === "GERMANY" || upper === "DEUTSCHLAND") {
        return "Deutschland";
    }
    if (upper === "AT" || upper === "AUT" || upper === "AUSTRIA" || upper === "ÖSTERREICH") {
        return "Österreich";
    }
    if (upper === "CH" || upper === "CHE" || upper === "SWITZERLAND" || upper === "SCHWEIZ") {
        return "Schweiz";
    }
    return val;
}

export function normalizeUnitOfMeasure(raw: unknown): string {
    const val = String(raw ?? "").trim();
    if (!val) return "Stück";
    const lower = val.toLowerCase();
    if (
        lower === "stk" ||
        lower === "stk." ||
        lower === "stück" ||
        lower === "stueck" ||
        lower === "c62" ||
        lower === "h87" ||
        lower === "pce" ||
        lower === "pcs" ||
        lower === "piece"
    ) {
        return "Stück";
    }
    if (
        lower === "std" ||
        lower === "std." ||
        lower === "stunde" ||
        lower === "stunden" ||
        lower === "h" ||
        lower === "hr" ||
        lower === "hur" ||
        lower === "hour"
    ) {
        return "Stunde";
    }
    if (
        lower === "psch" ||
        lower === "psch." ||
        lower === "pauschal" ||
        lower === "pauschale" ||
        lower === "ls"
    ) {
        return "Pauschale";
    }
    if (lower === "tag" || lower === "tage" || lower === "day" || lower === "pt") {
        return "Tag";
    }
    if (lower === "monat" || lower === "monate" || lower === "mon" || lower === "month") {
        return "Monat";
    }
    return val;
}

export function normalizeTaxRate(raw: unknown, fallback = 19): number {
    if (raw === undefined || raw === null || String(raw).trim() === "") {
        return fallback;
    }
    const str = String(raw).trim().toLowerCase();
    if (str.includes("steuerfrei") || str.includes("kleinunternehmer") || str === "0" || str === "0%") {
        return 0;
    }
    const num = parseFlexibleNumber(raw);
    if (num === 0 || num === 7 || num === 19) return num;
    if (num > 0 && num < 1) {
        // e.g. 0.19 -> 19
        return Math.round(num * 100);
    }
    if (num >= 0 && num <= 100) return num;
    return fallback;
}

export function normalizeInvoiceStatus(raw: unknown): InvoiceStatus {
    const str = String(raw ?? "").trim().toLowerCase();
    if (!str) return "paid";
    if (
        str.includes("bezahlt") ||
        str.includes("paid") ||
        str.includes("beglichen") ||
        str.includes("erledigt") ||
        str.includes("gebucht")
    ) {
        return "paid";
    }
    if (
        str.includes("storn") ||
        str.includes("cancel") ||
        str.includes("gutschrift")
    ) {
        return "cancelled";
    }
    if (str.includes("entwurf") || str.includes("draft")) {
        return "draft";
    }
    if (
        str.includes("offen") ||
        str.includes("versendet") ||
        str.includes("gestellt") ||
        str.includes("überfällig") ||
        str.includes("ueberfaellig") ||
        str.includes("mahnung") ||
        str.includes("overdue") ||
        str.includes("open") ||
        str.includes("sent") ||
        str.includes("unpaid")
    ) {
        return "sent";
    }
    return "paid";
}

export function normalizeExpenseCategory(raw: unknown, description = ""): ExpenseCategory {
    const combined = `${String(raw ?? "")} ${description}`.toLowerCase();
    if (
        combined.includes("software") ||
        combined.includes("saas") ||
        combined.includes("hosting") ||
        combined.includes("cloud") ||
        combined.includes("lizenz") ||
        combined.includes("domain") ||
        combined.includes("github") ||
        combined.includes("openai") ||
        combined.includes("adobe")
    ) {
        return "software";
    }
    if (
        combined.includes("hardware") ||
        combined.includes("laptop") ||
        combined.includes("macbook") ||
        combined.includes("monitor") ||
        combined.includes("computer") ||
        combined.includes("gerät")
    ) {
        return "hardware";
    }
    if (
        combined.includes("reise") ||
        combined.includes("travel") ||
        combined.includes("hotel") ||
        combined.includes("bahn") ||
        combined.includes("flug") ||
        combined.includes("tank") ||
        combined.includes("fahrt")
    ) {
        return "travel";
    }
    if (
        combined.includes("marketing") ||
        combined.includes("werbung") ||
        combined.includes("google ads") ||
        combined.includes("meta") ||
        combined.includes("anzeigen")
    ) {
        return "marketing";
    }
    if (
        combined.includes("beratung") ||
        combined.includes("consulting") ||
        combined.includes("steuerberater") ||
        combined.includes("rechtsanwalt") ||
        combined.includes("buchhaltung")
    ) {
        return "consulting";
    }
    if (combined.includes("miete") || combined.includes("rent") || combined.includes("coworking")) {
        return "rent";
    }
    if (
        combined.includes("nebenkosten") ||
        combined.includes("strom") ||
        combined.includes("wasser") ||
        combined.includes("heizung") ||
        combined.includes("utilities")
    ) {
        return "utilities";
    }
    if (combined.includes("versicherung") || combined.includes("insurance")) {
        return "insurance";
    }
    if (
        combined.includes("büro") ||
        combined.includes("buero") ||
        combined.includes("office") ||
        combined.includes("telefon") ||
        combined.includes("internet") ||
        combined.includes("porto") ||
        combined.includes("papier")
    ) {
        return "office";
    }
    return "other";
}

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

function xmlStr(val: unknown): string {
    if (val === null || val === undefined) return "";
    if (typeof val === "string" || typeof val === "number") return String(val).trim();
    if (typeof val === "object" && "#text" in (val as Record<string, unknown>)) {
        return String((val as Record<string, unknown>)["#text"] ?? "").trim();
    }
    return "";
}

function xmlArr(val: unknown): Record<string, unknown>[] {
    if (!val) return [];
    if (Array.isArray(val)) return val as Record<string, unknown>[];
    if (typeof val === "object") return [val as Record<string, unknown>];
    return [];
}

function asRec(val: unknown): Record<string, unknown> {
    if (val && typeof val === "object" && !Array.isArray(val)) {
        return val as Record<string, unknown>;
    }
    return {};
}

export interface ParsedMigrationEInvoice {
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    seller: NormalizedMigrationClient;
    buyer: NormalizedMigrationClient;
    subtotal: number;
    totalVat: number;
    totalGross: number;
    taxRatePercent: number;
    notes?: string;
    buyerReference?: string;
    items: NormalizedMigrationInvoiceItem[];
}

export function parseEInvoiceXmlForMigration(
    xmlContent: string,
): ParsedMigrationEInvoice | null {
    try {
        const parser = new XMLParser({
            ignoreAttributes: false,
            removeNSPrefix: true,
            parseTagValue: false,
        });
        const doc = parser.parse(xmlContent) as Record<string, unknown>;

        if (doc.CrossIndustryInvoice) {
            return parseCiiForMigration(asRec(doc.CrossIndustryInvoice));
        }
        if (doc.Invoice || doc.CreditNote) {
            return parseUblForMigration(asRec(doc.Invoice || doc.CreditNote));
        }
        return null;
    } catch {
        return null;
    }
}

function parseCiiParty(
    partyNode: Record<string, unknown>,
    leitwegId?: string,
): NormalizedMigrationClient {
    const name = xmlStr(partyNode.Name) || "Unbekannt";
    const contact = asRec(partyNode.DefinedTradeContact);
    const contactPerson = xmlStr(contact.PersonName) || undefined;
    const contactEmail =
        xmlStr(asRec(contact.EmailURIUniversalCommunication).URIID) ||
        xmlStr(asRec(partyNode.URIUniversalCommunication).URIID) ||
        undefined;
    const contactPhone =
        xmlStr(asRec(contact.TelephoneUniversalCommunication).CompleteNumber) ||
        undefined;

    const addr = asRec(partyNode.PostalTradeAddress);
    const addressLine1 = xmlStr(addr.LineOne) || "—";
    const addressLine2 = xmlStr(addr.LineTwo) || undefined;
    const postalCode = xmlStr(addr.PostcodeCode) || "00000";
    const city = xmlStr(addr.CityName) || "Unbekannt";
    const country = normalizeCountry(xmlStr(addr.CountryID) || "DE");

    let vatId: string | undefined;
    let taxNumber: string | undefined;
    for (const reg of xmlArr(partyNode.SpecifiedTaxRegistration)) {
        const idNode = reg.ID;
        const scheme =
            typeof idNode === "object" && idNode !== null
                ? String((idNode as Record<string, unknown>)["@_schemeID"] ?? "")
                : "";
        const val = xmlStr(idNode);
        if (scheme === "VA" && val) vatId = val;
        if (scheme === "FC" && val) taxNumber = val;
    }

    return {
        name,
        contact_person: contactPerson,
        client_type: "company",
        address_line1: addressLine1,
        address_line2: addressLine2,
        postal_code: postalCode,
        city,
        country,
        email: contactEmail?.includes("@") ? contactEmail : undefined,
        phone: contactPhone,
        vat_id: vatId,
        tax_number: taxNumber,
        leitweg_id: leitwegId,
    };
}

function parseCiiForMigration(
    cii: Record<string, unknown>,
): ParsedMigrationEInvoice {
    const docHeader = asRec(cii.ExchangedDocument);
    const invoiceNumber = xmlStr(docHeader.ID) || `XR-${Date.now()}`;
    const issueDate = parseFlexibleDate(
        xmlStr(asRec(docHeader.IssueDateTime).DateTimeString),
    );

    const transaction = asRec(cii.SupplyChainTradeTransaction);
    const agreement = asRec(transaction.ApplicableHeaderTradeAgreement);
    const settlement = asRec(transaction.ApplicableHeaderTradeSettlement);

    const buyerReference = xmlStr(agreement.BuyerReference) || undefined;
    const seller = parseCiiParty(asRec(agreement.SellerTradeParty));
    const buyer = parseCiiParty(asRec(agreement.BuyerTradeParty), buyerReference);

    const paymentTerms = asRec(settlement.SpecifiedTradePaymentTerms);
    const dueDate = parseFlexibleDate(
        xmlStr(asRec(paymentTerms.DueDateDateTime).DateTimeString),
        addDaysToIsoDate(issueDate, 14),
    );

    const monetary = asRec(
        settlement.SpecifiedTradeSettlementHeaderMonetarySummation,
    );
    const subtotal = parseFlexibleNumber(
        xmlStr(monetary.TaxBasisTotalAmount) || xmlStr(monetary.LineTotalAmount),
    );
    const totalVat = parseFlexibleNumber(xmlStr(monetary.TaxTotalAmount));
    const totalGross = parseFlexibleNumber(
        xmlStr(monetary.GrandTotalAmount) || xmlStr(monetary.DuePayableAmount),
    );

    const taxNodes = xmlArr(settlement.ApplicableTradeTax);
    const headerTaxRate =
        taxNodes.length > 0
            ? normalizeTaxRate(xmlStr(taxNodes[0].RateApplicablePercent), 19)
            : 19;

    const rawLines = xmlArr(transaction.IncludedSupplyChainTradeLineItem);
    const items: NormalizedMigrationInvoiceItem[] = rawLines.map((line) => {
        const prod = asRec(line.SpecifiedTradeProduct);
        const lineAgree = asRec(line.SpecifiedLineTradeAgreement);
        const lineDeliv = asRec(line.SpecifiedLineTradeDelivery);
        const lineSettle = asRec(line.SpecifiedLineTradeSettlement);

        const desc =
            [xmlStr(prod.Name), xmlStr(prod.Description)]
                .filter(Boolean)
                .join(" – ") || "Position";
        const billedQtyNode = lineDeliv.BilledQuantity;
        const quantity =
            parseFlexibleNumber(xmlStr(billedQtyNode)) || 1;
        const unitCode =
            typeof billedQtyNode === "object" && billedQtyNode !== null
                ? String((billedQtyNode as Record<string, unknown>)["@_unitCode"] ?? "")
                : "";
        const price = parseFlexibleNumber(
            xmlStr(asRec(lineAgree.NetPriceProductTradePrice).ChargeAmount),
        );
        const lineTaxes = xmlArr(lineSettle.ApplicableTradeTax);
        const lineTaxRate =
            lineTaxes.length > 0
                ? normalizeTaxRate(xmlStr(lineTaxes[0].RateApplicablePercent), headerTaxRate)
                : headerTaxRate;

        return {
            description: desc,
            quantity,
            unit_of_measure: normalizeUnitOfMeasure(unitCode),
            price,
            tax_rate_percent: lineTaxRate,
        };
    });

    if (items.length === 0) {
        items.push({
            description: `Rechnung ${invoiceNumber}`,
            quantity: 1,
            unit_of_measure: "Pauschale",
            price: subtotal,
            tax_rate_percent: headerTaxRate,
        });
    }

    return {
        invoiceNumber,
        issueDate,
        dueDate,
        seller,
        buyer,
        subtotal,
        totalVat,
        totalGross: totalGross || Math.round((subtotal + totalVat) * 100) / 100,
        taxRatePercent: headerTaxRate,
        buyerReference,
        items,
    };
}

function parseUblParty(
    partyWrapper: Record<string, unknown>,
    leitwegId?: string,
): NormalizedMigrationClient {
    const party = asRec(partyWrapper.Party || partyWrapper);
    const partyNames = xmlArr(party.PartyName);
    const legalEntities = xmlArr(party.PartyLegalEntity);

    const name =
        (legalEntities[0] ? xmlStr(legalEntities[0].RegistrationName) : "") ||
        (partyNames[0] ? xmlStr(partyNames[0].Name) : "") ||
        "Unbekannt";

    const contact = asRec(party.Contact);
    const contactPerson = xmlStr(contact.Name) || undefined;
    const contactEmail =
        xmlStr(contact.ElectronicMail) ||
        xmlStr(party.EndpointID) ||
        undefined;
    const contactPhone = xmlStr(contact.Telephone) || undefined;

    const addr = asRec(party.PostalAddress);
    const addressLine1 = xmlStr(addr.StreetName) || "—";
    const addressLine2 = xmlStr(addr.AdditionalStreetName) || undefined;
    const postalCode = xmlStr(addr.PostalZone) || "00000";
    const city = xmlStr(addr.CityName) || "Unbekannt";
    const country = normalizeCountry(
        xmlStr(asRec(addr.Country).IdentificationCode) || "DE",
    );

    const taxSchemes = xmlArr(party.PartyTaxScheme);
    let vatId: string | undefined;
    for (const ts of taxSchemes) {
        const cid = xmlStr(ts.CompanyID);
        if (cid && /^[A-Z]{2}/i.test(cid)) {
            vatId = cid;
        }
    }

    return {
        name,
        contact_person: contactPerson,
        client_type: "company",
        address_line1: addressLine1,
        address_line2: addressLine2,
        postal_code: postalCode,
        city,
        country,
        email: contactEmail?.includes("@") ? contactEmail : undefined,
        phone: contactPhone,
        vat_id: vatId,
        leitweg_id: leitwegId,
    };
}

function parseUblForMigration(
    inv: Record<string, unknown>,
): ParsedMigrationEInvoice {
    const invoiceNumber = xmlStr(inv.ID) || `XR-${Date.now()}`;
    const issueDate = parseFlexibleDate(xmlStr(inv.IssueDate));
    const dueDate = parseFlexibleDate(
        xmlStr(inv.DueDate),
        addDaysToIsoDate(issueDate, 14),
    );
    const buyerReference = xmlStr(inv.BuyerReference) || undefined;

    const seller = parseUblParty(asRec(inv.AccountingSupplierParty));
    const buyer = parseUblParty(
        asRec(inv.AccountingCustomerParty),
        buyerReference,
    );

    const monetary = asRec(inv.LegalMonetaryTotal);
    const subtotal = parseFlexibleNumber(
        xmlStr(monetary.TaxExclusiveAmount) || xmlStr(monetary.LineExtensionAmount),
    );
    const taxTotal = asRec(
        Array.isArray(inv.TaxTotal) ? inv.TaxTotal[0] : inv.TaxTotal,
    );
    const totalVat = parseFlexibleNumber(xmlStr(taxTotal.TaxAmount));
    const totalGross = parseFlexibleNumber(
        xmlStr(monetary.TaxInclusiveAmount) || xmlStr(monetary.PayableAmount),
    );

    const taxSubtotals = xmlArr(taxTotal.TaxSubtotal);
    const headerTaxRate =
        taxSubtotals.length > 0
            ? normalizeTaxRate(
                  xmlStr(asRec(taxSubtotals[0].TaxCategory).Percent),
                  19,
              )
            : 19;

    const rawLines = xmlArr(inv.InvoiceLine || inv.CreditNoteLine);
    const items: NormalizedMigrationInvoiceItem[] = rawLines.map((line) => {
        const itemNode = asRec(line.Item);
        const priceNode = asRec(line.Price);
        const qtyNode = line.InvoicedQuantity || line.CreditedQuantity;
        const quantity = parseFlexibleNumber(xmlStr(qtyNode)) || 1;
        const unitCode =
            typeof qtyNode === "object" && qtyNode !== null
                ? String((qtyNode as Record<string, unknown>)["@_unitCode"] ?? "")
                : "";
        const desc =
            [xmlStr(itemNode.Name), xmlStr(itemNode.Description)]
                .filter(Boolean)
                .join(" – ") || "Position";
        const price = parseFlexibleNumber(xmlStr(priceNode.PriceAmount));
        const lineTax = asRec(itemNode.ClassifiedTaxCategory);
        const taxRate = normalizeTaxRate(xmlStr(lineTax.Percent), headerTaxRate);

        return {
            description: desc,
            quantity,
            unit_of_measure: normalizeUnitOfMeasure(unitCode),
            price,
            tax_rate_percent: taxRate,
        };
    });

    if (items.length === 0) {
        items.push({
            description: `Rechnung ${invoiceNumber}`,
            quantity: 1,
            unit_of_measure: "Pauschale",
            price: subtotal,
            tax_rate_percent: headerTaxRate,
        });
    }

    return {
        invoiceNumber,
        issueDate,
        dueDate,
        seller,
        buyer,
        subtotal,
        totalVat,
        totalGross: totalGross || Math.round((subtotal + totalVat) * 100) / 100,
        taxRatePercent: headerTaxRate,
        buyerReference,
        items,
    };
}

/**
 * Generate clean sample CSV templates for users who want to prepare their own CSV.
 */
export function generateSampleCsvTemplate(
    entityType: Exclude<MigrationEntityType, "full_backup">,
): string {
    switch (entityType) {
        case "clients":
            return [
                "Firmenname;Ansprechpartner;Straße;PLZ;Ort;Land;E-Mail;Telefon;USt-IdNr.;Leitweg-ID",
                "Muster GmbH;Max Mustermann;Musterstraße 12;10115;Berlin;Deutschland;rechnung@muster.de;+49 30 123456;DE123456789;",
                "Design Studio Anna Schmidt;;Hauptstraße 5;80331;München;Deutschland;hallo@schmidt-design.de;;DE987654321;",
            ].join("\n");
        case "products":
            return [
                "Bezeichnung;Beschreibung;Preis (Netto);Steuersatz;Einheit",
                "Webentwicklung & Consulting;Konzeption und Umsetzung nach Aufwand;110,00;19;Stunde",
                "UI/UX Design Paket;Komplettes Screendesign inkl. Design-System;1850,00;19;Pauschale",
            ].join("\n");
        case "invoices":
            return [
                "Rechnungsnummer;Rechnungsdatum;Fälligkeitsdatum;Kunde;Kunden-E-Mail;Position;Nettobetrag;Steuerbetrag;Bruttobetrag;Steuersatz;Status",
                "RE-2026-001;15.01.2026;29.01.2026;Muster GmbH;rechnung@muster.de;Webentwicklung Januar;1000,00;190,00;1190,00;19;Bezahlt",
                "RE-2026-002;01.02.2026;15.02.2026;Design Studio Anna Schmidt;hallo@schmidt-design.de;UI/UX Workshop;500,00;95,00;595,00;19;Offen",
            ].join("\n");
        case "expenses":
            return [
                "Belegdatum;Lieferant;Beschreibung;Kategorie;Nettobetrag;Vorsteuer;Bruttobetrag;Steuersatz;Belegnummer",
                "10.01.2026;Hetzner Online GmbH;Cloud Server Hosting Januar;Software;25,00;4,75;29,75;19;H-2026-991",
                "18.01.2026;Deutsche Bahn AG;ICE Ticket Kundentermin Berlin;Reise;84,03;15,97;100,00;19;DB-8821",
            ].join("\n");
    }
}
