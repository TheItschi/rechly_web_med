"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    Card,
    Button,
    Space,
    message,
    Typography,
    Divider,
    Table,
    Tag,
    Descriptions,
    Dropdown,
    Spin,
    Modal,
    Tooltip,
} from "antd";
import {
    ArrowLeftOutlined,
    FilePdfOutlined,
    MailOutlined,
    EditOutlined,
    DeleteOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    PrinterOutlined,
    RobotOutlined,
    CopyOutlined,
    RollbackOutlined,
} from "@ant-design/icons";
import {
    getInvoiceById,
    updateInvoiceStatus,
    deleteInvoice,
} from "@/lib/invoiceService";
import { getCompanyInfo } from "@/lib/companyService";
import DunningCard from "@/components/DunningCard";
import { runInvoiceAssistant } from "@/lib/aiService";
import { formatCurrency } from "@/lib/currencyUtils";
import { formatDateGerman } from "@/lib/dateUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { InvoiceItem, InvoiceWithDetails, UserCompany } from "@/types";
import { formatFactor } from "@/lib/goae/fees";
import { formatDiagnosis } from "@/lib/icd10";

const { Title, Text } = Typography;

export default function InvoiceDetailPage() {
    const router = useRouter();
    const params = useParams();
    const invoiceId = params.id as string;
    const { t } = useLanguage();

    const statusConfig: Record<
        string,
        { color: string; label: string; icon: React.ReactNode }
    > = {
        draft: { color: "default", label: t("status.draft"), icon: <EditOutlined /> },
        sent: { color: "processing", label: t("status.sent"), icon: <MailOutlined /> },
        paid: { color: "success", label: t("status.paid"), icon: <CheckCircleOutlined /> },
        cancelled: {
            color: "default",
            label: t("status.cancelled"),
            icon: <ClockCircleOutlined />,
        },
    };

    const [loading, setLoading] = useState(true);
    const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
    const [company, setCompany] = useState<UserCompany | null>(null);
    const [draftingReminder, setDraftingReminder] = useState(false);
    const [reminderDraft, setReminderDraft] = useState("");
    const [reminderModalOpen, setReminderModalOpen] = useState(false);

    useEffect(() => {
        if (invoiceId) {
            loadInvoice();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invoiceId]);

    const loadInvoice = async () => {
        try {
            setLoading(true);
            const [data, companyData] = await Promise.all([
                getInvoiceById(invoiceId),
                getCompanyInfo(),
            ]);
            setInvoice(data);
            setCompany(companyData);
        } catch (error) {
            console.error("Error loading invoice:", error);
            message.error(t("invoiceDetail.notFound"));
            router.push("/dashboard/invoices");
        } finally {
            setLoading(false);
        }
    };

    const handleDraftReminder = async () => {
        if (!invoice) {
            return;
        }

        setDraftingReminder(true);
        try {
            const result = await runInvoiceAssistant({
                action: "payment_reminder",
                companyName: company?.name,
                clientName: invoice.client?.name,
                clientEmail: invoice.client?.email,
                invoiceNumber: invoice.invoice_number,
                issueDate: invoice.issue_date,
                dueDate: invoice.due_date,
                totalGross: invoice.total_gross,
                currency: "EUR",
                notes: invoice.notes,
                paymentTerms: invoice.payment_terms,
                lineItems: invoice.items.map((item) => ({
                    description: item.description,
                    quantity: item.quantity,
                    unit_of_measure: item.unit_of_measure,
                    price: item.price,
                })),
            });
            setReminderDraft(result.content);
            setReminderModalOpen(true);
            message.success(t("invoiceDetail.reminderCreated"));
        } catch (error) {
            console.error("Error drafting payment reminder:", error);
            message.error(
                error instanceof Error
                    ? error.message
                    : t("invoiceDetail.reminderError"),
            );
        } finally {
            setDraftingReminder(false);
        }
    };

    const copyReminderDraft = async () => {
        try {
            await navigator.clipboard.writeText(reminderDraft);
            message.success(t("invoiceDetail.draftCopied"));
        } catch (error) {
            console.error("Error copying reminder draft:", error);
            message.error(t("invoiceDetail.copyFailed"));
        }
    };

    const [preparingEmail, setPreparingEmail] = useState(false);
    const handleEmailDraft = async () => {
        if (!invoice) return;
        if (!invoice.client?.email) message.warning(`${t("invoiceDetail.noEmail")} – Empfänger bitte im Entwurf ergänzen.`);
        setPreparingEmail(true);
        try {
            const { downloadInvoiceEmailDraft } = await import("@/components/pdf/InvoicePDFDocument");
            await downloadInvoiceEmailDraft(invoice, company, t);
            message.success("E-Mail-Entwurf heruntergeladen – Datei öffnen, um ihn in Outlook zu bearbeiten und zu senden.", 6);
        } catch (error) {
            console.error("Error creating e-mail draft:", error);
            message.error("E-Mail-Entwurf konnte nicht erstellt werden.");
        } finally {
            setPreparingEmail(false);
        }
    };

    const openReminderAsEmail = () => {
        if (!invoice?.client?.email || !reminderDraft) {
            message.warning(t("invoiceDetail.noEmailOrDraft"));
            return;
        }

        const lines = reminderDraft.split("\n");
        const subjectLine = lines.find((line) =>
            line.toLowerCase().startsWith("betreff:"),
        );
        const subject = subjectLine
            ? subjectLine.replace(/^Betreff:\s*/i, "").trim()
            : `${t("invoiceDetail.reminderSubject")} ${invoice.invoice_number}`;
        const body = reminderDraft.replace(/^Betreff:\s*.*$/im, "").trim();

        window.open(
            `mailto:${invoice.client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
            "_blank",
        );
    };

    const handleStatusChange = async (
        newStatus: "draft" | "sent" | "paid" | "cancelled",
    ) => {
        if (!invoice || !invoice.id) return;

        try {
            await updateInvoiceStatus(invoice.id, newStatus);
            setInvoice({ ...invoice, status: newStatus });
            message.success(t("invoiceDetail.statusUpdated"));
        } catch (error) {
            console.error("Error updating status:", error);
            message.error(t("invoiceDetail.statusError"));
        }
    };

    const handleDelete = () => {
        Modal.confirm({
            title: t("invoiceDetail.deleteTitle"),
            content: t("invoiceDetail.deleteContent"),
            okText: t("invoiceDetail.deleteOk"),
            okType: "danger",
            cancelText: t("invoiceDetail.deleteCancel"),
            onOk: async () => {
                try {
                    await deleteInvoice(invoiceId);
                    message.success(t("invoiceDetail.deleted"));
                    router.push("/dashboard/invoices");
                } catch (error) {
                    console.error("Error deleting invoice:", error);
                    message.error(t("invoiceDetail.deleteError"));
                }
            },
        });
    };

    const [correctionLoading, setCorrectionLoading] = useState(false);
    const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
    const [correctionType, setCorrectionType] = useState<
        "credit_note" | "correction"
    >("credit_note");

    const handleCreateCorrection = async () => {
        setCorrectionLoading(true);
        try {
            const res = await fetch(`/api/invoices/${invoiceId}/correction`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: correctionType }),
            });
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            message.success(t("invoiceDetail.correctionCreated"));
            setCorrectionModalOpen(false);
            router.push(`/dashboard/invoices/${data.invoiceId}`);
        } catch {
            message.error(t("invoiceDetail.correctionError"));
        } finally {
            setCorrectionLoading(false);
        }
    };

    const statusMenuItems = [
        {
            key: "draft",
            label: t("invoiceDetail.markDraft"),
            onClick: () => handleStatusChange("draft"),
        },
        {
            key: "sent",
            label: t("invoiceDetail.markSent"),
            onClick: () => handleStatusChange("sent"),
        },
        {
            key: "paid",
            label: t("invoiceDetail.markPaid"),
            onClick: () => handleStatusChange("paid"),
        },
        {
            key: "cancelled",
            label: t("invoiceDetail.markCancelled"),
            onClick: () => handleStatusChange("cancelled"),
        },
    ];

    const columns = [
        {
            title: t("invoiceDetail.description"),
            dataIndex: "description",
            key: "description",
            render: (description: string, item: InvoiceItem) =>
                item.goae ? (
                    <div>
                        <div style={{ fontSize: 12, color: "#1677ff" }}>
                            GOÄ {item.goae.number} · {formatFactor(item.goae.factor)}-fach · {formatDateGerman(item.goae.service_date)}
                        </div>
                        <div>{description}</div>
                        {item.goae.justification && (
                            <div style={{ fontSize: 12, fontStyle: "italic", color: "#666" }}>
                                Begründung: {item.goae.justification}
                            </div>
                        )}
                    </div>
                ) : (
                    description
                ),
        },
        {
            title: t("invoiceDetail.quantity"),
            dataIndex: "quantity",
            key: "quantity",
            width: 100,
            align: "right" as const,
        },
        {
            title: t("invoiceDetail.unit"),
            dataIndex: "unit_of_measure",
            key: "unit_of_measure",
            width: 100,
        },
        {
            title: t("invoiceDetail.unitPrice"),
            dataIndex: "price",
            key: "price",
            width: 120,
            align: "right" as const,
            render: (val: number) => formatCurrency(val),
        },
        {
            title: t("invoiceDetail.vat"),
            dataIndex: "tax_rate_percent",
            key: "tax_rate_percent",
            width: 80,
            align: "right" as const,
            render: (val: number) => `${val}%`,
        },
        {
            title: t("invoiceDetail.total"),
            dataIndex: "total",
            key: "total",
            width: 120,
            align: "right" as const,
            render: (val: number) => <Text strong>{formatCurrency(val)}</Text>,
        },
    ];

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: 50 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!invoice) {
        return null;
    }

    const config = statusConfig[invoice.status] || statusConfig.draft;
    const clientAddress = invoice.client
        ? `${invoice.client.address_line1}\n${invoice.client.postal_code} ${invoice.client.city}`
        : "";

    return (
        <div>
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 24,
                    flexWrap: "wrap",
                    gap: 16,
                }}
            >
                <Space>
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => router.push("/dashboard/invoices")}
                    >
                        {t("invoiceDetail.back")}
                    </Button>
                    <Title level={4} style={{ margin: 0 }}>
                        {invoice.invoice_number}
                    </Title>
                    <Tag color={config.color} icon={config.icon}>
                        {config.label}
                    </Tag>
                </Space>

                <Space wrap>
                    <Dropdown
                        menu={{ items: statusMenuItems }}
                        trigger={["click"]}
                    >
                        <Button>{ t("invoiceDetail.changeStatus") }</Button>
                    </Dropdown>
                    {invoice.status === "draft" && (
                        <Button
                            icon={<EditOutlined />}
                            onClick={() => router.push(`/dashboard/invoices/${invoice.id}/edit`)}
                        >
                            {t("invoices.edit")}
                        </Button>
                    )}
                    <Button
                        type="primary"
                        icon={<FilePdfOutlined />}
                        onClick={() =>
                            router.push(`/dashboard/invoices/${invoice.id}/pdf`)
                        }
                    >
                        PDF
                    </Button>
                    <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={handleDelete}
                    >
                        {t("invoiceDetail.delete")}
                    </Button>
                </Space>
            </div>

            {/* Invoice Info */}
            <Card style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 32 }}>
                    <div style={{ flex: 1, minWidth: 250 }}>
                        <Text type="secondary">{t("invoiceDetail.recipient")}</Text>
                        <Title level={5} style={{ margin: "8px 0 4px" }}>
                            {invoice.client?.name || t("invoiceDetail.unknownClient")}
                        </Title>
                        <Text style={{ whiteSpace: "pre-line" }}>
                            {clientAddress}
                        </Text>
                        <br />
                        {invoice.client?.email && (
                            <Text type="secondary">{invoice.client.email}</Text>
                        )}
                    </div>

                    <div style={{ flex: 1, minWidth: 250 }}>
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label={t("invoiceDetail.invoiceNumber")}>
                                <Text strong>{invoice.invoice_number}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label={t("invoiceDetail.invoiceDate")}>
                                {formatDateGerman(invoice.issue_date)}
                            </Descriptions.Item>
                            <Descriptions.Item label={t("invoiceDetail.dueDate")}>
                                {invoice.due_date
                                    ? formatDateGerman(invoice.due_date)
                                    : "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label={t("invoiceDetail.currency")}>
                                EUR
                            </Descriptions.Item>
                            {invoice.medical?.diagnoses.length ? (
                                <Descriptions.Item label="Diagnosen">
                                    <div>
                                        {invoice.medical.diagnoses.map((d, i) => (
                                            <div key={i}>{formatDiagnosis(d, "both")}</div>
                                        ))}
                                    </div>
                                </Descriptions.Item>
                            ) : null}
                        </Descriptions>
                    </div>
                </div>
            </Card>

            {/* Line Items */}
            <Card title={t("invoiceDetail.positions")} style={{ marginBottom: 24 }}>
                <Table
                    columns={columns}
                    dataSource={invoice.items || []}
                    pagination={false}
                    rowKey="id"
                    locale={{ emptyText: t("invoiceDetail.noPositions") }}
                />

                <Divider />

                <div style={{ textAlign: "right" }}>
                    <Space direction="vertical" align="end" size={8}>
                        <div>
                            <Text type="secondary">{t("invoiceDetail.subtotal")}: </Text>
                            <Text
                                style={{
                                    minWidth: 100,
                                    display: "inline-block",
                                    textAlign: "right",
                                }}
                            >
                                {formatCurrency(invoice.subtotal)}
                            </Text>
                        </div>
                        <div>
                            <Text type="secondary">{t("invoiceDetail.vat")}: </Text>
                            <Text
                                style={{
                                    minWidth: 100,
                                    display: "inline-block",
                                    textAlign: "right",
                                }}
                            >
                                {formatCurrency(invoice.total_vat)}
                            </Text>
                        </div>
                        <Divider style={{ margin: "8px 0" }} />
                        <div>
                            <Text strong style={{ fontSize: 18 }}>
                                {t("invoiceDetail.totalLabel")}:{" "}
                            </Text>
                            <Text
                                strong
                                style={{
                                    fontSize: 18,
                                    minWidth: 100,
                                    display: "inline-block",
                                    textAlign: "right",
                                }}
                            >
                                {formatCurrency(invoice.total_gross)}
                            </Text>
                        </div>
                    </Space>
                </div>
            </Card>

            {/* Notes */}
            {invoice.notes && (
                <Card title={t("invoiceDetail.notes")}>
                    <Text style={{ whiteSpace: "pre-line" }}>
                        {invoice.notes}
                    </Text>
                </Card>
            )}

            {invoice.payment_terms && (
                <Card title={t("invoiceDetail.paymentTerms")} style={{ marginTop: 24 }}>
                    <Text style={{ whiteSpace: "pre-line" }}>
                        {invoice.payment_terms}
                    </Text>
                </Card>
            )}

            {/* Actions */}
            <Card title={t("invoiceDetail.actions")} style={{ marginTop: 24 }}>
                <Space wrap>
                    <Button
                        icon={<FilePdfOutlined />}
                        onClick={() =>
                            router.push(`/dashboard/invoices/${invoice.id}/pdf`)
                        }
                    >
                        {t("invoiceDetail.viewPdf")}
                    </Button>
                    <Button
                        icon={<PrinterOutlined />}
                        onClick={() => {
                            router.push(
                                `/dashboard/invoices/${invoice.id}/pdf?print=true`,
                            );
                        }}
                    >
                        {t("invoiceDetail.print")}
                    </Button>
                    <Button
                        icon={<RollbackOutlined />}
                        onClick={() => setCorrectionModalOpen(true)}
                        disabled={invoice.status === "draft"}
                    >
                        {t("invoiceDetail.cancelCorrection")}
                    </Button>
                    <Button
                        icon={<RobotOutlined />}
                        loading={draftingReminder}
                        onClick={handleDraftReminder}
                    >
                        {t("invoiceDetail.aiReminder")}
                    </Button>
                    <Tooltip title="Erzeugt einen E-Mail-Entwurf (.eml) mit Standardtext und der Rechnung als PDF-Anhang. Datei öffnen – Outlook zeigt die Mail sendebereit an.">
                        <Button
                            icon={<MailOutlined />}
                            loading={preparingEmail}
                            onClick={handleEmailDraft}
                        >
                            {t("invoiceDetail.sendEmail")}
                        </Button>
                    </Tooltip>
                </Space>
            </Card>

            <DunningCard invoice={invoice} company={company} />

            <Modal
                title={t("invoiceDetail.correctionTitle")}
                open={correctionModalOpen}
                onCancel={() => setCorrectionModalOpen(false)}
                onOk={handleCreateCorrection}
                okText={t("invoiceDetail.correctionOk")}
                cancelText={t("invoiceDetail.correctionCancel")}
                confirmLoading={correctionLoading}
            >
                <p>{t("invoiceDetail.correctionPrompt")}</p>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        marginTop: 12,
                    }}
                >
                    <label style={{ cursor: "pointer" }}>
                        <input
                            type="radio"
                            name="correctionType"
                            value="credit_note"
                            checked={correctionType === "credit_note"}
                            onChange={() => setCorrectionType("credit_note")}
                            style={{ marginRight: 8 }}
                        />
                        <strong>{t("invoiceDetail.creditNote")}</strong> — {t("invoiceDetail.creditNoteDesc")}
                    </label>
                    <label style={{ cursor: "pointer" }}>
                        <input
                            type="radio"
                            name="correctionType"
                            value="correction"
                            checked={correctionType === "correction"}
                            onChange={() => setCorrectionType("correction")}
                            style={{ marginRight: 8 }}
                        />
                        <strong>{t("invoiceDetail.correctionInvoice")}</strong> — {t("invoiceDetail.correctionInvoiceDesc")}
                    </label>
                </div>
            </Modal>

            <Modal
                title={t("invoiceDetail.aiReminderTitle")}
                open={reminderModalOpen}
                onCancel={() => setReminderModalOpen(false)}
                footer={[
                    <Button
                        key="copy"
                        icon={<CopyOutlined />}
                        onClick={copyReminderDraft}
                    >
                        {t("invoiceDetail.copy")}
                    </Button>,
                    <Button
                        key="mail"
                        type="primary"
                        icon={<MailOutlined />}
                        onClick={openReminderAsEmail}
                        disabled={!invoice.client?.email}
                    >
                        {t("invoiceDetail.openAsEmail")}
                    </Button>,
                ]}
                width={760}
            >
                <div style={{ whiteSpace: "pre-wrap" }}>{reminderDraft}</div>
            </Modal>
        </div>
    );
}
