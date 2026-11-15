"use client";

import { useState } from "react";
import { Form, Input, Button, message } from "antd";
import { MailOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useLanguage } from "@/contexts/LanguageContext";
import AuthShell from "@/components/auth/AuthShell";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const { language } = useLanguage();
    const l = (de: string, en: string) => (language === "de" ? de : en);
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const onFinish = async (values: { email: string }) => {
        setLoading(true);
        try {
            await fetch("/api/auth/recovery", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: values.email }),
            });
            setSent(true);
        } catch {
            message.error(l("Etwas ist schiefgelaufen. Bitte erneut versuchen.", "Something went wrong. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <AuthShell
                mode="reset"
                title={l("E-Mail unterwegs", "Check your inbox")}
                subtitle={l(
                    "Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Link zum Zurücksetzen geschickt. Er ist begrenzt gültig.",
                    "If an account exists for this email, we sent you a reset link. It expires after a short time.",
                )}
            >
                <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
                    <CheckCircleOutlined style={{ fontSize: 44, color: "#2e8c6e" }} />
                    <p style={{ marginTop: 18 }}>
                        <Link href="/login" style={{ fontWeight: 600 }}>
                            {l("Zurück zur Anmeldung", "Back to log in")}
                        </Link>
                    </p>
                </div>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            mode="reset"
            title={l("Passwort vergessen?", "Forgot your password?")}
            subtitle={l(
                "Gib deine E-Mail ein. Wir schicken dir einen sicheren Link, mit dem du ein neues Passwort setzen kannst.",
                "Enter your email. We'll send you a secure link to set a new password.",
            )}
            footer={
                <p style={{ textAlign: "center", marginTop: 22, fontSize: 14, color: "#5b6b82" }}>
                    <Link href="/login" style={{ fontWeight: 600 }}>
                        {l("Zurück zur Anmeldung", "Back to log in")}
                    </Link>
                </p>
            }
        >
            <Form name="forgot" onFinish={onFinish} layout="vertical" size="large" requiredMark={false}>
                <Form.Item
                    name="email"
                    label={l("E-Mail", "Email")}
                    rules={[
                        { required: true, message: l("Bitte E-Mail eingeben", "Please enter your email") },
                        { type: "email", message: l("Ungültige E-Mail-Adresse", "Invalid email address") },
                    ]}
                >
                    <Input prefix={<MailOutlined />} placeholder="name@firma.de" autoComplete="email" />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0 }}>
                    <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 46 }}>
                        {l("Link zum Zurücksetzen senden", "Send reset link")}
                    </Button>
                </Form.Item>
            </Form>
        </AuthShell>
    );
}
