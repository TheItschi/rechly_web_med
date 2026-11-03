/**
 * ICD-10-GM diagnoses for medical invoices.
 *
 * The catalogue itself is published by the BfArM (Systematik, ASCII/CSV
 * "…syst_kodes.txt") and imported with `npm run import:icd10gm -- <file>`.
 */

/** Zusatzkennzeichen für die Diagnosesicherheit */
export type DiagnosisCertainty = "G" | "V" | "Z" | "A";
/** Zusatzkennzeichen für die Seitenlokalisation */
export type DiagnosisSide = "R" | "L" | "B";

export interface InvoiceDiagnosis {
    /** ICD-10-GM code, e.g. "J06.9"; may be empty for free-text diagnoses */
    code?: string;
    text: string;
    certainty?: DiagnosisCertainty;
    side?: DiagnosisSide;
}

export type DiagnosisDisplay = "text" | "code" | "both";

/** Medical invoice data (stored as JSON in invoices.medicalData). */
export interface InvoiceMedicalData {
    diagnoses: InvoiceDiagnosis[];
    diagnosis_display: DiagnosisDisplay;
}

export class MedicalDataError extends Error {}

export interface Icd10Code {
    code: string;
    title: string;
}

export const CERTAINTY_LABELS: Record<DiagnosisCertainty, string> = {
    G: "gesichert",
    V: "Verdacht auf",
    Z: "Zustand nach",
    A: "ausgeschlossen",
};
export const SIDE_LABELS: Record<DiagnosisSide, string> = { R: "rechts", L: "links", B: "beidseits" };

const CODE_RE = /^[A-Z]\d{2}(\.[0-9A-Z]{1,2})?$/;
export const isIcd10Code = (value: string): boolean => CODE_RE.test(value.trim().toUpperCase());

/** "J06.9 G", "M17.1 R" – code with Zusatzkennzeichen as used on invoices. */
export function formatDiagnosisCode(d: InvoiceDiagnosis): string {
    if (!d.code) return "";
    return [d.code, d.certainty, d.side].filter(Boolean).join(" ");
}

export function formatDiagnosis(d: InvoiceDiagnosis, mode: DiagnosisDisplay): string {
    const code = formatDiagnosisCode(d);
    const qualifiers = [
        d.certainty && d.certainty !== "G" ? CERTAINTY_LABELS[d.certainty] : "",
    ].filter(Boolean);
    const side = d.side ? ` (${SIDE_LABELS[d.side]})` : "";
    const text = `${qualifiers.length ? `${qualifiers.join(" ")}: ` : ""}${d.text}${side}`;
    if (mode === "code") return code || text;
    if (mode === "text" || !code) return text;
    return `${text} [${code}]`;
}

export function normalizeMedicalData(raw: unknown): InvoiceMedicalData | undefined {
    if (!raw || typeof raw !== "object") return undefined;
    const r = raw as Record<string, unknown>;
    const display: DiagnosisDisplay = ["text", "code", "both"].includes(r.diagnosis_display as string)
        ? (r.diagnosis_display as DiagnosisDisplay)
        : "both";
    const diagnoses = (Array.isArray(r.diagnoses) ? r.diagnoses : [])
        .slice(0, 20)
        .map((d): InvoiceDiagnosis | null => {
            if (!d || typeof d !== "object") return null;
            const x = d as Record<string, unknown>;
            const code = typeof x.code === "string" ? x.code.trim().toUpperCase() : "";
            const text = typeof x.text === "string" ? x.text.trim().slice(0, 300) : "";
            if (!text && !code) return null;
            if (code && !isIcd10Code(code)) throw new MedicalDataError(`Ungültiger ICD-10-GM-Kode: ${code}`);
            return {
                ...(code ? { code } : {}),
                text: text || code,
                ...(["G", "V", "Z", "A"].includes(x.certainty as string) ? { certainty: x.certainty as DiagnosisCertainty } : {}),
                ...(["R", "L", "B"].includes(x.side as string) ? { side: x.side as DiagnosisSide } : {}),
            };
        })
        .filter((d): d is InvoiceDiagnosis => d !== null);
    if (!diagnoses.length) return undefined;
    return { diagnoses, diagnosis_display: display };
}

export function parseMedicalData(value: unknown): InvoiceMedicalData | undefined {
    if (!value) return undefined;
    try {
        return normalizeMedicalData(typeof value === "string" ? JSON.parse(value) : value);
    } catch {
        return undefined;
    }
}

/**
 * Parses the BfArM ICD-10-GM Systematik "kodes" file. Expected layout
 * (semicolon separated): [0] Ebene, [1] T/N (terminal), [2] X/S, [3] Kapitel,
 * [4] Dreisteller der Gruppe, [5] Kode, [6] Kode ohne Kreuz/Stern,
 * [7] Kode ohne Punkt, [8] Klassentitel, …
 * Falls back to plain "code;title" CSV. Only terminal codes are kept unless
 * `includeNonTerminal` is set.
 */
export function parseIcd10Catalog(content: string, opts: { includeNonTerminal?: boolean } = {}): Icd10Code[] {
    const out = new Map<string, string>();
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) continue;
        const f = line.split(";").map((x) => x.trim().replace(/^"|"$/g, ""));
        if (f.length >= 9 && /^[345]$/.test(f[0]) && /^[TN]$/.test(f[1])) {
            if (f[1] !== "T" && !opts.includeNonTerminal) continue;
            const code = f[6].replace(/[+*!†]/g, "");
            if (isIcd10Code(code) && f[8]) out.set(code, f[8]);
            continue;
        }
        const codeIdx = f.findIndex((x) => isIcd10Code(x.replace(/[+*!†-]/g, "")));
        if (codeIdx < 0) continue;
        const code = f[codeIdx].replace(/[+*!†-]/g, "").toUpperCase();
        const title = f.slice(codeIdx + 1).find((x) => /[a-zäöüß]/i.test(x) && !isIcd10Code(x));
        if (title) out.set(code, title);
    }
    return [...out].map(([code, title]) => ({ code, title })).sort((a, b) => a.code.localeCompare(b.code));
}

/** Simple ranked search: exact code > code prefix > all words in title. */
export function searchIcd10(catalog: Icd10Code[], query: string, limit = 30): Icd10Code[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const qCode = q.toUpperCase().replace(/\s/g, "");
    const words = q.split(/\s+/).filter(Boolean);
    const scored: [number, Icd10Code][] = [];
    for (const item of catalog) {
        let score = -1;
        if (item.code === qCode) score = 0;
        else if (item.code.startsWith(qCode) || item.code.replace(".", "").startsWith(qCode)) score = 1;
        else {
            const title = item.title.toLowerCase();
            if (words.every((w) => title.includes(w))) score = title.startsWith(words[0]) ? 2 : 3;
        }
        if (score >= 0) scored.push([score * 1000 + item.code.length, item]);
    }
    return scored.sort((a, b) => a[0] - b[0] || a[1].code.localeCompare(b[1].code)).slice(0, limit).map(([, i]) => i);
}
