"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Table,
    Button,
    Input,
    Tag,
    Dropdown,
    Modal,
    message,
    Card,
    Row,
    Col,
    Statistic,
} from "antd";
import type { TableProps, MenuProps } from "antd";
import {
    PlusOutlined,
    SearchOutlined,
    MoreOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    FilePdfOutlined,
    CheckCircleOutlined,
    SendOutlined,
    RobotOutlined,
    CopyOutlined,
    MailOutlined,
} from "@ant-design/icons";
import { useInvoiceStore } from "@/store";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency } from "@/lib/currencyUtils";
import { formatDateGerman } from "@/lib/dateUtils";
import { runInvoiceAssistant } from "@/lib/aiService";
import { getCompanyInfo } from "@/lib/companyService";
import type { InvoiceWithClient, Invoice } from "@/types";

const statusColors: Record<string, string> = {
    draft: "default",
    sent: "processing",
    paid: "success",
    cancelled: "error",
};

export default function InvoicesPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [searchText, setSearchText] = useState("");
    const [companyName, setCompanyName] = useState<string | undefined>();
    const [draftingInvoiceId, setDraftingInvoiceId] = useState<string | null>(
        null,
    );
    const [reminderModalOpen, setReminderModalOpen] = useState(false);
    const [reminderDraft, setReminderDraft] = useState("");
    const [selectedInvoice, setSelectedInvoice] =
        useState<InvoiceWithClient | null>(null);

    const statusLabels: Record<string, string> = {
        draft: t("status.draft"),
        sent: t("status.sent"),
        paid: t("status.paid"),
        cancelled: t("status.cancelled"),
    };

    // Zustand store
    const {
        invoices,
        stats,
        loading,
        fetchInvoices,
        fetchStats,
        updateStatus,
        removeInvoice,
    } = useInvoiceStore();

    // Filter invoices based on search
    const filteredInvoices = invoices.filter(
        (invoice) =>
            invoice.invoice_number
                .toLowerCase()
                .includes(searchText.toLowerCase()) ||
            invoice.client?.name
                ?.toLowerCase()
                .includes(searchText.toLowerCase()),
    );

    useEffect(() => {
        fetchInvoices();
        fetchStats();
        void loadCompanyInfo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadCompanyInfo = async () => {
        try {
            const company = await getCompanyInfo();
            setCompanyName(company?.name);
        } catch (error) {
            console.error("Error loading company info for AI reminder:", error);
        }
    };

    const handleDelete = (id: string) => {
        Modal.confirm({
            title: t("invoices.deleteConfirm"),
            content: t("invoices.deleteDesc"),
            okText: t("invoices.delete"),
            okType: "danger",
            cancelText: t("invoices.cancel"),
            onOk: async () => {
                try {
                    await removeInvoice(id);
                    message.success(t("invoices.deleted"));
                } catch (error) {
                    console.error("Error deleting invoice:", error);
                    message.error(t("invoices.deleteError"));
                }
            },
        });
    };

    const handleStatusChange = async (
        id: string,
        status: Invoice["status"],
    ) => {
        try {
            await updateStatus(id, status);
            message.success(t("invoices.statusUpdated"));
        } catch (error) {
            console.error("Error updating status:", error);
            message.error(t("invoices.updateError"));
        }
    };

    const handleDraftReminder = async (invoice: InvoiceWithClient) => {
        setDraftingInvoiceId(invoice.id || null);
        try {
            const result = await runInvoiceAssistant({
                action: "payment_reminder",
                companyName,
                clientName: invoice.client?.name,
                clientEmail: invoice.client?.email,
                invoiceNumber: invoice.invoice_number,
                issueDate: invoice.issue_date,
                dueDate: invoice.due_date,
                totalGross: invoice.total_gross,
                currency: "EUR",
                notes: invoice.notes,
                paymentTerms: invoice.payment_terms,
            });
            setSelectedInvoice(invoice);
            setReminderDraft(result.content);
            setReminderModalOpen(true);
            message.success(t("invoices.aiReminderSuccess"));
        } catch (error) {
            console.error("Error drafting invoice reminder:", error);
            message.error(
                error instanceof Error
                    ? error.message
                    : t("invoices.aiReminderError"),
            );
        } finally {
            setDraftingInvoiceId(null);
        }
    };

    const handleCopyReminderDraft = async () => {
        try {
            await navigator.clipboard.writeText(reminderDraft);
            message.success(t("invoices.aiCopySuccess"));
        } catch (error) {
            console.error("Error copying invoice reminder draft:", error);
            message.error(t("invoices.aiCopyError"));
        }
    };

    const handleOpenReminderEmail = () => {
        if (!selectedInvoice?.client?.email || !reminderDraft) {
            message.warning(t("invoices.aiEmailMissing"));
            return;
        }

        const lines = reminderDraft.split("\n");
        const subjectLine = lines.find((line) =>
            line.toLowerCase().startsWith("betreff:"),
        );
        const subject = subjectLine
            ? subjectLine.replace(/^Betreff:\s*/i, "").trim()
            : t("invoices.aiMailSubjectFallback");
        const body = reminderDraft.replace(/^Betreff:\s*.*$/im, "").trim();

        window.open(
            `mailto:${selectedInvoice.client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
            "_blank",
        );
    };

    const getActionMenu = (record: InvoiceWithClient): MenuProps["items"] => [
        {
            key: "view",
            icon: <EyeOutlined />,
            label: t("invoices.view"),
            onClick: () => router.push(`/dashboard/invoices/${record.id}`),
        },
        // Only drafts are editable; issued invoices are corrected via credit note / correction.
        ...(record.status === "draft"
            ? [
                  {
                      key: "edit",
                      icon: <EditOutlined />,
                      label: t("invoices.edit"),
                      onClick: () => router.push(`/dashboard/invoices/${record.id}/edit`),
                  },
              ]
            : []),
        {
            key: "pdf",
            icon: <FilePdfOutlined />,
            label: t("invoices.downloadPdf"),
            onClick: () => router.push(`/dashboard/invoices/${record.id}/pdf`),
        },
        {
            key: "ai-reminder",
            icon: <RobotOutlined />,
            label: t("invoices.aiReminder"),
            disabled: !record.client?.email,
            onClick: () => {
                void handleDraftReminder(record);
            },
        },
        { type: "divider" },
        ...(record.status === "draft"
            ? [
                  {
                      key: "send",
                      icon: <SendOutlined />,
                      label: t("invoices.markSent"),
                      onClick: () => handleStatusChange(record.id!, "sent"),
                  },
              ]
            : []),
        ...(record.status === "sent"
            ? [
                  {
                      key: "paid",
                      icon: <CheckCircleOutlined />,
                      label: t("invoices.markPaid"),
                      onClick: () => handleStatusChange(record.id!, "paid"),
                  },
              ]
            : []),
        { type: "divider" },
        {
            key: "delete",
            icon: <DeleteOutlined />,
            label: t("invoices.delete"),
            danger: true,
            onClick: () => handleDelete(record.id!),
        },
    ];

    const columns: TableProps<InvoiceWithClient>["columns"] = [
        {
            title: t("invoices.number"),
            dataIndex: "invoice_number",
            key: "invoice_number",
            sorter: (a, b) => a.invoice_number.localeCompare(b.invoice_number),
        },
        {
            title: t("invoices.client"),
            dataIndex: ["client", "name"],
            key: "client",
            render: (_, record) => record.client?.name || "—",
        },
        {
            title: t("invoices.date"),
            dataIndex: "issue_date",
            key: "issue_date",
            render: (date) => formatDateGerman(date),
            sorter: (a, b) =>
                new Date(a.issue_date).getTime() -
                new Date(b.issue_date).getTime(),
        },
        {
            title: t("invoices.amount"),
            dataIndex: "total_gross",
            key: "total_gross",
            render: (amount) => formatCurrency(amount),
            sorter: (a, b) => a.total_gross - b.total_gross,
            align: "right",
        },
        {
            title: t("invoices.status"),
            dataIndex: "status",
            key: "status",
            render: (status) => (
                <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
            ),
            filters: [
                { text: t("status.draft"), value: "draft" },
                { text: t("status.sent"), value: "sent" },
                { text: t("status.paid"), value: "paid" },
                { text: t("status.cancelled"), value: "cancelled" },
            ],
            onFilter: (value, record) => record.status === value,
        },
        {
            title: "",
            key: "actions",
            width: 50,
            render: (_, record) => (
                <div onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                        menu={{ items: getActionMenu(record) }}
                        trigger={["click"]}
                    >
                        <Button
                            type="text"
                            icon={<MoreOutlined />}
                            loading={draftingInvoiceId === record.id}
                        />
                    </Dropdown>
                </div>
            ),
        },
    ];

    return (
        <div>
            {/* Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title={t("invoices.total")}
                            value={stats?.total ?? 0}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title={t("invoices.open")}
                            value={stats?.unpaidAmount ?? 0}
                            precision={2}
                            suffix="€"
                            styles={{ content: { color: "#fa8c16" } }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title={t("status.paid")}
                            value={stats?.paidAmount ?? 0}
                            precision={2}
                            suffix="€"
                            styles={{ content: { color: "#52c41a" } }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title={t("dashboard.drafts")}
                            value={stats?.draft ?? 0}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Toolbar */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={16} md={12}>
                    <Input
                        placeholder={t("invoices.search")}
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: "100%" }}
                        allowClear
                    />
                </Col>
                <Col
                    xs={24}
                    sm={8}
                    md={12}
                    style={{ display: "flex", justifyContent: "flex-end" }}
                >
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() =>
                            router.push("/dashboard/invoices/create")
                        }
                        style={{ width: "100%", maxWidth: 200 }}
                    >
                        {t("invoices.new")}
                    </Button>
                </Col>
            </Row>

            {/* Table */}
            <Table
                columns={columns}
                dataSource={filteredInvoices}
                rowKey="id"
                loading={loading}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total, range) =>
                        t("invoices.pagination")
                            .replace("{0}", String(range[0]))
                            .replace("{1}", String(range[1]))
                            .replace("{2}", String(total)),
                }}
                onRow={(record) => ({
                    onClick: () =>
                        router.push(`/dashboard/invoices/${record.id}`),
                    style: { cursor: "pointer" },
                })}
            />

            <Modal
                title={t("invoices.aiReminderTitle")}
                open={reminderModalOpen}
                onCancel={() => setReminderModalOpen(false)}
                footer={[
                    <Button
                        key="copy"
                        icon={<CopyOutlined />}
                        onClick={() => void handleCopyReminderDraft()}
                    >
                        {t("invoices.aiCopy")}
                    </Button>,
                    <Button
                        key="email"
                        type="primary"
                        icon={<MailOutlined />}
                        onClick={handleOpenReminderEmail}
                        disabled={!selectedInvoice?.client?.email}
                    >
                        {t("invoices.aiOpenEmail")}
                    </Button>,
                ]}
                width={760}
            >
                <div style={{ whiteSpace: "pre-wrap" }}>{reminderDraft}</div>
            </Modal>
        </div>
    );
}
