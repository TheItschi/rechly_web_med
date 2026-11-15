"use client";

import { Collapse } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { homeFaqsDe, homeFaqsEn } from "@/lib/home-faq";

const faqData = {
    de: homeFaqsDe,
    en: homeFaqsEn,
};

export default function FaqSection() {
    const { t, language } = useLanguage();

    return (
        <section
            style={{
                padding: "60px 24px 80px",
                background: "#fafafa",
            }}
            aria-label="Häufige Fragen zur Rechnungssoftware"
        >
            <div style={{ maxWidth: 700, margin: "0 auto" }}>
                <h2
                    style={{
                        textAlign: "center",
                        marginBottom: 12,
                        fontWeight: 600,
                        color: "#111",
                        fontSize: 28,
                    }}
                >
                    {t("faq.title")}
                </h2>
                <p
                    style={{
                        textAlign: "center",
                        color: "#64748b",
                        marginBottom: 32,
                        fontSize: 16,
                    }}
                >
                    {t("faq.subtitle")}
                </p>

                <Collapse
                    ghost
                    expandIcon={({ isActive }) => (
                        <QuestionCircleOutlined
                            rotate={isActive ? 90 : 0}
                            style={{ fontSize: 18, color: "#2855d9" }}
                        />
                    )}
                    items={faqData[language].map((faq, i) => ({
                        key: i,
                        label: (
                            <span
                                style={{
                                    fontWeight: 500,
                                    fontSize: 16,
                                    color: "#1f2937",
                                }}
                            >
                                {faq.question}
                            </span>
                        ),
                        children: (
                            <p
                                style={{
                                    color: "#64748b",
                                    lineHeight: 1.7,
                                    margin: 0,
                                }}
                            >
                                {faq.answer}
                            </p>
                        ),
                    }))}
                />
            </div>
        </section>
    );
}
