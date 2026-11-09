import { TermineError } from "./store";
export function validateSettingsPatch(patch: Record<string, unknown>) {
    for (const [field, max] of Object.entries({
        displayName: 200,
        description: 2000,
        contactEmail: 200,
        contactPhone: 40,
        address: 500,
        website: 300,
    })) {
        if (patch[field] === undefined) continue;
        if (typeof patch[field] !== "string" || (patch[field] as string).length > max)
            throw new TermineError(`Bitte ${field} prüfen.`);
        patch[field] = (patch[field] as string).trim();
    }
    if (patch.displayName !== undefined && !patch.displayName)
        throw new TermineError("Bitte einen Unternehmensnamen angeben.");
    if (patch.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(patch.contactEmail)))
        throw new TermineError("Ungültige Kontakt-E-Mail.");
    if (patch.website) {
        try {
            const url = new URL(String(patch.website));
            if (!["https:", "http:"].includes(url.protocol) || url.username || url.password)
                throw new Error();
        } catch {
            throw new TermineError("Website muss eine gültige HTTP- oder HTTPS-Adresse sein.");
        }
    }
    if (patch.timezone !== undefined) {
        try {
            if (typeof patch.timezone !== "string") throw new Error();
            new Intl.DateTimeFormat("de-DE", { timeZone: patch.timezone });
        } catch {
            throw new TermineError("Ungültige Zeitzone.");
        }
    }
    for (const field of ["enabled", "published", "showPrices", "allowAnyStaff"])
        if (patch[field] !== undefined && typeof patch[field] !== "boolean")
            throw new TermineError("Ungültiger Schalterwert.");
    for (const [field, options] of Object.entries({
        language: ["de", "en"],
        confirmationMode: ["automatic", "manual"],
        slotIntervalMinutes: [15, 30],
    }))
        if (patch[field] !== undefined && !(options as unknown[]).includes(patch[field]))
            throw new TermineError(`Ungültiger Wert: ${field}.`);
    for (const field of [
        "minNoticeMinutes",
        "cancelNoticeMinutes",
        "rescheduleNoticeMinutes",
        "maxHorizonDays",
    ]) {
        const value = patch[field];
        if (value === undefined) continue;
        if (
            typeof value !== "number" ||
            !Number.isInteger(value) ||
            value < (field === "maxHorizonDays" ? 1 : 0) ||
            value > (field === "maxHorizonDays" ? 365 : 525600)
        )
            throw new TermineError("Buchungshorizont: 1–365 Tage; Fristen: höchstens ein Jahr.");
    }
    if (
        patch.currency !== undefined &&
        (typeof patch.currency !== "string" || !/^[A-Z]{3}$/.test(patch.currency))
    )
        throw new TermineError("Ungültige Währung.");
    return patch;
}
