"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Input, List, Radio, Select, Space, Spin, Typography } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import {
    CERTAINTY_LABELS,
    formatDiagnosis,
    isIcd10Code,
    SIDE_LABELS,
    type DiagnosisCertainty,
    type DiagnosisDisplay,
    type DiagnosisSide,
    type Icd10Code,
    type InvoiceDiagnosis,
} from "@/lib/icd10";
import { searchIcd10Codes } from "@/lib/medicalService";

const { Text } = Typography;

interface Props {
    diagnoses: InvoiceDiagnosis[];
    display: DiagnosisDisplay;
    onChange: (diagnoses: InvoiceDiagnosis[]) => void;
    onDisplayChange: (display: DiagnosisDisplay) => void;
}

export function DiagnosisPicker({ diagnoses, display, onChange, onDisplayChange }: Props) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Icd10Code[]>([]);
    const [searching, setSearching] = useState(false);
    const [catalog, setCatalog] = useState<{ available: boolean; version?: string } | null>(null);
    const [freeCode, setFreeCode] = useState("");
    const [freeText, setFreeText] = useState("");
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        // Probe once whether a catalogue has been imported.
        searchIcd10Codes("").then((r) => setCatalog({ available: r.available, version: r.version })).catch(() => setCatalog({ available: false }));
    }, []);

    const handleSearch = (value: string) => {
        setQuery(value);
        if (value.trim().length < 2) setResults([]);
    };

    useEffect(() => {
        if (query.trim().length < 2) return;
        const timer = setTimeout(() => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            setSearching(true);
            searchIcd10Codes(query, controller.signal)
                .then((r) => setResults(r.results))
                .catch(() => undefined)
                .finally(() => setSearching(false));
        }, 250);
        return () => clearTimeout(timer);
    }, [query]);

    const add = (d: InvoiceDiagnosis) => {
        if (d.code && diagnoses.some((x) => x.code === d.code)) return;
        onChange([...diagnoses, { certainty: "G", ...d }]);
    };
    const update = (index: number, patch: Partial<InvoiceDiagnosis>) =>
        onChange(diagnoses.map((d, i) => (i === index ? { ...d, ...patch } : d)));

    const freeCodeValid = !freeCode.trim() || isIcd10Code(freeCode);

    return (
        <Space direction="vertical" style={{ width: "100%" }} size={10}>
            {catalog && !catalog.available && (
                <Alert
                    type="info"
                    showIcon
                    message="Kein ICD-10-GM-Katalog importiert"
                    description="Diagnosen können frei erfasst werden. Für die Suche die BfArM-Systematik unter Einstellungen → ICD-10 Codes hochladen."
                />
            )}
            {catalog?.available && (
                <Select
                    showSearch
                    value={null}
                    style={{ width: "100%" }}
                    placeholder={`ICD-10-GM suchen – Kode oder Begriff${catalog.version ? ` (${catalog.version})` : ""}`}
                    filterOption={false}
                    onSearch={handleSearch}
                    notFoundContent={searching ? <Spin size="small" /> : query.length >= 2 ? "Keine Treffer" : null}
                    onChange={(code: string) => {
                        const hit = results.find((r) => r.code === code);
                        if (hit) add({ code: hit.code, text: hit.title });
                        handleSearch("");
                    }}
                    options={results.map((r) => ({ value: r.code, label: `${r.code} – ${r.title}` }))}
                />
            )}
            <Space.Compact style={{ width: "100%" }}>
                <Input
                    style={{ width: 120 }}
                    value={freeCode}
                    status={freeCodeValid ? undefined : "error"}
                    onChange={(e) => setFreeCode(e.target.value.toUpperCase())}
                    placeholder="ICD (optional)"
                />
                <Input value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder="Diagnose im Klartext" onPressEnter={() => document.getElementById("add-free-diagnosis")?.click()} />
                <Button
                    id="add-free-diagnosis"
                    icon={<PlusOutlined />}
                    disabled={!freeCodeValid || (!freeText.trim() && !freeCode.trim())}
                    onClick={() => {
                        add({ ...(freeCode.trim() ? { code: freeCode.trim() } : {}), text: freeText.trim() || freeCode.trim() });
                        setFreeCode("");
                        setFreeText("");
                    }}
                >
                    Hinzufügen
                </Button>
            </Space.Compact>

            {diagnoses.length > 0 && (
                <List
                    size="small"
                    bordered
                    dataSource={diagnoses}
                    renderItem={(d, i) => (
                        <List.Item
                            actions={[
                                <Select<DiagnosisCertainty>
                                    key="c"
                                    size="small"
                                    value={d.certainty ?? "G"}
                                    style={{ width: 130 }}
                                    onChange={(certainty) => update(i, { certainty })}
                                    options={Object.entries(CERTAINTY_LABELS).map(([v, l]) => ({ value: v as DiagnosisCertainty, label: `${v} – ${l}` }))}
                                />,
                                <Select<DiagnosisSide | "">
                                    key="s"
                                    size="small"
                                    value={d.side ?? ""}
                                    style={{ width: 110 }}
                                    onChange={(side) => update(i, { side: side || undefined })}
                                    options={[{ value: "", label: "Seite –" }, ...Object.entries(SIDE_LABELS).map(([v, l]) => ({ value: v as DiagnosisSide, label: `${v} – ${l}` }))]}
                                />,
                                <Button key="d" type="text" danger icon={<DeleteOutlined />} onClick={() => onChange(diagnoses.filter((_, j) => j !== i))} />,
                            ]}
                        >
                            <Text>{formatDiagnosis(d, "both")}</Text>
                        </List.Item>
                    )}
                />
            )}

            <Space>
                <Text type="secondary">Auf der Rechnung:</Text>
                <Radio.Group
                    size="small"
                    value={display}
                    onChange={(e) => onDisplayChange(e.target.value)}
                    options={[
                        { value: "text", label: "Klartext" },
                        { value: "code", label: "ICD-Schlüssel" },
                        { value: "both", label: "Beides" },
                    ]}
                    optionType="button"
                />
            </Space>
        </Space>
    );
}
