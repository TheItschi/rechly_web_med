"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, notification } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import type { RunningTimer } from "@/lib/workspace/work-types";
import type { CalendarSnapshot } from "./CalendarWorkspace";
import { addDays, localDay, useWords } from "./common";
export default function WorkspaceActivity() {
    const { user } = useAuth(), { l } = useWords();
    const [timer, setTimer] = useState<RunningTimer | null>(null), [now, setNow] = useState(() => Date.now());
    const [notify, holder] = notification.useNotification();
    useEffect(() => {
        if (process.env.NEXT_PUBLIC_RECHLY_WORKSPACE_ENABLED !== "1" || !user?.$id) return;
        let active = true, running = false;
        const userId = user.$id;
        async function poll() {
            if (!active || running || (document.hidden && localStorage.getItem(`rechly-reminders:${userId}`) !== "1")) return; running = true;
            try {
                const response = await fetch("/api/workspace/work?timer=1", { cache: "no-store" });
                if (response.ok && active) setTimer((await response.json()).timer);
                if (localStorage.getItem(`rechly-reminders:${userId}`) !== "1") return;
                const day = localDay(), response2 = await fetch(`/api/workspace/calendar?from=${day}T00:00&to=${addDays(day,2)}T00:00`, { cache: "no-store" });
                if (!response2.ok || !active) return;
                const data: CalendarSnapshot = await response2.json();
                const deliver = async () => {
                    const key = `rechly-reminded:${userId}`;
                    let seen: string[] = []; try { const parsed = JSON.parse(localStorage.getItem(key) || "[]"); if (Array.isArray(parsed)) seen = parsed.filter(v => typeof v === "string"); } catch { /* Reset corrupt local preferences. */ }
                    for (const event of data.items) {
                        const at = new Date(event.occurrenceStart).getTime() - event.reminder * 60000;
                        const id = `${event.id}:${event.occurrenceStart}:${event.reminder}`;
                        if (event.reminder < 0 || Date.now() < at || Date.now() - at >= 60000 || seen.includes(id)) continue;
                        seen.push(id); localStorage.setItem(key, JSON.stringify(seen.slice(-500)));
                        notify.info({ title: event.title, description: `${event.occurrenceStart.replace("T", " · ")} ${event.location}`, duration: 12 });
                        if ("Notification" in window && Notification.permission === "granted") {
                            try { const message = new Notification(event.title, { body: event.location, tag: id }); message.onclick = () => { window.focus(); message.close(); }; } catch { /* In-app reminder remains available. */ }
                        }
                    }
                };
                if (navigator.locks) await navigator.locks.request("rechly-reminders:" + userId, deliver); else await deliver();
            } catch { /* Optional activity must not interrupt invoicing; full screens expose errors. */ }
            finally { running = false; }
        }
        void poll(); const interval = setInterval(poll, 30000), tick = setInterval(() => setNow(Date.now()), 1000);
        window.addEventListener("rechly-workspace-change", poll); window.addEventListener("storage", poll); document.addEventListener("visibilitychange", poll);
        return () => { active = false; clearInterval(interval); clearInterval(tick); window.removeEventListener("rechly-workspace-change", poll); window.removeEventListener("storage", poll); document.removeEventListener("visibilitychange", poll); };
    }, [user?.$id, notify]);
    if (process.env.NEXT_PUBLIC_RECHLY_WORKSPACE_ENABLED !== "1") return null;
    return <>{holder}{timer && <Alert type="info" showIcon title={<Link href="/dashboard/workspace/time">{l("Timer läuft", "Timer running")}: {timer.description} · {Math.max(0, Math.floor((now - timer.started_at)/60000))} min →</Link>} style={{ marginBottom: 16 }} />}</>;
}
