"use client";

import { useEffect, useState } from "react";

/**
 * Whether AI features are switched on ("Keine KI nutzen" in the settings
 * switches them off). Loaded once per page load and shared by all callers;
 * AI controls stay hidden until the answer is known.
 */
let cached: boolean | null = null;
let pending: Promise<boolean> | null = null;
const listeners = new Set<(enabled: boolean) => void>();

const load = (): Promise<boolean> => {
    pending ??= fetch("/api/ai/settings")
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { disabled?: boolean } | null) => !data?.disabled)
        .catch(() => true)
        .then((enabled) => {
            cached = enabled;
            return enabled;
        });
    return pending;
};

/** Called by the settings page after saving, so open views update at once. */
export function setAiEnabled(enabled: boolean): void {
    cached = enabled;
    pending = Promise.resolve(enabled);
    listeners.forEach((listener) => listener(enabled));
}

export function useAiEnabled(): boolean {
    const [enabled, setEnabled] = useState<boolean>(cached ?? false);
    useEffect(() => {
        listeners.add(setEnabled);
        if (cached === null) void load().then(setEnabled);
        return () => {
            listeners.delete(setEnabled);
        };
    }, []);
    return enabled;
}
