/**
 * CSV import/export of the GOÄ catalogue (Excel-friendly, ";"-separated).
 *
 * Required columns: Ziffer, Bezeichnung, Punkte. All rule columns are
 * optional; lists are separated by "," or spaces, flags accept ja/x/1/true.
 */
import Papa from "papaparse";
import { normalizeGoaeNumber, type GoaeCatalogEntry } from "./catalog";
import type { GoaeFeeType } from "./fees";

export const GOAE_CSV_COLUMNS = [
    "Ziffer", "Bezeichnung", "Punkte", "Gebuehrenart", "Abschnitt",
    "NichtNeben", "NurNeben", "Allein", "Erfordert", "MaxTag", "MaxFall",
    "MaxAnzahl", "MaxMonate", "Kalenderjahr", "NichtImFall", "MinMinuten",
    "MehrfachBegruendung", "Hinweis", "Faktoren", "Festbetrag",
] as const;

const FEE_TYPE_IN: Record<string, GoaeFeeType> = {
    personal: "personal", persoenlich: "personal", "persönlich": "personal", p: "personal",
    technical: "technical", technisch: "technical", t: "technical",
    lab: "lab", labor: "lab", l: "lab",
    surcharge: "surcharge", zuschlag: "surcharge", z: "surcharge",
};
const FEE_TYPE_OUT: Record<GoaeFeeType, string> = {
    personal: "persönlich", technical: "technisch", lab: "labor", surcharge: "zuschlag",
};

const key = (h: string) => h.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/[^a-z]/g, "");
const COLUMN_BY_KEY = new Map(GOAE_CSV_COLUMNS.map((c) => [key(c), c]));

const list = (v?: string) => (v ?? "").split(/[,\s]+/).map(normalizeGoaeNumber).filter(Boolean);
const flag = (v?: string) => /^(ja|j|x|1|true|yes|y)$/i.test((v ?? "").trim());
const int = (v?: string) => {
    const n = Number.parseInt((v ?? "").trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
};

export interface GoaeCsvResult {
    entries: GoaeCatalogEntry[];
    errors: { row: number; message: string }[];
}

export function parseGoaeCsv(text: string): GoaeCsvResult {
    const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
        header: true,
        skipEmptyLines: "greedy",
        delimiter: "", // auto-detect ; or ,
        transformHeader: (h) => COLUMN_BY_KEY.get(key(h)) ?? h,
    });
    const errors: GoaeCsvResult["errors"] = [];
    const entries: GoaeCatalogEntry[] = [];
    const fields = parsed.meta.fields ?? [];
    for (const required of ["Ziffer", "Bezeichnung", "Punkte"]) {
        if (!fields.includes(required)) errors.push({ row: 1, message: `Spalte „${required}“ fehlt` });
    }
    if (errors.length) return { entries, errors };

    const seen = new Set<string>();
    parsed.data.forEach((r, i) => {
        const row = i + 2; // header is row 1
        const number = normalizeGoaeNumber(r.Ziffer);
        const title = (r.Bezeichnung ?? "").trim();
        const fixedFeeRaw = (r.Festbetrag ?? "").trim();
        const fixedFee = fixedFeeRaw ? Number.parseFloat(fixedFeeRaw.replace(",", ".")) : undefined;
        if (fixedFee !== undefined && !(fixedFee > 0)) return errors.push({ row, message: `${number}: ungültiger Festbetrag` });
        const points = fixedFee !== undefined && !(r.Punkte ?? "").trim() ? 0 : Number.parseFloat((r.Punkte ?? "").replace(",", "."));
        if (!number) return errors.push({ row, message: "Ziffer fehlt" });
        if (!title) return errors.push({ row, message: `${number}: Bezeichnung fehlt` });
        if (!(points > 0) && fixedFee === undefined) return errors.push({ row, message: `${number}: ungültige Punktzahl` });
        const factors = (r.Faktoren ?? "").split("/").map((x) => Number.parseFloat(x.trim().replace(",", "."))).filter((x) => x > 0);
        if (seen.has(number)) return errors.push({ row, message: `${number}: doppelt` });
        const feeRaw = (r.Gebuehrenart ?? "").trim().toLowerCase();
        const feeType = feeRaw ? FEE_TYPE_IN[feeRaw] : undefined;
        if (feeRaw && !feeType) return errors.push({ row, message: `${number}: unbekannte Gebührenart „${r.Gebuehrenart}“` });
        seen.add(number);

        const maxCount = int(r.MaxAnzahl);
        const entry: GoaeCatalogEntry = {
            number,
            title,
            points,
            feeType: feeType ?? (/^[A-Z]/.test(number) ? "surcharge" : "personal"),
            // Empty section: derived from the number range at check time.
            section: (r.Abschnitt ?? "").trim().toUpperCase() || (/^[A-Z]/.test(number) ? "Z" : ""),
        };
        const notWith = list(r.NichtNeben);
        const onlyWith = list(r.NurNeben);
        const requires = list(r.Erfordert);
        const notInCase = list(r.NichtImFall);
        if (notWith.length) entry.notWith = notWith;
        if (onlyWith.length) entry.onlyWith = onlyWith;
        if (requires.length) entry.requiresOneOf = requires;
        if (notInCase.length) entry.notWithInCase = notInCase;
        if (flag(r.Allein)) entry.alone = true;
        if (flag(r.MehrfachBegruendung)) entry.repeatSameDayNeedsReason = true;
        if (int(r.MaxTag)) entry.maxPerDay = int(r.MaxTag);
        if (int(r.MaxFall)) entry.maxPerCase = int(r.MaxFall);
        if (maxCount && (flag(r.Kalenderjahr) || int(r.MaxMonate))) {
            entry.maxPerPeriod = flag(r.Kalenderjahr) ? { count: maxCount, calendarYear: true } : { count: maxCount, months: int(r.MaxMonate) };
        }
        if (int(r.MinMinuten)) entry.minMinutes = int(r.MinMinuten);
        if ((r.Hinweis ?? "").trim()) entry.invoiceHint = r.Hinweis.trim();
        if (factors.length) entry.allowedFactors = factors;
        if (fixedFee !== undefined) entry.fixedFee = fixedFee;
        entries.push(entry);
    });
    return { entries, errors };
}

