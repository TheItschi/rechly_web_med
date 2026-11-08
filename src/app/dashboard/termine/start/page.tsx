"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Form, Input, InputNumber, Steps, TimePicker, message } from "antd";
import dayjs from "dayjs";
import { get, post } from "@/lib/termine/client";

export default function TermineStartPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [slug, setSlug] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [checking, setChecking] = useState(false);
    const [serviceName, setServiceName] = useState("");
    const [duration, setDuration] = useState<number | null>(30);
    const [price, setPrice] = useState<number | null>(25);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function checkSlug(value: string) {
        setSlug(value);
        if (value.trim().length < 3) return;
        setChecking(true);
        try {
            const r = await get<{ available: boolean; reason?: string }>(`/api/termine/slug?slug=${encodeURIComponent(value)}`);
            if (!r.available) setError(`Name nicht verfügbar (${r.reason}).`);
            else setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Prüfung fehlgeschlagen.");
        } finally {
            setChecking(false);
        }
    }

    async function activate() {
        setBusy(true);
        setError(null);
        try {
            await post("/api/termine/slug", { slug, displayName });
            let staffIds: string[] = [];
            try {
                const st = await post<{ staff: { $id: string } }>("/api/termine/staff", {
                    name: displayName,
                    active: true,
                    bookable: true,
                    serviceIds: [],
                });
                staffIds = [st.staff.$id];
            } catch {
                // Staff ist optional; Buchung funktioniert, sobald Personal angelegt ist.
            }
            if (serviceName.trim() && duration) {
                await post("/api/termine/services", {
                    name: serviceName.trim(),
                    durationMinutes: duration,
                    priceCents: Math.round((price ?? 0) * 100),
                    currency: "EUR",
                    staffIds,
                });
            }
            // Default hours Mon–Fri 09:00–18:00.
            for (const d of ["1", "2", "3", "4", "5"]) {
                await post("/api/termine/hours", {
                    kind: "week", day: d, closed: false,
                    periods: [{ start: "09:00", end: "18:00" }], breaks: [],
                });
            }
            message.success("Termine aktiviert.");
            router.push("/dashboard/termine/einstellungen");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Aktivierung fehlgeschlagen.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="dashboard-page" style={{ maxWidth: 720 }}>
            <section className="dashboard-welcome">
                <div>
                    <div className="dashboard-eyebrow">Termine · Einrichtung</div>
                    <h1>Online-Buchung aktivieren</h1>
                    <p>In wenigen Schritten ist Ihre Buchungsseite bereit.</p>
                </div>
            </section>
            {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
            <Steps current={step} style={{ marginBottom: 24 }} items={[{ title: "Name" }, { title: "Leistung" }, { title: "Fertig" }]} />
            {step === 0 && (
                <Card className="dashboard-panel">
                    <Form layout="vertical">
                        <Form.Item label="Wunsch-Adresse">
                            <Input
                                addonBefore="https://"
                                addonAfter=".rechly.de"
                                value={slug}
                                onChange={(e) => void checkSlug(e.target.value)}
                                placeholder="mariasalon"
                                status={error ? "error" : undefined}
                            />
                        </Form.Item>
                        <Form.Item label="Firmenname (wird öffentlich angezeigt)">
                            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Marias Salon" />
                        </Form.Item>
                        <Button type="primary" disabled={!slug || !displayName.trim() || !!error} loading={checking} onClick={() => setStep(1)}>
                            Weiter
                        </Button>
                    </Form>
                </Card>
            )}
            {step === 1 && (
                <Card className="dashboard-panel">
                    <Form layout="vertical">
                        <Form.Item label="Erste Leistung">
                            <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="z. B. Haarschnitt" />
                        </Form.Item>
                        <Form.Item label="Dauer (Minuten)">
                            <InputNumber min={5} max={480} value={duration} onChange={setDuration} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item label="Preis (€)">
                            <InputNumber min={0} precision={2} value={price} onChange={setPrice} style={{ width: "100%" }} />
                        </Form.Item>
                        <div style={{ display: "flex", gap: 8 }}>
                            <Button onClick={() => setStep(0)}>Zurück</Button>
                            <Button type="primary" onClick={() => setStep(2)}>Weiter</Button>
                        </div>
                    </Form>
                </Card>
            )}
            {step === 2 && (
                <Card className="dashboard-panel">
                    <p>Arbeitszeiten sind mit Mo–Fr 09:00–18:00 vorbelegt und können später unter „Verfügbarkeit“ angepasst werden.</p>
                    <Form layout="vertical">
                        <Form.Item label="Täglicher Start">
                            <TimePicker format="HH:mm" defaultValue={dayjs("09:00", "HH:mm")} disabled style={{ width: "100%" }} />
                        </Form.Item>
                        <div style={{ display: "flex", gap: 8 }}>
                            <Button onClick={() => setStep(1)}>Zurück</Button>
                            <Button type="primary" loading={busy} onClick={() => void activate()}>
                                Jetzt aktivieren
                            </Button>
                        </div>
                    </Form>
                </Card>
            )}
            <p style={{ marginTop: 16, color: "var(--dash-muted)", fontSize: 12 }}>
                Hinweis: Standard-Zeitzone Europe/Berlin, 30-Minuten-Raster, 60 Minuten Vorlauf. Details lassen sich später ändern.
            </p>
        </div>
    );
}
