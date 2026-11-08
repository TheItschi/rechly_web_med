"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Alert, Button, Space, Typography } from "antd";
import { useLanguage } from "@/contexts/LanguageContext";
export function useWords() { const { language } = useLanguage(); return { language, l: (de: string, en: string) => language === "de" ? de : en }; }
export function localDay(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
export function addDays(day: string, count: number) { const date = new Date(day + "T12:00:00"); date.setDate(date.getDate() + count); return localDay(date); }
export const money = (value: number, language = "de") => new Intl.NumberFormat(language === "de" ? "de-DE" : "en-GB", { style: "currency", currency: "EUR" }).format(value);
export function download(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function useResource<T>(url: string) {
    const [data, setData] = useState<T>(); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
    const generation = useRef(0);
    const load = useCallback(async () => {
        const current = ++generation.current;
        setLoading(true);
        try { const response = await fetch(url, { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Unable to load workspace"); if (current === generation.current) { setData(body); setError(""); } }
        catch (error) { if (current === generation.current) setError((error as Error).message); } finally { if (current === generation.current) setLoading(false); }
    }, [url]);
    useEffect(() => { void load(); }, [load]);
    async function mutate(body: object) {
        setBusy(true);
        try {
            const response = await fetch(url.split("?")[0], { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to save");
            await load(); window.dispatchEvent(new Event("rechly-workspace-change")); return result.result;
        } finally { setBusy(false); }
    }
    return { data, error, setError, loading, busy, load, mutate };
}
export function WorkspaceLinks() {
    const { l } = useWords();
    return <Space wrap style={{ marginBottom: 20 }}>
        <Link href="/dashboard/workspace/overview">{l("Übersicht", "Overview")}</Link>
        <Link href="/dashboard/workspace">{l("Projekte, Aufgaben & Dokumente", "Projects, tasks & documents")}</Link>
        <Link href="/dashboard/workspace/time">{l("Zeiten & Abrechnung", "Time & billing")}</Link>
        <Link href="/dashboard/workspace/reports">{l("Projektcontrolling", "Project reports")}</Link>
        <Link href="/dashboard/workspace/calendar">{l("Kalender", "Calendar")}</Link>
    </Space>;
}
export function WorkspaceFrame({ title, description, error, retry, children }: { title: string; description: string; error?: string; retry: () => void; children: React.ReactNode }) {
    const { l } = useWords();
    return <div style={{ maxWidth: 1280, margin: "0 auto" }}><WorkspaceLinks /><Typography.Title level={2}>{title}</Typography.Title><Typography.Paragraph type="secondary">{description}</Typography.Paragraph>{error && <Alert type="error" showIcon title={error} action={<Button onClick={retry}>{l("Erneut versuchen", "Retry")}</Button>} style={{ marginBottom: 16 }} />}{children}</div>;
}
