"use client";

import { useEffect, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Select, Switch, message } from "antd";
import { get, patch } from "@/lib/termine/client";

interface Settings {
    slug: string; displayName: string; description?: string; timezone: string; language: string;
    slotIntervalMinutes: number; minNoticeMinutes: number; maxHorizonDays: number;
    cancelNoticeMinutes: number; rescheduleNoticeMinutes: number; confirmationMode: string;
    allowAnyStaff: boolean; showPrices: boolean; currency: string;
    contactEmail?: string; contactPhone?: string; address?: string; website?: string;
    enabled: boolean; published: boolean;
}

export default function TermineSettingsPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [form] = Form.useForm();

    useEffect(() => {
        (async () => {
            try {
                const s = await get<{ settings: Settings | null }>("/api/termine/settings");
                if (!s.settings) {
                    window.location.href = "/dashboard/termine/start";
                    return;
                }
                setSettings(s.settings);
                form.setFieldsValue(s.settings);
            } catch (e) {
                message.error(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
            } finally {
                setLoading(false);
            }
        })();
    }, [form]);

    async function save() {
        try {
            const v = await form.validateFields();
            const updated = await patch<{ settings: Settings }>("/api/termine/settings", v);
            setSettings(updated.settings);
            message.success("Gespeichert.");
        } catch (e) {
            message.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
        }
    }

    if (loading) return <Card loading />;
    if (!settings) return null;
    const publicUrl = `https://${settings.slug}.rechly.de`;

    return (
        <div className="dashboard-page" style={{ maxWidth: 760 }}>
            <section className="dashboard-welcome">
                <div>
                    <div className="dashboard-eyebrow">Termine · Einstellungen</div>
                    <h1>Buchungsseite</h1>
                    <p>Öffentlich: <a href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a></p>
                </div>
                <Button type="primary" onClick={() => void save()}>Speichern</Button>
            </section>
            <Card className="dashboard-panel">
                <Form form={form} layout="vertical" initialValues={settings}>
                    <Form.Item label="Anzeigename" name="displayName" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="Beschreibung" name="description">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Form.Item label="Zeitzone" name="timezone">
                            <Select options={["Europe/Berlin", "Europe/Vienna", "Europe/Zurich"].map((z) => ({ value: z, label: z }))} />
                        </Form.Item>
                        <Form.Item label="Sprache" name="language">
                            <Select options={[{ value: "de", label: "Deutsch" }, { value: "en", label: "English" }]} />
                        </Form.Item>
                        <Form.Item label="Zeitraster (Minuten)" name="slotIntervalMinutes">
                            <Select options={[{ value: 15, label: "15" }, { value: 30, label: "30" }]} />
                        </Form.Item>
                        <Form.Item label="Mindestvorlauf (Minuten)" name="minNoticeMinutes">
                            <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item label="Buchungshorizont (Tage)" name="maxHorizonDays">
                            <InputNumber min={1} max={365} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item label="Währung" name="currency">
                            <Select options={["EUR", "CHF"].map((c) => ({ value: c, label: c }))} />
                        </Form.Item>
                        <Form.Item label="Stornofrist (Minuten)" name="cancelNoticeMinutes">
                            <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item label="Umbuchungsfrist (Minuten)" name="rescheduleNoticeMinutes">
                            <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                    </div>
                    <Form.Item label="Bestätigungsmodus" name="confirmationMode">
                        <Select options={[{ value: "automatic", label: "Automatisch bestätigen" }, { value: "manual", label: "Manuell prüfen" }]} />
                    </Form.Item>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Form.Item label="Kontakt-E-Mail" name="contactEmail"><Input /></Form.Item>
                        <Form.Item label="Telefon" name="contactPhone"><Input /></Form.Item>
                    </div>
                    <Form.Item label="Adresse" name="address"><Input /></Form.Item>
                    <Form.Item label="Website" name="website"><Input /></Form.Item>
                    <Form.Item label="Aktiviert (Buchungen möglich)" name="enabled" valuePropName="checked"><Switch /></Form.Item>
                    <Form.Item label="Öffentlich (Seite sichtbar)" name="published" valuePropName="checked"><Switch /></Form.Item>
                    <Form.Item label="Beliebiger Mitarbeiter wählbar" name="allowAnyStaff" valuePropName="checked"><Switch /></Form.Item>
                    <Form.Item label="Preise öffentlich" name="showPrices" valuePropName="checked"><Switch /></Form.Item>
                    <Button type="primary" onClick={() => void save()}>Speichern</Button>
                </Form>
            </Card>
            <p style={{ marginTop: 12, fontSize: 12, color: "var(--dash-muted)" }}>
                Deaktivieren pausiert neue Buchungen; Verlauf, Kunden und Rechnungen bleiben erhalten.
            </p>
        </div>
    );
}
