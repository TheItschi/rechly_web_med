"use client";

import DecimalInput from "@/components/DecimalInput";

import { useEffect, useState, useCallback } from "react";
import dayjs from "dayjs";
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
    Input,
    Select,
    DatePicker,
    Upload,
    message,
} from "antd";
import {
    ImportOutlined,
    PlusOutlined,
    DeleteOutlined,
    EditOutlined,
    UploadOutlined,
    ScanOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useLanguage } from "@/contexts/LanguageContext";
import { useExpenseStore } from "@/store/expenseStore";
import { ocrExpenseReceipt, uploadExpenseReceipt } from "@/lib/expenseService";
import { formatCurrency } from "@/lib/currencyUtils";
import type { Expense, ExpenseCategory, ExpenseFormData } from "@/types";

const { Title, Text } = Typography;

const categoryColors: Record<ExpenseCategory, string> = {
    office: "blue",
    travel: "cyan",
    software: "purple",
    hardware: "geekblue",
    marketing: "magenta",
    consulting: "gold",
    utilities: "orange",
    rent: "volcano",
    insurance: "lime",
    other: "default",
};

const DEFAULT_FORM: ExpenseFormData = {
    date: dayjs().format("YYYY-MM-DD"),
    vendor_name: "",
    description: "",
    amount_net: 0,
    vat_amount: 0,
    amount_gross: 0,
    vat_rate_percent: 19,
    category: "other",
    payment_method: "bank_transfer",
};

