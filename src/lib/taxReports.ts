/**
 * UStVA and EÜR report calculations — pure module (unit tested, kept in
 * sync with lib/taxReports.ts on mobile).
 *
 * Assumptions, stated in the UI as well:
 * - UStVA follows Soll-Versteuerung: revenue counts by invoice issue date
 *   for every issued (non-draft, non-cancelled) invoice.
 * - The EÜR is simplified: income from paid invoices by issue date
 *   (payment dates are not tracked), expenses by expense date.
 * - Values are meant for transfer into ELSTER / review with a tax
 *   advisor — Rechly does not submit anything itself.
 */

export interface RevenueLineInput {
    /** Invoice issue date, YYYY-MM-DD */
    issue_date: string;
    /** Invoice status the line belongs to */
    status: "draft" | "sent" | "paid" | "cancelled";
    tax_rate_percent: number;
    /** Net amount of the line */
    net: number;
    /** VAT amount of the line */
    tax: number;
}

export interface ExpenseInput {
    date: string;
    vat_rate_percent: number;
    amount_net: number;
    vat_amount: number;
    amount_gross: number;
    category: string;
}

export interface Period {
    /** Inclusive, YYYY-MM-DD */
    from: string;
    /** Inclusive, YYYY-MM-DD */
    to: string;
}

const inPeriod = (date: string, period: Period): boolean =>
    date >= period.from && date <= period.to;

const round2 = (value: number): number => Math.round(value * 100) / 100;

// ─── UStVA ───────────────────────────────────────────────────────────────────

export interface UstvaReport {
    period: Period;
    /** KZ 81: net revenue taxed at 19 % */
    kz81Net: number;
    kz81Tax: number;
    /** KZ 86: net revenue taxed at 7 % */
    kz86Net: number;
    kz86Tax: number;
    /** Tax-free / 0 % revenue (informational) */
    taxFreeNet: number;
    /** § 24 UStG flat-rate (Durchschnittssatz) revenue — informational:
     *  the charged 7.8 %/5.5 % tax is kept by the farmer, never remitted,
     *  so it is excluded from the Zahllast below. */
    flatRate24Net: number;
    flatRate24Tax: number;
    /** KZ 66: input tax (Vorsteuer) from expenses */
    kz66Vorsteuer: number;
    /** KZ 83: resulting payment (positive) or refund (negative) */
    kz83Zahllast: number;
}

/**
 * Compute the UStVA figures for a period. Only issued invoices count
 * (drafts and cancelled invoices are excluded); credit notes carry
 * negative amounts and reduce the figures naturally.
 */
export const computeUstva = (
    lines: RevenueLineInput[],
    expenses: ExpenseInput[],
    period: Period
): UstvaReport => {
    let kz81Net = 0;
    let kz81Tax = 0;
    let kz86Net = 0;
    let kz86Tax = 0;
    let taxFreeNet = 0;
    let flatRate24Net = 0;
    let flatRate24Tax = 0;

    for (const line of lines) {
        if (line.status === "draft" || line.status === "cancelled") continue;
        if (!inPeriod(line.issue_date, period)) continue;
        if (line.tax_rate_percent === 19) {
            kz81Net += line.net;
            kz81Tax += line.tax;
        } else if (line.tax_rate_percent === 7) {
            kz86Net += line.net;
            kz86Tax += line.tax;
        } else if (line.tax_rate_percent === 7.8 || line.tax_rate_percent === 5.5) {
            // § 24 UStG Durchschnittssatz: shown for information only.
            flatRate24Net += line.net;
            flatRate24Tax += line.tax;
        } else {
            taxFreeNet += line.net;
        }
    }

    let kz66Vorsteuer = 0;
    for (const expense of expenses) {
        if (!inPeriod(expense.date, period)) continue;
        kz66Vorsteuer += expense.vat_amount;
    }

    return {
        period,
        kz81Net: round2(kz81Net),
        kz81Tax: round2(kz81Tax),
        kz86Net: round2(kz86Net),
        kz86Tax: round2(kz86Tax),
        taxFreeNet: round2(taxFreeNet),
        flatRate24Net: round2(flatRate24Net),
        flatRate24Tax: round2(flatRate24Tax),
        kz66Vorsteuer: round2(kz66Vorsteuer),
        kz83Zahllast: round2(kz81Tax + kz86Tax - kz66Vorsteuer),
    };
};

/** Build the period for a month (1–12) or quarter ("Q1"–"Q4") of a year */
export const periodFor = (
    year: number,
    part: number | "Q1" | "Q2" | "Q3" | "Q4"
): Period => {
    if (typeof part === "number") {
        const lastDay = new Date(Date.UTC(year, part, 0)).getUTCDate();
        const mm = String(part).padStart(2, "0");
        return {
            from: `${year}-${mm}-01`,
            to: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
        };
    }
    const quarter = Number(part[1]);
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    const lastDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
    return {
        from: `${year}-${String(startMonth).padStart(2, "0")}-01`,
        to: `${year}-${String(endMonth).padStart(2, "0")}-${lastDay}`,
    };
};

// ─── EÜR ─────────────────────────────────────────────────────────────────────

export interface EuerReport {
    year: number;
    /** Net income by VAT rate */
    incomeByRate: Array<{ rate: number; net: number }>;
    /** Collected VAT counts as income in the EÜR */
    collectedVat: number;
    totalIncome: number;
    /** Net expenses grouped by category */
    expenseGroups: Array<{ category: string; net: number }>;
    /** Paid input tax counts as expense in the EÜR */
    paidVorsteuer: number;
    totalExpenses: number;
    profit: number;
}

/**
 * Simplified EÜR: income from paid invoices (by issue date), expenses by
 * their date, both net with VAT amounts listed separately as the EÜR
 * requires.
 */
export const computeEuer = (
    lines: RevenueLineInput[],
    expenses: ExpenseInput[],
    year: number
): EuerReport => {
    const period: Period = { from: `${year}-01-01`, to: `${year}-12-31` };

    const rateMap = new Map<number, number>();
    let collectedVat = 0;
    for (const line of lines) {
        if (line.status !== "paid") continue;
        if (!inPeriod(line.issue_date, period)) continue;
        rateMap.set(
            line.tax_rate_percent,
            (rateMap.get(line.tax_rate_percent) || 0) + line.net
        );
        collectedVat += line.tax;
    }

    const categoryMap = new Map<string, number>();
    let paidVorsteuer = 0;
    for (const expense of expenses) {
        if (!inPeriod(expense.date, period)) continue;
        categoryMap.set(
            expense.category,
            (categoryMap.get(expense.category) || 0) + expense.amount_net
        );
        paidVorsteuer += expense.vat_amount;
    }

    const incomeByRate = [...rateMap.entries()]
        .map(([rate, net]) => ({ rate, net: round2(net) }))
        .sort((a, b) => b.rate - a.rate);
    const expenseGroups = [...categoryMap.entries()]
        .map(([category, net]) => ({ category, net: round2(net) }))
        .sort((a, b) => b.net - a.net);

    const netIncome = incomeByRate.reduce((sum, item) => sum + item.net, 0);
    const netExpenses = expenseGroups.reduce((sum, item) => sum + item.net, 0);
    const totalIncome = round2(netIncome + collectedVat);
    const totalExpenses = round2(netExpenses + paidVorsteuer);

    return {
        year,
        incomeByRate,
        collectedVat: round2(collectedVat),
        totalIncome,
        expenseGroups,
        paidVorsteuer: round2(paidVorsteuer),
        totalExpenses,
        profit: round2(totalIncome - totalExpenses),
    };
};
