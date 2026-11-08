import type {
    Expense,
    ExpenseCategory,
    Invoice,
} from "@/types";

export type MigrationClientType = "company" | "person";
export type ExpensePaymentMethod = Expense["payment_method"];
export type InvoiceStatus = Invoice["status"];

export interface ParsedCsvFileEntry {
    id: string;
    fileName: string;
    headers: string[];
    rows: Record<string, string>[];
    detectedSource: MigrationSourceId;
    entityType: Exclude<MigrationEntityType, "full_backup">;
    mapping: Record<string, string>;
}

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