export default function ExpensesPage() {
    const { t } = useLanguage();
    const {
        expenses,
        loading,
        fetchExpenses,
        addExpense,
        editExpense,
        removeExpense,
    } = useExpenseStore();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ExpenseFormData>(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [, setCreatedExpenseId] = useState<string | null>(
        null,
    );

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    const openCreate = () => {
        setEditingId(null);
        setForm(DEFAULT_FORM);
        setPendingFile(null);
        setCreatedExpenseId(null);
        setModalOpen(true);
    };

    const handleImportEInvoice = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".xml,.pdf,application/xml,text/xml,application/pdf";
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
                const buffer = await file.arrayBuffer();
                const fileBase64 = btoa(
                    Array.from(new Uint8Array(buffer))
                        .map((byte) => String.fromCharCode(byte))
                        .join("")
                );
                const res = await fetch("/api/expenses/import-einvoice", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileBase64, filename: file.name }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    message.error(
                        err.error === "no_embedded_xml"
                            ? t("expenses.eInvoiceNoXml")
                            : t("expenses.eInvoiceUnsupported")
                    );
                    return;
                }
                const parsed = await res.json();
                setEditingId(null);
                setPendingFile(null);
                setCreatedExpenseId(null);
                setForm({
                    ...DEFAULT_FORM,
                    date: parsed.date || DEFAULT_FORM.date,
                    vendor_name: parsed.vendor_name || "",
                    description: parsed.invoice_number
                        ? `E-Rechnung ${parsed.invoice_number}`
                        : DEFAULT_FORM.description,
                    amount_net: parsed.amount_net ?? 0,
                    vat_amount: parsed.vat_amount ?? 0,
                    amount_gross: parsed.amount_gross ?? 0,
                    vat_rate_percent: parsed.vat_rate_percent ?? 19,
                });
                setModalOpen(true);
                message.success(t("expenses.eInvoiceParsed"));
            } catch (error) {
                console.error("E-invoice import failed:", error);
                message.error(t("expenses.eInvoiceUnsupported"));
            }
        };
        input.click();
    };

    const openEdit = (expense: Expense) => {
        setEditingId(expense.id!);
        setForm({
            date: expense.date,
            vendor_name: expense.vendor_name,
            description: expense.description || "",
            amount_net: expense.amount_net,
            vat_amount: expense.vat_amount,
            amount_gross: expense.amount_gross,
            vat_rate_percent: expense.vat_rate_percent,
            category: expense.category,
            payment_method: expense.payment_method,
        });
        setPendingFile(null);
        setCreatedExpenseId(expense.id!);
        setModalOpen(true);
    };

    const handleGrossChange = (gross: number | null) => {
        const g = gross ?? 0;
        const vatRate = form.vat_rate_percent;
        const net = g / (1 + vatRate / 100);
        const vat = g - net;
        setForm((prev) => ({
            ...prev,
            amount_gross: g,
            amount_net: Math.round(net * 100) / 100,
            vat_amount: Math.round(vat * 100) / 100,
        }));
    };

    const handleVatRateChange = (rate: number) => {
        const net = form.amount_net;
        const vat = (net * rate) / 100;
        const gross = net + vat;
        setForm((prev) => ({
            ...prev,
            vat_rate_percent: rate,
            vat_amount: Math.round(vat * 100) / 100,
            amount_gross: Math.round(gross * 100) / 100,
        }));
    };

    const handleOCR = useCallback(
        async (file: File) => {
            setOcrLoading(true);
            try {
                const arrayBuffer = await file.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString("base64");
                const result = await ocrExpenseReceipt(base64, file.type);

                setForm((prev) => ({
                    ...prev,
                    vendor_name: result.vendor_name || prev.vendor_name,
                    date: result.date || prev.date,
                    amount_gross: result.amount_gross ?? prev.amount_gross,
                    vat_rate_percent: result.vat_rate ?? prev.vat_rate_percent,
                    description: result.description || prev.description,
                }));
                message.success(t("expenses.ocrSuccess"));
            } catch {
                message.warning(t("expenses.ocrError"));
            } finally {
                setOcrLoading(false);
            }
        },
        [t],
    );

    const handleSave = async () => {
        if (!form.vendor_name || !form.date) {
            message.error(t("expenses.fillRequired"));
            return;
        }
        setSaving(true);
        try {
            let expenseId = editingId;
            if (editingId) {
                await editExpense(editingId, form);
            } else {
                expenseId = await addExpense(form);
                setCreatedExpenseId(expenseId);
            }

            // Upload pending receipt if any
            if (pendingFile && expenseId) {
                try {
                    await uploadExpenseReceipt(expenseId, pendingFile);
                } catch {
                    message.warning(t("expenses.receiptUploadError"));
                }
            }

            message.success(
                editingId ? t("expenses.updated") : t("expenses.created"),
            );
            fetchExpenses(true);
            setModalOpen(false);
        } catch {
            message.error(t("expenses.saveError"));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id: string) => {
        Modal.confirm({
            title: t("expenses.deleteConfirm"),
            okText: t("expenses.delete"),
            okType: "danger",
            cancelText: t("expenses.cancel"),
            onOk: async () => {
                try {
                    await removeExpense(id);
                    message.success(t("expenses.deleted"));
                } catch {
                    message.error(t("expenses.deleteError"));
                }
            },
        });
    };

    const currentMonthTotal = expenses
        .filter((e) => e.date?.startsWith(dayjs().format("YYYY-MM")))
        .reduce((sum, e) => sum + (e.amount_gross || 0), 0);

    const ytdTotal = expenses
        .filter((e) => e.date?.startsWith(dayjs().format("YYYY")))
        .reduce((sum, e) => sum + (e.amount_gross || 0), 0);

    const columns: ColumnsType<Expense> = [
        {
            title: t("expenses.date"),
            dataIndex: "date",
            key: "date",
            sorter: (a, b) => a.date.localeCompare(b.date),
        },
        {
            title: t("expenses.vendor"),
            dataIndex: "vendor_name",
            key: "vendor_name",
        },
        {
            title: t("expenses.description"),
            dataIndex: "description",
            key: "description",
            render: (v) => v || "—",
        },
        {
            title: t("expenses.category"),
            dataIndex: "category",
            key: "category",
            render: (v: ExpenseCategory) => (
                <Tag color={categoryColors[v]}>
                    {t(`expenses.category.${v}`) || v}
                </Tag>
            ),
        },
        {
            title: t("expenses.gross"),
            dataIndex: "amount_gross",
            key: "amount_gross",
            align: "right",
            render: (v) => formatCurrency(v),
            sorter: (a, b) => a.amount_gross - b.amount_gross,
        },
        {
            title: t("expenses.vat"),
            dataIndex: "vat_amount",
            key: "vat_amount",
            align: "right",
            render: (v) => formatCurrency(v),
        },
        {
            key: "actions",
            align: "right",
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(record)}
                    />
                    <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record.id!)}
                    />
                </Space>
            ),
        },
    ];

    const vatOptions = [
        { value: 19, label: "19%" },
        { value: 7, label: "7%" },
        { value: 0, label: "0%" },
    ];

    const categoryOptions = (
        [
            "office",
            "travel",
            "software",
            "hardware",
            "marketing",
            "consulting",
            "utilities",
            "rent",
            "insurance",
            "other",
        ] as ExpenseCategory[]
    ).map((c) => ({ value: c, label: t(`expenses.category.${c}`) || c }));

    const paymentMethodOptions = [
        {
            value: "bank_transfer",
            label: t("expenses.paymentMethod.bank_transfer") || "Überweisung",
        },
        { value: "cash", label: t("expenses.paymentMethod.cash") || "Bar" },
        {
            value: "credit_card",
            label: t("expenses.paymentMethod.credit_card") || "Kreditkarte",
        },
        {
            value: "paypal",
            label: t("expenses.paymentMethod.paypal") || "PayPal",
        },
        {
            value: "other",
            label: t("expenses.paymentMethod.other") || "Sonstiges",
        },
    ];

    return (
        <div>
            <Title level={4}>{t("expenses.title")}</Title>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={8}>
                    <Card size="small">
                        <Statistic
                            title={t("expenses.monthTotal")}
                            value={currentMonthTotal}
                            precision={2}
                            prefix="€"
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={8}>
                    <Card size="small">
                        <Statistic
                            title={t("expenses.ytdTotal")}
                            value={ytdTotal}
                            precision={2}
                            prefix="€"
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={8}>
                    <Card size="small">
                        <Statistic
                            title={t("expenses.count")}
                            value={expenses.length}
                        />
                    </Card>
                </Col>
            </Row>

            <div
                style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    marginBottom: 16,
                }}
            >
                <Button
                    icon={<ImportOutlined />}
                    onClick={handleImportEInvoice}
                >
                    {t("expenses.importEInvoice")}
                </Button>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openCreate}
                >
                    {t("expenses.new")}
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={expenses}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 20 }}
            />

            <Modal
                title={
                    editingId
                        ? t("expenses.editTitle")
                        : t("expenses.newTitle")
                }
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleSave}
                okText={t("expenses.save")}
                cancelText={t("expenses.cancel")}
                confirmLoading={saving}
                width={640}
            >
                {/* Receipt upload / OCR */}
                <div style={{ marginBottom: 16 }}>
                    <Upload.Dragger
                        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                        showUploadList={false}
                        beforeUpload={(file) => {
                            setPendingFile(file);
                            handleOCR(file);
                            return false;
                        }}
                        style={{ padding: "8px 0" }}
                    >
                        <Space>
                            {ocrLoading ? (
                                <ScanOutlined spin />
                            ) : (
                                <UploadOutlined />
                            )}
                            <Text type="secondary">
                                {t("expenses.uploadHint")}
                            </Text>
                        </Space>
                    </Upload.Dragger>
                    {pendingFile && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {pendingFile.name}
                        </Text>
                    )}
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                    }}
                >
                    <div>
                        <label style={{ display: "block", marginBottom: 4 }}>
                            {t("expenses.date")} *
                        </label>
                        <DatePicker
                            value={form.date ? dayjs(form.date) : null}
                            onChange={(d) =>
                                setForm((prev) => ({
                                    ...prev,
                                    date: d ? d.format("YYYY-MM-DD") : "",
                                }))
                            }
                            style={{ width: "100%" }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: 4 }}>
                            {t("expenses.vendor")} *
                        </label>
                        <Input
                            value={form.vendor_name}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    vendor_name: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                        <label style={{ display: "block", marginBottom: 4 }}>
                            {t("expenses.description")}
                        </label>
                        <Input
                            value={form.description}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    description: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: 4 }}>
                            {t("expenses.gross")} (€)
                        </label>
                        <DecimalInput
                            value={form.amount_gross}
                            min={0}
                            step={0.01}
                            style={{ width: "100%" }}
                            onChange={handleGrossChange}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: 4 }}>
                            {t("expenses.vatRate")}
                        </label>
                        <Select
                            value={form.vat_rate_percent}
                            options={vatOptions}
                            onChange={handleVatRateChange}
                            style={{ width: "100%" }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: 4 }}>
                            {t("expenses.category")}
                        </label>
                        <Select
                            value={form.category}
                            options={categoryOptions}
                            onChange={(v) =>
                                setForm((prev) => ({
                                    ...prev,
                                    category: v as ExpenseCategory,
                                }))
                            }
                            style={{ width: "100%" }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: 4 }}>
                            {t("expenses.paymentMethod")}
                        </label>
                        <Select
                            value={form.payment_method}
                            options={paymentMethodOptions}
                            onChange={(v) =>
                                setForm((prev) => ({
                                    ...prev,
                                    payment_method: v,
                                }))
                            }
                            style={{ width: "100%" }}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
