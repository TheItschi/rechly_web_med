"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spin, Typography } from "antd";
import { getCompanyInfo } from "@/lib/companyService";
import { useClientStore, useProductStore, useInvoiceStore } from "@/store";
import { logger } from "@/lib/logger";

const { Text } = Typography;

/**
 * OAuth Callback Handler Content
 * Handles both client-side OAuth (old flow) and SSR OAuth (new flow)
 */
function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState("Processing OAuth callback...");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleOAuthCallback = async () => {
            try {
                // Log all URL params for debugging
                const allParams = Object.fromEntries(searchParams.entries());
                logger.debug("OAuth callback URL params:", allParams);

                // Check for error in URL params
                const errorParam = searchParams.get("error");
                if (errorParam) {
                    console.error("OAuth error from URL:", errorParam);
                    setError(`OAuth error: ${errorParam}`);
                    setTimeout(() => router.push("/login"), 3000);
                    return;
                }

                // Check if this is from SSR flow
                const fromSSR = searchParams.get("from") === "ssr";
                logger.debug(
                    "OAuth flow type:",
                    fromSSR ? "SSR" : "Client-side"
                );

                setStatus("Checking session...");

                // For SSR flow, the session is already set via cookie
                // For client-side flow, give Appwrite a moment to process
                if (!fromSSR) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }

                // Check if we have a valid session via SSR API route
                let user;
                try {
                    // Always use SSR session check first (works for both flows)
                    const response = await fetch("/api/auth/user");
                    if (response.ok) {
                        user = await response.json();
                    }
                    logger.debug("Session check result:", user);
                } catch (sessionError) {
                    console.error("Session check failed:", sessionError);
                    setError(
                        "No valid session found. Please try logging in again."
                    );
                    setTimeout(() => router.push("/login"), 3000);
                    return;
                }

                if (!user) {
                    logger.debug("No user found after OAuth");
                    setError("No user found. Please try logging in again.");
                    setTimeout(() => router.push("/login"), 3000);
                    return;
                }

                logger.debug("OAuth user found:", user.$id, user.email);
                setStatus(
                    `Welcome ${user.name || user.email}! Checking setup...`
                );

                // Clear cached data from previous session
                useClientStore.getState().clearCache();
                useProductStore.getState().clearCache();
                useInvoiceStore.getState().clearCache();

                // Check if user has company info set up
                try {
                    const companyInfo = await getCompanyInfo();
                    if (companyInfo?.name) {
                        setStatus("Redirecting to dashboard...");
                        router.push("/dashboard");
                    } else {
                        setStatus("Redirecting to setup...");
                        router.push("/onboarding");
                    }
                } catch (companyError) {
                    console.error("Error checking company info:", companyError);
                    setStatus("Redirecting to setup...");
                    router.push("/onboarding");
                }
            } catch (error) {
                console.error("OAuth callback error:", error);
                setError("An error occurred. Redirecting to login...");
                setTimeout(() => router.push("/login"), 3000);
            }
        };

        handleOAuthCallback();
    }, [router, searchParams]);

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                background: "linear-gradient(135deg, #1976d2 0%, #64b5f6 100%)",
                gap: 16,
            }}
        >
            <Spin size="large" />
            <Text style={{ color: "white", fontSize: 16 }}>
                {error || status}
            </Text>
        </div>
    );
}

/**
 * OAuth Callback Handler
 * Wrapped in Suspense for useSearchParams
 */
export default function AuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100vh",
                        background:
                            "linear-gradient(135deg, #1976d2 0%, #64b5f6 100%)",
                    }}
                >
                    <Spin size="large" />
                </div>
            }
        >
            <CallbackContent />
        </Suspense>
    );
}
