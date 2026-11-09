"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Space } from "antd";
import { useLanguage } from "@/contexts/LanguageContext";
import { get, post } from "@/lib/termine/client";

interface Health {
    mailConfigured: boolean;
    retryAuthConfigured: boolean;
    pending: number;
    failed: number;
    published: boolean;
    hasServices: boolean;
    hasHours: boolean;
}

export default function BookingHealth() {
    const { language } = useLanguage();
    const l = (de: string, en: string) => (language === "de" ? de : en);
    const [health, setHealth] = useState<Health | null>(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const load = useCallback(async () => {
        setBusy(true);
        try {
            setHealth(await get<Health>("/api/termine/health"));
            setError("");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Status unavailable");
        } finally {
            setBusy(false);
        }
    }, []);
    useEffect(() => {
        void load();
    }, [load]);
    async function retry() {
        setBusy(true);
        try {
            await post("/api/termine/health", {});
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Retry failed");
        } finally {
            setBusy(false);
        }
    }
    const issues: string[] = [];
    if (health) {
        if (!health.hasServices)
            issues.push(
                l(
                    "Noch keine öffentlich buchbare Leistung. Nutzen Sie „Buchbare Leistungen“ oben.",
                    "No public service yet. Open Bookable services above.",
                ),
            );
        if (!health.hasHours)
            issues.push(
                l(
                    "Noch keine Arbeitszeiten hinterlegt. Nutzen Sie „Arbeitszeiten & Sperrzeiten“ oben.",
                    "No working hours yet. Open Working hours & blocks above.",
                ),
            );
        if (!health.published)
            issues.push(
                l(
                    "Ihre Buchungsseite ist derzeit nicht veröffentlicht.",
                    "Your booking page is currently unpublished.",
                ),
            );
        if (!health.mailConfigured)
            issues.push(
                l(
                    "E-Mail-Versand ist nicht eingerichtet. Buchungen werden gespeichert; Kunden müssen ihren privaten Verwaltungslink sichern. Bitte wenden Sie sich zur Einrichtung an den Betreiber.",
                    "Email delivery is not configured. Bookings are saved; customers must keep their private management link. Contact the operator to configure delivery.",
                ),
            );
        if (!health.retryAuthConfigured)
            issues.push(
                l(
                    "Automatischer erneuter Versand ist noch nicht eingerichtet. Bitte wenden Sie sich an den Betreiber.",
                    "Automatic email retries are not configured yet. Contact the operator.",
                ),
            );
        if (health.failed)
            issues.push(
                l(
                    `${health.failed} Benachrichtigungen konnten nach mehreren Versuchen nicht versendet werden. Bitte zuerst die Serverkonfiguration prüfen.`,
                    `${health.failed} notifications failed after multiple attempts. Check the server configuration before retrying.`,
                ),
            );
    }
    return (
        <Alert
            style={{ marginBottom: 16 }}
            showIcon
            type={error || issues.length ? "warning" : "info"}
            title={l("Buchungsseite & Benachrichtigungen", "Booking page & notifications")}
            description={
                <Space orientation="vertical" style={{ width: "100%" }}>
                    {error && <span role="alert">{error}</span>}
                    {issues.map((issue) => (
                        <div key={issue}>{issue}</div>
                    ))}
                    {health && (
                        <div>
                            {l(
                                `${health.pending} Benachrichtigungen warten auf Versand oder erneuten Versuch.`,
                                `${health.pending} notifications awaiting delivery or retry.`,
                            )}
                        </div>
                    )}
                    <Space wrap>
                        <Button size="small" loading={busy} onClick={() => void load()}>
                            {l("Status aktualisieren", "Refresh status")}
                        </Button>
                        {!!health?.failed && (
                            <Button
                                size="small"
                                disabled={!health.mailConfigured || !health.retryAuthConfigured}
                                loading={busy}
                                onClick={() => void retry()}
                            >
                                {l(
                                    "Fehlgeschlagene erneut vormerken (max. 20)",
                                    "Requeue failed notifications (up to 20)",
                                )}
                            </Button>
                        )}
                    </Space>
                </Space>
            }
        />
    );
}
