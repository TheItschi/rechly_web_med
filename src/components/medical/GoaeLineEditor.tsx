"use client";

import { AutoComplete, Button, Checkbox, DatePicker, Input, InputNumber, Select, Space, Tag, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import {
    baseFeeFromPoints,
    exceedsMaximum,
    findGoaeEntry,
    formatFactor,
    GOAE_FEE_FRAMES,
    GOAE_FEE_TYPE_LABELS,
    guessGoaeFeeType,
    listGoaeCatalog,
    needsJustification,
    normalizeGoaeNumber,
    type GoaeFeeType,
} from "@/lib/goae";

const { Text } = Typography;

/** Editable GOÄ state of an invoice line (camelCase, UI only). */
export interface GoaeLineState {
    number: string;
    factor: number;
    serviceDate: string;
    justification?: string;
    feeType: GoaeFeeType;
    /** Einfachsatz for numbers outside the catalogue */
    baseFee?: number;
    feeAgreement?: boolean;
}

export const goaeStateForNumber = (number: string, serviceDate: string): GoaeLineState => {
    const feeType = guessGoaeFeeType(number);
    return { number: normalizeGoaeNumber(number), factor: GOAE_FEE_FRAMES[feeType].threshold, serviceDate, feeType };
};

export const goaeCatalogOptions = () =>
    listGoaeCatalog().map((e) => ({
        value: e.number,
        label: `${/^\d/.test(e.number) ? "Nr." : "Zuschlag"} ${e.number} – ${e.title.length > 70 ? `${e.title.slice(0, 70)}…` : e.title} (${e.points} P.)`,
    }));

interface Props {
    value: GoaeLineState;
    hasError?: boolean;
    onChange: (next: GoaeLineState, catalogTitle?: string) => void;
}

export function GoaeLineEditor({ value, hasError, onChange }: Props) {
    const entry = findGoaeEntry(value.number);
    const frame = GOAE_FEE_FRAMES[value.feeType];
    const isSurcharge = value.feeType === "surcharge";
    const overThreshold = !isSurcharge && needsJustification(value.feeType, value.factor);
    const overMax = !isSurcharge && exceedsMaximum(value.feeType, value.factor);
    const baseFee = entry ? baseFeeFromPoints(entry.points) : value.baseFee ?? 0;

    const setNumber = (raw: string) => {
        const number = normalizeGoaeNumber(raw);
        const known = findGoaeEntry(number);
        const feeType = known?.feeType ?? (number === value.number ? value.feeType : guessGoaeFeeType(number));
        // Reset the factor to the default of the new fee frame when the frame changes.
        const factor = feeType === value.feeType ? value.factor : GOAE_FEE_FRAMES[feeType].threshold;
        onChange({ ...value, number, feeType, factor }, known?.title);
    };

    return (
        <Space direction="vertical" size={6} style={{ width: "100%", padding: 8, background: "rgba(22,119,255,0.04)", borderRadius: 6, border: hasError ? "1px solid #ff4d4f" : "1px solid rgba(22,119,255,0.15)" }}>
            <Space wrap size={8}>
                <Tooltip title="GOÄ-Ziffer (Katalog oder frei)">
                    <AutoComplete
                        aria-label="GOÄ-Ziffer"
                        style={{ width: 110 }}
                        value={value.number}
                        options={goaeCatalogOptions()}
                        popupMatchSelectWidth={480}
                        filterOption={(input, option) => String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                        onChange={(v) => setNumber(String(v))}
                        placeholder="GOÄ-Nr."
                    />
                </Tooltip>
                <Tooltip title="Datum der Leistungserbringung">
                    <DatePicker
                        aria-label="Leistungsdatum"
                        value={value.serviceDate ? dayjs(value.serviceDate) : null}
                        format="DD.MM.YYYY"
                        allowClear={false}
                        onChange={(d) => d && onChange({ ...value, serviceDate: d.format("YYYY-MM-DD") })}
                        style={{ width: 130 }}
                    />
                </Tooltip>
                <Tooltip title={isSurcharge ? "Zuschläge nur mit einfachem Satz" : `Schwellenwert ${formatFactor(frame.threshold)} · Höchstsatz ${formatFactor(frame.max)}`}>
                    <Space.Compact>
                        <InputNumber
                            aria-label="Steigerungssatz"
                            value={value.factor}
                            min={isSurcharge ? 0.5 : 1}
                            max={isSurcharge ? 1 : 10}
                            step={isSurcharge ? 0.5 : 0.1}
                            precision={2}
                            status={overMax && !value.feeAgreement ? "error" : overThreshold ? "warning" : undefined}
                            onChange={(v) => onChange({ ...value, factor: Number(v) || frame.threshold })}
                            style={{ width: 90 }}
                        />
                        <Button disabled style={{ pointerEvents: "none" }}>×</Button>
                    </Space.Compact>
                </Tooltip>
                {entry ? (
                    <Tag>{GOAE_FEE_TYPE_LABELS[value.feeType]} · {entry.points} Punkte · Einfachsatz {baseFee.toFixed(2).replace(".", ",")} €</Tag>
                ) : (
                    <>
                        <Select
                            aria-label="Gebührenart"
                            value={value.feeType}
                            style={{ width: 170 }}
                            onChange={(feeType: GoaeFeeType) => onChange({ ...value, feeType, factor: GOAE_FEE_FRAMES[feeType].threshold })}
                            options={Object.entries(GOAE_FEE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                        />
                        <Tooltip title="Einfachsatz (1,0-fach) in Euro">
                            <Space.Compact>
                                <InputNumber
                                    aria-label="Einfachsatz"
                                    value={value.baseFee}
                                    min={0}
                                    step={0.01}
                                    precision={2}
                                    placeholder="Einfachsatz"
                                    onChange={(v) => onChange({ ...value, baseFee: Number(v) || 0 })}
                                    style={{ width: 110 }}
                                />
                                <Button disabled style={{ pointerEvents: "none" }}>€</Button>
                            </Space.Compact>
                        </Tooltip>
                    </>
                )}
            </Space>
            {(overThreshold || value.justification) && (
                <Input.TextArea
                    aria-label="Begründung"
                    value={value.justification}
                    status={overThreshold && !value.justification?.trim() ? "error" : undefined}
                    onChange={(e) => onChange({ ...value, justification: e.target.value })}
                    rows={2}
                    maxLength={1000}
                    placeholder={`Begründung für Faktor ${formatFactor(value.factor)} (> ${formatFactor(frame.threshold)}): patientenbezogen, verständlich, z. B. „erhöhter Zeitaufwand wegen …“`}
                />
            )}
            {overMax && (
                <Checkbox checked={!!value.feeAgreement} onChange={(e) => onChange({ ...value, feeAgreement: e.target.checked })}>
                    <Text type={value.feeAgreement ? undefined : "danger"}>Schriftliche Vereinbarung nach § 2 GOÄ liegt vor</Text>
                </Checkbox>
            )}
        </Space>
    );
}
