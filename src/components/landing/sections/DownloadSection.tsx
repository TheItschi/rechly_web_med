"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
    WindowsOutlined,
    AppleOutlined,
    DownloadOutlined,
    GithubOutlined,
    SafetyCertificateOutlined,
    CloudSyncOutlined,
    FileProtectOutlined,
    InfoCircleOutlined,
} from "@ant-design/icons";

const DOWNLOAD_URLS = {
    windows:
        "https://github.com/myaxyo/rechly_desktop/releases/latest/download/Rechly-Desktop-Setup-win-x64.exe",
    macArm:
        "https://github.com/myaxyo/rechly_desktop/releases/latest/download/Rechly-Desktop-mac-arm64.dmg",
    macIntel:
        "https://github.com/myaxyo/rechly_desktop/releases/latest/download/Rechly-Desktop-mac-x64.dmg",
    releases: "https://github.com/myaxyo/rechly_desktop/releases",
    sourceCode: "https://github.com/myaxyo/rechly_desktop",
};

type DetectedOS = "windows" | "mac" | "other" | "unknown";
type MacArch = "arm64" | "x86";

type PlatformNavigator = Navigator & {
    userAgentData?: {
        platform?: string;
        mobile?: boolean;
        getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string }>;
    };
};

// The platform is stable for the lifetime of a browser page. The server uses
// "unknown" so hydration agrees before reading browser-only information.
const subscribePlatform = () => () => {};
const serverPlatform = (): DetectedOS => "unknown";
function browserPlatform(): DetectedOS {
    const nav = navigator as PlatformNavigator;
    const ua = nav.userAgent || "";
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
        || (nav.maxTouchPoints > 1 && /Macintosh/i.test(ua) && !("MSStream" in window))
        || nav.userAgentData?.mobile === true;
    if (mobile) return "other";
    const platform = nav.userAgentData?.platform || nav.platform || "";
    if (/Windows|Win32|Win64|WOW64/i.test(ua) || /Win/i.test(platform)) return "windows";
    if (/Macintosh|MacIntel|MacPPC|Mac68K/i.test(ua) || /Mac/i.test(platform)) return "mac";
    return "other";
}

