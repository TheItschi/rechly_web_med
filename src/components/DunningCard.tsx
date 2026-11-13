"use client";

import DecimalInput from "@/components/DecimalInput";

import { useCallback, useEffect, useState } from "react";
import {
    Button,
    Card,
    List,
    Modal,
    Tag,
    Typography,
    message,
} from "antd";
import { MailOutlined, PrinterOutlined } from "@ant-design/icons";
import { formatCurrency } from "@/lib/currencyUtils";
import { formatDateGerman } from "@/lib/dateUtils";
import {
    generateDunningLetterHTML,
    type DunningNoticeData,
} from "@/lib/dunningLetter";
import type { InvoiceWithDetails, UserCompany } from "@/types";

const { Text } = Typography;

const LEVEL_LABELS: Record<number, string> = {
    1: "Zahlungserinnerung",
    2: "1. Mahnung",
    3: "2. Mahnung",
};

interface DunningNotice extends DunningNoticeData {
    id: string;
}

interface DunningCardProps {
    invoice: InvoiceWithDetails;
    company: UserCompany | null;
}

/**
 * Mahnwesen section on the invoice detail page: staged dunning with
 * printable letters. Only shown for sent invoices past their due date
 * (or ones that already have notices).
 */
export default function DunningCard({ invoice, company }: DunningCardProps) {
    const [notices, setNotices] = useState<DunningNotice[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [fee, setFee] = useState(0);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch(`/api/invoices/${invoice.id}/dunning`);
            if (res.ok) setNotices(await res.json());
        } catch (error) {
            console.error("Error loading dunning notices:", error);
        }
    }, [invoice.id]);

    useEffect(() => {
        load();
    }, [load]);

    const today = new Date().toISOString().slice(0, 10);
    const isOverdue =
        invoice.status === "sent" &&
        !!invoice.due_date &&
        invoice.due_date < today &&
        !invoice.correction_type;

    if (!isOverdue && notices.length === 0) return null;

    const maxLevel = notices.reduce(
        (max, notice) => Math.max(max, notice.level),
        0
    );
    const nextLevel = Math.min(3, maxLevel + 1);

    const printLetter = async (notice: DunningNoticeData) => {
        if (!company) return;
        const html = await generateDunningLetterHTML(company, invoice, notice);
        const win = window.open("", "_blank");
        if (!win) return;
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 300);
    };

    const handleCreate = async () => {
        try {
            setBusy(true);
            const res = await fetch(`/api/invoices/${invoice.id}/dunning`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ level: nextLevel, fee }),
            });
            if (!res.ok) throw new Error("failed");
            const notice: DunningNotice = await res.json();
            setModalOpen(false);
            await load();
            await printLetter(notice);
        } catch (error) {
            console.error("Dunning creation failed:", error);
            message.error("Mahnung konnte nicht erstellt werden.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card
            title="Mahnwesen"
            style={{ marginTop: 24 }}
            extra={
                maxLevel < 3 &&
                isOverdue && (
                    <Button
                        type="primary"
                        icon={<MailOutlined />}
                        onClick={() => {
                            setFee(nextLevel === 1 ? 0 : nextLevel === 2 ? 5 : 10);
                            setModalOpen(true);
                        }}
                    >
                        {LEVEL_LABELS[nextLevel]} erstellen
                    </Button>
                )
            }
        >
            {notices.length === 0 ? (
                <Text type="secondary">
                    Diese Rechnung ist überfällig. Erstellen Sie eine
                    Zahlungserinnerung — die Mahnstufen (Erinnerung, 1. und 2.
                    Mahnung) bauen aufeinander auf.
                </Text>
            ) : (
                <List
                    dataSource={notices}
                    renderItem={(notice) => (
                        <List.Item
                            actions={[
                                <Button
                                    key="print"
                                    size="small"
                                    icon={<PrinterOutlined />}
                                    onClick={() => printLetter(notice)}
                                >
                                    Drucken
                                </Button>,
                            ]}
                        >
                            <List.Item.Meta
                                title={
                                    <>
                                        <Tag color="orange">
                                            {LEVEL_LABELS[notice.level]}
                                        </Tag>
                                        {notice.notice_number}
                                    </>
                                }
                                description={`${formatDateGerman(notice.issue_date)} · ${notice.days_overdue} Tage überfällig${notice.fee ? ` · Gebühr ${formatCurrency(notice.fee, "de")}` : ""}`}
                            />
                        </List.Item>
                    )}
                />
            )}

            <Modal
                title={`${LEVEL_LABELS[nextLevel]} erstellen`}
                open={modalOpen}
                onOk={handleCreate}
                onCancel={() => setModalOpen(false)}
                okText="Erstellen & drucken"
                confirmLoading={busy}
            >
                <p style={{ marginBottom: 12 }}>
                    Es wird ein Mahnschreiben mit fortlaufender Nummer
                    erstellt. Die Mahngebühr wird zum offenen Betrag addiert
                    (Girocode inklusive).
                </p>
                <DecimalInput
                    addonBefore="Mahngebühr"
                    addonAfter="€"
                    min={0}
                    value={fee}
                    onChange={(value) => setFee(Number(value) || 0)}
                    style={{ width: 260 }}
                />
            </Modal>
        </Card>
    );
}
