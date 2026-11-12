"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Form,
    Input,
    Button,
    Card,
    Checkbox,
    Typography,
    Divider,
    Space,
    message,
} from "antd";
import {
    MailOutlined,
    LockOutlined,
    UserOutlined,
    GoogleOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { AuthFooter, AuthHeader } from "@/components/AuthChrome";
import { PRIVACY_URL, TERMS_URL } from "@/lib/legal";
import Link from "next/link";

const { Title, Text } = Typography;

export default function RegisterPage() {
    const router = useRouter();
    const { register } = useAuth();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: {
        name: string;
        email: string;
        password: string;
    }) => {
        setLoading(true);
        try {
            await register(values.email, values.password, values.name);
            message.success(t("auth.registerSuccess"));
            router.push("/onboarding");
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : t("auth.registerFailed");
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "#fff" }}>
            <AuthHeader />

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
                                {t("auth.createAccount")}
                            </Title>
                            <Text type="secondary">{t("auth.startWithRechly")}</Text>
                        </div>

                        <Form
                            name="register"
                            onFinish={onFinish}
                            layout="vertical"
                            size="large"
                        >
                            <Form.Item
                                name="name"
                                rules={[
                                    { required: true, message: t("auth.nameRequired") },
                                ]}
                            >
                                <Input
                                    prefix={<UserOutlined />}
                                    placeholder={t("auth.fullName")}
                                />
                            </Form.Item>

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
                                    { min: 8, message: t("auth.passwordMin") },
                                ]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder={t("auth.password")}
                                />
                            </Form.Item>

                            <Form.Item
                                name="confirmPassword"
                                dependencies={["password"]}
                                rules={[
                                    {
                                        required: true,
                                        message: t("auth.confirmPasswordRequired"),
                                    },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (
                                                !value ||
                                                getFieldValue("password") === value
                                            ) {
                                                return Promise.resolve();
                                            }
                                            return Promise.reject(
                                                new Error(t("auth.passwordMismatch"))
                                            );
                                        },
                                    }),
                                ]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder={t("auth.confirmPassword")}
                                />
                            </Form.Item>

                            {/* Only when the operator has configured own terms/privacy pages */}
                            {TERMS_URL && PRIVACY_URL && (
                            <Form.Item
                                name="acceptPolicy"
                                valuePropName="checked"
                                rules={[
                                    {
                                        validator: (_, value) =>
                                            value
                                                ? Promise.resolve()
                                                : Promise.reject(
                                                      new Error(
                                                          t("auth.acceptPolicyRequired")
                                                      )
                                                  ),
                                    },
                                ]}
                            >
                                <Checkbox style={{ fontSize: 13, lineHeight: 1.5 }}>
                                    {t("auth.acceptPolicyPrefix")}{" "}
                                    <Link
                                        href={TERMS_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: "#1976d2" }}
                                    >
                                        {t("auth.termsLink")}
                                    </Link>{" "}
                                    {t("auth.acceptPolicyAnd")}{" "}
                                    <Link
                                        href={PRIVACY_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: "#1976d2" }}
                                    >
                                        {t("auth.privacyLink")}
                                    </Link>
                                    {t("auth.acceptPolicyOpenSource")}
                                </Checkbox>
                            </Form.Item>
                            )}

                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    block
                                    loading={loading}
                                >
                                    {t("auth.register")}
                                </Button>
                            </Form.Item>
                        </Form>

                        <Divider>{t("auth.or")}</Divider>

                        <Space
                            direction="vertical"
                            style={{ width: "100%" }}
                            size="small"
                        >
                            <Button
                                icon={<GoogleOutlined />}
                                block
                                size="large"
                                href="/api/auth/google"
                            >
                                {t("auth.registerWithGoogle")}
                            </Button>
                            <Text
                                type="secondary"
                                style={{
                                    fontSize: 12,
                                    display: "block",
                                    textAlign: "center",
                                }}
                            >
                                {t("auth.googlePolicyHint")}
                            </Text>
                        </Space>

                        <div style={{ textAlign: "center", marginTop: 24 }}>
                            <Text type="secondary">
                                {t("auth.hasAccount")}{" "}
                                <Link href="/login" style={{ color: "#1976d2" }}>
                                    {t("auth.signInNow")}
                                </Link>
                            </Text>
                        </div>
                    </Card>
                </div>
            </main>

            <AuthFooter />
        </div>
    );
}
