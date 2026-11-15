"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Form, Input, Button, message, Spin } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { useLanguage } from "@/contexts/LanguageContext";
import AuthShell from "@/components/auth/AuthShell";
import Link from "next/link";

function ResetForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { language } = useLanguage();
    const l = (de: string, en: string) => (language === "de" ? de : en);
    const [loading, setLoading] = useState(false);
    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");

    const onFinish = async (values: { password: string }) => {
        if (!userId || !secret) {
            message.error(l("Der Link ist ungültig oder abgelaufen.", "This link is invalid or expired."));
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("/api/auth/recovery/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, secret, password: values.password }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Recovery failed");
            }
            message.success(l("Neues Passwort gespeichert. Bitte melde dich an.", "New password saved. Please log in."));
            router.push("/login");
        } catch (error: unknown) {
            message.error(
                error instanceof Error
                    ? error.message
                    : l("Der Link ist ungültig oder abgelaufen.", "This link is invalid or expired."),
            );
        } finally {
            setLoading(false);
        }
    };

    if (!userId || !secret) {
        return (
            <AuthShell
                mode="reset"
                title={l("Link ungültig", "Invalid link")}
                subtitle={l(
                    "Dieser Link ist ungültig oder abgelaufen. Fordere einfach einen neuen an.",
                    "This link is invalid or expired. Just request a new one.",
                )}
            >
                <Link href="/forgot-password" style={{ fontWeight: 600 }}>
                    {l("Neuen Link anfordern", "Request a new link")}
                </Link>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            mode="reset"
            title={l("Neues Passwort setzen", "Set a new password")}
            subtitle={l("Wähle ein sicheres Passwort mit mindestens 8 Zeichen.", "Choose a secure password with at least 8 characters.")}
        >
            <Form name="reset" onFinish={onFinish} layout="vertical" size="large" requiredMark={false}>
                <Form.Item
                    name="password"
                    label={l("Neues Passwort", "New password")}
                    rules={[
                        { required: true, message: l("Bitte Passwort eingeben", "Please enter a password") },
                        { min: 8, message: l("Mindestens 8 Zeichen", "At least 8 characters") },
                    ]}
                >
                    <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="new-password" />
                </Form.Item>
                <Form.Item
                    name="confirmPassword"
                    label={l("Passwort bestätigen", "Confirm password")}
                    dependencies={["password"]}
                    rules={[
                        { required: true, message: l("Bitte Passwort bestätigen", "Please confirm your password") },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue("password") === value) return Promise.resolve();
                                return Promise.reject(new Error(l("Die Passwörter stimmen nicht überein", "Passwords do not match")));
                            },
                        }),
                    ]}
                >
                    <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="new-password" />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0 }}>
                    <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 46 }}>
                        {l("Passwort speichern", "Save new password")}
                    </Button>
                </Form.Item>
            </Form>
        </AuthShell>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Spin size="large" />
                </div>
            }
        >
            <ResetForm />
        </Suspense>
    );
}
