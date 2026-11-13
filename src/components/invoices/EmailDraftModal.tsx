"use client";

import { useState } from "react";
import { Alert, Button, Checkbox, Input, Modal, Space, Typography, message } from "antd";
import { CopyOutlined, ReloadOutlined } from "@ant-design/icons";
import { DEFAULT_PASSWORD_HINT } from "@/lib/invoiceEmail";
import { generatePdfPassword, MIN_PDF_PASSWORD_LENGTH } from "@/lib/pdfProtect";

const { Text, Paragraph } = Typography;

export interface EmailDraftOptions {
    password?: string;
    passwordHint?: string;
    neutralSubject: boolean;
}

const PREFS_KEY = "rechly-med.emailDraft";
interface Prefs { protect: boolean; neutralSubject: boolean; passwordHint: string }
const DEFAULT_PREFS: Prefs = { protect: true, neutralSubject: true, passwordHint: DEFAULT_PASSWORD_HINT };

// Per-viewer convenience only (never the password itself).
const readPrefs = (): Prefs => {
    try {
        return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") };
    } catch {
        return DEFAULT_PREFS;
    }
};
const writePrefs = (prefs: Prefs) => {
    try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
        /* storage unavailable */
    }
};

interface Props {
    open: boolean;
    loading: boolean;
    hasRecipient: boolean;
    onCancel: () => void;
    onConfirm: (options: EmailDraftOptions) => void;
}

/** Options for the e-mail draft: AES-256 password for the PDF and a neutral subject. */
export function EmailDraftModal({ open, loading, hasRecipient, onCancel, onConfirm }: Props) {
    // Mounted only while open (see caller), so these initialise per dialog.
    const [prefs, setPrefs] = useState<Prefs>(readPrefs);
    const [password, setPassword] = useState(() => generatePdfPassword());

    const update = (patch: Partial<Prefs>) => {
        const next = { ...prefs, ...patch };
        setPrefs(next);
        writePrefs(next);
    };
    const passwordTooShort = prefs.protect && password.length < MIN_PDF_PASSWORD_LENGTH;

    return (
        <Modal
            title="Rechnung per E-Mail"
            open={open}
            okText="E-Mail-Entwurf erstellen"
            cancelText="Abbrechen"
            confirmLoading={loading}
            okButtonProps={{ disabled: passwordTooShort }}
            onCancel={onCancel}
            onOk={() =>
                onConfirm({
                    neutralSubject: prefs.neutralSubject,
                    ...(prefs.protect ? { password, passwordHint: prefs.passwordHint } : {}),
                })
            }
        >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
                {!hasRecipient && <Alert type="warning" showIcon message="Beim Patienten ist keine E-Mail-Adresse hinterlegt – Empfänger bitte im Entwurf ergänzen." />}

                <Checkbox checked={prefs.protect} onChange={(e) => update({ protect: e.target.checked })}>
                    PDF mit Passwort schützen (AES-256)
                </Checkbox>
                {prefs.protect && (
                    <div style={{ paddingLeft: 24 }}>
                        <Space.Compact style={{ width: "100%" }}>
                            <Input
                                aria-label="Passwort"
                                value={password}
                                status={passwordTooShort ? "error" : undefined}
                                onChange={(e) => setPassword(e.target.value.trim())}
                                style={{ fontFamily: "monospace" }}
                            />
                            <Button icon={<ReloadOutlined />} onClick={() => setPassword(generatePdfPassword())} title="Neues Passwort" />
                            <Button
                                icon={<CopyOutlined />}
                                title="Kopieren"
                                onClick={() => navigator.clipboard?.writeText(password).then(() => message.success("Passwort kopiert"))}
                            />
                        </Space.Compact>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Mindestens {MIN_PDF_PASSWORD_LENGTH} Zeichen. Eigene Vereinbarung möglich, z. B. Geburtsdatum (TTMMJJJJ). Das Passwort steht nicht in der E-Mail.
                        </Text>
                        <Input
                            style={{ marginTop: 8 }}
                            aria-label="Hinweis zum Passwort"
                            value={prefs.passwordHint}
                            onChange={(e) => update({ passwordHint: e.target.value })}
                            placeholder={DEFAULT_PASSWORD_HINT}
                        />
                    </div>
                )}

                <Checkbox checked={prefs.neutralSubject} onChange={(e) => update({ neutralSubject: e.target.checked })}>
                    Neutraler Betreff („Ihre Unterlagen – Nummer“, ohne „Rechnung“ und Praxisname)
                </Checkbox>

                <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
                    Betreff, Absender und Empfänger werden nie verschlüsselt – auch nicht mit S/MIME. Hat der Empfänger ein
                    S/MIME-Zertifikat, kann die Mail zusätzlich in Outlook über <i>Optionen → Verschlüsseln</i> Ende-zu-Ende
                    verschlüsselt werden.
                </Paragraph>
            </Space>
        </Modal>
    );
}
