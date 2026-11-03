"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Input, Popconfirm, Radio, Space, Table, Tag, Typography, Upload, message } from "antd";
import { DownloadOutlined, InboxOutlined, UndoOutlined } from "@ant-design/icons";
import { baseFeeFromPoints, GOAE_FEE_TYPE_LABELS, listGoaeCatalog, setGoaeCustomCatalog, type GoaeCatalogEntry, type GoaeCatalogMode } from "@/lib/goae";
import { activateGoaeCatalog, type GoaeCatalogInfo } from "@/lib/medicalService";

const { Text, Paragraph } = Typography;

const rulesSummary = (e: GoaeCatalogEntry) =>
    [
        e.notWith?.length ? `nicht neben ${e.notWith.slice(0, 6).join(", ")}${e.notWith.length > 6 ? " …" : ""}` : "",
        e.onlyWith?.length ? `nur neben ${e.onlyWith.join(", ")}` : "",
        e.alone ? "nur allein" : "",
        e.requiresOneOf?.length ? `erfordert ${e.requiresOneOf.slice(0, 6).join(", ")}${e.requiresOneOf.length > 6 ? " …" : ""}` : "",
        e.maxPerDay ? `max. ${e.maxPerDay}×/Tag` : "",
        e.maxPerCase ? `max. ${e.maxPerCase}×/Fall` : "",
        e.maxPerPeriod ? `max. ${e.maxPerPeriod.count}× ${e.maxPerPeriod.calendarYear ? "/Jahr" : `in ${e.maxPerPeriod.months} Mon.`}` : "",
        e.minMinutes ? `≥ ${e.minMinutes} Min.` : "",
    ].filter(Boolean).join(" · ");

