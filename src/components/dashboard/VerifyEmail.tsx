"use client";

import { useState } from "react";
import { Alert, Button, Card, Space, Spin, Typography, message } from "antd";
import { MailOutlined } from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { isDesktopRuntime } from "@/lib/runtime";

const { Paragraph, Title } = Typography;
const DISMISS_KEY = "rechly-verify-banner-dismissed";

function useVerificationActions() {
    const { t } = useLanguage();
    const { refreshUser, user } = useAuth();
    const [sending, setSending] = useState(false);
    const [checking, setChecking] = useState(false);

    const resend = async () => {
        setSending(true);
        try {
            const res = await fetch("/api/auth/verification", { method: "POST" });
            if (!res.ok) throw new Error("send failed");
            message.success(t("verify.sent"));
        } catch {
            message.error(t("verify.sendFailed"));
        } finally {
            setSending(false);
        }
    };

    const checkNow = async () => {
        setChecking(true);
        try {
            await refreshUser();
            // refreshUser updates context async; read fresh status from the API to judge now.
            const res = await fetch("/api/auth/user");
            const fresh = res.ok ? await res.json() : null;
            if (fresh?.emailVerification) {
                message.success(t("verify.verifiedBadge"));
            } else {
                message.info(t("verify.stillPending"));
            }
        } finally {
            setChecking(false);
        }
    };

    return { resend, sending, checkNow, checking, email: user?.email };
}

/**
 * Persistent (per-session dismissible) nudge for signed-in users whose email
 * is not verified yet. Hidden for guests, verified users and desktop mode.
 */
export function VerifyEmailBanner() {
    const { t } = useLanguage();
    const { user, isAnonymous } = useAuth();
    const { resend, sending, checkNow, checking } = useVerificationActions();
    const [dismissed, setDismissed] = useState<boolean>(
        () => typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY) === "1",
    );

    if (isDesktopRuntime || dismissed) return null;
    if (!user || isAnonymous || !user.email || user.emailVerification) return null;

    return (
        <Alert
            type="warning"
            showIcon
            closable
            style={{ marginBottom: 16 }}
            onClose={() => {
                sessionStorage.setItem(DISMISS_KEY, "1");
                setDismissed(true);
            }}
            message={t("verify.bannerTitle")}
            description={
                <Space direction="vertical" size={8}>
                    <span>{t("verify.bannerDesc")}</span>
                    <Space wrap>
                        <Button size="small" type="primary" icon={<MailOutlined />} loading={sending} onClick={resend}>
                            {t("verify.resend")}
                        </Button>
                        <Button size="small" loading={checking} onClick={checkNow}>
                            {t("verify.checkNow")}
                        </Button>
                    </Space>
                </Space>
            }
        />
    );
}

/**
 * Wrapper for verified-only areas (Termine): renders children only for
 * verified accounts; guests get a register prompt, unverified users the
 * resend/check panel. Desktop/local profiles are verified by construction.
 */
export function VerifiedOnly({ children }: { children: React.ReactNode }) {
    const { t } = useLanguage();
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
                <Spin size="large" />
            </div>
        );
    }
    if (isDesktopRuntime || (user?.email && user.emailVerification)) {
        return <>{children}</>;
    }
    if (!user?.email) {
        return (
            <Card style={{ maxWidth: 560, margin: "48px auto", textAlign: "center" }}>
                <MailOutlined style={{ fontSize: 40, color: "var(--dash-accent, #2855d9)" }} />
                <Title level={3} style={{ marginTop: 16 }}>
                    {t("termine.verifyGateTitle")}
                </Title>
                <Paragraph type="secondary">{t("termine.verifyGateGuest")}</Paragraph>
                <Button type="primary" size="large" href="/register">
                    {t("dashboard.registerNow")}
                </Button>
            </Card>
        );
    }
    return <VerifyEmailGate />;
}

/** Full-panel gate shown in place of verified-only features (Termine). */
export function VerifyEmailGate() {
    const { t } = useLanguage();
    const { resend, sending, checkNow, checking, email } = useVerificationActions();

    return (
        <Card style={{ maxWidth: 560, margin: "48px auto", textAlign: "center" }}>
            <MailOutlined style={{ fontSize: 40, color: "var(--dash-accent, #2855d9)" }} />
            <Title level={3} style={{ marginTop: 16 }}>
                {t("termine.verifyGateTitle")}
            </Title>
            <Paragraph type="secondary">{t("termine.verifyGateDesc")}</Paragraph>
            {email && <Paragraph strong>{email}</Paragraph>}
            <Space wrap style={{ justifyContent: "center" }}>
                <Button type="primary" size="large" icon={<MailOutlined />} loading={sending} onClick={resend}>
                    {t("verify.resend")}
                </Button>
                <Button size="large" loading={checking} onClick={checkNow}>
                    {t("verify.checkNow")}
                </Button>
            </Space>
        </Card>
    );
}
