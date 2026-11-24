/**
 * EU member states — the only selectable countries in company/client forms.
 * Stored values keep the canonical German name ("Deutschland", "Österreich", …)
 * to stay compatible with existing records and the e-invoice country mapping;
 * only the displayed label is localized. Germany always sorts first (default).
 */
export interface EuCountry {
    /** ISO 3166-1 alpha-2 (EL for Greece per EU convention). */
    code: string;
    de: string;
    en: string;
}

export const EU_COUNTRIES: EuCountry[] = [
    { code: "DE", de: "Deutschland", en: "Germany" },
    { code: "BE", de: "Belgien", en: "Belgium" },
    { code: "BG", de: "Bulgarien", en: "Bulgaria" },
    { code: "DK", de: "Dänemark", en: "Denmark" },
    { code: "EE", de: "Estland", en: "Estonia" },
    { code: "FI", de: "Finnland", en: "Finland" },
    { code: "FR", de: "Frankreich", en: "France" },
    { code: "GR", de: "Griechenland", en: "Greece" },
    { code: "IE", de: "Irland", en: "Ireland" },
    { code: "IT", de: "Italien", en: "Italy" },
    { code: "HR", de: "Kroatien", en: "Croatia" },
    { code: "LV", de: "Lettland", en: "Latvia" },
    { code: "LT", de: "Litauen", en: "Lithuania" },
    { code: "LU", de: "Luxemburg", en: "Luxembourg" },
    { code: "MT", de: "Malta", en: "Malta" },
    { code: "NL", de: "Niederlande", en: "Netherlands" },
    { code: "AT", de: "Österreich", en: "Austria" },
    { code: "PL", de: "Polen", en: "Poland" },
    { code: "PT", de: "Portugal", en: "Portugal" },
    { code: "RO", de: "Rumänien", en: "Romania" },
    { code: "SE", de: "Schweden", en: "Sweden" },
    { code: "SK", de: "Slowakei", en: "Slovakia" },
    { code: "SI", de: "Slowenien", en: "Slovenia" },
    { code: "ES", de: "Spanien", en: "Spain" },
    { code: "CZ", de: "Tschechien", en: "Czechia" },
    { code: "HU", de: "Ungarn", en: "Hungary" },
    { code: "CY", de: "Zypern", en: "Cyprus" },
];

export const DEFAULT_COUNTRY = "Deutschland";

/** True if the stored free-text value names an EU country (name or code). */
export function isEuCountryName(value: string | null | undefined): boolean {
    const v = (value || "").trim().toLowerCase();
    if (!v) return false;
    return EU_COUNTRIES.some(
        (c) => c.de.toLowerCase() === v || c.en.toLowerCase() === v || c.code.toLowerCase() === v,
    );
}

/**
 * Select options for country fields. A legacy non-EU value (existing record)
 * is prepended once so it stays visible and is never silently rewritten —
 * new selections are EU-only.
 */
export function euCountryOptions(
    language: string,
    currentValue?: string | null,
): Array<{ value: string; label: string }> {
    const options = EU_COUNTRIES.map((c) => ({
        value: c.de,
        label: language === "en" ? c.en : c.de,
    }));
    const current = (currentValue || "").trim();
    if (current && !isEuCountryName(current)) {
        options.unshift({ value: current, label: current });
    }
    return options;
}

/** Options whose value is the ISO code (e-invoice address fields). */
export function euCountryCodeOptions(
    language: string,
): Array<{ value: string; label: string }> {
    return EU_COUNTRIES.map((c) => ({
        value: c.code,
        label: `${c.code} – ${language === "en" ? c.en : c.de}`,
    }));
}
