"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Space, Typography } from "antd";
import { CloudDownloadOutlined } from "@ant-design/icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { isLoopbackHostname } from "@/lib/updateCheck";

interface CheckPayload {
    enabled?: boolean;
    updateAvailable?: boolean;
    kind?: "release" | "commit" | null;
    currentVersion?: string;
    latestVersion?: string | null;
    latestCommit?: string | null;
    url?: string | null;
}

interface StatusPayload {
    state?: "idle" | "running" | "done" | "failed";
    message?: string | null;
}

const DISMISS_KEY = "rechly-dismissed-update";

/**
 * Update notice for laptop-local installs only. Renders nothing on any
 * non-loopback host, so hosted users (rechly.de, Coolify, …) never see it.
 * "Update now" calls the loopback-guarded /api/update/apply; terminal
 * users can always run `npm run update` instead.
 */
export default function UpdateBanner() {
    const { t } = useLanguage();
    const [check, setCheck] = useState<CheckPayload | null>(null);
    const [status, setStatus] = useState<StatusPayload | null>(null);
    const [starting, setStarting] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!isLoopbackHostname(window.location.hostname)) return;
        let cancelled = false;
        fetch("/api/update/check")
            .then((r) => (r.ok ? r.json() : null))
            .then((data: CheckPayload | null) => {
                if (cancelled || !data?.updateAvailable) return;
                const marker = data.latestVersion || data.latestCommit || "";
                if (localStorage.getItem(DISMISS_KEY) === marker) return;
                setCheck(data);
            })
            .catch(() => { /* offline: stay silent */ });
        return () => { cancelled = true; };
    }, []);

    const stopPolling = useCallback(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
    }, []);

    useEffect(() => stopPolling, [stopPolling]);

    const startUpdate = useCallback(async () => {
        setStarting(true);
        try {
            const response = await fetch("/api/update/apply", {
                method: "POST",
                headers: { "x-rechly-update": "1" },
            });
            if (!response.ok) throw new Error("rejected");
            setStatus({ state: "running", message: t("update.starting") });
            stopPolling();
            pollRef.current = setInterval(async () => {
                try {
                    const s: StatusPayload = await (await fetch("/api/update/status")).json();
                    setStatus(s);
                    if (s.state === "done" || s.state === "failed") stopPolling();
                } catch { /* server may restart mid-update; keep polling */ }
            }, 2000);
        } catch {
            setStatus({ state: "failed", message: t("update.startFailed") });
        } finally {
            setStarting(false);
        }
    }, [stopPolling, t]);

    if (!check && !status) return null;

    const running = status?.state === "running";
    if (status && !check) return null;

    const versionLabel = check?.latestVersion
        ? `v${check.latestVersion}`
        : check?.latestCommit || "";

    return (
        <Alert
            type={status?.state === "failed" ? "error" : status?.state === "done" ? "success" : "info"}
            showIcon
            icon={<CloudDownloadOutlined />}
            closable={!running}
            onClose={() => {
                if (check) {
                    localStorage.setItem(
                        DISMISS_KEY,
                        check.latestVersion || check.latestCommit || "",
                    );
                }
                setCheck(null);
                setStatus(null);
            }}
            style={{ marginBottom: 16 }}
            message={
                status?.state === "done"
                    ? t("update.doneTitle")
                    : status?.state === "failed"
                      ? t("update.failedTitle")
                      : `${t("update.availableTitle")} ${versionLabel}`.trim()
            }
            description={
                <Space direction="vertical" size={8}>
                    <span>
                        {status?.message ||
                            (check?.kind === "release"
                                ? t("update.releaseDesc")
                                : t("update.commitDesc"))}
                    </span>
                    {!status && (
                        <Space wrap>
                            <Button
                                type="primary"
                                size="small"
                                loading={starting}
                                onClick={startUpdate}
                            >
                                {t("update.now")}
                            </Button>
                            {check?.url && (
                                <Button size="small" href={check.url} target="_blank" rel="noreferrer">
                                    {t("update.whatsNew")}
                                </Button>
                            )}
                            <Typography.Text code copyable>
                                npm run update
                            </Typography.Text>
                        </Space>
                    )}
                    {status?.state === "done" && (
                        <Button size="small" type="primary" onClick={() => window.location.reload()}>
                            {t("update.reload")}
                        </Button>
                    )}
                </Space>
            }
        />
    );
}
