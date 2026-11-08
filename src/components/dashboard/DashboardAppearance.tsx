"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { ConfigProvider, Select, theme } from "antd";
import { useLanguage } from "@/contexts/LanguageContext";

type Appearance = "light" | "dark" | "system";
let memoryAppearance: Appearance = "light";
function getAppearance(): Appearance {
    try {
        const saved = localStorage.getItem("rechly.dashboard.appearance");
        if (saved === "light" || saved === "dark" || saved === "system") return saved;
    } catch {}
    return memoryAppearance;
}
function subscribeAppearance(notify: () => void) {
    window.addEventListener("storage", notify);
    window.addEventListener("rechly-appearance", notify);
    return () => {
        window.removeEventListener("storage", notify);
        window.removeEventListener("rechly-appearance", notify);
    };
}
function subscribeSystem(notify: () => void) {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    query.addEventListener("change", notify);
    return () => query.removeEventListener("change", notify);
}
const AppearanceContext = createContext<{
    appearance: Appearance;
    change: (value: Appearance) => void;
}>({ appearance: "light", change: () => {} });

export default function DashboardAppearance({ children }: { children: React.ReactNode }) {
    const appearance = useSyncExternalStore(subscribeAppearance, getAppearance, () => "light" as Appearance);
    const systemDark = useSyncExternalStore(subscribeSystem, () => window.matchMedia("(prefers-color-scheme: dark)").matches, () => false);
    const dark = appearance === "dark" || (appearance === "system" && systemDark);
    const change = (value: Appearance) => {
        memoryAppearance = value;
        try { localStorage.setItem("rechly.dashboard.appearance", value); } catch {}
        window.dispatchEvent(new Event("rechly-appearance"));
    };
    return (
        <AppearanceContext.Provider value={{ appearance, change }}>
            <ConfigProvider theme={{ algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
                token: {
                    colorPrimary: dark ? "#7c9bf5" : "#365fd6",
                    colorBgLayout: dark ? "#0d1420" : "#f4f6fa",
                    colorBgContainer: dark ? "#151e2d" : "#ffffff",
                    colorBorderSecondary: dark ? "#273449" : "#e5eaf1",
                    borderRadius: 8,
                    fontFamily: 'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                } }}>
                <div className="dashboard-appearance" data-appearance={dark ? "dark" : "light"}
                    style={{ minHeight: "100vh", colorScheme: dark ? "dark" : "light" }}>
                    {children}
                </div>
            </ConfigProvider>
        </AppearanceContext.Provider>
    );
}

export function AppearanceSelect() {
    const { appearance, change } = useContext(AppearanceContext);
    const { t } = useLanguage();
    return <Select aria-label={t("appearance.label")} value={appearance} onChange={change}
        style={{ width: 125 }} options={[
            { value: "light", label: t("appearance.light") },
            { value: "dark", label: t("appearance.dark") },
            { value: "system", label: t("appearance.system") },
        ]} />;
}
