import { Permission, Query, Role, type Databases } from "node-appwrite";
import type { BusinessProject } from "./domain";
import { WorkspaceStore, atomic, DB, recordId, newId, object, text, date, amount, missing } from "./store";
import { WorkspaceError } from "./repository";
import { projectReports, roundMoney, type TimeEntry, type RunningTimer, type ExpenseLink, type TimeBilling, type WorkSnapshot } from "./work-types";
import { calculateInvoiceTotals, calculateLineItemTotals } from "../currencyUtils";
import { allDocuments } from "../server/pagination";
import { snapshotIdentifiers, readEInvoiceData } from "../eRechnung/identifiers";

export const timerId = (user: string) => recordId(user, "timer");
export const billingId = (user: string, invoice: string) => recordId(user, "billing:" + invoice);
async function project(store: WorkspaceStore, id: unknown) {
    const row = await store.find<BusinessProject>("projects", text(id, 100, true));
    if (!row) throw new WorkspaceError("Bitte ein vorhandenes Projekt auswählen.");
    return row;
}
async function fields(store: WorkspaceStore, raw: Record<string, unknown>) {
    const p = await project(store, raw.project_id);
    if (typeof raw.billable !== "boolean") throw new WorkspaceError("Bitte Abrechenbarkeit festlegen.");
    return { project_id: p.id, description: text(raw.description, 1000, true), rate: amount(raw.rate), cost_rate: amount(raw.cost_rate), billable: raw.billable };
}
function duration(value: unknown): number {
    if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 1440) throw new WorkspaceError("Die Dauer muss zwischen 1 und 1.440 Minuten liegen.");
    return Number(value);
}
export async function readWork(store: WorkspaceStore): Promise<WorkSnapshot> {
    const rows = await store.rows();
    const values = <T>(kind: string) => rows.filter(r => r.kind === kind).map(r => JSON.parse(r.payload) as T);
    const [invoices, expenses, companies] = await Promise.all([store.list("invoices"), store.list("expenses"), store.list("user_company")]);
    const billings = values<TimeBilling>("billings"), links = values<ExpenseLink>("expenseLinks");
    const data = { projects: values<BusinessProject>("projects"), entries: values<TimeEntry>("timeEntries").sort((a,b) => b.date.localeCompare(a.date) || b.created_at - a.created_at), timer: values<RunningTimer>("timers")[0] || null,
        smallBusiness: Boolean(companies[0]?.isSmallBusiness),
        invoices: invoices.map(i => ({ id: i.$id, invoice_number: String(i.invoiceNumber), project_id: billings.find(b => b.invoice_id === i.$id)?.project_id || "", status: String(i.status), subtotal: Number(i.subtotal || 0), due_date: String(i.dueDate || "") })),
        expenses: expenses.map(e => ({ id: e.$id, project_id: links.find(l => l.expense_id === e.$id)?.project_id || "", date: String(e.date || ""), vendor_name: String(e.vendorName || ""), description: String(e.description || ""), amount_net: Number(e.amountNet || 0), amount_gross: Number(e.amountGross || 0) })) };
    return { ...data, reports: projectReports(data) };
}
export async function mutateWork(db: Databases, user: string, input: unknown) {
    const raw = object(input);
    return atomic(db, user, async store => {
        if (raw.action === "save" || raw.action === "start") {
            const value = await fields(store, raw);
            if (raw.action === "start") {
                const id = timerId(user);
                if (await store.find("timers", id)) throw new WorkspaceError("Es läuft bereits ein Timer.", 409);
                const timer: RunningTimer = { ...value, id, token: newId(), started_at: Date.now() };
                await store.put("timers", timer, false); return timer;
            }
            const previous = raw.id ? await store.find<TimeEntry>("timeEntries", text(raw.id, 100, true)) : undefined;
            if (raw.id && !previous) throw new WorkspaceError("Zeiteintrag nicht gefunden.", 404);
            if (previous?.invoice_id) throw new WorkspaceError("Abgerechnete Zeiten sind gesperrt.", 409);
            const entry: TimeEntry = { ...value, id: previous?.id || newId(), date: date(raw.date), minutes: duration(raw.minutes), invoice_id: "", created_at: previous?.created_at || Date.now() };
            await store.put("timeEntries", entry, !!previous); return entry;
        }
        if (raw.action === "stop" || raw.action === "cancel") {
            const timer = await store.find<RunningTimer>("timers", timerId(user));
            if (!timer || timer.token !== raw.token) throw new WorkspaceError("Der Timer wurde bereits geändert. Bitte neu laden.", 409);
            if (raw.action === "stop") {
                const entry: TimeEntry = { ...timer, id: newId(), date: date(raw.date), minutes: duration(raw.minutes), invoice_id: "", created_at: Date.now() };
                await store.put("timeEntries", entry, false);
            }
            await store.remove(timer.id); return null;
        }
        if (raw.action === "delete") {
            const entry = await store.find<TimeEntry>("timeEntries", text(raw.id, 100, true));
            if (!entry) throw new WorkspaceError("Zeiteintrag nicht gefunden.", 404);
            if (entry.invoice_id) throw new WorkspaceError("Abgerechnete Zeiten können nicht gelöscht werden.", 409);
            await store.remove(entry.id); return null;
        }
        if (raw.action === "bill") return bill(store, raw);
        if (["link_expense", "add_expense", "unlink_expense"].includes(String(raw.action))) {
            const expenseId = raw.action === "add_expense" ? newId() : text(raw.expense_id, 100, true);
            if (raw.action !== "add_expense") await store.own("expenses", expenseId);
            const id = recordId(user, "expense:" + expenseId);
            const existing = await store.find<ExpenseLink>("expenseLinks", id);
            if (raw.action === "unlink_expense") { if (existing) await store.remove(id); return null; }
            const p = await project(store, raw.project_id);
            if (raw.action === "add_expense") {
                const gross = amount(raw.amount_gross, 1e9), vat = amount(raw.vat_rate, 100), net = roundMoney(gross / (1 + vat / 100));
                await store.db.createDocument(DB, "expenses", expenseId, { userId: user, date: date(raw.date), vendorName: text(raw.vendor_name, 200, true), description: text(raw.description, 1000), amountNet: net, vatRatePercent: vat, vatAmount: roundMoney(gross - net), amountGross: gross, category: "other", paymentMethod: "bank_transfer", status: "pending" }, [Permission.read(Role.user(user)), Permission.update(Role.user(user)), Permission.delete(Role.user(user))], store.transactionId);
            }
            await store.put("expenseLinks", { id, expense_id: expenseId, project_id: p.id } as ExpenseLink, !!existing);
            return { id: expenseId };
        }
        throw new WorkspaceError("Unbekannte Aktion.");
    });
}
async function bill(store: WorkspaceStore, raw: Record<string, unknown>) {
    const p = await project(store, raw.project_id);
    if (!p.client_id) throw new WorkspaceError("Bitte dem Projekt zuerst einen Kunden zuordnen.");
    const customer = await store.own("clients", p.client_id);
    if (!Array.isArray(raw.entry_ids) || !raw.entry_ids.length || raw.entry_ids.length > 40 || new Set(raw.entry_ids).size !== raw.entry_ids.length) throw new WorkspaceError("Bitte 1 bis 40 unterschiedliche Zeiten auswählen.");
    const entries: TimeEntry[] = [];
    for (const id of raw.entry_ids) {
        const entry = await store.find<TimeEntry>("timeEntries", text(id, 100, true));
        if (!entry || entry.project_id !== p.id || !entry.billable || entry.invoice_id) throw new WorkspaceError("Die Auswahl enthält bereits abgerechnete oder nicht abrechenbare Zeiten.", 409);
        entries.push(entry);
    }
    const issue = date(raw.issue_date), due = date(raw.due_date);
    if (due < issue) throw new WorkspaceError("Das Zahlungsziel liegt vor dem Rechnungsdatum.");
    const companies = await store.list("user_company"), company = companies[0];
    const tax = company?.isSmallBusiness ? 0 : amount(raw.tax_rate ?? 19, 100);
    const items = entries.map(e => ({ description: `${e.description} · ${e.date} · ${e.minutes} Min. à ${e.rate.toFixed(2)} €/Std.`, quantity: 1, price: roundMoney(e.minutes * e.rate / 60), tax_rate_percent: tax, discount_percent: 0 }));
    const totals = calculateInvoiceTotals(items), invoiceId = newId();
    const counterId = recordId(store.userId, "time-invoice-counter:" + issue.slice(0, 4));
    const counter = await store.find<{ id: string; value: number }>("counters", counterId);
    let next = (counter?.value || 0) + 1;
    const existing = await store.list("invoices");
    const number = () => `ZEIT-${issue.slice(0, 4)}-${String(next).padStart(4, "0")}`;
    while (existing.some(i => i.invoiceNumber === number())) next++;
    const invoiceNumber = number();
    await store.put("counters", { id: counterId, value: next } as { id: string; value: number }, !!counter);
    const identifiers = snapshotIdentifiers(readEInvoiceData(customer.eInvoiceData), readEInvoiceData(company?.eInvoiceData));
    const permissions = [Permission.read(Role.user(store.userId)), Permission.update(Role.user(store.userId)), Permission.delete(Role.user(store.userId))];
    await store.db.createDocument(DB, "invoices", invoiceId, { userId: store.userId, clientId: p.client_id, invoiceNumber, issueDate: issue, dueDate: due, subtotal: totals.netAfterDiscount, totalVat: totals.totalVAT, totalGross: totals.totalGross, status: "draft", notes: `Projekt: ${p.name}`, paymentTerms: company?.paymentTermsDefault || null, ...(Object.keys(identifiers).length ? { eInvoiceData: JSON.stringify(identifiers) } : {}) }, permissions, store.transactionId);
    for (const item of items) {
        const totals = calculateLineItemTotals(item.quantity, item.price, tax, 0);
        await store.db.createDocument(DB, "invoice_items", newId(), { invoiceId, productId: null, description: item.description, quantity: 1, unitOfMeasure: "Pauschal", price: item.price, taxRatePercent: tax, discountPercent: 0, subtotal: totals.subtotal, taxAmount: totals.taxAmount, total: totals.total }, permissions, store.transactionId);
    }
    for (const entry of entries) await store.put("timeEntries", { ...entry, invoice_id: invoiceId } as TimeEntry, true);
    const billing: TimeBilling = { id: billingId(store.userId, invoiceId), project_id: p.id, invoice_id: invoiceId, entry_ids: entries.map(e => e.id) };
    await store.put("billings", billing, false);
    return { id: invoiceId, invoice_number: invoiceNumber };
}

