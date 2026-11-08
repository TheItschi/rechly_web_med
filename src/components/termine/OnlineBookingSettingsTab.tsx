"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    Alert,
    Button,
    Card,
    Col,
    Divider,
    Form,
    Input,
    InputNumber,
    Row,
    Select,
    Space,
    Switch,
    Tag,
    Typography,
    message,
} from "antd";
import {
    CalendarOutlined,
    CheckCircleOutlined,
    CopyOutlined,
    LinkOutlined,
    SaveOutlined,
} from "@ant-design/icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { get, patch, post } from "@/lib/termine/client";
import { normalizeSlug } from "@/lib/termine/slug";

interface BookingSettings {
    slug: string;
    displayName: string;
    description?: string;
    timezone: string;
    language: string;
    slotIntervalMinutes: number;
    minNoticeMinutes: number;
    maxHorizonDays: number;
    cancelNoticeMinutes: number;
    rescheduleNoticeMinutes: number;
    confirmationMode: string;
    allowAnyStaff: boolean;
    showPrices: boolean;
    currency: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    website?: string;
    enabled: boolean;
    published: boolean;
}

interface CompanyDefaults {
    displayName?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    website?: string;
}

export default function OnlineBookingSettingsTab() {
    const { language } = useLanguage();
    const l = (de: string, en: string) => (language === "de" ? de : en);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [claiming, setClaiming] = useState(false);
    const [settings, setSettings] = useState<BookingSettings | null>(null);
    const [defaults, setDefaults] = useState<CompanyDefaults>({});
    const [slugInput, setSlugInput] = useState("");
    const [setupName, setSetupName] = useState("");
    const [slugCheck, setSlugCheck] = useState<{
        checking: boolean;
        available?: boolean;
        reason?: string;
    }>({ checking: false });
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await get<{ settings: BookingSettings | null; companyDefaults?: CompanyDefaults }>(
                "/api/termine/settings",
            );
            const cd = res.companyDefaults || {};
            setDefaults(cd);
            if (res.settings) {
                setSettings(res.settings);
                setSlugInput(res.settings.slug);
                form.setFieldsValue({
                    ...res.settings,
                    displayName: res.settings.displayName || cd.displayName || "",
                });
            } else {
                setSettings(null);
                const suggested = cd.displayName || "";
                setSetupName(suggested);
                if (suggested) {
                    setSlugInput(normalizeSlug(suggested));
                }
            }
        } catch (e) {
            message.error(
                e instanceof Error
                    ? e.message
                    : l("Online-Buchungseinstellungen konnten nicht geladen werden.", "Could not load booking settings."),
            );
        } finally {
            setLoading(false);
        }
    }, [form, language]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        void load();
    }, [load]);

    async function verifySlug(candidate: string) {
        const norm = normalizeSlug(candidate);
        setSlugInput(norm);
        if (!norm) {
            setSlugCheck({ checking: false });
            return;
        }
        setSlugCheck({ checking: true });
        try {
            const res = await get<{ available: boolean; reason?: string }>(
                `/api/termine/slug?slug=${encodeURIComponent(norm)}`,
            );
            setSlugCheck({ checking: false, available: res.available, reason: res.reason });
        } catch {
            setSlugCheck({ checking: false });
        }
    }

    async function handleClaimOrUpdateSlug() {
        const norm = normalizeSlug(slugInput);
        if (!norm) {
            message.warning(l("Bitte eine gültige Buchungs-URL eingeben.", "Please enter a valid booking slug."));
            return;
        }
        setClaiming(true);
        try {
            await post("/api/termine/slug", {
                slug: norm,
                displayName: settings ? form.getFieldValue("displayName") : setupName || defaults.displayName,
            });
            message.success(
                settings
                    ? l("Buchungs-URL aktualisiert.", "Booking URL updated.")
                    : l("Online-Buchung aktiviert!", "Online booking activated!"),
            );
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : l("Konnte URL nicht reservieren.", "Could not reserve slug."));
        } finally {
            setClaiming(false);
        }
    }

    async function handleSave(values: Record<string, unknown>) {
        setSaving(true);
        try {
            await patch("/api/termine/settings", values);
            message.success(l("Online-Buchung gespeichert.", "Online booking settings saved."));
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : l("Speichern fehlgeschlagen.", "Save failed."));
        } finally {
            setSaving(false);
        }
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicPath = settings ? `/buchen/${settings.slug}` : `/buchen/${slugInput || "ihr-name"}`;
    const fullPublicUrl = origin ? `${origin}${publicPath}` : publicPath;

    if (!loading && !settings) {
        return (
            <Card loading={loading}>
                <Space orientation="vertical" size="middle" style={{ width: "100%", maxWidth: 640 }}>
                    <Typography.Title level={5} style={{ margin: 0 }}>
                        <CalendarOutlined /> {l("Online-Terminbuchung aktivieren", "Enable online appointment booking")}
                    </Typography.Title>
                    <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                        {l(
                            "Lassen Sie Kunden online Termine buchen. Ihre Firmendaten (Name, Adresse, Kontakt) werden automatisch aus dem Reiter „Firma“ übernommen — keine doppelte Pflege nötig.",
                            "Let clients book appointments online. Your company details (name, address, contact) are automatically inherited from your Company tab — no duplicate entry needed.",
                        )}
                    </Typography.Paragraph>

                    {defaults.displayName && (
                        <Alert
                            type="success"
                            showIcon
                            title={l(
                                `Verbunden mit Ihrem Firmenprofil: ${defaults.displayName}`,
                                `Connected to your company profile: ${defaults.displayName}`,
                            )}
                        />
                    )}

                    <div>
                        <Typography.Text strong>
                            {l("Öffentlicher Anzeigename", "Public business name")}
                        </Typography.Text>
                        <Input
                            style={{ marginTop: 6 }}
                            value={setupName}
                            onChange={(e) => {
                                setSetupName(e.target.value);
                                if (!slugInput) setSlugInput(normalizeSlug(e.target.value));
                            }}
                            placeholder={defaults.displayName || l("Ihr Unternehmen", "Your business name")}
                        />
                    </div>

                    <div>
                        <Typography.Text strong>{l("Ihre Buchungs-URL", "Your booking URL")}</Typography.Text>
                        <Space.Compact style={{ width: "100%", marginTop: 6 }}>
                            <Input
                                value={slugInput}
                                onChange={(e) => setSlugInput(normalizeSlug(e.target.value))}
                                onBlur={() => void verifySlug(slugInput)}
                                placeholder="muster-studio"
                            />
                            <Button onClick={() => void verifySlug(slugInput)} loading={slugCheck.checking}>
                                {l("Prüfen", "Check")}
                            </Button>
                        </Space.Compact>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {l("Vorschau:", "Preview:")} <code>{publicPath}</code>{" "}
                            {l("sowie", "and")} <code>{slugInput || "ihr-name"}.rechly.de</code>
                        </Typography.Text>
                        {slugCheck.available === true && (
                            <div style={{ marginTop: 4 }}>
                                <Tag color="success">{l("Verfügbar", "Available")}</Tag>
                            </div>
                        )}
                        {slugCheck.available === false && (
                            <div style={{ marginTop: 4 }}>
                                <Tag color="error">
                                    {l("Nicht verfügbar", "Unavailable")}
                                    {slugCheck.reason ? ` (${slugCheck.reason})` : ""}
                                </Tag>
                            </div>
                        )}
                    </div>

                    <Button
                        type="primary"
                        size="large"
                        icon={<CheckCircleOutlined />}
                        loading={claiming}
                        onClick={() => void handleClaimOrUpdateSlug()}
                    >
                        {l("Online-Buchung jetzt aktivieren", "Activate online booking")}
                    </Button>
                </Space>
            </Card>
        );
    }

    return (
        <Card loading={loading}>
            <Space wrap style={{ justifyContent: "space-between", width: "100%", marginBottom: 16 }}>
                <div>
                    <Typography.Title level={5} style={{ margin: 0 }}>
                        {l("Online-Buchung & Terminregeln", "Online booking & scheduling rules")}
                    </Typography.Title>
                    <Typography.Text type="secondary">
                        {l(
                            "Öffentliche Buchungsseite, Zeitraster und Fristen zentral verwalten.",
                            "Manage your public booking page, slot intervals and notice policies.",
                        )}
                    </Typography.Text>
                </div>
                <Space wrap>
                    <Link href="/dashboard/products?tab=services">
                        <Button>{l("Buchbare Leistungen", "Bookable services")}</Button>
                    </Link>
                    <Link href="/dashboard/termine/buchungen?tab=availability">
                        <Button>{l("Arbeitszeiten & Sperrzeiten", "Working hours & blocks")}</Button>
                    </Link>
                    <Link href="/dashboard/termine/buchungen?tab=staff">
                        <Button>{l("Mitarbeiter", "Staff")}</Button>
                    </Link>
                </Space>
            </Space>

            {settings && (
                <Card size="small" style={{ marginBottom: 16 }}>
                    <Row gutter={[12, 12]} align="middle">
                        <Col xs={24} md={14}>
                            <Typography.Text strong>{l("Buchungs-Link:", "Booking link:")}</Typography.Text>{" "}
                            <a href={publicPath} target="_blank" rel="noreferrer">
                                {fullPublicUrl} <LinkOutlined />
                            </a>
                            <Button
                                size="small"
                                type="text"
                                icon={<CopyOutlined />}
                                onClick={() => {
                                    void navigator.clipboard?.writeText(fullPublicUrl);
                                    message.success(l("Link kopiert.", "Link copied."));
                                }}
                            />
                        </Col>
                        <Col xs={24} md={10}>
                            <Space.Compact style={{ width: "100%" }}>
                                <Input
                                    value={slugInput}
                                    onChange={(e) => setSlugInput(normalizeSlug(e.target.value))}
                                    placeholder="slug"
                                />
                                <Button
                                    loading={claiming}
                                    disabled={!slugInput || slugInput === settings.slug}
                                    onClick={() => void handleClaimOrUpdateSlug()}
                                >
                                    {l("URL ändern", "Change URL")}
                                </Button>
                            </Space.Compact>
                        </Col>
                    </Row>
                </Card>
            )}

            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                title={l(
                    "Automatische Synchronisation mit Ihrem Firmenprofil",
                    "Automatic sync with your Company profile",
                )}
                description={l(
                    "Name, E-Mail, Telefon, Adresse und Website werden automatisch aus dem Reiter „Firma“ übernommen. Nur wenn Sie auf der Buchungsseite abweichende Angaben zeigen möchten, tragen Sie diese unten optional ein.",
                    "Name, email, phone, address and website are automatically inherited from your Company tab. Only fill the optional fields below if you want public overrides.",
                )}
            />

            <Form form={form} layout="vertical" onFinish={handleSave} style={{ maxWidth: 760 }}>
                <Row gutter={24}>
                    <Col xs={24} sm={12}>
                        <Form.Item
                            name="enabled"
                            label={l("Terminmodul aktiv", "Scheduling active")}
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item
                            name="published"
                            label={l("Öffentliche Buchungsseite sichtbar", "Public booking page live")}
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider titlePlacement="left">{l("Buchungsregeln", "Booking rules")}</Divider>
                <Row gutter={16}>
                    <Col xs={24} sm={8}>
                        <Form.Item name="timezone" label={l("Zeitzone", "Time zone")}>
                            <Input placeholder="Europe/Berlin" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Form.Item name="slotIntervalMinutes" label={l("Zeitraster", "Slot interval")}>
                            <Select
                                options={[
                                    { value: 15, label: "15 min" },
                                    { value: 30, label: "30 min" },
                                ]}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Form.Item name="confirmationMode" label={l("Bestätigung", "Confirmation")}>
                            <Select
                                options={[
                                    { value: "automatic", label: l("Sofort bestätigt", "Automatic") },
                                    { value: "manual", label: l("Manuell bestätigen", "Manual approval") },
                                ]}
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col xs={12} sm={6}>
                        <Form.Item name="minNoticeMinutes" label={l("Vorlauf (Min.)", "Lead time (min)")}>
                            <InputNumber min={0} max={43200} style={{ width: "100%" }} />
                        </Form.Item>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Form.Item name="maxHorizonDays" label={l("Horizont (Tage)", "Max horizon (days)")}>
                            <InputNumber min={1} max={365} style={{ width: "100%" }} />
                        </Form.Item>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Form.Item name="cancelNoticeMinutes" label={l("Stornofrist (Min.)", "Cancel notice (min)")}>
                            <InputNumber min={0} max={43200} style={{ width: "100%" }} />
                        </Form.Item>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Form.Item
                            name="rescheduleNoticeMinutes"
                            label={l("Umbuchung (Min.)", "Reschedule notice (min)")}
                        >
                            <InputNumber min={0} max={43200} style={{ width: "100%" }} />
                        </Form.Item>
                    </Col>
                </Row>

                <Space size="large" wrap>
                    <Form.Item
                        name="allowAnyStaff"
                        label={l("„Beliebiger Mitarbeiter“ erlauben", "Allow 'Any staff' option")}
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>
                    <Form.Item
                        name="showPrices"
                        label={l("Preise öffentlich anzeigen", "Show prices publicly")}
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>
                </Space>

                <Divider titlePlacement="left">
                    {l("Optionale Abweichungen vom Firmenprofil", "Optional overrides from Company profile")}
                </Divider>
                <Form.Item name="displayName" label={l("Öffentlicher Anzeigename", "Public display name")}>
                    <Input placeholder={defaults.displayName || ""} />
                </Form.Item>
                <Form.Item name="description" label={l("Kurzbeschreibung auf der Buchungsseite", "Public description")}>
                    <Input.TextArea rows={2} />
                </Form.Item>
                <Row gutter={16}>
                    <Col xs={24} sm={12}>
                        <Form.Item name="contactEmail" label={l("Öffentliche E-Mail (optional)", "Public email (optional)")}>
                            <Input placeholder={defaults.contactEmail || ""} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="contactPhone" label={l("Öffentliches Telefon (optional)", "Public phone (optional)")}>
                            <Input placeholder={defaults.contactPhone || ""} />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col xs={24} sm={12}>
                        <Form.Item name="address" label={l("Öffentliche Adresse (optional)", "Public address (optional)")}>
                            <Input placeholder={defaults.address || ""} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="website" label={l("Website (optional)", "Website (optional)")}>
                            <Input placeholder={defaults.website || ""} />
                        </Form.Item>
                    </Col>
                </Row>

                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                    {l("Buchungseinstellungen speichern", "Save booking settings")}
                </Button>
            </Form>
        </Card>
    );
}
