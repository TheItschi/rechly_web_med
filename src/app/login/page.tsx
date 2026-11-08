"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Form,
    Input,
    Button,
    Card,
    Typography,
    Divider,
    message,
    Space,
    Modal,
    Spin,
} from "antd";
import {
    MailOutlined,
    LockOutlined,
    GoogleOutlined,
    UserOutlined,
    WarningOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import Link from "next/link";
import { logger } from "@/lib/logger";

const { Title, Text } = Typography;

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, loginAnonymously } = useAuth();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [guestLoading, setGuestLoading] = useState(false);
    const [guestModalVisible, setGuestModalVisible] = useState(false);

    // Handle OAuth errors from URL
    useEffect(() => {
        // Log all URL params for debugging
        const allParams = Object.fromEntries(searchParams.entries());
        if (Object.keys(allParams).length > 0) {
            logger.debug("Login page URL params:", allParams);
        }

        const errorParam = searchParams.get("error");
        if (errorParam) {
            logger.debug("OAuth error param:", errorParam);
            try {
                const decodedError = decodeURIComponent(errorParam);
                // Try to parse as JSON first
                try {
                    const error = JSON.parse(decodedError);
                    if (error.type === "user_already_exists") {
                        message.info(t("auth.accountExists"));
                    } else {
                        message.error(error.message || t("auth.loginFailed"));
                    }
                } catch {
                    // Not JSON - check if it contains the error text directly
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
                // Fallback for any decoding errors
                message.error(t("auth.loginFailed"));
            }
            // Clear the error from URL
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
            const errorMessage =
                error instanceof Error ? error.message : t("auth.loginFailed");
            message.error(errorMessage);
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
            const errorMessage =
                error instanceof Error ? error.message : t("auth.guestFailed");
            message.error(errorMessage);
        } finally {
            setGuestLoading(false);
            setGuestModalVisible(false);
        }
    };

    const showGuestWarning = () => {
        setGuestModalVisible(true);
    };

    return (
        <div style={{ minHeight: "100vh", background: "#fff" }}>
            <Navbar showAuth={false} />

            <main
                style={{
                    maxWidth: 1000,
                    margin: "0 auto",
                    padding: "120px 24px 64px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        minHeight: "calc(100vh - 260px)",
                    }}
                >
                    <Card
                        style={{
                            width: "100%",
                            maxWidth: 420,
                            borderRadius: 12,
                            border: "1px solid #f0f0f0",
                            boxShadow: "0 12px 24px rgba(0,0,0,0.06)",
                        }}
                    >
                        <div style={{ textAlign: "center", marginBottom: 32 }}>
                            <Title
                                level={2}
                                style={{ marginBottom: 8, color: "#111" }}
                            >
                                Rechly
                            </Title>
                            <Text type="secondary">{t("auth.subtitle")}</Text>
                        </div>

                        <Form
                            name="login"
                            onFinish={onFinish}
                            layout="vertical"
                            size="large"
                        >
                            <Form.Item
                                name="email"
                                rules={[
                                    {
                                        required: true,
                                        message: t("auth.emailRequired"),
                                    },
                                    {
                                        type: "email",
                                        message: t("auth.emailInvalid"),
                                    },
                                ]}
                            >
                                <Input
                                    prefix={<MailOutlined />}
                                    placeholder={t("auth.email")}
                                />
                            </Form.Item>

                            <Form.Item
                                name="password"
                                rules={[
                                    {
                                        required: true,
                                        message: t("auth.passwordRequired"),
                                    },
                                ]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder={t("auth.password")}
                                />
                            </Form.Item>

                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    block
                                    loading={loading}
                                >
                                    {t("auth.login")}
                                </Button>
                            </Form.Item>
                        </Form>

                        <Divider>{t("auth.or")}</Divider>

                        <Space
                            direction="vertical"
                            style={{ width: "100%" }}
                            size="middle"
                        >
                            <Button
                                icon={<GoogleOutlined />}
                                block
                                size="large"
                                href="/api/auth/google"
                            >
                                {t("auth.withGoogle")}
                            </Button>

                            <Button
                                icon={<UserOutlined />}
                                block
                                size="large"
                                onClick={showGuestWarning}
                                loading={guestLoading}
                            >
                                {t("auth.asGuest")}
                            </Button>
                        </Space>

                        <div style={{ textAlign: "center", marginTop: 24 }}>
                            <Text type="secondary">
                                {t("auth.noAccount")}{" "}
                                <Link
                                    href="/register"
                                    style={{ color: "#1976d2" }}
                                >
                                    {t("auth.signUpNow")}
                                </Link>
                            </Text>
                        </div>
                    </Card>
                </div>
            </main>

            <Footer />

            <Modal
                title={
                    <span>
                        <WarningOutlined
                            style={{ color: "#faad14", marginRight: 8 }}
                        />
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
                    <Text
                        strong
                        style={{
                            fontSize: 15,
                            display: "block",
                            marginBottom: 12,
                        }}
                    >
                        {t("guest.warningMain")}
                    </Text>
                    <Text style={{ color: "#666" }}>
                        {t("guest.warningIntro")}
                    </Text>
                    <ul style={{ marginTop: 8, color: "#666" }}>
                        <li>{t("guest.warningPoint1")}</li>
                        <li>{t("guest.warningPoint2")}</li>
                        <li>{t("guest.warningPoint3")}</li>
                    </ul>
                    <Text
                        type="secondary"
                        style={{ display: "block", marginTop: 12 }}
                    >
                        {t("guest.warningNote")}
                    </Text>
                </div>
            </Modal>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div
                    style={{
                        minHeight: "100vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#fff",
                    }}
                >
                    <Spin size="large" />
                </div>
            }
        >
            <LoginForm />
        </Suspense>
    );
}
