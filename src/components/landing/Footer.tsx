"use client";

import { Typography, Space, Divider } from "antd";
import { GithubOutlined, HeartOutlined } from "@ant-design/icons";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { getRepoUrl } from "@/lib/env";

const { Text } = Typography;
const repoUrl = getRepoUrl();

export default function Footer() {
    const { language, t } = useLanguage();

    const linkStyle = {
        color: "#64748b",
        fontSize: 14,
        transition: "color 0.2s",
    };

    return (
        <footer
            style={{
                background: "#fafafa",
                borderTop: "1px solid #f0f0f0",
                padding: "48px 24px 32px",
            }}
        >
            <div style={{ maxWidth: 1000, margin: "0 auto" }}>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 32,
                        marginBottom: 32,
                    }}
                >
                    {/* Brand */}
                    <div>
                        <Link
                            href="/"
                            aria-label="Rechly Startseite"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 12,
                                textDecoration: "none",
                            }}
                        >
                            <Image
                                src="/logo.png"
                                alt="Rechly Logo"
                                width={24}
                                height={24}
                                style={{ borderRadius: 4 }}
                            />
                            <Text strong style={{ margin: 0, fontSize: 16 }}>
                                Rechly
                            </Text>
                        </Link>
                        <Text style={{ color: "#64748b", fontSize: 14 }}>
                            {t("footer.tagline")}
                        </Text>
                    </div>

                    {/* Product */}
                    <div>
                        <Text
                            strong
                            style={{
                                display: "block",
                                marginBottom: 12,
                                fontSize: 13,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                                color: "#374151",
                            }}
                        >
                            {t("footer.product")}
                        </Text>
                        <Space direction="vertical" size={8}>
                            <Link href="/features" style={linkStyle}>
                                {t("nav.features")}
                            </Link>
                            <Link href="/desktop" style={linkStyle}>
                                Desktop-App (Download)
                            </Link>
                            <Link href="/open-source" style={linkStyle}>
                                Open Source
                            </Link>
                            <a
                                href={repoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={linkStyle}
                            >
                                GitHub
                            </a>
                        </Space>
                    </div>

                    {/* Kostenlose Tools & Rechner */}
                    <div>
                        <Text
                            strong
                            style={{
                                display: "block",
                                marginBottom: 12,
                                fontSize: 13,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                                color: "#374151",
                            }}
                        >
                            Generatoren & Rechner
                        </Text>
                        <Space direction="vertical" size={8}>
                            <Link href="/tools" style={linkStyle}>
                                Alle Tools & Rechner
                            </Link>
                            <Link href="/tools/rechnungsgenerator" style={linkStyle}>
                                Rechnungsgenerator
                            </Link>
                            <Link href="/tools/angebotsgenerator" style={linkStyle}>
                                Angebotsgenerator
                            </Link>
                            <Link href="/tools/mehrwertsteuer-rechner" style={linkStyle}>
                                Mehrwertsteuer-Rechner
                            </Link>
                            <Link href="/tools/quittung-erstellen" style={linkStyle}>
                                Quittung erstellen
                            </Link>
                            <Link href="/tools/e-rechnung-viewer" style={linkStyle}>
                                E-Rechnung Viewer
                            </Link>
                            <Link href="/tools/mahnung-generator" style={linkStyle}>
                                Mahnung-Generator
                            </Link>
                        </Space>
                    </div>

                    {language === "de" ? (
                        <>
                            {/* Branchen-Vorlagen & Lexikon */}
                            <div>
                                <Text
                                    strong
                                    style={{
                                        display: "block",
                                        marginBottom: 12,
                                        fontSize: 13,
                                        textTransform: "uppercase",
                                        letterSpacing: 0.5,
                                        color: "#374151",
                                    }}
                                >
                                    Vorlagen & Lexikon
                                </Text>
                                <Space direction="vertical" size={8}>
                                    <Link href="/vorlagen" style={linkStyle}>
                                        Branchen-Vorlagen
                                    </Link>
                                    <Link href="/vorlagen/handwerker" style={linkStyle}>
                                        Handwerkerrechnung (§ 35a)
                                    </Link>
                                    <Link href="/vorlagen/bauleistung-13b" style={linkStyle}>
                                        Bauleistung (§ 13b UStG)
                                    </Link>
                                    <Link href="/vorlagen/kleinunternehmer" style={linkStyle}>
                                        Kleinunternehmer-Vorlage
                                    </Link>
                                    <Link href="/lexikon" style={linkStyle}>
                                        Steuer- & Rechnungs-Lexikon
                                    </Link>
                                    <Link href="/lexikon/pflichtangaben-rechnung" style={linkStyle}>
                                        Pflichtangaben (§ 14 UStG)
                                    </Link>
                                    <Link href="/lexikon/e-rechnung-pflicht" style={linkStyle}>
                                        E-Rechnungspflicht 2025–2028
                                    </Link>
                                </Space>
                            </div>

                            {/* Ratgeber: sitewide links to the SEO landing pages */}
                            <div>
                        <Text
                            strong
                            style={{
                                display: "block",
                                marginBottom: 12,
                                fontSize: 13,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                                color: "#374151",
                            }}
                        >
                            Ratgeber
                        </Text>
                        <Space direction="vertical" size={8}>
                            <Link href="/rechnung-schreiben" style={linkStyle}>
                                Rechnung schreiben
                            </Link>
                            <Link href="/angebot-schreiben" style={linkStyle}>
                                Angebot schreiben
                            </Link>
                            <Link
                                href="/rechnungsprogramm-kostenlos"
                                style={linkStyle}
                            >
                                Rechnungsprogramm kostenlos
                            </Link>
                            <Link
                                href="/kostenlose-rechnungssoftware"
                                style={linkStyle}
                            >
                                Kostenlose Rechnungssoftware
                            </Link>
                            <Link href="/rechnungsvorlage" style={linkStyle}>
                                Rechnungsvorlage
                            </Link>
                            <Link
                                href="/kleinunternehmer-rechnung"
                                style={linkStyle}
                            >
                                Kleinunternehmer-Rechnung
                            </Link>
                            <Link
                                href="/rechnung-fuer-kleinunternehmer-erstellen"
                                style={linkStyle}
                            >
                                Rechnung für Kleinunternehmer
                            </Link>
                            <Link
                                href="/e-rechnung-software"
                                style={linkStyle}
                            >
                                E-Rechnung-Software
                            </Link>
                        </Space>
                    </div>

                    {/* Vergleiche */}
                    <div>
                        <Text
                            strong
                            style={{
                                display: "block",
                                marginBottom: 12,
                                fontSize: 13,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                                color: "#374151",
                            }}
                        >
                            Vergleiche
                        </Text>
                        <Space direction="vertical" size={8}>
                            <Link
                                href="/lexoffice-alternative"
                                style={linkStyle}
                            >
                                lexoffice Alternative
                            </Link>
                            <Link
                                href="/sevdesk-alternative"
                                style={linkStyle}
                            >
                                sevdesk Alternative
                            </Link>
                            <Link
                                href="/rechnungssoftware-fuer-freelancer"
                                style={linkStyle}
                            >
                                Software für Freelancer
                            </Link>
                            <Link
                                href="/zahlungserinnerung-schreiben"
                                style={linkStyle}
                            >
                                Zahlungserinnerung schreiben
                            </Link>
                            </Space>
                        </div>
                    </>
                    ) : null}

                    {/* Legal */}
                    <div>
                        <Text
                            strong
                            style={{
                                display: "block",
                                marginBottom: 12,
                                fontSize: 13,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                                color: "#374151",
                            }}
                        >
                            {t("footer.legal")}
                        </Text>
                        <Space direction="vertical" size={8}>
                            <Link href="/impressum" style={linkStyle}>
                                {t("footer.impressum")}
                            </Link>
                            <Link href="/datenschutz" style={linkStyle}>
                                {t("footer.privacy")}
                            </Link>
                            <Link href="/agb" style={linkStyle}>
                                {t("footer.terms")}
                            </Link>
                            <Link href="/cookies" style={linkStyle}>
                                {t("footer.cookies")}
                            </Link>
                        </Space>
                    </div>

                    {/* Contact */}
                    <div>
                        <Text
                            strong
                            style={{
                                display: "block",
                                marginBottom: 12,
                                fontSize: 13,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                                color: "#374151",
                            }}
                        >
                            {t("footer.contact")}
                        </Text>
                        <Text
                            style={{
                                color: "#64748b",
                                fontSize: 13,
                                display: "block",
                                marginBottom: 10,
                                lineHeight: 1.6,
                            }}
                        >
                            {t("footer.contactHint")}
                        </Text>
                        <a
                            href="mailto:admin@rechly.de"
                            style={{
                                color: "#1677ff",
                                fontSize: 14,
                                fontWeight: 500,
                                textDecoration: "none",
                            }}
                        >
                            admin@rechly.de
                        </a>
                    </div>
                </div>

                <Divider style={{ margin: "24px 0", borderColor: "#e5e7eb" }} />

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 16,
                    }}
                >
                    <Text style={{ color: "#64748b", fontSize: 13 }}>
                        <HeartOutlined style={{ marginRight: 6 }} />
                        {t("footer.madeBy")}
                    </Text>
                    <a
                        href={repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#64748b" }}
                    >
                        <GithubOutlined style={{ fontSize: 18 }} />
                    </a>
                </div>
            </div>
        </footer>
    );
}