/** Called even when the module is disabled: deleting a linked draft releases its entries atomically. */
/** True when the invoice was generated from time entries (a billing record links them). */
export async function isTimeInvoice(db: Databases, user: string, invoiceId: string): Promise<boolean> {
    try { return !!await new WorkspaceStore(db, user).find("billings", billingId(user, invoiceId)); } catch (error) { if (missing(error)) return false; throw error; }
}

export async function deleteTimeInvoice(db: Databases, user: string, invoiceId: string): Promise<boolean> {
    const id = billingId(user, invoiceId), store = new WorkspaceStore(db, user);
    try { if (!await store.find("billings", id)) return false; } catch (error) { if (missing(error)) return false; throw error; }
    await atomic(db, user, async tx => {
        const invoice = await tx.own("invoices", invoiceId);
        if (invoice.status !== "draft") throw new WorkspaceError("Abgerechnete Zeiten können nur durch Löschen eines Rechnungsentwurfs freigegeben werden.", 409);
        const billing = await tx.find<TimeBilling>("billings", id);
        if (!billing) throw new WorkspaceError("Die Rechnung wurde bereits geändert.", 409);
        const items = await allDocuments(q => db.listDocuments(DB, "invoice_items", q, tx.transactionId), [Query.equal("invoiceId", invoiceId)]);
        if (items.length + billing.entry_ids.length + 2 > 95) throw new WorkspaceError("Dieser Entwurf enthält zu viele Positionen für eine atomare Löschung.", 409);
        for (const item of items) await db.deleteDocument(DB, "invoice_items", item.$id, tx.transactionId);
        for (const entryId of billing.entry_ids) {
            const entry = await tx.find<TimeEntry>("timeEntries", entryId);
            if (!entry || entry.invoice_id !== invoiceId) throw new WorkspaceError("Die Zeitverknüpfung wurde geändert.", 409);
            await tx.put("timeEntries", { ...entry, invoice_id: "" } as TimeEntry, true);
        }
        await db.deleteDocument(DB, "invoices", invoiceId, tx.transactionId);
        await tx.remove(id);
    });
    return true;
}
