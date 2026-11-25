"use client";

import { Button, Modal, Space, message } from "antd";
import {
    downloadEInvoiceFile,
    EInvoiceDownloadError,
    type EInvoiceFormat,
} from "@/lib/eRechnung/downloadClient";

interface DownloadWithFeedbackOptions {
    invoiceId: string;
    invoiceNumber?: string;
    format: EInvoiceFormat;
    t: (key: string) => string;
    onNavigate?: (path: string) => void;
}

export async function downloadInvoiceWithFeedback({
    invoiceId,
    invoiceNumber,
    format,
    t,
    onNavigate,
}: DownloadWithFeedbackOptions): Promise<void> {
    try {
        await downloadEInvoiceFile(invoiceId, format, invoiceNumber);
    } catch (error) {
        if (
            error instanceof EInvoiceDownloadError &&
            error.status === 422 &&
            error.errors.length > 0
        ) {
            const modal = Modal.warning({
                title: t("erechnung.validationModalTitle"),
                width: 520,
                content: (
                    <div>
                        <p style={{ marginBottom: 8 }}>
                            {t("erechnung.validationModalHint")}
                        </p>
                        <ul style={{ paddingLeft: 20, marginBottom: onNavigate ? 16 : 0 }}>
                            {error.errors.map((err, idx) => (
                                <li key={idx} style={{ marginBottom: 4 }}>
                                    {err}
                                </li>
                            ))}
                        </ul>
                        {onNavigate && (
                            <Space wrap>
                                <Button
                                    size="small"
                                    onClick={() => {
                                        modal.destroy();
                                        onNavigate("/dashboard/settings");
                                    }}
                                >
                                    {t("erechnung.fixSettings")}
                                </Button>
                                <Button
                                    size="small"
                                    onClick={() => {
                                        modal.destroy();
                                        onNavigate("/dashboard/clients");
                                    }}
                                >
                                    {t("erechnung.fixClient")}
                                </Button>
                            </Space>
                        )}
                    </div>
                ),
            });
            return;
        }

        message.error(
            error instanceof Error && error.message
                ? error.message
                : t("erechnung.downloadError"),
        );
    }
}
