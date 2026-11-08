"use client";
import EInvoiceFields from "@/components/dashboard/EInvoiceFields";


import { useEffect, useState } from "react";
import {
    Table,
    Button,
    Input,
    Space,
    Modal,
    Form,
    message,
    Popconfirm,
    Typography,
    Row,
    Col,
    Card,
    Radio,
    Drawer,
    Tag,
    Divider,
    Tooltip,
} from "antd";
import type { TableProps } from "antd";
import {
    PlusOutlined,
    SearchOutlined,
    EditOutlined,
    DeleteOutlined,
    RobotOutlined,
    MailOutlined,
    CopyOutlined,
    SwapOutlined,
    CalendarOutlined,
    FileTextOutlined,
    ProjectOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useClientStore } from "@/store";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAllInvoices } from "@/lib/invoiceService";
import { splitVatId } from "@/lib/validation";
import { getCompanyInfo } from "@/lib/companyService";
import { runInvoiceAssistant } from "@/lib/aiService";
import { formatCurrency } from "@/lib/currencyUtils";
import { BOOKING_STATUS_COLOR, bookingStatusLabel } from "@/components/termine/BookingDrawerAndModals";
import type {
    Client,
    ClientFormData,
    InvoiceWithClient,
    UserCompany,
} from "@/types";

const { Title } = Typography;

