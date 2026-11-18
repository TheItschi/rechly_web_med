"use client";

import { useEffect, useState } from "react";
import {
    Card,
    Table,
    Button,
    Space,
    Tag,
    Typography,
    Row,
    Col,
    Statistic,
    Modal,
    Select,
    Tabs,
    Upload,
    message,
    Tooltip,
} from "antd";
import {
    ImportOutlined,
    LinkOutlined,
    StopOutlined,
    ThunderboltOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBankStore } from "@/store/bankStore";
import { useInvoiceStore } from "@/store/invoiceStore";
import { importBankTransactions } from "@/lib/bankService";
import { readCamtFile } from "@/lib/bank/readCamtFile";
import { formatCurrency } from "@/lib/currencyUtils";
import type { BankTransaction, InvoiceWithClient } from "@/types";

const { Title, Text } = Typography;

const statusColors = {
    unmatched: "warning",
    matched: "success",
    ignored: "default",
};

export default function BankPage() {
    const { t } = useLanguage();
    const { transactions, loading, fetchTransactions, matchTx, ignoreTx } =
        useBankStore();
    const { invoices, fetchInvoices } = useInvoiceStore();

    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importFormat, setImportFormat] = useState("camt");
    const [csvText, setCsvText] = useState("");
    /** CAMT: XML documents of the selected .xml/.zip */
    const [xmlFiles, setXmlFiles] = useState<string[]>([]);
    const [fileName, setFileName] = useState("");
    const [importing, setImporting] = useState(false);
    const [matchModalOpen, setMatchModalOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState<BankTransaction | null>(null);
    const [matchInvoiceId, setMatchInvoiceId] = useState<string | null>(null);

    useEffect(() => {
        fetchTransactions();
        fetchInvoices();
    }, [fetchTransactions, fetchInvoices]);

    const handleAutoMatch = () => {
        const unmatched = transactions.filter((t) => t.status === "unmatched");
        let matchCount = 0;

        for (const tx of unmatched) {
            // Match by amount and invoice number reference
            const candidate = (invoices as InvoiceWithClient[]).find((inv) => {
                if (inv.status === "paid") return false;
                const amountMatch =
                    Math.abs(inv.total_gross - Math.abs(tx.amount)) < 0.02;
                const refMatch = tx.description
                    ?.toLowerCase()
                    .includes(inv.invoice_number?.toLowerCase() ?? "");
                return amountMatch || refMatch;
            });

            if (candidate) {
                matchTx(tx.id!, candidate.id!).catch(() => {});
                matchCount++;
            }
        }

        if (matchCount > 0) {
            message.success(
                t("bank.autoMatchResult").replace("{0}", String(matchCount)),
            );
        } else {
            message.info(t("bank.noMatches"));
        }
    };

    const handleImport = async () => {
        const isCamt = importFormat === "camt";
        if (isCamt ? !xmlFiles.length : !csvText.trim()) {
            message.error(t("bank.importEmpty"));
            return;
        }
        setImporting(true);
        try {
            const result = await importBankTransactions(csvText, importFormat, isCamt ? xmlFiles : undefined);
            message.success(
                t("bank.importSuccess")
                    .replace("{0}", String(result.imported))
                    .replace("{1}", String(result.duplicates)) +
                    (result.skippedPending ? ` · ${result.skippedPending} vorgemerkte Umsätze übersprungen` : ""),
            );
            fetchTransactions(true);
            setImportModalOpen(false);
            setCsvText("");
            setXmlFiles([]);
            setFileName("");
        } catch (error) {
            const detail = error instanceof Error && error.message !== "Failed to import bank transactions" ? `: ${error.message}` : "";
            message.error(t("bank.importError") + detail);
        } finally {
            setImporting(false);
        }
    };

    const openMatch = (tx: BankTransaction) => {
        setSelectedTx(tx);
        setMatchInvoiceId(null);
        setMatchModalOpen(true);
    };

    const handleMatch = async () => {
        if (!selectedTx || !matchInvoiceId) return;
        try {
            await matchTx(selectedTx.id!, matchInvoiceId);
            message.success(t("bank.matched"));
            setMatchModalOpen(false);
        } catch {
            message.error(t("bank.matchError"));
        }
    };

    const handleIgnore = async (txId: string) => {
        try {
            await ignoreTx(txId);
            message.success(t("bank.ignored"));
        } catch {
            message.error(t("bank.ignoreError"));
        }
    };

    const columns: ColumnsType<BankTransaction> = [
        {
            title: t("bank.date"),
            dataIndex: "transaction_date",
            key: "date",
            width: 110,
        },
        {
            title: t("bank.amount"),
            dataIndex: "amount",
            key: "amount",
            width: 120,
            align: "right",
            render: (v: number) => (
                <Text style={{ color: v >= 0 ? "#52c41a" : "#f5222d" }}>
                    {formatCurrency(v)}
                </Text>
            ),
        },
        {
            title: t("bank.description"),
            dataIndex: "description",
            key: "description",
            render: (v, r) => (
                <div>
                    <div>{v}</div>
                    {r.counterpart_name && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {r.counterpart_name}
                        </Text>
                    )}
                </div>
            ),
        },
        {
            title: t("bank.status"),
            key: "status",
            width: 110,
            render: (_, r) => (
                <Tag color={statusColors[r.status]}>
                    {t(`status.${r.status}`) || r.status}
                </Tag>
            ),
        },
        {
            key: "actions",
            width: 100,
            align: "right",
            render: (_, r) => (
                <Space>
                    {r.status === "unmatched" && (
                        <>
                            <Tooltip title={t("bank.match")}>
                                <Button
                                    size="small"
                                    icon={<LinkOutlined />}
                                    onClick={() => openMatch(r)}
                                />
                            </Tooltip>
                            <Tooltip title={t("bank.ignore")}>
                                <Button
                                    size="small"
                                    icon={<StopOutlined />}
                                    onClick={() => handleIgnore(r.id!)}
                                />
                            </Tooltip>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    const unmatchedCount = transactions.filter(
        (t) => t.status === "unmatched",
    ).length;
    const matchedCount = transactions.filter(
        (t) => t.status === "matched",
    ).length;

    const tabItems = [
        {
            key: "unmatched",
            label: `${t("bank.unmatched")} (${unmatchedCount})`,
            children: (
                <Table
                    columns={columns}
                    dataSource={transactions.filter(
                        (t) => t.status === "unmatched",
                    )}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    pagination={{ pageSize: 20 }}
                />
            ),
        },
        {
            key: "matched",
            label: `${t("bank.matched")} (${matchedCount})`,
            children: (
                <Table
                    columns={columns}
                    dataSource={transactions.filter(
                        (t) => t.status === "matched",
                    )}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    pagination={{ pageSize: 20 }}
                />
            ),
        },
        {
            key: "ignored",
            label: t("bank.ignored"),
            children: (
                <Table
                    columns={columns}
                    dataSource={transactions.filter(
                        (t) => t.status === "ignored",
                    )}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    pagination={{ pageSize: 20 }}
                />
            ),
        },
    ];

    const unmatchedInvoices = (invoices as InvoiceWithClient[]).filter(
        (inv) => inv.status === "sent" || inv.status === "draft",
    );

    return (
        <div>
            <Title level={4}>{t("bank.title")}</Title>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={8}>
                    <Card size="small">
                        <Statistic
                            title={t("bank.total")}
                            value={transactions.length}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={8}>
                    <Card size="small">
                        <Statistic
                            title={t("bank.unmatched")}
                            value={unmatchedCount}
                            valueStyle={{ color: "#faad14" }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={8}>
                    <Card size="small">
                        <Statistic
                            title={t("bank.matched")}
                            value={matchedCount}
                            valueStyle={{ color: "#52c41a" }}
                        />
                    </Card>
                </Col>
            </Row>

            <div
                style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "flex-end",
                    marginBottom: 16,
                }}
            >
                <Button
                    icon={<ThunderboltOutlined />}
                    onClick={handleAutoMatch}
                    disabled={unmatchedCount === 0}
                >
                    {t("bank.autoMatch")}
                </Button>
                <Button
                    type="primary"
                    icon={<ImportOutlined />}
                    onClick={() => setImportModalOpen(true)}
                >
                    {t("bank.import")}
                </Button>
            </div>

            <Card>
                <Tabs items={tabItems} />
            </Card>

            {/* Import modal */}
            <Modal
                title={t("bank.importTitle")}
                open={importModalOpen}
                onCancel={() => setImportModalOpen(false)}
                onOk={handleImport}
                okText={t("bank.importBtn")}
                cancelText={t("bank.cancel")}
                confirmLoading={importing}
                width={600}
            >
                <Space direction="vertical" style={{ width: "100%" }}>
                    <div>
                        <label style={{ display: "block", marginBottom: 4 }}>
                            {t("bank.format")}
                        </label>
                        <Select
                            value={importFormat}
                            onChange={(value: string) => {
                                setImportFormat(value);
                                setCsvText("");
                                setXmlFiles([]);
                                setFileName("");
                            }}
                            style={{ width: 320 }}
                            options={[
                                {
                                    value: "camt",
                                    label: "CAMT-XML (ISO 20022, z. B. Sparkasse)",
                                },
                                {
                                    value: "dkb",
                                    label: t("bank.format.dkb") || "DKB",
                                },
                                {
                                    value: "ing",
                                    label: t("bank.format.ing") || "ING",
                                },
                                {
                                    value: "generic",
                                    label:
                                        t("bank.format.generic") ||
                                        "Generic CSV",
                                },
                            ]}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: 4 }}>
                            {t("bank.csvFile")}
                        </label>
                        <Upload.Dragger
                            accept={importFormat === "camt" ? ".xml,.zip" : ".csv,.txt"}
                            showUploadList={false}
                            beforeUpload={(file) => {
                                setFileName(file.name);
                                if (importFormat === "camt") {
                                    readCamtFile(file)
                                        .then((docs) => {
                                            setXmlFiles(docs);
                                            if (!docs.length) message.error("Keine XML-Datei im ZIP gefunden");
                                        })
                                        .catch(() => message.error("Datei konnte nicht gelesen werden"));
                                    return false;
                                }
                                const reader = new FileReader();
                                reader.onload = (e) =>
                                    setCsvText(
                                        (e.target?.result as string) || "",
                                    );
                                reader.readAsText(file, "windows-1252");
                                return false;
                            }}
                        >
                            <p className="ant-upload-text">
                                {importFormat === "camt"
                                    ? "CAMT-Datei (.xml oder .zip) hierher ziehen oder klicken – im Online-Banking z. B. „XML (CAMT V8 – gebuchte Umsätze)“"
                                    : t("bank.uploadHint")}
                            </p>
                        </Upload.Dragger>
                        {importFormat === "camt" && xmlFiles.length > 0 && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {fileName} · {xmlFiles.length} {xmlFiles.length === 1 ? "Kontoauszug" : "Kontoauszüge"}
                            </Text>
                        )}
                        {importFormat !== "camt" && csvText && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {csvText.split("\n").length} {t("bank.lines")}
                            </Text>
                        )}
                    </div>
                </Space>
            </Modal>

            {/* Manual match modal */}
            <Modal
                title={t("bank.matchTitle")}
                open={matchModalOpen}
                onCancel={() => setMatchModalOpen(false)}
                onOk={handleMatch}
                okText={t("bank.matchBtn")}
                cancelText={t("bank.cancel")}
                okButtonProps={{ disabled: !matchInvoiceId }}
            >
                {selectedTx && (
                    <div style={{ marginBottom: 16 }}>
                        <Text strong>{formatCurrency(selectedTx.amount)}</Text>
                        <br />
                        <Text type="secondary">{selectedTx.description}</Text>
                    </div>
                )}
                <Select
                    showSearch
                    placeholder={t("bank.selectInvoice")}
                    style={{ width: "100%" }}
                    value={matchInvoiceId}
                    onChange={setMatchInvoiceId}
                    optionFilterProp="label"
                    options={unmatchedInvoices.map((inv) => ({
                        value: inv.id,
                        label: `${inv.invoice_number} — ${inv.client?.name || "?"} — ${formatCurrency(inv.total_gross)}`,
                    }))}
                />
            </Modal>
        </div>
    );
}