export function GoaeSettingsTab() {
    const [info, setInfo] = useState<GoaeCatalogInfo | null>(null);
    const [version, setVersion] = useState(0);
    const [mode, setMode] = useState<GoaeCatalogMode>("merge");
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState<{ row: number; message: string }[]>([]);
    const [filter, setFilter] = useState("");

    const refresh = () =>
        activateGoaeCatalog()
            .then((i) => {
                setInfo(i);
                setVersion((v) => v + 1);
            })
            .catch(() => undefined);
    useEffect(() => {
        refresh();
    }, []);

    const entries = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return listGoaeCatalog().filter((e) => !q || e.number.toLowerCase() === q || e.title.toLowerCase().includes(q));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- version invalidates the global catalogue
    }, [filter, version]);
    const customNumbers = useMemo(() => new Set(info?.custom?.entries.map((e) => e.number) ?? []), [info]);

    const upload = async (file: File) => {
        setUploading(true);
        setErrors([]);
        try {
            const form = new FormData();
            form.append("file", file);
            form.append("mode", mode);
            const res = await fetch("/api/goae/catalog", { method: "POST", body: form });
            const body = await res.json();
            setErrors(body.errors ?? []);
            if (!res.ok) throw new Error(body.error || "Import fehlgeschlagen");
            message.success(`${body.imported} Ziffern importiert – ${body.effectiveCount} aktiv`);
            await refresh();
        } catch (e) {
            message.error(e instanceof Error ? e.message : "Import fehlgeschlagen");
        } finally {
            setUploading(false);
        }
    };

    const reset = async () => {
        await fetch("/api/goae/catalog", { method: "DELETE" });
        setGoaeCustomCatalog(null);
        message.success("Auf mitgelieferten Katalogauszug zurückgesetzt");
        await refresh();
    };

    return (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card
                title="GOÄ-Ziffern"
                extra={
                    <Space>
                        <Button icon={<DownloadOutlined />} href="/api/goae/catalog?format=csv">
                            Als CSV exportieren
                        </Button>
                        {info?.custom && (
                            <Popconfirm title="Eigenen Katalog entfernen?" okText="Zurücksetzen" cancelText="Abbrechen" onConfirm={reset}>
                                <Button icon={<UndoOutlined />}>Zurücksetzen</Button>
                            </Popconfirm>
                        )}
                    </Space>
                }
            >
                <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                    {info?.custom
                        ? `Eigener Katalog (${info.custom.mode === "replace" ? "ersetzt" : "ergänzt"} den Auszug): ${info.custom.count} Ziffern aus ${info.custom.source ?? "Upload"}, importiert ${new Date(info.custom.importedAt).toLocaleString("de-DE")}.`
                        : "Mitgelieferter Auszug (Abschnitt B, Zuschläge, einzelne C-Leistungen)."}{" "}
                    Aktiv: {entries.length === listGoaeCatalog().length ? entries.length : `${entries.length} von ${listGoaeCatalog().length}`} Ziffern.
                </Paragraph>
                <Input.Search placeholder="Ziffer oder Begriff filtern" allowClear onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 320, marginBottom: 12 }} />
                <Table<GoaeCatalogEntry>
                    size="small"
                    rowKey="number"
                    dataSource={entries}
                    pagination={{ pageSize: 15, showSizeChanger: false }}
                    columns={[
                        { title: "Ziffer", dataIndex: "number", width: 80, render: (n: string) => <Space size={4}>{n}{customNumbers.has(n) && <Tag color="blue">eigen</Tag>}</Space> },
                        { title: "Bezeichnung", dataIndex: "title", ellipsis: true },
                        { title: "Punkte", dataIndex: "points", width: 70, align: "right" },
                        { title: "1,0-fach", width: 80, align: "right", render: (_, e) => `${baseFeeFromPoints(e.points).toFixed(2).replace(".", ",")} €` },
                        { title: "Art", dataIndex: "feeType", width: 150, render: (f: GoaeCatalogEntry["feeType"]) => GOAE_FEE_TYPE_LABELS[f] },
                        { title: "Regeln", render: (_, e) => <Text type="secondary" style={{ fontSize: 12 }}>{rulesSummary(e)}</Text> },
                    ]}
                />
            </Card>

            <Card title="Katalog hochladen (CSV)">
                <Paragraph>
                    CSV mit Semikolon, erste Zeile Spaltennamen. Pflicht: <Text code>Ziffer</Text>, <Text code>Bezeichnung</Text>, <Text code>Punkte</Text>.
                    Optional: <Text code>Gebuehrenart</Text> (persönlich/technisch/labor/zuschlag), <Text code>Abschnitt</Text>, <Text code>NichtNeben</Text>,{" "}
                    <Text code>NurNeben</Text>, <Text code>Allein</Text>, <Text code>Erfordert</Text>, <Text code>MaxTag</Text>, <Text code>MaxFall</Text>,{" "}
                    <Text code>MaxAnzahl</Text> + <Text code>MaxMonate</Text> oder <Text code>Kalenderjahr</Text>, <Text code>NichtImFall</Text>, <Text code>MinMinuten</Text>,{" "}
                    <Text code>MehrfachBegruendung</Text>, <Text code>Hinweis</Text>. Listen mit Komma trennen. Am einfachsten: aktuellen Katalog exportieren, in Excel ergänzen, wieder hochladen.
                </Paragraph>
                <Space style={{ marginBottom: 12 }}>
                    <Text>Hochgeladene Ziffern</Text>
                    <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} optionType="button" size="small" options={[
                        { value: "merge", label: "ergänzen den Auszug" },
                        { value: "replace", label: "ersetzen den Auszug" },
                    ]} />
                </Space>
                {errors.length > 0 && (
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 12 }}
                        message={`${errors.length} Zeile(n) übersprungen`}
                        description={errors.slice(0, 10).map((e) => <div key={`${e.row}-${e.message}`}>Zeile {e.row}: {e.message}</div>)}
                    />
                )}
                <Upload.Dragger
                    accept=".csv,.txt"
                    multiple={false}
                    showUploadList={false}
                    disabled={uploading}
                    beforeUpload={(file) => {
                        void upload(file);
                        return false;
                    }}
                >
                    <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                    <p className="ant-upload-text">{uploading ? "Wird verarbeitet …" : "CSV hierher ziehen oder klicken"}</p>
                    <p className="ant-upload-hint">Ein neuer Upload ersetzt einen vorher hochgeladenen Katalog. Bestehende Rechnungen bleiben unverändert.</p>
                </Upload.Dragger>
            </Card>
        </Space>
    );
}
