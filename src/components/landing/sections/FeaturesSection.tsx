"use client";

import { Card, Typography } from "antd";
import {
    FileTextOutlined,
    TeamOutlined,
    RobotOutlined,
    RiseOutlined,
    SafetyCertificateOutlined,
    MailOutlined,
} from "@ant-design/icons";
import { useLanguage } from "@/contexts/LanguageContext";

const { Text } = Typography;

export default function FeaturesSection() {
    const { t } = useLanguage();

    const features = [
        {
            icon: (
                <FileTextOutlined style={{ fontSize: 24, color: "#0f766e" }} />
            ),
            title: t("features.invoices.title"),
            desc: t("features.invoices.desc"),
        },
        {
            icon: <TeamOutlined style={{ fontSize: 24, color: "#2855d9" }} />,
            title: t("features.clients.title"),
            desc: t("features.clients.desc"),
        },
        {
            icon: <MailOutlined style={{ fontSize: 24, color: "#b45309" }} />,
            title: t("features.reminders.title"),
            desc: t("features.reminders.desc"),
        },
        {
            icon: <RobotOutlined style={{ fontSize: 24, color: "#7c3aed" }} />,
            title: t("features.ai.title"),
            desc: t("features.ai.desc"),
        },
        {
            icon: <RiseOutlined style={{ fontSize: 24, color: "#dc2626" }} />,
            title: t("features.analytics.title"),
            desc: t("features.analytics.desc"),
        },
        {
            icon: (
                <SafetyCertificateOutlined
                    style={{ fontSize: 24, color: "#166534" }}
                />
            ),
            title: t("features.opensource.title"),
            desc: t("features.opensource.desc"),
        },
    ];

    const highlights = [
        {
            value: t("features.highlight1.value"),
            label: t("features.highlight1.label"),
        },
        {
            value: t("features.highlight2.value"),
            label: t("features.highlight2.label"),
        },
        {
            value: t("features.highlight3.value"),
            label: t("features.highlight3.label"),
        },
    ];

    return (
        <section
            style={{
                padding: "84px 24px 96px",
                background:
                    "linear-gradient(180deg, #fff8ed 0%, #fff 52%, #f6fbff 100%)",
            }}
            aria-label="Funktionen der Rechnungssoftware"
        >
            <div style={{ maxWidth: 1120, margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: 48 }}>
                    <div className="landing-eyebrow">{t("features.badge")}</div>
                    <h2
                        style={{
                            textAlign: "center",
                            marginBottom: 16,
                            marginTop: 18,
                            fontWeight: 700,
                            color: "#111827",
                            fontSize: 34,
                            lineHeight: 1.15,
                        }}
                    >
                        {t("features.title")}
                    </h2>
                    <p
                        style={{
                            maxWidth: 760,
                            margin: "0 auto",
                            color: "#5b6474",
                            fontSize: 17,
                            lineHeight: 1.7,
                        }}
                    >
                        {t("features.subtitle")}
                    </p>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(240px, 1fr))",
                        gap: 22,
                    }}
                >
                    {features.map((feature, i) => (
                        <Card
                            key={i}
                            className="feature-card"
                            style={{
                                borderRadius: 20,
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                background: "rgba(255,255,255,0.9)",
                                boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
                            }}
                            styles={{ body: { padding: 28 } }}
                        >
                            <div
                                style={{
                                    marginBottom: 18,
                                    width: 52,
                                    height: 52,
                                    borderRadius: 16,
                                    background: "rgba(255,255,255,0.92)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow:
                                        "inset 0 0 0 1px rgba(15, 23, 42, 0.04)",
                                }}
                            >
                                {feature.icon}
                            </div>
                            <h3
                                style={{
                                    marginBottom: 10,
                                    fontWeight: 700,
                                    fontSize: 18,
                                    color: "#111827",
                                }}
                            >
                                {feature.title}
                            </h3>
                            <Text
                                style={{
                                    color: "#5f6b7a",
                                    fontSize: 14,
                                    lineHeight: 1.7,
                                }}
                            >
                                {feature.desc}
                            </Text>
                        </Card>
                    ))}
                </div>

                <div
                    style={{
                        marginTop: 32,
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 16,
                    }}
                >
                    {highlights.map((highlight, index) => (
                        <div key={index} className="landing-highlight-card">
                            <div
                                style={{
                                    fontSize: 26,
                                    fontWeight: 700,
                                    color: "#111827",
                                    marginBottom: 6,
                                }}
                            >
                                {highlight.value}
                            </div>
                            <div
                                style={{
                                    color: "#5f6b7a",
                                    fontSize: 14,
                                    lineHeight: 1.6,
                                }}
                            >
                                {highlight.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
