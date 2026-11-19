"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Result, Spin } from "antd";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import AuthShell from "@/components/auth/AuthShell";
import Link from "next/link";

type VerifyState = "loading" | "success" | "error" | "invalid";

function VerifyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { language } = useLanguage();
    const { user, refreshUser } = useAuth();
    const l = (de: string, en: string) => (language === "de" ? de : en);
    const [state, setState] = useState<VerifyState>("loading");
    const startedRef = useRef(false);
    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");

    useEffect(() => {
        if (!userId || !secret) {
            setState("invalid");
            return;
        }
        if (startedRef.current) return;
        startedRef.current = true;
        (async () => {
            try {
                const res = await fetch("/api/auth/verification/confirm", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, secret }),
                });
                if (!res.ok) throw new Error("Verification failed");
                await refreshUser().catch(() => undefined);
                setState("success");
            } catch {
                setState("error");
            }
        })();
    }, [userId, secret, refreshUser]);

    if (state === "invalid") {
        return (
            <AuthShell
                mode="reset"
                title={l("Link ungültig", "Invalid link")}
                subtitle={l(
                    "Dieser Link ist ungültig oder unvollständig. Fordere in den Einstellungen einfach einen neuen an.",
                    "This link is invalid or incomplete. Just request a new one from your settings.",
                )}
            >
                <Link href="/login" style={{ fontWeight: 600 }}>
                    {l("Zur Anmeldung", "Go to login")}
                </Link>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            mode="reset"
            title={l("E-Mail bestätigen", "Verify your email")}
            subtitle={l(
                "Wir prüfen deinen Bestätigungslink …",
                "We are checking your verification link …",
            )}
        >
            {state === "loading" && (
                <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                    <Spin size="large" />
                </div>
            )}
            {state === "success" && (
                <Result
                    status="success"
                    title={l("E-Mail bestätigt", "Email verified")}
                    subTitle={l(
                        "Vielen Dank! Deine E-Mail-Adresse ist jetzt bestätigt — alle Funktionen, inklusive Termine, sind freigeschaltet.",
                        "Thank you! Your email address is now verified — all features, including Termine (bookings), are unlocked.",
                    )}
                    extra={
                        <Button
                            type="primary"
                            size="large"
                            onClick={() => router.push(user ? "/dashboard" : "/login")}
                        >
                            {user
                                ? l("Zum Dashboard", "Go to dashboard")
                                : l("Jetzt anmelden", "Log in now")}
                        </Button>
                    }
                />
            )}
            {state === "error" && (
                <Result
                    status="error"
                    title={l("Link abgelaufen", "Link expired")}
                    subTitle={l(
                        "Dieser Bestätigungslink ist ungültig oder abgelaufen (gültig 7 Tage). Melde dich an und fordere in den Einstellungen einen neuen an.",
                        "This verification link is invalid or has expired (valid for 7 days). Log in and request a new one from your settings.",
                    )}
                    extra={
                        <Button type="primary" size="large" onClick={() => router.push("/login")}>
                            {l("Zur Anmeldung", "Go to login")}
                        </Button>
                    }
                />
            )}
        </AuthShell>
    );
}

export default function VerifyPage() {
    return (
        <Suspense
            fallback={
                <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Spin size="large" />
                </div>
            }
        >
            <VerifyContent />
        </Suspense>
    );
}
