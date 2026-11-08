import type { BusinessProject } from "./domain";
export interface TimeEntry { id: string; project_id: string; date: string; description: string; minutes: number; rate: number; cost_rate: number; billable: boolean; invoice_id: string; created_at: number }
export interface RunningTimer { id: string; token: string; project_id: string; description: string; rate: number; cost_rate: number; billable: boolean; started_at: number }
export interface ExpenseLink { id: string; project_id: string; expense_id: string }
export interface TimeBilling { id: string; project_id: string; invoice_id: string; entry_ids: string[] }
export interface WorkInvoice { id: string; invoice_number: string; project_id: string; status: string; subtotal: number; due_date: string }
export interface WorkExpense { id: string; project_id: string; date: string; vendor_name: string; description: string; amount_net: number; amount_gross: number }
export interface ProjectReport { project: BusinessProject; minutes: number; value: number; unbilled: number; labor: number; costs: number; invoiced: number; paid: number; contribution: number; budgetRemaining: number }
export interface WorkSnapshot { projects: BusinessProject[]; entries: TimeEntry[]; timer: RunningTimer | null; invoices: WorkInvoice[]; expenses: WorkExpense[]; reports: ProjectReport[]; smallBusiness: boolean }
export const roundMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function projectReports(data: Omit<WorkSnapshot, "reports">): ProjectReport[] {
    return data.projects.map(project => {
        const time = data.entries.filter(e => e.project_id === project.id);
        const expenses = data.expenses.filter(e => e.project_id === project.id);
        const invoices = data.invoices.filter(e => e.project_id === project.id);
        const sum = (items: number[]) => roundMoney(items.reduce((total, value) => total + value, 0));
        const value = sum(time.filter(e => e.billable).map(e => roundMoney(e.minutes * e.rate / 60)));
        const labor = sum(time.map(e => roundMoney(e.minutes * e.cost_rate / 60)));
        const costs = sum(expenses.map(e => data.smallBusiness ? e.amount_gross : e.amount_net));
        return { project, minutes: time.reduce((total,e) => total + e.minutes, 0), value, labor, costs,
            unbilled: sum(time.filter(e => e.billable && !e.invoice_id).map(e => roundMoney(e.minutes * e.rate / 60))),
            invoiced: sum(invoices.filter(i => !["draft", "cancelled"].includes(i.status)).map(i => i.subtotal)),
            paid: sum(invoices.filter(i => i.status === "paid").map(i => i.subtotal)),
            contribution: roundMoney(value - labor - costs), budgetRemaining: roundMoney(project.budget - labor - costs) };
    });
}
export function timeCsv(data: WorkSnapshot): string {
    const cell = (value: unknown) => { let s = String(value ?? ""); if (/^\s*[=+@-]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    return "\ufeff" + [["Datum", "Projekt", "Tätigkeit", "Minuten", "Stundensatz EUR", "Abrechenbar", "Rechnungsnummer"], ...data.entries.map(e => [e.date, data.projects.find(p => p.id === e.project_id)?.name || "", e.description, e.minutes, e.rate.toFixed(2).replace(".", ","), e.billable ? "Ja" : "Nein", data.invoices.find(i => i.id === e.invoice_id)?.invoice_number || ""])].map(row => row.map(cell).join(";")).join("\r\n");
}
