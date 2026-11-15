"use client";

import { Typography, Card, Switch, Button, Space } from "antd";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const { Title, Paragraph, Text } = Typography;

const content = {
    de: {
        title: "Cookie-Einstellungen",
        intro: "Technisch notwendige Cookies sind immer aktiv. Optionale Analyse wird erst nach deiner ausdrücklichen Zustimmung geladen.",
        essentialTitle: "Notwendige Cookies",
        essentialDesc: "Für Login und Grundfunktionen erforderlich.",
        analyticsTitle: "Analyse-Cookies",
        analyticsDesc: "Optional: hilft uns, Nutzung und technische Qualität zu verstehen.",
        saveButton: "Einstellungen speichern",
        savedAlert: "Einstellungen gespeichert.",
        lastUpdated: "Stand: August 2026",
    },
    en: {
        title: "Cookie Settings",
        intro: "Essential cookies are always active. Optional analytics are loaded only after your explicit consent.",
        essentialTitle: "Essential Cookies",
        essentialDesc: "Required for login and basic functionality.",
        analyticsTitle: "Analytics Cookies",
        analyticsDesc: "Optional: helps us understand usage and technical quality.",
        saveButton: "Save Settings",
        savedAlert: "Settings saved.",
        lastUpdated: "Last updated: August 2026",
    },
};

export default function CookiesPage() {
    const { language } = useLanguage();
    const t = content[language];
    const [analyticsCookies, setAnalyticsCookies] = useState(false);
    const [preferencesLoaded, setPreferencesLoaded] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem("cookiePreferences");
            if (stored) {
                const preferences: unknown = JSON.parse(stored);
                if (
                    typeof preferences === "object" &&
                    preferences !== null &&
                    "analytics" in preferences &&
                    typeof preferences.analytics === "boolean"
                ) {
                    setAnalyticsCookies(preferences.analytics);
                }
            }
        } catch {
            // Invalid preferences are treated as no optional consent.
        } finally {
            setPreferencesLoaded(true);
        }
    }, []);

    const handleSave = () => {
        if (!preferencesLoaded) return;

        localStorage.setItem(
            "cookiePreferences",
            JSON.stringify({
                essential: true,
                analytics: analyticsCookies,
                timestamp: new Date().toISOString(),
            })
        );
        window.dispatchEvent(new Event("cookie-consent-changed"));
        alert(t.savedAlert);
    };

    return (
        <div style={{ minHeight: "100vh", background: "#fff" }}>
            <Navbar showAuth={false} />

            <main
                style={{
                    paddingTop: 100,
                    paddingBottom: 60,
                    paddingLeft: 24,
                    paddingRight: 24,
                    maxWidth: 700,
                    margin: "0 auto",
                }}
            >
                <Card className="legal-prose" style={{ borderRadius: 10 }}>
                    <Title level={1} style={{ marginBottom: 24 }}>
                        {t.title}
                    </Title>

                    <Paragraph style={{ fontSize: 15 }}>{t.intro}</Paragraph>

                    <Card
                        style={{
                            marginTop: 24,
                            marginBottom: 16,
                            background: "#fafafa",
                            border: "1px solid #f0f0f0",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <div>
                                <Title level={5} style={{ marginBottom: 4 }}>
                                    {t.essentialTitle}
                                </Title>
                                <Text
                                    style={{ color: "#64748b", fontSize: 14 }}
                                >
                                    {t.essentialDesc}
                                </Text>
                            </div>
                            <Switch checked disabled />
                        </div>
                    </Card>

                    <Card
                        style={{
                            marginBottom: 24,
                            background: "#fafafa",
                            border: "1px solid #f0f0f0",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <div>
                                <Title level={5} style={{ marginBottom: 4 }}>
                                    {t.analyticsTitle}
                                </Title>
                                <Text
                                    style={{ color: "#64748b", fontSize: 14 }}
                                >
                                    {t.analyticsDesc}
                                </Text>
                            </div>
                            <Switch
                                checked={analyticsCookies}
                                disabled={!preferencesLoaded}
                                onChange={setAnalyticsCookies}
                            />
                        </div>
                    </Card>

                    <Space direction="vertical" style={{ width: "100%" }}>
                        <Button
                            type="primary"
                            size="large"
                            onClick={handleSave}
                            disabled={!preferencesLoaded}
                            block
                            style={{ borderRadius: 8 }}
                        >
                            {t.saveButton}
                        </Button>
                    </Space>

                    <Text
                        type="secondary"
                        style={{
                            fontSize: 13,
                            marginTop: 24,
                            display: "block",
                        }}
                    >
                        {t.lastUpdated}
                    </Text>
                </Card>
            </main>

            <Footer />
        </div>
    );
}