export default function ClientsPage() {
    const { t, language } = useLanguage();
    const l = (de: string, en: string) => (language === "de" ? de : en);
    const [vatCheck, setVatCheck] = useState<{
        status: "idle" | "checking" | "valid" | "invalid" | "error";
        name?: string;
    }>({ status: "idle" });

    const checkVatId = async () => {
        const vatId = form.getFieldValue("vat_id");
        if (!vatId || !splitVatId(vatId)) {
            setVatCheck({ status: "invalid" });
            return;
        }
        try {
            setVatCheck({ status: "checking" });
            const res = await fetch("/api/validate/vat-id", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vat_id: vatId }),
            });
            if (!res.ok) throw new Error("vies_unavailable");
            const result = await res.json();
            setVatCheck({
                status: result.valid ? "valid" : "invalid",
                name: result.name,
            });
        } catch {
            setVatCheck({ status: "error" });
        }
    };
    const [searchText, setSearchText] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [invoices, setInvoices] = useState<InvoiceWithClient[]>([]);
    const [company, setCompany] = useState<UserCompany | null>(null);
    const [draftingClientId, setDraftingClientId] = useState<string | null>(
        null,
    );
    const [replyModalOpen, setReplyModalOpen] = useState(false);
    const [replyDraft, setReplyDraft] = useState("");
    const [replyClient, setReplyClient] = useState<Client | null>(null);
    const [detailClientId, setDetailClientId] = useState<string | null>(null);
    const [clientBookings, setClientBookings] = useState<
        Array<{
            $id: string;
            customerId?: string;
            customerEmail: string;
            serviceNameSnapshot: string;
            startUtc: string;
            status: string;
            linkedInvoiceId?: string;
        }>
    >([]);
    const [clientProjects, setClientProjects] = useState<
        Array<{ id: string; name: string; client_id: string; status: string; budget: number }>
    >([]);

    // Zustand store
    const {
        clients,
        loading,
        fetchClients,
        addClient,
        editClient,
        removeClient,
    } = useClientStore();

    // Filter clients based on search
    const filteredClients = clients.filter(
        (client) =>
            client.name.toLowerCase().includes(searchText.toLowerCase()) ||
            client.email?.toLowerCase().includes(searchText.toLowerCase()) ||
            client.city?.toLowerCase().includes(searchText.toLowerCase()),
    );

    useEffect(() => {
        const paramId = new URLSearchParams(window.location.search).get("client");
        if (paramId) setDetailClientId(paramId);
        fetchClients();
        loadReplyContext();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadReplyContext = async () => {
        try {
            const [invoiceData, companyData] = await Promise.all([
                getAllInvoices(),
                getCompanyInfo(),
            ]);
            setInvoices(invoiceData);
            setCompany(companyData);
        } catch (error) {
            console.error("Error loading client reply context:", error);
        }
        // Load bookings and projects non-blockingly for unified Client 360° view
        void fetch("/api/termine/appointments", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (d?.appointments) setClientBookings(d.appointments);
            })
            .catch(() => {});
        void fetch("/api/workspace", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (d?.data?.projects) setClientProjects(d.data.projects);
            })
            .catch(() => {});
    };

    const getBookingsForClient = (client: Client) => {
        const email = client.email?.trim().toLowerCase();
        return clientBookings.filter(
            (b) =>
                (client.id && b.customerId === client.id) ||
                (email && b.customerEmail?.toLowerCase() === email),
        );
    };

    const getProjectsForClient = (clientId?: string) => {
        if (!clientId) return [];
        return clientProjects.filter((p) => p.client_id === clientId);
    };

    const getInvoicesForClient = (clientId?: string) => {
        if (!clientId) return [];
        return invoices.filter((i) => i.client_id === clientId);
    };

    const getOverdueInvoicesForClient = (clientId?: string) => {
        if (!clientId) return [];

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        return invoices
            .filter((invoice) => {
                if (invoice.client_id !== clientId || !invoice.due_date) {
                    return false;
                }

                if (
                    invoice.status === "paid" ||
                    invoice.status === "cancelled"
                ) {
                    return false;
                }

                const dueDate = new Date(invoice.due_date);
                dueDate.setHours(0, 0, 0, 0);
                return dueDate < now;
            })
            .sort((left, right) => {
                const leftDue = left.due_date
                    ? new Date(left.due_date).getTime()
                    : 0;
                const rightDue = right.due_date
                    ? new Date(right.due_date).getTime()
                    : 0;
                return leftDue - rightDue;
            });
    };

    const handleDraftOverdueReply = async (client: Client) => {
        const overdueInvoices = getOverdueInvoicesForClient(client.id);
        if (overdueInvoices.length === 0) {
            message.warning(t("clients.aiNoOverdueInvoices"));
            return;
        }

        setDraftingClientId(client.id || null);
        try {
            const result = await runInvoiceAssistant({
                action: "overdue_client_reply",
                companyName: company?.name,
                clientName: client.name,
                clientEmail: client.email,
                currency: "EUR",
                invoices: overdueInvoices.map((invoice) => ({
                    invoiceNumber: invoice.invoice_number,
                    issueDate: invoice.issue_date,
                    dueDate: invoice.due_date,
                    totalGross: invoice.total_gross,
                    status: invoice.status,
                })),
            });
            setReplyClient(client);
            setReplyDraft(result.content);
            setReplyModalOpen(true);
            message.success(t("clients.aiDraftSuccess"));
        } catch (error) {
            console.error("Error drafting overdue client reply:", error);
            message.error(
                error instanceof Error
                    ? error.message
                    : t("clients.aiDraftError"),
            );
        } finally {
            setDraftingClientId(null);
        }
    };

    const handleCopyReplyDraft = async () => {
        try {
            await navigator.clipboard.writeText(replyDraft);
            message.success(t("clients.aiCopySuccess"));
        } catch (error) {
            console.error("Error copying client reply draft:", error);
            message.error(t("clients.aiCopyError"));
        }
    };

    const handleOpenReplyEmail = () => {
        if (!replyClient?.email || !replyDraft) {
            message.warning(t("clients.aiEmailMissing"));
            return;
        }

        const lines = replyDraft.split("\n");
        const subjectLine = lines.find((line) =>
            line.toLowerCase().startsWith("betreff:"),
        );
        const subject = subjectLine
            ? subjectLine.replace(/^Betreff:\s*/i, "").trim()
            : t("clients.aiMailSubjectFallback");
        const body = replyDraft.replace(/^Betreff:\s*.*$/im, "").trim();

        window.open(
            `mailto:${replyClient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
            "_blank",
        );
    };

    const openCreateModal = () => {
        setEditingClient(null);
        form.resetFields();
        form.setFieldsValue({ country: "Deutschland", client_type: "company" });
        setModalOpen(true);
    };

    const openEditModal = (client: Client) => {
        setEditingClient(client);
        form.resetFields();
        form.setFieldsValue({
            ...client,
            client_type: client.client_type || "company",
        });
        setModalOpen(true);
    };

    const handleSubmit = async (values: ClientFormData) => {
        setSubmitting(true);
        try {
            if (editingClient) {
                await editClient(editingClient.id!, values);
                message.success(t("clients.updated"));
            } else {
                await addClient(values);
                message.success(t("clients.created"));
            }
            setModalOpen(false);
        } catch (error) {
            console.error("Error saving client:", error);
            const errorMsg = error instanceof Error ? error.message : t("clients.saveError");
            message.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await removeClient(id);
            message.success(t("clients.deleted"));
        } catch (error) {
            console.error("Error deleting client:", error);
            message.error(t("clients.deleteError"));
        }
    };

    const columns: TableProps<Client>["columns"] = [
        {
            title: t("clients.name"),
            dataIndex: "name",
            key: "name",
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: t("clients.contactPerson"),
            dataIndex: "contact_person",
            key: "contact_person",
            responsive: ["md"],
        },
        {
            title: t("clients.city"),
            dataIndex: "city",
            key: "city",
            responsive: ["sm"],
        },
        {
            title: t("clients.email"),
            dataIndex: "email",
            key: "email",
            responsive: ["lg"],
        },
        {
            title: t("clients.phone"),
            dataIndex: "phone",
            key: "phone",
            responsive: ["xl"],
        },
        {
            title: l("Aktivitäten", "Activity"),
            key: "activity",
            responsive: ["md"],
            render: (_, record) => {
                const invCount = getInvoicesForClient(record.id).length;
                const bkCount = getBookingsForClient(record).length;
                const prjCount = getProjectsForClient(record.id).length;
                return (
                    <Space size={4} wrap>
                        <Tag color={invCount > 0 ? "blue" : "default"}>
                            <FileTextOutlined /> {invCount}
                        </Tag>
                        {bkCount > 0 && (
                            <Tag color="cyan">
                                <CalendarOutlined /> {bkCount}
                            </Tag>
                        )}
                        {prjCount > 0 && (
                            <Tag color="purple">
                                <ProjectOutlined /> {prjCount}
                            </Tag>
                        )}
                    </Space>
                );
            },
        },
        {
            title: t("clients.actions"),
            key: "actions",
            width: 210,
            render: (_, record) => (
                <Space>
                    <Tooltip title={l("Termin für Kunden buchen", "Book appointment for client")}>
                        <Link
                            href={`/dashboard/termine/buchungen?clientId=${record.id}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Button type="text" icon={<CalendarOutlined />} />
                        </Link>
                    </Tooltip>
                    <Button
                        type="text"
                        icon={<RobotOutlined />}
                        disabled={
                            getOverdueInvoicesForClient(record.id).length === 0
                        }
                        loading={draftingClientId === record.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            void handleDraftOverdueReply(record);
                        }}
                    />
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(record);
                        }}
                    />
                    <Popconfirm
                        title={t("clients.deleteConfirm")}
                        description={t("clients.deleteDesc")}
                        onConfirm={(e) => {
                            e?.stopPropagation();
                            handleDelete(record.id!);
                        }}
                        onCancel={(e) => e?.stopPropagation()}
                        okText={t("clients.delete")}
                        cancelText={t("clients.cancel")}
                    >
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Title level={4}>{t("clients.title")}</Title>

            {/* Toolbar */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={16} md={12}>
                    <Input
                        placeholder={t("clients.search")}
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
                    style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}
                >
                    <Link href="/dashboard/migration">
                        <Button icon={<SwapOutlined />}>
                            {t("clients.importData")}
                        </Button>
                    </Link>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={openCreateModal}
                    >
                        {t("clients.new")}
                    </Button>
                </Col>
            </Row>

            {/* Table */}
            <Table
                columns={columns}
                dataSource={filteredClients}
                rowKey="id"
                loading={loading}
                onRow={(record) => ({
                    style: { cursor: "pointer" },
                    onClick: () => setDetailClientId(record.id || null),
                })}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total, range) =>
                        t("clients.pagination")
                            .replace("{0}", String(range[0]))
                            .replace("{1}", String(range[1]))
                            .replace("{2}", String(total)),
                }}
            />

            {/* Create/Edit Modal */}
            <Modal
                title={
                    editingClient
                        ? t("clients.editTitle")
                        : t("clients.newTitle")
                }
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    style={{ marginTop: 16 }}
                >
                    <Form.Item
                        name="client_type"
                        label={t("clients.clientType")}
                    >
                        <Radio.Group>
                            <Radio.Button value="company">
                                {t("clients.typeCompany")}
                            </Radio.Button>
                            <Radio.Button value="person">
                                {t("clients.typePerson")}
                            </Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    <Form.Item noStyle shouldUpdate={(prev, cur) => prev.client_type !== cur.client_type}>
                        {() => (
                            <Form.Item
                                name="name"
                                label={
                                    form.getFieldValue("client_type") === "person"
                                        ? t("clients.personName")
                                        : t("clients.companyName")
                                }
                                rules={[
                                    { required: true, message: t("clients.required") },
                                ]}
                            >
                                <Input
                                    placeholder={
                                        form.getFieldValue("client_type") === "person"
                                            ? t("clients.personNamePlaceholder")
                                            : t("clients.companyName")
                                    }
                                />
                            </Form.Item>
                        )}
                    </Form.Item>

                    <Form.Item
                        name="contact_person"
                        label={t("clients.contactPerson")}
                    >
                        <Input placeholder={t("clients.contactPerson")} />
                    </Form.Item>

                    <Form.Item
                        name="address_line1"
                        label={t("clients.address")}
                        rules={[
                            { required: true, message: t("clients.required") },
                        ]}
                    >
                        <Input placeholder={t("clients.streetNumber")} />
                    </Form.Item>

                    <Form.Item
                        name="address_line2"
                        label={t("clients.addressExtra")}
                    >
                        <Input placeholder={t("clients.addressExtra")} />
                    </Form.Item>

                    <Row gutter={[12, 0]}>
                        <Col xs={24} sm={8}>
                            <Form.Item
                                name="postal_code"
                                label={t("clients.postalCode")}
                                rules={[
                                    {
                                        required: true,
                                        message: t("clients.required"),
                                    },
                                ]}
                            >
                                <Input placeholder={t("clients.postalCode")} />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={16}>
                            <Form.Item
                                name="city"
                                label={t("clients.city")}
                                rules={[
                                    {
                                        required: true,
                                        message: t("clients.required"),
                                    },
                                ]}
                            >
                                <Input placeholder={t("clients.city")} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="country" label={t("clients.country")}>
                        <Input placeholder={t("clients.country")} />
                    </Form.Item>

                    <Row gutter={[12, 0]}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="email" label={t("clients.email")}>
                                <Input
                                    placeholder="email@example.com"
                                    type="email"
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={12}>
                            <Form.Item name="phone" label={t("clients.phone")}>
                                <Input placeholder="+49 123 456789" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={[12, 0]}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="vat_id"
                                label={t("clients.vatId")}
                                extra={
                                    vatCheck.status === "valid"
                                        ? `✓ ${t("clients.vatIdValid")}${vatCheck.name ? ` – ${vatCheck.name}` : ""}`
                                        : vatCheck.status === "invalid"
                                          ? t("clients.vatIdInvalid")
                                          : vatCheck.status === "error"
                                            ? t("clients.vatIdCheckFailed")
                                            : undefined
                                }
                            >
                                <Input
                                    placeholder="DE123456789"
                                    addonAfter={
                                        <Button
                                            type="link"
                                            size="small"
                                            style={{ padding: 0, height: "auto" }}
                                            loading={
                                                vatCheck.status === "checking"
                                            }
                                            onClick={checkVatId}
                                        >
                                            VIES
                                        </Button>
                                    }
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="tax_number"
                                label={t("clients.taxNumber")}
                            >
                                <Input placeholder="12/345/67890" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="leitweg_id" label={t("clients.leitwegId")}>
                        <Input placeholder={t("clients.leitwegPlaceholder")} />
                    </Form.Item>

                    <EInvoiceFields />
                    <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
                        <Space>
                            <Button onClick={() => setModalOpen(false)}>
                                {t("clients.cancel")}
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={submitting}
                            >
                                {editingClient
                                    ? t("clients.save")
                                    : t("clients.create")}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* AI Reply Draft Modal */}
            <Modal
                title={t("clients.aiDraftTitle")}
                open={replyModalOpen}
                onCancel={() => setReplyModalOpen(false)}
                footer={[
                    <Button
                        key="copy"
                        icon={<CopyOutlined />}
                        onClick={() => void handleCopyReplyDraft()}
                    >
                        {t("clients.aiCopy")}
                    </Button>,
                    <Button
                        key="email"
                        type="primary"
                        icon={<MailOutlined />}
                        onClick={handleOpenReplyEmail}
                        disabled={!replyClient?.email}
                    >
                        {t("clients.aiOpenEmail")}
                    </Button>,
                ]}
                width={760}
            >
                <Card size="small" style={{ marginBottom: 16 }}>
                    <strong>{replyClient?.name}</strong>
                    <div>
                        {replyClient?.email || t("clients.aiEmailMissing")}
                    </div>
                </Card>
                <div style={{ whiteSpace: "pre-wrap" }}>{replyDraft}</div>
            </Modal>

            {/* Client 360° Drawer */}
            <Drawer
                title={l("Kundenakte 360°", "Client 360° Profile")}
                open={!!detailClientId}
                onClose={() => setDetailClientId(null)}
                size={520}
            >
                {(() => {
                    const selected = clients.find((c) => c.id === detailClientId);
                    if (!selected) return null;
                    const cInvoices = getInvoicesForClient(selected.id);
                    const cBookings = getBookingsForClient(selected);
                    const cProjects = getProjectsForClient(selected.id);
                    return (
                        <div>
                            <Typography.Title level={5} style={{ marginTop: 0 }}>
                                {selected.name}
                            </Typography.Title>
                            <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                                {[selected.email, selected.phone, selected.city].filter(Boolean).join(" · ")}
                            </Typography.Paragraph>
                            <Space wrap style={{ marginBottom: 16 }}>
                                <Link href="/dashboard/invoices/create">
                                    <Button type="primary" icon={<FileTextOutlined />}>
                                        {l("Neue Rechnung", "New invoice")}
                                    </Button>
                                </Link>
                                <Link href={`/dashboard/termine/buchungen?clientId=${selected.id}`}>
                                    <Button icon={<CalendarOutlined />}>
                                        {l("Termin buchen", "Book appointment")}
                                    </Button>
                                </Link>
                                <Link href="/dashboard/workspace">
                                    <Button icon={<ProjectOutlined />}>
                                        {l("Projekte & Aufgaben", "Projects & tasks")}
                                    </Button>
                                </Link>
                                <Button icon={<EditOutlined />} onClick={() => openEditModal(selected)}>
                                    {l("Stammdaten", "Edit details")}
                                </Button>
                            </Space>

                            <Divider titlePlacement="left">
                                {l("Rechnungen", "Invoices")} ({cInvoices.length})
                            </Divider>
                            {cInvoices.length === 0 ? (
                                <Typography.Paragraph type="secondary">
                                    {l("Noch keine Rechnungen für diesen Kunden.", "No invoices for this client yet.")}
                                </Typography.Paragraph>
                            ) : (
                                <Space orientation="vertical" style={{ width: "100%" }} size={8}>
                                    {cInvoices.slice(0, 8).map((inv) => (
                                        <Card key={inv.id} size="small">
                                            <Space style={{ justifyContent: "space-between", width: "100%" }}>
                                                <Link href={`/dashboard/invoices/${inv.id}`}>
                                                    <strong>{inv.invoice_number}</strong> · {inv.issue_date}
                                                </Link>
                                                <Space>
                                                    <Tag>{inv.status}</Tag>
                                                    <strong>{formatCurrency(inv.total_gross)}</strong>
                                                </Space>
                                            </Space>
                                        </Card>
                                    ))}
                                </Space>
                            )}

                            <Divider titlePlacement="left">
                                {l("Terminbuchungen", "Appointments")} ({cBookings.length})
                            </Divider>
                            {cBookings.length === 0 ? (
                                <Typography.Paragraph type="secondary">
                                    {l("Noch keine Terminbuchungen.", "No appointments booked yet.")}
                                </Typography.Paragraph>
                            ) : (
                                <Space orientation="vertical" style={{ width: "100%" }} size={8}>
                                    {cBookings.slice(0, 8).map((bk) => (
                                        <Card key={bk.$id} size="small">
                                            <Space style={{ justifyContent: "space-between", width: "100%" }} wrap>
                                                <span>
                                                    <strong>{bk.serviceNameSnapshot}</strong> ·{" "}
                                                    {new Date(bk.startUtc).toLocaleString(
                                                        language === "de" ? "de-DE" : "en-GB",
                                                    )}
                                                </span>
                                                <Tag color={BOOKING_STATUS_COLOR[bk.status] ?? "default"}>
                                                    {bookingStatusLabel(bk.status, language)}
                                                </Tag>
                                            </Space>
                                        </Card>
                                    ))}
                                </Space>
                            )}

                            <Divider titlePlacement="left">
                                {l("Projekte", "Projects")} ({cProjects.length})
                            </Divider>
                            {cProjects.length === 0 ? (
                                <Typography.Paragraph type="secondary">
                                    {l("Noch keine Projekte zugeordnet.", "No projects assigned yet.")}
                                </Typography.Paragraph>
                            ) : (
                                <Space orientation="vertical" style={{ width: "100%" }} size={8}>
                                    {cProjects.map((prj) => (
                                        <Card key={prj.id} size="small">
                                            <Space style={{ justifyContent: "space-between", width: "100%" }}>
                                                <Link href="/dashboard/workspace">
                                                    <strong>{prj.name}</strong>
                                                </Link>
                                                <Space>
                                                    <Tag>{prj.status}</Tag>
                                                    <span>{formatCurrency(prj.budget)}</span>
                                                </Space>
                                            </Space>
                                        </Card>
                                    ))}
                                </Space>
                            )}
                        </div>
                    );
                })()}
            </Drawer>
        </div>
    );
}
