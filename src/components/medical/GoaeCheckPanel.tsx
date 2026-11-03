"use client";

import { Alert, Collapse, List, Space, Tag, Typography } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import type { GoaeFinding } from "@/lib/goae";

const { Text } = Typography;

const COLORS = { error: "red", warning: "orange", info: "blue" } as const;
const LABELS = { error: "Fehler", warning: "Hinweis", info: "Info" } as const;

export function GoaeCheckPanel({ findings, loadingHistory }: { findings: GoaeFinding[]; loadingHistory?: boolean }) {
    const errors = findings.filter((f) => f.severity === "error").length;
    const warnings = findings.filter((f) => f.severity === "warning").length;
    const infos = findings.filter((f) => f.severity === "info");
    const relevant = findings.filter((f) => f.severity !== "info");

    if (!findings.length) {
        return (
            <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message={loadingHistory ? "GOÄ-Prüfung: frühere Leistungen werden geladen …" : "GOÄ-Prüfung: keine Auffälligkeiten"}
            />
        );
    }

    return (
        <Alert
            type={errors ? "error" : warnings ? "warning" : "info"}
            showIcon
            message={
                <Space>
                    <Text strong>GOÄ-Prüfung</Text>
                    {errors > 0 && <Tag color="red">{errors} Fehler</Tag>}
                    {warnings > 0 && <Tag color="orange">{warnings} Hinweise</Tag>}
                    {loadingHistory && <Text type="secondary">frühere Leistungen werden geladen …</Text>}
                </Space>
            }
            description={
                <>
                    {relevant.length > 0 && (
                        <List
                            size="small"
                            split={false}
                            dataSource={relevant}
                            renderItem={(f) => (
                                <List.Item style={{ padding: "2px 0" }}>
                                    <Tag color={COLORS[f.severity]}>{LABELS[f.severity]}</Tag> {f.message}
                                </List.Item>
                            )}
                        />
                    )}
                    {infos.length > 0 && (
                        <Collapse
                            ghost
                            size="small"
                            items={[{
                                key: "info",
                                label: `${infos.length} Abrechnungshinweise`,
                                children: infos.map((f, i) => <div key={i}><Text type="secondary">{f.message}</Text></div>),
                            }]}
                        />
                    )}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Automatische Plausibilitätsprüfung auf Basis des hinterlegten Regelauszugs; maßgeblich bleibt der amtliche GOÄ-Text. Behandlungsfall = 1 Monat ab erster Inanspruchnahme (je Patient, ohne Unterscheidung der Erkrankung).
                    </Text>
                </>
            }
        />
    );
}
