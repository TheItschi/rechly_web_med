"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Form, Input, Button, Divider, message, Space, Modal, Spin } from "antd";
import { MailOutlined, LockOutlined, GoogleOutlined, UserOutlined, WarningOutlined } from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { isDesktopRuntime } from "@/lib/runtime";
import AuthShell from "@/components/auth/AuthShell";
import Link from "next/link";
import { logger } from "@/lib/logger";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, loginAnonymously } = useAuth();
    const { t, language } = useLanguage();
    const l = (de: string, en: string) => (language === "de" ? de : en);
    const [loading, setLoading] = useState(false);
    const [guestLoading, setGuestLoading] = useState(false);
    const [guestModalVisible, setGuestModalVisible] = useState(false);

    useEffect(() => {
        const allParams = Object.fromEntries(searchParams.entries());
        if (Object.keys(allParams).length > 0) {
            logger.debug("Login page URL params:", allParams);
        }
        const errorParam = searchParams.get("error");
        if (errorParam) {
            logger.debug("OAuth error param:", errorParam);
            try {
                const decodedError = decodeURIComponent(errorParam);
                try {
                    const error = JSON.parse(decodedError);
                    if (error.type === "user_already_exists") {
                        message.info(t("auth.accountExists"));
                    } else {
                        message.error(error.message || t("auth.loginFailed"));
                    }
                } catch {
                    const lowerError = decodedError.toLowerCase();
                    if (
                        lowerError.includes("user_already_exists") ||
                        lowerError.includes("already exists") ||
                        lowerError.includes("existiert bereits")
                    ) {
                        message.info(t("auth.accountExists"));
                    } else {
                        message.error(decodedError || t("auth.loginFailed"));
                    }
                }
            } catch {
                message.error(t("auth.loginFailed"));
            }
            router.replace("/login");
        }
    }, [searchParams, router, t]);

    const onFinish = async (values: { email: string; password: string }) => {
        setLoading(true);
        try {
            await login(values.email, values.password);
            message.success(t("auth.loginSuccess"));
            router.push("/dashboard");
        } catch (error: unknown) {
            message.error(error instanceof Error ? error.message : t("auth.loginFailed"));
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setGuestLoading(true);
        try {
            await loginAnonymously();
            message.success(t("auth.guestSuccess"));
            router.push("/dashboard");
        } catch (error: unknown) {
            message.error(error instanceof Error ? error.message : t("auth.guestFailed"));
        } finally {
            setGuestLoading(false);
            setGuestModalVisible(false);
        }
    };

    return (
        <AuthShell
            mode="login"
            title={l("Willkommen zurück", "Welcome back")}
            subtitle={l(
                "Melde dich an, um Rechnungen, Kunden und Termine weiter zu verwalten.",
                "Log in to continue managing invoices, clients and appointments.",
            )}
            footer={
                <p style={{ textAlign: "center", marginTop: 22, fontSize: 14, color: "#5b6b82" }}>
                    {t("auth.noAccount")}{" "}
                    <Link href="/register" style={{ fontWeight: 600 }}>
                        {t("auth.signUpNow")}
                    </Link>
                </p>
            }
        >
            <Form name="login" onFinish={onFinish} layout="vertical" size="large" requiredMark={false}>
                <Form.Item
                    name="email"
                    label={t("auth.email")}
                    rules={[
                        { required: true, message: t("auth.emailRequired") },
                        { type: "email", message: t("auth.emailInvalid") },
                    ]}
                >
                    <Input prefix={<MailOutlined />} placeholder="name@firma.de" autoComplete="email" />
                </Form.Item>

                <Form.Item
                    name="password"
                    label={t("auth.password")}
                    rules={[{ required: true, message: t("auth.passwordRequired") }]}
                >
                    <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="current-password" />
                </Form.Item>

                {!isDesktopRuntime && (
                    <div style={{ textAlign: "right", marginTop: -8, marginBottom: 16 }}>
                        <Link href="/forgot-password" style={{ fontSize: 13.5, fontWeight: 550 }}>
                            {l("Passwort vergessen?", "Forgot your password?")}
                        </Link>
                    </div>
                )}

                <Form.Item style={{ marginBottom: 0 }}>
                    <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 46 }}>
                        {t("auth.login")}
                    </Button>
                </Form.Item>
            </Form>

            {!isDesktopRuntime && (
                <>
                    <Divider style={{ color: "#8494ab", fontSize: 13 }}>{t("auth.or")}</Divider>
                    <Space direction="vertical" style={{ width: "100%" }} size="middle">
                        <Button icon={<GoogleOutlined />} block size="large" href="/api/auth/google">
                            {t("auth.withGoogle")}
                        </Button>
                        <Button icon={<UserOutlined />} block size="large" onClick={() => setGuestModalVisible(true)} loading={guestLoading}>
                            {t("auth.asGuest")}
                        </Button>
                    </Space>
                </>
            )}

            <Modal
                title={
                    <span>
                        <WarningOutlined style={{ color: "#faad14", marginRight: 8 }} />
                        {t("guest.warningTitle")}
                    </span>
                }
                open={guestModalVisible}
                onOk={handleGuestLogin}
                onCancel={() => setGuestModalVisible(false)}
                okText={t("guest.continue")}
                cancelText={t("guest.cancel")}
                okButtonProps={{ loading: guestLoading, danger: true }}
            >
                <div style={{ padding: "16px 0" }}>
                    <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>{t("guest.warningMain")}</p>
                    <p style={{ color: "#666" }}>{t("guest.warningIntro")}</p>
                    <ul style={{ marginTop: 8, color: "#666" }}>
                        <li>{t("guest.warningPoint1")}</li>
                        <li>{t("guest.warningPoint2")}</li>
                        <li>{t("guest.warningPoint3")}</li>
                    </ul>
                    <p style={{ color: "#666", marginTop: 12 }}>{t("guest.warningNote")}</p>
                </div>
            </Modal>
        </AuthShell>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Spin size="large" />
                </div>
            }
        >
            <LoginForm />
        </Suspense>
    );
}