export default function DownloadSection() {
    const detectedOS = useSyncExternalStore(subscribePlatform, browserPlatform, serverPlatform);
    const [macArch, setMacArch] = useState<MacArch>("arm64");

    useEffect(() => {
        if (detectedOS !== "mac") return;
        const data = (navigator as PlatformNavigator).userAgentData;
        if (!data?.getHighEntropyValues) return;
        let active = true;
        // The Mac user agent reports Intel on Apple Silicon too. Prefer the
        // browser's architecture hint when available.
        data.getHighEntropyValues(["architecture"]).then(values => {
            if (active && values.architecture === "x86") setMacArch("x86");
        }).catch(() => { /* Keep Apple Silicon default. */ });
        return () => { active = false; };
    }, [detectedOS]);

    const primaryHref =
        detectedOS === "windows"
            ? DOWNLOAD_URLS.windows
            : detectedOS === "mac"
            ? macArch === "x86"
                ? DOWNLOAD_URLS.macIntel
                : DOWNLOAD_URLS.macArm
            : null;

    const primaryButtonLabel =
        detectedOS === "windows"
            ? "Für Windows herunterladen"
            : detectedOS === "mac"
            ? "Für Mac herunterladen"
            : null;

    const primarySubtext =
        detectedOS === "windows"
            ? "Windows 10 / 11 (64-Bit) · Setup-win-x64.exe"
            : detectedOS === "mac"
            ? macArch === "x86"
                ? "macOS Intel · Rechly-Desktop-mac-x64.dmg"
                : "macOS Apple Silicon (M1 und neuer) · Rechly-Desktop-mac-arm64.dmg"
            : null;

    return (
        <section
            id="download"
            style={{
                scrollMarginTop: 80,
                padding: "88px 24px 96px",
                background:
                    "#ffffff",
                borderTop: "1px solid #e2e8f0",
                borderBottom: "1px solid #e2e8f0",
            }}
            aria-label="Rechly Desktop herunterladen"
        >
            <div style={{ maxWidth: 840, margin: "0 auto", textAlign: "center" }}>
                {/* Eyebrow badge */}
                <div
                    className="landing-eyebrow"
                    style={{
                        background: "none",
                        color: "#2855d9",
                        marginBottom: 16,
                    }}
                >
                    100 % LOKAL & OFFLINE
                </div>

                {/* Heading */}
                <h2
                    style={{
                        fontSize: 34,
                        fontWeight: 700,
                        color: "#152438",
                        marginBottom: 16,
                        lineHeight: 1.2,
                    }}
                >
                    Rechly Desktop – 100 % offline
                </h2>

                {/* Short intro */}
                <p
                    style={{
                        maxWidth: 680,
                        margin: "0 auto 32px",
                        color: "#526174",
                        fontSize: 17,
                        lineHeight: 1.7,
                    }}
                >
                    Alle Daten bleiben lokal auf deinem Rechner. Keine Cloud, kein
                    Login. E-Rechnung (XRechnung/ZUGFeRD), DATEV-Export und
                    optionale lokale KI.
                </p>

                {/* Feature highlight chips */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mb-8">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200/80 text-xs font-medium text-gray-700 shadow-xs">
                        <SafetyCertificateOutlined className="text-emerald-600" />
                        100 % offline & DSGVO-konform
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200/80 text-xs font-medium text-gray-700 shadow-xs">
                        <CloudSyncOutlined className="text-blue-600" />
                        Keine Cloud, kein Login nötig
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200/80 text-xs font-medium text-gray-700 shadow-xs">
                        <FileProtectOutlined className="text-amber-600" />
                        E-Rechnung (XRechnung & ZUGFeRD)
                    </span>
                </div>

                {/* Primary Button / OS Matching CTA */}
                <div className="flex flex-col items-center justify-center">
                    {detectedOS === "windows" || detectedOS === "mac" ? (
                        <div className="flex flex-col items-center">
                            <a
                                href={primaryHref!}
                                className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                                style={{
                                    backgroundColor:
                                        detectedOS === "windows"
                                            ? "#2855d9"
                                            : "#0f172a",
                                    minHeight: 56,
                                    textDecoration: "none",
                                }}
                                aria-label={primaryButtonLabel!}
                            >
                                {detectedOS === "windows" ? (
                                    <WindowsOutlined style={{ fontSize: 24 }} />
                                ) : (
                                    <AppleOutlined style={{ fontSize: 24 }} />
                                )}
                                <span>{primaryButtonLabel}</span>
                                <DownloadOutlined className="ml-1 text-sm group-hover:translate-y-0.5 transition-transform" />
                            </a>
                            <div className="mt-2 text-xs text-gray-500 font-medium">
                                {primarySubtext}
                            </div>
                        </div>
                    ) : (
                        /* Other or unknown OS (Linux, mobile, or JS disabled) */
                        <div className="w-full max-w-md mx-auto">
                            <div className="mb-5 p-3 rounded-xl bg-blue-50/80 border border-blue-100 text-xs sm:text-sm text-blue-900 leading-relaxed text-center">
                                <InfoCircleOutlined className="mr-1.5 text-blue-600" />
                                Hinweis: Die Rechly Desktop-App läuft derzeit
                                nativ auf <strong>Windows</strong> und{" "}
                                <strong>macOS</strong>.
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <a
                                    href={DOWNLOAD_URLS.windows}
                                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-white font-semibold text-base shadow-md hover:shadow-lg transition-all"
                                    style={{
                                        backgroundColor: "#2855d9",
                                        textDecoration: "none",
                                    }}
                                    aria-label="Rechly Desktop für Windows (64-Bit) herunterladen"
                                >
                                    <WindowsOutlined style={{ fontSize: 20 }} />
                                    <span>Für Windows herunterladen</span>
                                </a>
                                <a
                                    href={DOWNLOAD_URLS.macArm}
                                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-white font-semibold text-base shadow-md hover:shadow-lg transition-all"
                                    style={{
                                        backgroundColor: "#0f172a",
                                        textDecoration: "none",
                                    }}
                                    aria-label="Rechly Desktop für Mac herunterladen"
                                >
                                    <AppleOutlined style={{ fontSize: 20 }} />
                                    <span>Für Mac herunterladen</span>
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* Below the button: Always show smaller links to all three downloads */}
                <div className="mt-6 pt-5 border-t border-gray-200/70 max-w-2xl mx-auto">
                    <div className="text-xs text-gray-500 font-medium mb-3 uppercase tracking-wider">
                        Alle Downloads zur manuellen Auswahl:
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
                        <a
                            href={DOWNLOAD_URLS.windows}
                            className={`inline-flex items-center gap-1.5 text-gray-700 hover:text-blue-600 transition-colors underline-offset-4 hover:underline ${
                                detectedOS === "windows" ? "font-semibold" : ""
                            }`}
                        >
                            <WindowsOutlined className="text-blue-600" />
                            <span>Windows 10/11 (64-Bit)</span>
                        </a>
                        <span className="text-gray-300 hidden sm:inline">·</span>
                        <a
                            href={DOWNLOAD_URLS.macArm}
                            className={`inline-flex items-center gap-1.5 text-gray-700 hover:text-blue-600 transition-colors underline-offset-4 hover:underline ${
                                detectedOS === "mac" && macArch === "arm64"
                                    ? "font-semibold"
                                    : ""
                            }`}
                        >
                            <AppleOutlined className="text-gray-900" />
                            <span>Mac (Apple Silicon M1+)</span>
                        </a>
                        <span className="text-gray-300 hidden sm:inline">·</span>
                        <a
                            href={DOWNLOAD_URLS.macIntel}
                            className={`inline-flex items-center gap-1.5 text-gray-700 hover:text-blue-600 transition-colors underline-offset-4 hover:underline ${
                                detectedOS === "mac" && macArch === "x86"
                                    ? "font-semibold"
                                    : ""
                            }`}
                        >
                            <AppleOutlined className="text-gray-900" />
                            <span>Mac mit Intel-Prozessor</span>
                        </a>
                        <span className="text-gray-300 hidden sm:inline">·</span>
                        <a
                            href={DOWNLOAD_URLS.releases}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            <span>Alle Versionen & Release Notes →</span>
                        </a>
                    </div>
                </div>

                {/* Open Source / GitHub link */}
                <div className="mt-4 text-center">
                    <a
                        href={DOWNLOAD_URLS.sourceCode}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors underline-offset-2 hover:underline"
                    >
                        <GithubOutlined />
                        <span>Open Source (AGPL-3.0) · Quellcode auf GitHub</span>
                    </a>
                </div>

                {/* Installation Hints (Collapsible) */}
                <div className="mt-8 max-w-xl mx-auto text-left">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2.5 text-center">
                        Installationshinweise
                    </div>
                    <div className="space-y-2">
                        <details className="group bg-white rounded-xl border border-gray-200/90 p-3.5 text-sm transition-all open:shadow-xs">
                            <summary className="font-medium text-gray-800 cursor-pointer flex items-center justify-between select-none list-none">
                                <span className="flex items-center gap-2">
                                    <WindowsOutlined className="text-blue-600" />
                                    <span>Hinweis für Windows (SmartScreen)</span>
                                </span>
                                <span className="text-xs text-gray-400 group-open:rotate-180 transition-transform">
                                    ▼
                                </span>
                            </summary>
                            <p className="mt-2.5 text-gray-600 text-xs sm:text-sm leading-relaxed pl-6 m-0 border-t border-gray-100 pt-2">
                                Falls Windows SmartScreen erscheint: auf „Weitere
                                Informationen“ und dann „Trotzdem ausführen“
                                klicken.
                            </p>
                        </details>
                        <details className="group bg-white rounded-xl border border-gray-200/90 p-3.5 text-sm transition-all open:shadow-xs">
                            <summary className="font-medium text-gray-800 cursor-pointer flex items-center justify-between select-none list-none">
                                <span className="flex items-center gap-2">
                                    <AppleOutlined className="text-gray-900" />
                                    <span>Hinweis für macOS (DMG & Gatekeeper)</span>
                                </span>
                                <span className="text-xs text-gray-400 group-open:rotate-180 transition-transform">
                                    ▼
                                </span>
                            </summary>
                            <p className="mt-2.5 text-gray-600 text-xs sm:text-sm leading-relaxed pl-6 m-0 border-t border-gray-100 pt-2">
                                DMG öffnen, Rechly in den Programme-Ordner
                                ziehen. Falls macOS die App nicht öffnen will:
                                Rechtsklick auf die App → „Öffnen“ → bestätigen.
                            </p>
                        </details>
                    </div>
                </div>
            </div>
        </section>
    );
}
