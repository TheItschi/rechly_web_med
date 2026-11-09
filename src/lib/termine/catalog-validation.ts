import { T, TermineError, type TermineStore } from "./store";

/** Validate edits as well as creation: malformed edits must not corrupt the slot engine. */
export async function validateCatalogPatch(
    store: TermineStore,
    patch: Record<string, unknown>,
    kind: "service" | "staff",
) {
    for (const [field, max] of Object.entries({
        name: 200,
        description: 2000,
        category: 100,
        productId: 100,
    })) {
        const value = patch[field];
        if (value === undefined || (field === "productId" && value === null)) continue;
        if (typeof value !== "string" || value.length > max || (field === "name" && !value.trim()))
            throw new TermineError(`Ungültiger Wert: ${field}.`);
    }
    for (const field of ["active", "publicVisible", "bookable"])
        if (patch[field] !== undefined && typeof patch[field] !== "boolean")
            throw new TermineError("Ungültiger Schalterwert.");
    const bounds = {
        durationMinutes: [5, 1440],
        prepMinutes: [0, 240],
        cleanupMinutes: [0, 240],
        priceCents: [0, 100000000],
        sortOrder: [-100000, 100000],
        taxRatePercent: [0, 100],
    };
    for (const [field, [min, max]] of Object.entries(bounds)) {
        const value = patch[field];
        if (value === undefined || (field === "taxRatePercent" && value === null)) continue;
        if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max)
            throw new TermineError(`Ungültiger Wert: ${field}.`);
    }
    if (
        patch.currency !== undefined &&
        (typeof patch.currency !== "string" || !/^[A-Z]{3}$/.test(patch.currency))
    )
        throw new TermineError("Ungültige Währung.");
    if (patch.color != null && (typeof patch.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(patch.color)))
        throw new TermineError("Ungültige Farbe.");
    const field = kind === "service" ? "staffIds" : "serviceIds",
        ids = patch[field];
    if (ids !== undefined) {
        if (!Array.isArray(ids) || ids.length > 50 || ids.some((id) => typeof id !== "string" || !id))
            throw new TermineError("Ungültige Zuordnung.");
        for (const id of new Set(ids as string[]))
            await store.own(kind === "service" ? T.STAFF : T.SERVICES, id);
    }
    if (typeof patch.productId === "string" && patch.productId) await store.own("products", patch.productId);
}
