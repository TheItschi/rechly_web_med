/**
 * Backwards-compatible barrel — the importer was split into focused modules.
 * New code should import from "@/lib/migration/types",
 * "@/lib/migration/parseUtils", "@/lib/migration/csv", or
 * "@/lib/migration/einvoiceXml" directly.
 */
export * from "./types";
export * from "./parseUtils";
export * from "./csv";
export * from "./einvoiceXml";
export * from "./aggregate";
