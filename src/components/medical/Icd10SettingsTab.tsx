"use client";

import { useEffect, useState } from "react";
import { Alert, Card, Descriptions, Input, Space, Typography, Upload, message } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { getIcd10Status, searchIcd10Codes, type Icd10Status } from "@/lib/medicalService";
import type { Icd10Code } from "@/lib/icd10";

const { Text, Paragraph, Link } = Typography;

export function Icd10SettingsTab() {
    const [status, setStatus] = useState<Icd10Status | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [probe, setProbe] = useState<Icd10Code[]>([]);

    const refresh = () => getIcd10Status().then(setStatus).catch(() => setStatus({ available: false }));
    useEffect(() => {
        refresh();
    }, []);

    const upload = async (file: File) => {
        setUploading(true);
        setError(null);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch("/api/icd10/import", { method: "POST", body: form });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || "Import fehlgeschlagen");
            message.success(`${body.count.toLocaleString("de-DE")} Kodes importiert${body.version ? ` (${body.version})` : ""}`);
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Import fehlgeschlagen");
        } finally {
            setUploading(false);
        }
    };

    return (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card title="Aktueller ICD-10-GM-Katalog">
                {status?.available ? (
                    <Descriptions column={1} size="small">
                        <Descriptions.Item label="Version">{status.version ?? "–"}</Descriptions.Item>
                        <Descriptions.Item label="Kodes">{status.count?.toLocaleString("de-DE")}</Descriptions.Item>
                        <Descriptions.Item label="Importiert">
                            {status.importedAt ? new Date(status.importedAt).toLocaleString("de-DE") : "–"}
                            {status.source ? ` · ${status.source}` : ""}
                        </Descriptions.Item>
                    </Descriptions>
                ) : (
                    <Text type="secondary">Noch kein Katalog importiert – Diagnosen können nur frei erfasst werden.</Text>
                )}
                {status?.available && (
                    <Input.Search
                        style={{ marginTop: 12, maxWidth: 420 }}
                        placeholder="Testsuche, z. B. J06 oder Kopfschmerz"
                        allowClear
                        onSearch={(q) => (q.trim().length >= 2 ? searchIcd10Codes(q).then((r) => setProbe(r.results.slice(0, 8))) : setProbe([]))}
                    />
                )}
                {probe.map((c) => (
                    <div key={c.code}>
                        <Text code>{c.code}</Text> {c.title}
                    </div>
                ))}
            </Card>

            <Card title="Katalog importieren">
                <Paragraph>
                    Benötigt wird die <Text strong>Systematik</Text> des BfArM, EDV-Fassung TXT (CSV) – entweder die heruntergeladene ZIP-Datei
                    oder die darin enthaltene <Text code>icd10gmJJJJsyst_kodes.txt</Text>. Das Alphabetische Verzeichnis wird nicht unterstützt.
                    Download: <Link href="https://www.bfarm.de/DE/Kodiersysteme/Services/Downloads/_node.html" target="_blank" rel="noreferrer">BfArM – Downloads Kodiersysteme</Link>
                </Paragraph>
                {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} closable onClose={() => setError(null)} />}
                <Upload.Dragger
                    accept=".txt,.zip"
                    multiple={false}
                    showUploadList={false}
                    disabled={uploading}
                    beforeUpload={(file) => {
                        void upload(file);
                        return false;
                    }}
                >
                    <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                    <p className="ant-upload-text">{uploading ? "Wird verarbeitet …" : "ZIP oder …syst_kodes.txt hierher ziehen oder klicken"}</p>
                    <p className="ant-upload-hint">Ein erneuter Import ersetzt den vorhandenen Katalog. Bereits erstellte Rechnungen bleiben unverändert.</p>
                </Upload.Dragger>
            </Card>
        </Space>
    );
}
