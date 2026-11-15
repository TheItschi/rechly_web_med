"use client";

import { useEffect } from "react";
import { pingAppwrite } from "@/lib/appwrite";
import { logger } from "@/lib/logger";
import { isDesktopRuntime } from "@/lib/runtime";

/**
 * Pings the Appwrite backend once when the app opens, to verify the SDK
 * setup (endpoint + project) as early as possible. Runs only in the
 * browser, never blocks rendering, and stays silent on failure except
 * for a debug log — the regular auth check reports real problems.
 * Skipped in desktop mode, where the backend is the local runtime.
 */
export default function AppwritePing() {
    useEffect(() => {
        if (isDesktopRuntime) return;
        pingAppwrite()
            .then((response) => logger.debug("Appwrite ping OK:", response))
            .catch((error) =>
                logger.debug("Appwrite ping failed (backend unreachable?):", error),
            );
    }, []);

    return null;
}
