"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Checkbox, Divider, Space, message } from "antd";
import { MailOutlined, LockOutlined, UserOutlined, GoogleOutlined } from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { isDesktopRuntime } from "@/lib/runtime";
import AuthShell from "@/components/auth/AuthShell";
import Link from "next/link";

export default function RegisterPage() {
    const router = useRouter();
    const { register } = useAuth();
    const { t, language } = useLanguage();
    const l = (de: string, en: string) => (language === "de" ? de : en);
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: { name: string; email: string; password: string }) => {
        setLoading(true);
        try {
            await register(values.email, values.password, values.name);
            message.success(t("auth.registerSuccess"));
            router.push("/onboarding");
        } catch (error: unknown) {
            message.error(error instanceof Error ? error.message : t("auth.registerFailed"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            mode="register"
            title={l("Kostenloses Konto erstellen", "Create your free account")}
            subtitle={l(
                "In zwei Minuten zur ersten Rechnung. Kein Abo, keine Kreditkarte, keine Limits.",
                "Your first invoice in two minutes. No subscription, no credit card, no limits.",
            )}
            footer={
                <p style={{ textAlign: "center", marginTop: 22, fontSize: 14, color: "#5b6b82" }}>
                    {t("auth.hasAccount")}{" "}
                    <Link href="/login" style={{ fontWeight: 600 }}>
                        {t("auth.signInNow")}
                    </Link>
                </p>
            }
        >
            <Form name="register" onFinish={onFinish} layout="vertical" size="large" requiredMark={false}>
                <Form.Item
                    name="name"
                    label={t("auth.fullName")}
                    rules={[{ required: true, message: t("auth.nameRequired") }]}
                >
                    <Input prefix={<UserOutlined />} placeholder="Max Mustermann" autoComplete="name" />
                </Form.Item>

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
                    extra={l("Mindestens 8 Zeichen.", "At least 8 characters.")}
                    rules={[
                        { required: true, message: t("auth.passwordRequired") },
                        { min: 8, message: t("auth.passwordMin") },
                    ]}
                >
                    <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="new-password" />
                </Form.Item>

                <Form.Item
                    name="confirmPassword"
                    label={t("auth.confirmPassword")}
                    dependencies={["password"]}
                    rules={[
                        { required: true, message: t("auth.confirmPasswordRequired") },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue("password") === value) return Promise.resolve();
                                return Promise.reject(new Error(t("auth.passwordMismatch")));
                            },
                        }),
                    ]}
                >
                    <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="new-password" />
                </Form.Item>

                <Form.Item
                    name="acceptPolicy"
                    valuePropName="checked"
                    rules={[
                        {
                            validator: (_, value) =>
                                value
                                    ? Promise.resolve()
                                    : Promise.reject(new Error(t("auth.acceptPolicyRequired"))),
                        },
                    ]}
                >
                    <Checkbox style={{ fontSize: 13, lineHeight: 1.55 }}>
                        {t("auth.acceptPolicyPrefix")}{" "}
                        <Link href="/agb" target="_blank" rel="noopener noreferrer">
                            {t("auth.termsLink")}
                        </Link>{" "}
                        {t("auth.acceptPolicyAnd")}{" "}
                        <Link href="/datenschutz" target="_blank" rel="noopener noreferrer">
                            {t("auth.privacyLink")}
                        </Link>
                        {t("auth.acceptPolicyOpenSource")}
                    </Checkbox>
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                    <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 46 }}>
                        {l("Kostenlos registrieren", "Create free account")}
                    </Button>
                </Form.Item>
            </Form>

            {!isDesktopRuntime && (
                <>
                    <Divider style={{ color: "#8494ab", fontSize: 13 }}>{t("auth.or")}</Divider>
                    <Space direction="vertical" style={{ width: "100%" }} size="small">
                        <Button icon={<GoogleOutlined />} block size="large" href="/api/auth/google">
                            {t("auth.registerWithGoogle")}
                        </Button>
                        <p style={{ fontSize: 12, color: "#8494ab", textAlign: "center", margin: 0 }}>
                            {t("auth.googlePolicyHint")}
                        </p>
                    </Space>
                </>
            )}
        </AuthShell>
    );
}
