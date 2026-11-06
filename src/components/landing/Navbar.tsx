"use client";

import { useState } from "react";
import { Button, Space, Typography, Select, Drawer } from "antd";
import { GithubOutlined, MenuOutlined, CloseOutlined } from "@ant-design/icons";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { getRepoUrl } from "@/lib/env";

const { Text } = Typography;
const repoUrl = getRepoUrl();

interface NavbarProps {
    showAuth?: boolean;
}

export default function Navbar({ showAuth = true }: NavbarProps) {
    const { language, setLanguage, t } = useLanguage();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                background: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(12px)",
                borderBottom: "1px solid #f0f0f0",
                zIndex: 1000,
                padding: "12px 24px",
            }}
        >
            <div
                style={{
                    maxWidth: 1000,
                    margin: "0 auto",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                {/* Logo */}
                <Link
                    href="/"
                    aria-label="Rechly Startseite"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        textDecoration: "none",
                    }}
                >
                    <Image
                        src="/logo.png"
                        alt="Rechly Logo"
                        width={32}
                        height={32}
                        style={{ borderRadius: 6 }}
                        priority
                    />
                    <Text
                        strong
                        style={{ margin: 0, fontSize: 16, color: "#111" }}
                    >
                        Rechly
                    </Text>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:block">
                    <Space size="small">
                        <Button type="text" href="/features">
                            {t("nav.features")}
                        </Button>
                        <Button type="text" href="/#download">
                            {t("nav.download")}
                        </Button>
                        <Button type="text" href="/tools">
                            Tools
                        </Button>
                        {language === "de" ? (
                            <Button type="text" href="/rechnung-schreiben">
                                Ratgeber
                            </Button>
                        ) : null}
                        <Button type="text" href="/open-source">
                            Open Source
                        </Button>
                        <Select
                            value={language}
                            onChange={setLanguage}
                            variant="borderless"
                            style={{ width: 80 }}
                            options={[
                                { value: "de", label: "DE" },
                                { value: "en", label: "EN" },
                            ]}
                        />
                        <Button
                            type="text"
                            icon={<GithubOutlined />}
                            href={repoUrl}
                            target="_blank"
                        />
                        {showAuth && (
                            <>
                                <Button type="text" href="/login">
                                    {t("nav.login")}
                                </Button>
                                <Button
                                    type="primary"
                                    href="/register"
                                    style={{ borderRadius: 6 }}
                                >
                                    {t("nav.register")}
                                </Button>
                            </>
                        )}
                    </Space>
                </div>

                {/* Mobile Menu Button */}
                <div className="md:hidden">
                    <Button
                        type="text"
                        icon={<MenuOutlined style={{ fontSize: 20 }} />}
                        onClick={() => setMobileMenuOpen(true)}
                        style={{ padding: "4px 8px" }}
                        aria-label="Hauptmenü öffnen"
                    />
                </div>

                {/* Mobile Drawer Menu */}
                <Drawer
                    title={
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                            }}
                        >
                            <Image
                                src="/logo.png"
                                alt="Rechly"
                                width={28}
                                height={28}
                                style={{ borderRadius: 6 }}
                            />
                            <span style={{ fontWeight: 600 }}>Rechly</span>
                        </div>
                    }
                    placement="right"
                    onClose={() => setMobileMenuOpen(false)}
                    open={mobileMenuOpen}
                    width={280}
                    closeIcon={<CloseOutlined />}
                    styles={{
                        body: {
                            padding: "16px 0",
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                        },
                    }}
                >
                    {/* Language Selector */}
                    <div style={{ padding: "8px 24px" }}>
                        <Select
                            value={language}
                            onChange={setLanguage}
                            style={{ width: "100%" }}
                            options={[
                                { value: "de", label: "🇩🇪 Deutsch" },
                                { value: "en", label: "🇬🇧 English" },
                            ]}
                        />
                    </div>

                    {/* Navigation Links */}
                    <div
                        style={{
                            padding: "8px 24px",
                            borderTop: "1px solid #f0f0f0",
                            marginTop: 8,
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        <Button
                            type="text"
                            href="/features"
                            onClick={() => setMobileMenuOpen(false)}
                            style={{ justifyContent: "flex-start", height: 44 }}
                        >
                            {t("nav.features")}
                        </Button>
                        <Button
                            type="text"
                            href="/#download"
                            onClick={() => setMobileMenuOpen(false)}
                            style={{ justifyContent: "flex-start", height: 44 }}
                        >
                            {t("nav.download")}
                        </Button>
                        <Button
                            type="text"
                            href="/tools"
                            onClick={() => setMobileMenuOpen(false)}
                            style={{ justifyContent: "flex-start", height: 44 }}
                        >
                            Tools & Rechner
                        </Button>
                        {language === "de" ? (
                            <>
                                <Button
                                    type="text"
                                    href="/vorlagen"
                                    onClick={() => setMobileMenuOpen(false)}
                                    style={{
                                        justifyContent: "flex-start",
                                        height: 44,
                                    }}
                                >
                                    Rechnungsvorlagen
                                </Button>
                                <Button
                                    type="text"
                                    href="/lexikon"
                                    onClick={() => setMobileMenuOpen(false)}
                                    style={{
                                        justifyContent: "flex-start",
                                        height: 44,
                                    }}
                                >
                                    Steuer-Lexikon
                                </Button>
                                <Button
                                    type="text"
                                    href="/rechnung-schreiben"
                                    onClick={() => setMobileMenuOpen(false)}
                                    style={{
                                        justifyContent: "flex-start",
                                        height: 44,
                                    }}
                                >
                                    Ratgeber
                                </Button>
                            </>
                        ) : null}
                        <Button
                            type="text"
                            href="/open-source"
                            onClick={() => setMobileMenuOpen(false)}
                            style={{ justifyContent: "flex-start", height: 44 }}
                        >
                            Open Source
                        </Button>
                        <Button
                            type="text"
                            icon={<GithubOutlined />}
                            href={repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                width: "100%",
                                justifyContent: "flex-start",
                                height: 44,
                            }}
                        >
                            GitHub
                        </Button>
                    </div>

                    {/* Auth Buttons */}
                    {showAuth && (
                        <div
                            style={{
                                padding: "16px 24px",
                                borderTop: "1px solid #f0f0f0",
                                marginTop: "auto",
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                            }}
                        >
                            <Button
                                block
                                size="large"
                                href="/login"
                                onClick={() => setMobileMenuOpen(false)}
                                style={{ borderRadius: 8 }}
                            >
                                {t("nav.login")}
                            </Button>
                            <Button
                                type="primary"
                                block
                                size="large"
                                href="/register"
                                onClick={() => setMobileMenuOpen(false)}
                                style={{ borderRadius: 8 }}
                            >
                                {t("nav.register")}
                            </Button>
                        </div>
                    )}
                </Drawer>
            </div>
        </nav>
    );
}
