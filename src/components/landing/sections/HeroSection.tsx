"use client";

import { Button, Typography } from "antd";
import { ArrowRightOutlined, GithubOutlined } from "@ant-design/icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { getRepoUrl } from "@/lib/env";

const { Text } = Typography;
const repoUrl = getRepoUrl();

export default function HeroSection() {
    const { t } = useLanguage();

    return (
        <section
            style={{
                paddingTop: "clamp(96px, 12vw, 140px)",
                paddingBottom: "clamp(48px, 8vw, 80px)",
                paddingLeft: "clamp(16px, 4vw, 24px)",
                paddingRight: "clamp(16px, 4vw, 24px)",
                textAlign: "center",
                maxWidth: 700,
                margin: "0 auto",
            }}
            aria-label="Rechnungssoftware für Freelancer"
        >
            <div
                style={{
                    display: "inline-block",
                    padding: "6px 14px",
                    background: "#f0f9ff",
                    borderRadius: 20,
                    marginBottom: 24,
                }}
            >
                <Text
                    style={{
                        color: "#0369a1",
                        fontSize: 13,
                        fontWeight: 500,
                    }}
                >
                    {t("hero.badge")}
                </Text>
            </div>

            {/* SEO-optimized H1 with target keywords */}
            <h1
                style={{
                    fontSize: "clamp(1.85rem, 5.5vw, 3rem)",
                    fontWeight: 700,
                    margin: "0 0 16px",
                    lineHeight: 1.2,
                    color: "#111",
                    overflowWrap: "break-word",
                    wordBreak: "break-word",
                }}
            >
                {t("hero.title")}
                <br />
                <span style={{ color: "#1890ff" }}>
                    {t("hero.titleHighlight")}
                </span>
            </h1>

            <p
                style={{
                    fontSize: 18,
                    color: "#64748b",
                    marginBottom: 32,
                    lineHeight: 1.7,
                }}
            >
                {t("hero.subtitle")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <Button
                    type="primary"
                    size="large"
                    href="/register"
                    className="w-full sm:w-auto"
                    style={{
                        height: 48,
                        paddingInline: 28,
                        fontSize: 15,
                        borderRadius: 8,
                        fontWeight: 500,
                    }}
                    aria-label="Jetzt kostenlos Rechnung erstellen"
                >
                    {t("hero.cta")}
                    <ArrowRightOutlined />
                </Button>
                <Button
                    size="large"
                    icon={<GithubOutlined />}
                    href={repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto"
                    style={{
                        height: 48,
                        paddingInline: 24,
                        fontSize: 15,
                        borderRadius: 8,
                    }}
                >
                    {t("hero.secondary")}
                </Button>
            </div>
        </section>
    );
}
