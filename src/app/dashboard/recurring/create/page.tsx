"use client";

import DecimalInput from "@/components/DecimalInput";
import { getCompanyInfo } from "@/lib/companyService";
import { defaultVatRate } from "@/lib/vatDefaults";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Card,
    Steps,
    Button,
    Space,
    message,
    Typography,
    Divider,
    Select,
    Table,
    DatePicker,
    Result,
    Input,
} from "antd";
import {
    PlusOutlined,
    DeleteOutlined,
    ArrowLeftOutlined,
    ArrowRightOutlined,
    CheckOutlined,
    RedoOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getAllClients } from "@/lib/clientService";
import { getAllProducts } from "@/lib/productService";
import { createRecurring } from "@/lib/recurringService";
import { formatCurrency, calculateInvoiceTotals } from "@/lib/currencyUtils";
import type { Client, Product, RecurringFormData } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";

const { Title, Text } = Typography;

interface LineItem {
    key: string;
    description: string;
    quantity: number;
    unit_of_measure: string;
    price: number;
    tax_rate_percent: number;
    discount_percent: number;
}

const vatOptions = [
    { value: 19, label: "19%" },
    { value: 7, label: "7%" },
    { value: 0, label: "0%" },
];

const intervalOptions = [
    { value: "weekly", labelKey: "recurring.interval.weekly" },
    { value: "monthly", labelKey: "recurring.interval.monthly" },
    { value: "quarterly", labelKey: "recurring.interval.quarterly" },
    { value: "annually", labelKey: "recurring.interval.annually" },
];

