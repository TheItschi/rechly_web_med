"use client";

import React, { createContext, useContext, useState, useSyncExternalStore } from "react";
import { translations } from "@/i18n";

export type Language = "de" | "en";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Re-export for backwards compatibility (prefer importing from "@/i18n").
export { translations };

const subscribeHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;
function storedLanguage(): Language {
    try {
        const stored = localStorage.getItem("language");
        return stored === "en" ? "en" : "de";
    } catch {
        return "de";
    }
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // German HTML and the first client render must agree. Restore a saved
    // preference after hydration; reading it in the initializer breaks English reloads.
    const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated);
    const [selectedLanguage, setLanguageState] = useState<Language | null>(null);
    const language = selectedLanguage ?? (hydrated ? storedLanguage() : "de");

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        try {
            localStorage.setItem("language", lang);
        } catch {
            /* Switching still works without storage. */
        }
    };

    const t = (key: string): string => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
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
