"use client";

import React, { createContext, useContext, useState } from "react";
import { translations } from "@/i18n";

export type Language = "de" | "en";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
    undefined,
);

// Re-export for backwards compatibility (prefer importing from "@/i18n").
export { translations };

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    // Default to German for SEO - German is the primary target market
    // Use lazy initializer to read stored preference without triggering a cascading render
    const [language, setLanguageState] = useState<Language>(() => {
        if (typeof window === "undefined") return "de";
        const stored = localStorage.getItem("language") as Language | null;
        if (stored && (stored === "de" || stored === "en")) {
            return stored;
        }
        // Note: We intentionally default to German and don't auto-detect browser language
        // This ensures German content is served by default for SEO purposes
        return "de";
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("language", lang);
    };

    const t = (key: string): string => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const getTranslation = (lang: Language, key: string): string => {
    return translations[lang]?.[key] || translations.de[key] || key;
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};
