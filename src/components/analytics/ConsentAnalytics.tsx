"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

interface ConsentAnalyticsProps {
    googleAnalyticsId?: string;
}

type GoogleConsentValue = "granted" | "denied";

type GoogleTagWindow = Window & {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
};

function hasAnalyticsConsent(): boolean {
    try {
        const stored = localStorage.getItem("cookiePreferences");
        if (!stored) return false;

        const preferences: unknown = JSON.parse(stored);
        return (
            typeof preferences === "object" &&
            preferences !== null &&
            "analytics" in preferences &&
            preferences.analytics === true
        );
    } catch {
        return false;
    }
}

function updateGoogleConsent(
    googleAnalyticsId: string,
    value: GoogleConsentValue
) {
    const analyticsWindow = window as GoogleTagWindow;
    analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? [];
    analyticsWindow.gtag =
        analyticsWindow.gtag ??
        function gtag(...args: unknown[]) {
            analyticsWindow.dataLayer?.push(args);
        };
    Reflect.set(
        analyticsWindow,
        `ga-disable-${googleAnalyticsId}`,
        value === "denied"
    );
    analyticsWindow.gtag("consent", "update", {
        analytics_storage: value,
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
    });
}

function clearAnalyticsCookies() {
    const analyticsCookie = /^_(?:ga|gid|gat|gcl_au)(?:_|$)/;
    const cookieNames = document.cookie
        .split(";")
        .map((cookie) => cookie.trim().split("=")[0])
        .filter((name) => analyticsCookie.test(name));
    const hostname = window.location.hostname;
    const domains = [undefined, hostname, `.${hostname}`];

    for (const name of cookieNames) {
        for (const domain of domains) {
            document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${
                domain ? `; Domain=${domain}` : ""
            }`;
        }
    }
}

export default function ConsentAnalytics({
    googleAnalyticsId,
}: ConsentAnalyticsProps) {
    const privateBooking = usePathname().startsWith("/buchen/");
    const [enabled, setEnabled] = useState(false);
    const enabledRef = useRef(false);

    useEffect(() => {
        if (googleAnalyticsId) {
            updateGoogleConsent(googleAnalyticsId, "denied");
        }

        const syncConsent = () => {
            const nextEnabled = !privateBooking && hasAnalyticsConsent();
            const wasEnabled = enabledRef.current;

            if (googleAnalyticsId) {
                updateGoogleConsent(
                    googleAnalyticsId,
                    nextEnabled ? "granted" : "denied"
                );
            }
            if (!nextEnabled) clearAnalyticsCookies();

            enabledRef.current = nextEnabled;
            setEnabled(nextEnabled);

            if (wasEnabled && !nextEnabled) {
                window.setTimeout(() => window.location.reload(), 0);
            }
        };

        syncConsent();

        const handleStorage = (event: StorageEvent) => {
            if (event.key === "cookiePreferences" || event.key === null) {
                syncConsent();
            }
        };

        window.addEventListener("cookie-consent-changed", syncConsent);
        window.addEventListener("storage", handleStorage);
        return () => {
            window.removeEventListener("cookie-consent-changed", syncConsent);
            window.removeEventListener("storage", handleStorage);
        };
    }, [googleAnalyticsId, privateBooking]);

    if (!enabled || privateBooking) return null;

    const filterVercelEvent = (event: BeforeSendEvent) =>
        hasAnalyticsConsent() && !new URL(event.url).pathname.startsWith("/buchen/") ? event : null;

    return (
        <>
            {googleAnalyticsId ? (
                <>
                    <Script
                        src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
                        strategy="afterInteractive"
                    />
                    <Script id="google-analytics" strategy="afterInteractive">
                        {`
                            window.dataLayer = window.dataLayer || [];
                            function gtag(){dataLayer.push(arguments);}
                            gtag('js', new Date());
                            gtag('config', '${googleAnalyticsId}', {
                                anonymize_ip: true,
                                allow_google_signals: false,
                                allow_ad_personalization_signals: false,
                                cookie_expires: 33696000
                            });
                        `}
                    </Script>
                </>
            ) : null}
            <Analytics beforeSend={filterVercelEvent} />
        </>
    );
}