export function goaeCatalogToCsv(entries: GoaeCatalogEntry[]): string {
    const rows = entries.map((e) => ({
        Ziffer: e.number,
        Bezeichnung: e.title,
        Punkte: String(e.points),
        Gebuehrenart: FEE_TYPE_OUT[e.feeType],
        Abschnitt: e.section,
        NichtNeben: (e.notWith ?? []).join(","),
        NurNeben: (e.onlyWith ?? []).join(","),
        Allein: e.alone ? "ja" : "",
        Erfordert: (e.requiresOneOf ?? []).join(","),
        MaxTag: e.maxPerDay ? String(e.maxPerDay) : "",
        MaxFall: e.maxPerCase ? String(e.maxPerCase) : "",
        MaxAnzahl: e.maxPerPeriod ? String(e.maxPerPeriod.count) : "",
        MaxMonate: e.maxPerPeriod?.months ? String(e.maxPerPeriod.months) : "",
        Kalenderjahr: e.maxPerPeriod?.calendarYear ? "ja" : "",
        NichtImFall: (e.notWithInCase ?? []).join(","),
        MinMinuten: e.minMinutes ? String(e.minMinutes) : "",
        MehrfachBegruendung: e.repeatSameDayNeedsReason ? "ja" : "",
        Hinweis: e.invoiceHint ?? "",
        Faktoren: (e.allowedFactors ?? []).map((f) => String(f).replace(".", ",")).join("/"),
        Festbetrag: e.fixedFee !== undefined ? String(e.fixedFee).replace(".", ",") : "",
    }));
    // BOM so Excel opens UTF-8 correctly
    return "﻿" + Papa.unparse(rows, { delimiter: ";", columns: [...GOAE_CSV_COLUMNS] });
}