export default function RecurringCreatePage() {
    const router = useRouter();
    const { t } = useLanguage();

    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [smallBusiness, setSmallBusiness] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [templateName, setTemplateName] = useState("");
    const [interval, setInterval] = useState<string>("monthly");
    const [nextDueDate, setNextDueDate] = useState(dayjs().add(1, "month"));
    const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
    const [notes, setNotes] = useState("");
    const [paymentTerms, setPaymentTerms] = useState("");
    const [createdId, setCreatedId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [clientsData, productsData, companyData] = await Promise.all([
                getAllClients(),
                getAllProducts(),
                getCompanyInfo(),
            ]);
            setClients(clientsData);
            setSmallBusiness(!!companyData?.is_small_business);
            setProducts(productsData);
        } catch {
            message.error(t("recurring.loadError"));
        } finally {
            setLoading(false);
        }
    };

    const addEmptyLine = () => {
        setLineItems((prev) => [
            ...prev,
            {
                key: Date.now().toString(),
                description: "",
                quantity: 1,
                unit_of_measure: "Stück",
                price: 0,
                tax_rate_percent: defaultVatRate(smallBusiness),
                discount_percent: 0,
            },
        ]);
    };

    const addFromProduct = (productId: string) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return;
        setLineItems((prev) => [
            ...prev,
            {
                key: Date.now().toString(),
                description: product.name,
                quantity: 1,
                unit_of_measure: product.unit_of_measure,
                price: product.price,
                tax_rate_percent: defaultVatRate(smallBusiness, product.tax_rate_percent),
                discount_percent: 0,
            },
        ]);
    };

    const updateLineItem = (
        key: string,
        field: keyof LineItem,
        value: string | number,
    ) => {
        setLineItems((prev) =>
            prev.map((item) =>
                item.key === key ? { ...item, [field]: value } : item,
            ),
        );
    };

    const removeLineItem = (key: string) => {
        setLineItems((prev) => prev.filter((item) => item.key !== key));
    };

    const totals = calculateInvoiceTotals(
        lineItems.map((item) => ({
            quantity: item.quantity,
            price: item.price,
            tax_rate_percent: item.tax_rate_percent,
            discount_percent: item.discount_percent,
        })),
    );

    const handleCreate = async () => {
        if (!selectedClient) return;
        setSaving(true);
        try {
            const data: RecurringFormData = {
                template_name: templateName,
                client_id: selectedClient.id!,
                interval: interval as RecurringFormData["interval"],
                next_due_date: nextDueDate.format("YYYY-MM-DD"),
                end_date: endDate ? endDate.format("YYYY-MM-DD") : undefined,
                notes: notes || undefined,
                payment_terms: paymentTerms || undefined,
                items: lineItems.map((item) => ({
                    description: item.description,
                    quantity: item.quantity,
                    unit_of_measure: item.unit_of_measure,
                    price: item.price,
                    tax_rate_percent: item.tax_rate_percent,
                    discount_percent: item.discount_percent,
                })),
            };
            const id = await createRecurring(data);
            setCreatedId(id);
            setCurrentStep(3);
        } catch {
            message.error(t("recurringCreate.saveError"));
        } finally {
            setSaving(false);
        }
    };

    const lineColumns = [
        {
            title: t("invoiceCreate.description"),
            key: "description",
            render: (_: unknown, record: LineItem) => (
                <Input.TextArea
                    value={record.description}
                    onChange={(e) =>
                        updateLineItem(
                            record.key,
                            "description",
                            e.target.value,
                        )
                    }
                    autoSize={{ minRows: 1, maxRows: 3 }}
                />
            ),
        },
        {
            title: t("invoiceCreate.quantity"),
            key: "quantity",
            width: 90,
            render: (_: unknown, record: LineItem) => (
                <DecimalInput
                    value={record.quantity}
                    min={0}
                    step={0.5}
                    onChange={(v) =>
                        updateLineItem(record.key, "quantity", v ?? 0)
                    }
                    style={{ width: "100%" }}
                />
            ),
        },
        {
            title: t("invoiceCreate.unitPrice"),
            key: "price",
            width: 120,
            render: (_: unknown, record: LineItem) => (
                <DecimalInput
                    value={record.price}
                    min={0}
                    step={0.01}
                    addonAfter="€"
                    onChange={(v) =>
                        updateLineItem(record.key, "price", v ?? 0)
                    }
                    style={{ width: "100%" }}
                />
            ),
        },
        {
            title: "MwSt.",
            key: "vat",
            width: 80,
            render: (_: unknown, record: LineItem) => (
                <Select
                    value={record.tax_rate_percent}
                    options={vatOptions}
                    onChange={(v) =>
                        updateLineItem(record.key, "tax_rate_percent", v)
                    }
                    style={{ width: "100%" }}
                />
            ),
        },
        {
            title: t("invoiceCreate.lineTotal"),
            key: "total",
            width: 100,
            align: "right" as const,
            render: (_: unknown, record: LineItem) => {
                const net =
                    record.quantity *
                    record.price *
                    (1 - record.discount_percent / 100);
                return (
                    <Text>
                        {formatCurrency(
                            net * (1 + record.tax_rate_percent / 100),
                        )}
                    </Text>
                );
            },
        },
        {
            key: "delete",
            width: 40,
            render: (_: unknown, record: LineItem) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeLineItem(record.key)}
                />
            ),
        },
    ];

    const steps = [
        { title: t("recurringCreate.selectClient") },
        { title: t("recurringCreate.addItems") },
        { title: t("recurringCreate.review") },
        { title: t("recurringCreate.done") },
    ];

    return (
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <Space style={{ marginBottom: 24 }}>
                <RedoOutlined style={{ fontSize: 24 }} />
                <Title level={4} style={{ margin: 0 }}>
                    {t("recurringCreate.title")}
                </Title>
            </Space>

            <Steps
                current={currentStep}
                items={steps}
                style={{ marginBottom: 32 }}
            />

            {currentStep === 0 && (
                <Card>
                    <Title level={5}>{t("recurringCreate.selectClient")}</Title>
                    <Select
                        showSearch
                        placeholder={t("invoiceCreate.searchClients")}
                        style={{ width: "100%", marginBottom: 16 }}
                        loading={loading}
                        value={selectedClient?.id}
                        onChange={(val) =>
                            setSelectedClient(
                                clients.find((c) => c.id === val) || null,
                            )
                        }
                        optionFilterProp="label"
                        options={clients.map((c) => ({
                            value: c.id,
                            label: c.name,
                        }))}
                    />
                    <div style={{ textAlign: "right" }}>
                        <Button
                            type="primary"
                            icon={<ArrowRightOutlined />}
                            disabled={!selectedClient}
                            onClick={() => setCurrentStep(1)}
                        >
                            {t("recurringCreate.next")}
                        </Button>
                    </div>
                </Card>
            )}

            {currentStep === 1 && (
                <Card>
                    <Space style={{ marginBottom: 16 }}>
                        <Select
                            placeholder={t("invoiceCreate.addFromProducts")}
                            style={{ width: 250 }}
                            options={products.map((p) => ({
                                value: p.id,
                                label: p.name,
                            }))}
                            onChange={(val) => addFromProduct(val as string)}
                            value={null as unknown as string}
                        />
                        <Button icon={<PlusOutlined />} onClick={addEmptyLine}>
                            {t("invoiceCreate.addEmptyLine")}
                        </Button>
                    </Space>

                    <Table
                        dataSource={lineItems}
                        columns={lineColumns}
                        rowKey="key"
                        pagination={false}
                        locale={{ emptyText: t("invoiceCreate.noItems") }}
                    />

                    {lineItems.length > 0 && (
                        <div style={{ textAlign: "right", marginTop: 16 }}>
                            <Space direction="vertical" align="end">
                                <Text>
                                    {t("invoiceCreate.subtotal")}:{" "}
                                    {formatCurrency(totals.netAfterDiscount)}
                                </Text>
                                <Text>
                                    {t("invoiceCreate.vat")}:{" "}
                                    {formatCurrency(totals.totalVAT)}
                                </Text>
                                <Title level={5}>
                                    {t("invoiceCreate.total")}:{" "}
                                    {formatCurrency(totals.totalGross)}
                                </Title>
                            </Space>
                        </div>
                    )}

                    <Divider />
                    <Space>
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={() => setCurrentStep(0)}
                        >
                            {t("recurringCreate.back")}
                        </Button>
                        <Button
                            type="primary"
                            icon={<ArrowRightOutlined />}
                            disabled={lineItems.length === 0}
                            onClick={() => setCurrentStep(2)}
                        >
                            {t("recurringCreate.next")}
                        </Button>
                    </Space>
                </Card>
            )}

            {currentStep === 2 && (
                <Card>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 16,
                        }}
                    >
                        <div style={{ gridColumn: "1 / -1" }}>
                            <label
                                style={{ display: "block", marginBottom: 4 }}
                            >
                                {t("recurringCreate.templateName")} *
                            </label>
                            <Input
                                value={templateName}
                                onChange={(e) =>
                                    setTemplateName(e.target.value)
                                }
                                placeholder={t(
                                    "recurringCreate.templateNamePlaceholder",
                                )}
                            />
                        </div>
                        <div>
                            <label
                                style={{ display: "block", marginBottom: 4 }}
                            >
                                {t("recurringCreate.interval")}
                            </label>
                            <Select
                                value={interval}
                                onChange={setInterval}
                                style={{ width: "100%" }}
                                options={intervalOptions.map((o) => ({
                                    value: o.value,
                                    label: t(o.labelKey) || o.value,
                                }))}
                            />
                        </div>
                        <div>
                            <label
                                style={{ display: "block", marginBottom: 4 }}
                            >
                                {t("recurringCreate.nextDueDate")}
                            </label>
                            <DatePicker
                                value={nextDueDate}
                                onChange={(d) => d && setNextDueDate(d)}
                                style={{ width: "100%" }}
                            />
                        </div>
                        <div>
                            <label
                                style={{ display: "block", marginBottom: 4 }}
                            >
                                {t("recurringCreate.endDate")}
                            </label>
                            <DatePicker
                                value={endDate}
                                onChange={(d) => setEndDate(d)}
                                style={{ width: "100%" }}
                                placeholder={t(
                                    "recurringCreate.endDateOptional",
                                )}
                            />
                        </div>
                        <div>
                            <label
                                style={{ display: "block", marginBottom: 4 }}
                            >
                                {t("offerCreate.paymentTerms")}
                            </label>
                            <Input
                                value={paymentTerms}
                                onChange={(e) =>
                                    setPaymentTerms(e.target.value)
                                }
                            />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                            <label
                                style={{ display: "block", marginBottom: 4 }}
                            >
                                {t("offerCreate.notes")}
                            </label>
                            <Input.TextArea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <Divider />
                    <Space>
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={() => setCurrentStep(1)}
                        >
                            {t("recurringCreate.back")}
                        </Button>
                        <Button
                            type="primary"
                            icon={<CheckOutlined />}
                            loading={saving}
                            onClick={handleCreate}
                            disabled={!templateName}
                        >
                            {t("recurringCreate.create")}
                        </Button>
                    </Space>
                </Card>
            )}

            {currentStep === 3 && createdId && (
                <Card>
                    <Result
                        status="success"
                        title={t("recurringCreate.success")}
                        subTitle={t("recurringCreate.successDesc")}
                        extra={[
                            <Button
                                key="list"
                                type="primary"
                                onClick={() =>
                                    router.push("/dashboard/recurring")
                                }
                            >
                                {t("recurringCreate.viewList")}
                            </Button>,
                            <Button
                                key="another"
                                onClick={() =>
                                    router.push("/dashboard/recurring/create")
                                }
                            >
                                {t("recurringCreate.createAnother")}
                            </Button>,
                        ]}
                    />
                </Card>
            )}
        </div>
    );
}
