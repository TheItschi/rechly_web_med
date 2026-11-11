"use client";
import { InvoiceIdentifierEditor } from "@/components/dashboard/EInvoiceFields";
import { type EInvoiceData } from "@/lib/eRechnung/identifiers";
import {
    buildInvoiceFormData,
    summarizeServicePeriod,
    validateInvoiceDraft,
    type InvoiceLineItem as LineItem,
} from "@/lib/invoiceForm";
import {
    createInvoiceTemplate,
    getAllInvoiceTemplates,
    type InvoiceTemplate,
} from "@/lib/invoiceTemplateService";
import { defaultVatRate } from "@/lib/vatDefaults";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Card,
    Form,
    Input,
    Button,
    Space,
    message,
    Typography,
    Divider,
    Select,
    InputNumber,
    Table,
    DatePicker,
    Steps,
    Result,
    Modal,
    Tooltip,
} from "antd";
import {
    PlusOutlined,
    DeleteOutlined,
    ArrowLeftOutlined,
    ArrowRightOutlined,
    CheckOutlined,
    FileTextOutlined,
    RobotOutlined,
    ReloadOutlined,
    SaveOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { getAllClients, createClient } from "@/lib/clientService";
import { getAllProducts, createProduct } from "@/lib/productService";
import { createInvoice, getInvoiceById, getNextInvoiceNumber } from "@/lib/invoiceService";
import { getCompanyInfo } from "@/lib/companyService";
import { runInvoiceAssistant, parseInvoiceDraftWithAI } from "@/lib/aiService";
import {
    formatCurrency,
    calculateInvoiceTotals,
    type InvoiceTotals,
} from "@/lib/currencyUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import type {
    Client,
    Product,
    UserCompany,
} from "@/types";

const { Title, Text } = Typography;

export default function InvoiceCreatePage() {
    const router = useRouter();
    const { language, t } = useLanguage();

    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [clients, setClients] = useState<Client[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [eInvoice, setEInvoice] = useState<EInvoiceData | undefined>();
    const [company, setCompany] = useState<UserCompany | null>(null);

    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [invoiceDate, setInvoiceDate] = useState(dayjs());
    const [dueDate, setDueDate] = useState(dayjs().add(14, "day"));
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [numberTouched, setNumberTouched] = useState(false);
    const [deliveryDateStart, setDeliveryDateStart] = useState<Dayjs | null>(null);
    const [deliveryDateEnd, setDeliveryDateEnd] = useState<Dayjs | null>(null);
    const [notes, setNotes] = useState("");
    const [paymentTerms, setPaymentTerms] = useState("");
    const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templateSaving, setTemplateSaving] = useState(false);
    const [templateForm] = Form.useForm();
    const [generatingNotes, setGeneratingNotes] = useState(false);
    const [generatingPaymentTerms, setGeneratingPaymentTerms] = useState(false);
    const [generatingLineItemKey, setGeneratingLineItemKey] = useState<
        string | null
    >(null);
    const [aiPrompt, setAiPrompt] = useState("");
    const [parsingPrompt, setParsingPrompt] = useState(false);

    const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(
        null,
    );

    const [clientModalOpen, setClientModalOpen] = useState(false);
    const [clientSaving, setClientSaving] = useState(false);
    const [clientForm] = Form.useForm();
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [productSaving, setProductSaving] = useState(false);
    const [productForm] = Form.useForm();

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [clientsData, productsData, companyData, templatesData] =
                await Promise.all([
                    getAllClients(),
                    getAllProducts(),
                    getCompanyInfo(),
                    getAllInvoiceTemplates().catch(() => [] as InvoiceTemplate[]),
                ]);
            setClients(clientsData);
            setProducts(productsData);
            setCompany(companyData);
            setPaymentTerms(companyData?.payment_terms_default || "");
            setTemplates(templatesData);
        } catch (error) {
            console.error("Error loading data:", error);
            message.error(t("invoiceCreate.loadError"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    const toLineItem = useCallback(
        (item: {
            description: string;
            quantity: number;
            unit_of_measure?: string;
            price: number;
            tax_rate_percent?: number;
            discount_percent?: number;
            product_id?: string;
            service_date_start?: string;
            service_date_end?: string;
        }): LineItem => ({
            key: `${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
            description: item.description,
            service_summary: item.description,
            quantity: item.quantity || 1,
            unit_of_measure: item.unit_of_measure || t("invoiceCreate.unitPiece"),
            price: item.price ?? 0,
            tax_rate_percent:
                typeof item.tax_rate_percent === "number"
                    ? item.tax_rate_percent
                    : defaultVatRate(company?.is_small_business),
            discount_percent: item.discount_percent ?? 0,
            ...(item.product_id ? { product_id: item.product_id } : {}),
            ...(item.service_date_start ? { service_date_start: item.service_date_start } : {}),
            ...(item.service_date_end ? { service_date_end: item.service_date_end } : {}),
        }),
        [company, t],
    );

    /** Fill the whole form from an existing invoice or template draft. */
    const applyDraftData = useCallback(
        (draft: {
            clientId?: string;
            notes?: string;
            paymentTerms?: string;
            deliveryDateStart?: string;
            deliveryDateEnd?: string;
            items: Array<{
                description: string;
                quantity: number;
                unit_of_measure?: string;
                price: number;
                tax_rate_percent?: number;
                discount_percent?: number;
                product_id?: string;
                service_date_start?: string;
                service_date_end?: string;
            }>;
        }) => {
            if (draft.clientId) {
                const found = clients.find((c) => c.id === draft.clientId);
                setSelectedClient(found ?? null);
            } else {
                setSelectedClient(null);
            }
            setEInvoice(undefined);
            setNotes(draft.notes ?? "");
            setPaymentTerms(draft.paymentTerms ?? company?.payment_terms_default ?? "");
            setDeliveryDateStart(draft.deliveryDateStart ? dayjs(draft.deliveryDateStart) : null);
            setDeliveryDateEnd(draft.deliveryDateEnd ? dayjs(draft.deliveryDateEnd) : null);
            setLineItems(draft.items.map((item) => toLineItem(item)));
        },
        [clients, company, toLineItem],
    );

    const applyTemplate = useCallback(
        (template: InvoiceTemplate) => {
            applyDraftData({
                clientId: template.payload.clientId,
                notes: template.payload.notes,
                paymentTerms: template.payload.paymentTerms,
                deliveryDateStart: template.payload.deliveryDateStart,
                deliveryDateEnd: template.payload.deliveryDateEnd,
                items: template.payload.items.map((item) => ({
                    description: item.description,
                    quantity: item.quantity,
                    unit_of_measure: item.unitOfMeasure,
                    price: item.price,
                    tax_rate_percent: item.taxRatePercent,
                    discount_percent: item.discount,
                    product_id: item.productId,
                    service_date_start: item.serviceDateStart,
                    service_date_end: item.serviceDateEnd,
                })),
            });
            message.success(t("invoiceCreate.templateApplied"));
        },
        [applyDraftData, t],
    );

    const suggestDuplicatePrefill = useCallback(async () => {
        try {
            const params = new URLSearchParams(window.location.search);
            const duplicateId = params.get("duplicate");
            const templateId = params.get("template");
            if (duplicateId) {
                const source = await getInvoiceById(duplicateId);
                if (!source) {
                    message.error(t("invoiceCreate.duplicateNotFound"));
                    return;
                }
                applyDraftData({
                    clientId: source.client_id,
                    notes: source.notes,
                    paymentTerms: source.payment_terms,
                    deliveryDateStart: source.delivery_date_start,
                    deliveryDateEnd: source.delivery_date_end ?? source.delivery_date,
                    items: source.items.map((item) => ({
                        description: item.description,
                        quantity: item.quantity,
                        unit_of_measure: item.unit_of_measure,
                        price: item.price,
                        tax_rate_percent: item.tax_rate_percent,
                        discount_percent: item.discount_percent,
                        product_id: item.product_id ?? undefined,
                        service_date_start: item.service_date_start,
                        service_date_end: item.service_date_end,
                    })),
                });
                message.success(t("invoiceCreate.duplicatedNotice"));
            } else if (templateId) {
                const tpl = templates.find((item) => item.id === templateId);
                if (!tpl) {
                    message.error(t("invoiceCreate.templateNotFound"));
                    return;
                }
                applyTemplate(tpl);
            }
        } catch (error) {
            console.error("Error applying prefill:", error);
        }
    }, [templates, applyDraftData, applyTemplate, t]);

    const generateInvoiceNumber = useCallback(async () => {
        try {
            const next = await getNextInvoiceNumber();
            if (next?.number) {
                setInvoiceNumber(next.number);
                setNumberTouched(false);
                return;
            }
        } catch (error) {
            console.error("Error fetching next invoice number:", error);
        }
        // Fallback when the numbering endpoint is unavailable.
        const year = dayjs().format("YYYY");
        const month = dayjs().format("MM");
        const random = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, "0");
        setInvoiceNumber(`RE-${year}${month}-${random}`);
        setNumberTouched(false);
    }, []);

    const [prefillDone, setPrefillDone] = useState(false);

    useEffect(() => {
        void loadData();
        void generateInvoiceNumber();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!loading && !prefillDone) {
            setPrefillDone(true);
            void suggestDuplicatePrefill();
        }
    }, [loading, prefillDone, suggestDuplicatePrefill]);

    const addLineItem = () => {
        const newItem: LineItem = {
            key: Date.now().toString(),
            description: "",
            service_summary: "",
            quantity: 1,
            unit_of_measure: t("invoiceCreate.unitPiece"),
            price: 0,
            tax_rate_percent: defaultVatRate(company?.is_small_business),
            discount_percent: 0,
        };
        setLineItems([...lineItems, newItem]);
    };

    const updateLineItem = (
        key: string,
        field: keyof LineItem,
        value: unknown,
    ) => {
        setLineItems(
            lineItems.map((item) => {
                if (item.key === key) {
                    return { ...item, [field]: value };
                }
                return item;
            }),
        );
    };

    const removeLineItem = (key: string) => {
        setLineItems(lineItems.filter((item) => item.key !== key));
    };

    const addProductAsLineItem = (productId: string) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return;

        const newItem: LineItem = {
            key: Date.now().toString(),
            description: product.name,
            service_summary: product.description || product.name,
            quantity: 1,
            unit_of_measure: product.unit_of_measure || t("invoiceCreate.unitPiece"),
            price: product.price,
            tax_rate_percent: defaultVatRate(company?.is_small_business, product.tax_rate_percent),
            discount_percent: 0,
        };
        setLineItems([...lineItems, newItem]);
    };

    const handleCreateClient = async () => {
        try {
            const values = await clientForm.validateFields();
            setClientSaving(true);
            const newClient = await createClient({
                name: values.name.trim(),
                email: values.email?.trim() || undefined,
                phone: values.phone?.trim() || undefined,
                address_line1: values.address_line1?.trim() || "",
                postal_code: values.postal_code?.trim() || "",
                city: values.city?.trim() || "",
                country: values.country?.trim() || "Deutschland",
            });
            setClients((prev) => [...prev, newClient]);
            setSelectedClient(newClient);
            setEInvoice(undefined);
            setClientModalOpen(false);
            clientForm.resetFields();
            message.success(t("invoiceCreate.createdClient"));
        } catch (error) {
            if (error instanceof Error && error.message) {
                message.error(error.message);
            }
        } finally {
            setClientSaving(false);
        }
    };

    const handleCreateProduct = async () => {
        try {
            const values = await productForm.validateFields();
            setProductSaving(true);
            const newProduct = await createProduct({
                name: values.name.trim(),
                description: values.description?.trim() || undefined,
                price: Number(values.price) || 0,
                tax_rate_percent: Number(values.tax_rate_percent ?? defaultVatRate(company?.is_small_business)),
                unit_of_measure: values.unit_of_measure?.trim() || t("invoiceCreate.unitPiece"),
            });
            setProducts((prev) => [...prev, newProduct]);
            setProductModalOpen(false);
            productForm.resetFields();
            message.success(t("invoiceCreate.createdProduct"));
            if (newProduct.id) {
                addProductAsLineItem(newProduct.id);
            }
        } catch (error) {
            if (error instanceof Error && error.message) {
                message.error(error.message);
            }
        } finally {
            setProductSaving(false);
        }
    };

    const totals: InvoiceTotals = calculateInvoiceTotals(
        lineItems.map((item) => ({
            quantity: item.quantity,
            price: item.price,
            tax_rate_percent: item.tax_rate_percent,
            discount_percent: item.discount_percent,
        })),
    );

    /** Adopt min start / max end from per-item service dates. */
    const handleAdoptServicePeriod = () => {
        const summary = summarizeServicePeriod(
            lineItems.map((item) => ({
                service_date_start: item.service_date_start,
                service_date_end: item.service_date_end,
            })),
        );
        if (!summary) {
            message.info(t("invoiceCreate.noServiceDates"));
            return;
        }
        setDeliveryDateStart(dayjs(summary.start));
        setDeliveryDateEnd(dayjs(summary.end));
        message.success(t("invoiceCreate.servicePeriodAdopted"));
    };

    /** Save the current draft as a reusable template. */
    const handleSaveTemplate = async () => {
        try {
            const name = (templateForm.getFieldValue("name") as string | undefined)?.trim();
            if (!name) {
                message.warning(t("invoiceCreate.templateNameRequired"));
                return;
            }
            setTemplateSaving(true);
            const tpl = await createInvoiceTemplate({
                name: name.slice(0, 120),
                payload: {
                    ...(selectedClient?.id ? { clientId: selectedClient.id } : {}),
                    ...(notes.trim() ? { notes: notes.trim() } : {}),
                    ...(paymentTerms.trim() ? { paymentTerms: paymentTerms.trim() } : {}),
                    ...(deliveryDateStart ? { deliveryDateStart: deliveryDateStart.format("YYYY-MM-DD") } : {}),
                    ...(deliveryDateEnd ? { deliveryDateEnd: deliveryDateEnd.format("YYYY-MM-DD") } : {}),
                    items: lineItems.map((item) => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitOfMeasure: item.unit_of_measure,
                        price: item.price,
                        taxRatePercent: item.tax_rate_percent,
                        discount: item.discount_percent,
                        ...(item.product_id ? { productId: item.product_id } : {}),
                        ...(item.service_date_start ? { serviceDateStart: item.service_date_start } : {}),
                        ...(item.service_date_end ? { serviceDateEnd: item.service_date_end } : {}),
                    })),
                },
            });
            setTemplates((prev) => [tpl, ...prev]);
            setTemplateModalOpen(false);
            templateForm.resetFields();
            message.success(t("invoiceCreate.templateSaved"));
        } catch (error) {
            console.error("Error saving template:", error);
            message.error(error instanceof Error ? error.message : t("invoiceCreate.createError"));
        } finally {
            setTemplateSaving(false);
        }
    };

    const handleCreateInvoice = async () => {
        const draftError = validateInvoiceDraft(selectedClient?.id, lineItems.length);
        if (draftError === "missing-client") {
            message.error(t("invoiceCreate.selectClientError"));
            return;
        }
        if (draftError === "missing-items") {
            message.error(t("invoiceCreate.addItemsError"));
            return;
        }
        if (deliveryDateStart && deliveryDateEnd && deliveryDateStart.isAfter(deliveryDateEnd, "day")) {
            message.error(t("invoiceCreate.servicePeriodInvalid"));
            return;
        }

        setSaving(true);
        try {
            const invoiceData = buildInvoiceFormData({
                clientId: selectedClient!.id!,
                eInvoice,
                invoiceNumber,
                issueDate: invoiceDate.format("YYYY-MM-DD"),
                dueDate: dueDate.format("YYYY-MM-DD"),
                notes,
                paymentTerms,
                deliveryDateStart: deliveryDateStart?.format("YYYY-MM-DD"),
                deliveryDateEnd: deliveryDateEnd?.format("YYYY-MM-DD"),
                lineItems,
            });

            const created = await createInvoice(invoiceData);
            // Use the server-assigned number (may differ after conflict resolution).
            if (created.invoiceNumber) {
                setInvoiceNumber(created.invoiceNumber);
            }

            setCreatedInvoiceId(created.id);
            setCurrentStep(3);
            message.success(t("invoiceCreate.created"));
        } catch (error) {
            console.error("Error creating invoice:", error);
            const status = (error as { status?: number } | null)?.status;
            if (status === 409) {
                message.error(t("invoiceCreate.numberTaken"));
            } else {
                const errorMsg = error instanceof Error ? error.message : t("invoiceCreate.createError");
                message.error(errorMsg);
            }
        } finally {
            setSaving(false);
        }
    };

    const buildAssistantPayload = () => ({
        companyName: company?.name,
        clientName: selectedClient?.name,
        clientEmail: selectedClient?.email,
        invoiceNumber,
        issueDate: invoiceDate.format("YYYY-MM-DD"),
        dueDate: dueDate.format("YYYY-MM-DD"),
        totalGross: totals.totalGross,
        currency: "EUR",
        notes: notes || undefined,
        paymentTerms: paymentTerms || undefined,
        lineItems: lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit_of_measure: item.unit_of_measure,
            price: item.price,
        })),
    });

    const handleGenerateNotes = async () => {
        if (!selectedClient) {
            message.warning(t("invoiceCreate.selectClientFirst"));
            return;
        }

        setGeneratingNotes(true);
        try {
            const result = await runInvoiceAssistant({
                action: "invoice_note",
                ...buildAssistantPayload(),
            });
            setNotes(result.content);
            message.success(t("invoiceCreate.notesAiCreated"));
        } catch (error) {
            console.error("Error generating invoice notes:", error);
            message.error(
                error instanceof Error
                    ? error.message
                    : t("invoiceCreate.notesAiError"),
            );
        } finally {
            setGeneratingNotes(false);
        }
    };

    const handleGeneratePaymentTerms = async () => {
        if (!selectedClient) {
            message.warning(t("invoiceCreate.selectClientFirst"));
            return;
        }

        setGeneratingPaymentTerms(true);
        try {
            const result = await runInvoiceAssistant({
                action: "payment_terms",
                ...buildAssistantPayload(),
            });
            setPaymentTerms(result.content);
            message.success(t("invoiceCreate.paymentTermsAiCreated"));
        } catch (error) {
            console.error("Error generating payment terms:", error);
            message.error(
                error instanceof Error
                    ? error.message
                    : t("invoiceCreate.paymentTermsAiError"),
            );
        } finally {
            setGeneratingPaymentTerms(false);
        }
    };

    const handleGenerateLineItemDescription = async (item: LineItem) => {
        const serviceSummary =
            item.service_summary?.trim() || item.description.trim();
        if (!serviceSummary) {
            message.warning(
                t("invoiceCreate.serviceSummaryHint"),
            );
            return;
        }

        setGeneratingLineItemKey(item.key);
        try {
            const result = await runInvoiceAssistant({
                action: "line_item_description",
                ...buildAssistantPayload(),
                serviceSummary,
            });
            updateLineItem(item.key, "description", result.content);
            if (!item.service_summary?.trim()) {
                updateLineItem(item.key, "service_summary", serviceSummary);
            }
            message.success(t("invoiceCreate.lineItemAiCreated"));
        } catch (error) {
            console.error("Error generating line item description:", error);
            message.error(
                error instanceof Error
                    ? error.message
                    : t("invoiceCreate.lineItemAiError"),
            );
        } finally {
            setGeneratingLineItemKey(null);
        }
    };

    const handleAiQuickFill = async () => {
        if (!aiPrompt.trim()) {
            message.warning(t("invoiceCreate.aiQuickPlaceholder"));
            return;
        }

        setParsingPrompt(true);
        try {
            const result = await parseInvoiceDraftWithAI({
                promptText: aiPrompt,
                isSmallBusiness: company?.is_small_business,
                availableClients: clients.map((c) => ({
                    id: c.id || "",
                    name: c.name,
                })),
            });

            const parsed = result.parsed;
            if (parsed.client_id) {
                const found = clients.find((c) => c.id === parsed.client_id);
                if (found) {
                    if (found.id !== selectedClient?.id) setEInvoice(undefined);
                    setSelectedClient(found);
                }
            } else if (parsed.client_name) {
                const found = clients.find(
                    (c) =>
                        c.name.toLowerCase() ===
                        parsed.client_name?.toLowerCase(),
                );
                if (found) {
                    if (found.id !== selectedClient?.id) setEInvoice(undefined);
                    setSelectedClient(found);
                }
            }

            if (parsed.items && parsed.items.length > 0) {
                const newItems: LineItem[] = parsed.items.map((it, idx) => ({
                    key: `${Date.now()}-${idx}`,
                    description: it.description,
                    service_summary: it.description,
                    quantity: it.quantity,
                    unit_of_measure:
                        it.unit_of_measure || t("invoiceCreate.unitPiece"),
                    price: it.price,
                    tax_rate_percent: company?.is_small_business
                        ? 0
                        : it.tax_rate_percent,
                    discount_percent: 0,
                }));
                setLineItems(newItems);
            }

            if (parsed.due_days) {
                setDueDate(dayjs().add(parsed.due_days, "day"));
            }

            if (parsed.payment_terms) {
                setPaymentTerms(parsed.payment_terms);
            }

            if (parsed.notes) {
                setNotes(parsed.notes);
            }

            message.success(t("invoiceCreate.aiQuickSuccess"));
            if (parsed.client_id || parsed.client_name) {
                setCurrentStep(1);
            }
        } catch (error) {
            console.error("AI Quick Fill error:", error);
            message.error(
                error instanceof Error
                    ? error.message
                    : t("invoiceCreate.aiQuickError"),
            );
        } finally {
            setParsingPrompt(false);
        }
    };

    const columns = [
        {
            title: t("invoiceCreate.description"),
            dataIndex: "description",
            key: "description",
            render: (_: unknown, record: LineItem) => (
                <Space direction="vertical" style={{ width: "100%" }} size={8}>
                    <Input.TextArea
                        value={record.description}
                        onChange={(e) =>
                            updateLineItem(
                                record.key,
                                "description",
                                e.target.value,
                            )
                        }
                        placeholder={t("invoiceCreate.descriptionPlaceholder")}
                        rows={2}
                    />
                    <details><summary style={{ cursor: "pointer" }}>{t("einvoice.gtin")}</summary><Input aria-label={t("einvoice.gtin")} maxLength={14} value={record.gtin || ""} onChange={e => updateLineItem(record.key, "gtin", e.target.value)} placeholder={t("einvoice.gtinHelp")} /></details>
                    <Space.Compact style={{ width: "100%" }}>
                        <Input
                            value={record.service_summary}
                            onChange={(e) =>
                                updateLineItem(
                                    record.key,
                                    "service_summary",
                                    e.target.value,
                                )
                            }
                            placeholder={t("invoiceCreate.serviceSummaryPlaceholder")}
                        />
                        <Button
                            icon={<RobotOutlined />}
                            loading={generatingLineItemKey === record.key}
                            onClick={() =>
                                void handleGenerateLineItemDescription(record)
                            }
                        >
                            {t("invoiceCreate.ai")}
                        </Button>
                    </Space.Compact>
                </Space>
            ),
        },
        {
            title: t("invoiceCreate.quantity"),
            dataIndex: "quantity",
            key: "quantity",
            width: 100,
            render: (_: unknown, record: LineItem) => (
                <InputNumber
                    value={record.quantity}
                    min={0}
                    onChange={(val) =>
                        updateLineItem(record.key, "quantity", val || 0)
                    }
                    style={{ width: "100%" }}
                />
            ),
        },
        {
            title: t("invoiceDetail.unit"),
            dataIndex: "unit_of_measure",
            key: "unit_of_measure",
            width: 100,
            render: (_: unknown, record: LineItem) => (
                <Select
                    value={record.unit_of_measure}
                    onChange={(val) =>
                        updateLineItem(record.key, "unit_of_measure", val)
                    }
                    style={{ width: "100%" }}
                    options={[
                        { value: t("invoiceCreate.unitPiece"), label: t("invoiceCreate.unitPiece") },
                        { value: t("invoiceCreate.unitHour"), label: t("invoiceCreate.unitHour") },
                        { value: t("invoiceCreate.unitDay"), label: t("invoiceCreate.unitDay") },
                        { value: t("invoiceCreate.unitMonth"), label: t("invoiceCreate.unitMonth") },
                        { value: t("invoiceCreate.unitFlatRate"), label: t("invoiceCreate.unitFlatRate") },
                        { value: "m²", label: "m²" },
                        { value: "kg", label: "kg" },
                    ]}
                />
            ),
        },
        {
            title: t("invoiceCreate.unitPrice"),
            dataIndex: "price",
            key: "price",
            width: 120,
            render: (_: unknown, record: LineItem) => (
                <Space.Compact style={{ width: "100%" }}>
                    <InputNumber
                        value={record.price}
                        min={0}
                        step={0.01}
                        precision={2}
                        onChange={(val) =>
                            updateLineItem(record.key, "price", val || 0)
                        }
                        style={{ width: "100%" }}
                    />
                    <Button disabled style={{ pointerEvents: "none" }}>
                        €
                    </Button>
                </Space.Compact>
            ),
        },
        {
            title: t("invoiceCreate.vat"),
            dataIndex: "tax_rate_percent",
            key: "tax_rate_percent",
            width: 100,
            render: (_: unknown, record: LineItem) => (
                <Select
                    value={record.tax_rate_percent}
                    onChange={(val) =>
                        updateLineItem(record.key, "tax_rate_percent", val)
                    }
                    style={{ width: "100%" }}
                    options={[
                        { value: 0, label: "0%" },
                        { value: 7, label: "7%" },
                        { value: 19, label: "19%" },
                    ]}
                />
            ),
        },
        {
            title: t("invoiceCreate.itemServicePeriod"),
            key: "service_period",
            width: 210,
            render: (_: unknown, record: LineItem) => (
                <DatePicker.RangePicker
                    size="small"
                    format="DD.MM.YY"
                    value={[
                        record.service_date_start ? dayjs(record.service_date_start) : null,
                        record.service_date_end ? dayjs(record.service_date_end) : null,
                    ]}
                    allowEmpty={[true, true]}
                    onChange={(dates) => {
                        const [start, end] = dates ?? [null, null];
                        updateLineItem(record.key, "service_date_start", start ? start.format("YYYY-MM-DD") : undefined);
                        updateLineItem(record.key, "service_date_end", end ? end.format("YYYY-MM-DD") : undefined);
                    }}
                    style={{ width: "100%" }}
                />
            ),
        },
        {
            title: t("invoiceCreate.lineTotal"),
            key: "line_total",
            width: 100,
            render: (_: unknown, record: LineItem) => {
                const lineTotal = record.quantity * record.price;
                return <Text strong>{formatCurrency(lineTotal)}</Text>;
            },
        },
        {
            title: "",
            key: "actions",
            width: 50,
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

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <Card title={t("invoiceCreate.selectClientCard")}>
                        {templates.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <Select
                                    style={{ width: "100%" }}
                                    placeholder={t("invoiceCreate.fromTemplate")}
                                    value={undefined}
                                    onChange={(id: string) => {
                                        const tpl = templates.find((item) => item.id === id);
                                        if (tpl) applyTemplate(tpl);
                                    }}
                                    options={templates.map((tpl) => ({ value: tpl.id, label: tpl.name }))}
                                    allowClear
                                />
                            </div>
                        )}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Select
                                showSearch
                                style={{ flex: "1 1 200px", minWidth: 0 }}
                                placeholder={t("invoiceCreate.clientSearch")}
                                optionFilterProp="label"
                                value={selectedClient?.id}
                                onChange={(value) => {
                                    const client = clients.find(
                                        (c) => c.id === value,
                                    );
                                    setSelectedClient(client || null);
                                    setEInvoice(undefined);
                                }}
                                options={clients.map((c) => ({
                                    value: c.id,
                                    label: `${c.name} ${
                                        c.contact_person
                                            ? `(${c.contact_person})`
                                            : ""
                                    }`,
                                }))}
                                size="large"
                            />
                            <Button
                                icon={<PlusOutlined />}
                                size="large"
                                onClick={() => setClientModalOpen(true)}
                            >
                                {t("invoiceCreate.newClientBtn")}
                            </Button>
                        </div>
                        {selectedClient && <InvoiceIdentifierEditor key={selectedClient.id} initial={selectedClient.e_invoice} value={eInvoice} onChange={setEInvoice} />}
                        {selectedClient && (
                            <Card size="small" style={{ marginTop: 16 }}>
                                <Title level={5}>{selectedClient.name}</Title>
                                {selectedClient.contact_person && (
                                    <Text>{selectedClient.contact_person}</Text>
                                )}
                                <br />
                                <Text type="secondary">
                                    {selectedClient.address_line1}
                                    <br />
                                    {selectedClient.postal_code}{" "}
                                    {selectedClient.city}
                                </Text>
                                <br />
                                <Text type="secondary">
                                    {selectedClient.email}
                                </Text>
                            </Card>
                        )}
                    </Card>
                );

            case 1:
                return (
                    <Card title={t("invoiceCreate.addPositions")}>
                        <Space style={{ marginBottom: 16 }} wrap>
                            <Select
                                style={{ width: 300, maxWidth: "100%" }}
                                placeholder={t("invoiceCreate.addProduct")}
                                onChange={addProductAsLineItem}
                                value={undefined}
                                options={products.map((p) => ({
                                    value: p.id,
                                    label: `${p.name} - ${formatCurrency(
                                        p.price,
                                    )}`,
                                }))}
                            />
                            <Button
                                icon={<PlusOutlined />}
                                onClick={() => setProductModalOpen(true)}
                            >
                                {t("invoiceCreate.newProductBtn")}
                            </Button>
                            <Button
                                icon={<PlusOutlined />}
                                onClick={addLineItem}
                            >
                                {t("invoiceCreate.freePosition")}
                            </Button>
                        </Space>

                        <Table
                            columns={columns}
                            dataSource={lineItems}
                            pagination={false}
                            rowKey="key"
                            locale={{ emptyText: t("invoiceDetail.noPositions") }}
                        />

                        <Divider />

                        <div style={{ textAlign: "right" }}>
                            <Space direction="vertical" align="end">
                                <Text>
                                    {t("invoiceCreate.subtotal")}:{" "}
                                    <Text strong>
                                        {formatCurrency(
                                            totals.netAfterDiscount,
                                        )}
                                    </Text>
                                </Text>
                                <Text>
                                    {t("invoiceCreate.vat")}:{" "}
                                    <Text strong>
                                        {formatCurrency(totals.totalVAT)}
                                    </Text>
                                </Text>
                                <Title level={4} style={{ margin: 0 }}>
                                    {t("invoiceCreate.total")}: {formatCurrency(totals.totalGross)}
                                </Title>
                            </Space>
                        </div>
                    </Card>
                );

            case 2:
                return (
                    <Card
                        title={t("invoiceCreate.invoiceDetails")}
                        extra={
                            <Button
                                icon={<SaveOutlined />}
                                onClick={() => setTemplateModalOpen(true)}
                            >
                                {t("invoiceCreate.saveAsTemplate")}
                            </Button>
                        }
                    >
                        <Form layout="vertical">
                            <Space style={{ width: "100%" }}>
                                <Form.Item
                                    label={t("invoiceCreate.invoiceNumber")}
                                    style={{ flex: 1 }}
                                >
                                    <Space.Compact style={{ width: "100%" }}>
                                        <Input
                                            value={invoiceNumber}
                                            onChange={(e) => {
                                                setInvoiceNumber(e.target.value);
                                                setNumberTouched(true);
                                            }}
                                            placeholder={t("invoiceCreate.invoiceNumberPlaceholder")}
                                        />
                                        <Tooltip title={t("invoiceCreate.newNumberTooltip")}>
                                            <Button
                                                icon={<ReloadOutlined />}
                                                onClick={() => void generateInvoiceNumber()}
                                            />
                                        </Tooltip>
                                    </Space.Compact>
                                </Form.Item>
                            </Space>
                            {!numberTouched && invoiceNumber && (
                                <Text type="secondary" style={{ display: "block", marginTop: -12, marginBottom: 16, fontSize: 12 }}>
                                    {t("invoiceCreate.autoNumberHint")}
                                </Text>
                            )}

                            <Form.Item
                                label={t("invoiceCreate.deliveryPeriod")}
                                extra={t("invoiceCreate.deliveryPeriodHelp")}
                            >
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                    <DatePicker.RangePicker
                                        format="DD.MM.YYYY"
                                        value={[deliveryDateStart, deliveryDateEnd]}
                                        onChange={(dates) => {
                                            const [start, end] = dates ?? [null, null];
                                            setDeliveryDateStart(start);
                                            setDeliveryDateEnd(end);
                                        }}
                                        allowEmpty={[true, true]}
                                        style={{ flex: "1 1 260px", minWidth: 0 }}
                                    />
                                    <Button onClick={handleAdoptServicePeriod}>
                                        {t("invoiceCreate.deliveryPeriodAuto")}
                                    </Button>
                                </div>
                            </Form.Item>

                            <Space style={{ width: "100%" }}>
                                <Form.Item
                                    label={t("invoiceCreate.invoiceDate")}
                                    style={{ flex: 1 }}
                                >
                                    <DatePicker
                                        value={invoiceDate}
                                        onChange={(date) =>
                                            date && setInvoiceDate(date)
                                        }
                                        format="DD.MM.YYYY"
                                        style={{ width: "100%" }}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label={t("invoiceCreate.dueDate")}
                                    style={{ flex: 1 }}
                                >
                                    <DatePicker
                                        value={dueDate}
                                        onChange={(date) =>
                                            date && setDueDate(date)
                                        }
                                        format="DD.MM.YYYY"
                                        style={{ width: "100%" }}
                                    />
                                </Form.Item>
                            </Space>

                            <Form.Item label={t("invoiceCreate.notesLabel")}>
                                <Space style={{ marginBottom: 8 }}>
                                    <Button
                                        icon={<RobotOutlined />}
                                        loading={generatingNotes}
                                        onClick={handleGenerateNotes}
                                    >
                                        {t("invoiceCreate.generateWithAi")}
                                    </Button>
                                </Space>
                                <Input.TextArea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    placeholder={t("invoiceCreate.notesPlaceholderLong")}
                                />
                            </Form.Item>

                            <Form.Item label={t("invoiceCreate.paymentTermsLabel")}>
                                <Space style={{ marginBottom: 8 }}>
                                    <Button
                                        icon={<RobotOutlined />}
                                        loading={generatingPaymentTerms}
                                        onClick={handleGeneratePaymentTerms}
                                    >
                                        {t("invoiceCreate.generateWithAi")}
                                    </Button>
                                    {company?.payment_terms_default ? (
                                        <Button
                                            onClick={() =>
                                                setPaymentTerms(
                                                    company.payment_terms_default,
                                                )
                                            }
                                        >
                                            {t("invoiceCreate.restoreDefault")}
                                        </Button>
                                    ) : null}
                                </Space>
                                <Input.TextArea
                                    value={paymentTerms}
                                    onChange={(e) =>
                                        setPaymentTerms(e.target.value)
                                    }
                                    rows={3}
                                    placeholder={t("invoiceCreate.paymentTermsPlaceholderLong")}
                                />
                            </Form.Item>
                        </Form>

                        <Divider>{t("invoiceCreate.summary")}</Divider>

                        <Card size="small" className="dashboard-subpanel">
                            <Space
                                direction="vertical"
                                style={{ width: "100%" }}
                            >
                                <div>
                                    <Text type="secondary">{t("invoiceCreate.client")}</Text>
                                    <br />
                                    <Text strong>{selectedClient?.name}</Text>
                                </div>
                                <div>
                                    <Text type="secondary">{t("invoiceCreate.positionsCount")}</Text>
                                    <br />
                                    <Text strong>{lineItems.length}</Text>
                                </div>
                                <div>
                                    <Text type="secondary">{t("invoiceCreate.totalAmount")}</Text>
                                    <br />
                                    <Title level={4} style={{ margin: 0 }}>
                                        {formatCurrency(totals.totalGross)}
                                    </Title>
                                </div>
                                <div style={{ paddingTop: 8, borderTop: "1px solid #e5e7eb" }}>
                                    {company?.bank_iban ? (
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ GiroCode: </span>
                                            {language === "en"
                                                ? "SEPA QR code will be generated on invoice"
                                                : "SEPA-QR-Code wird auf Rechnung generiert"}
                                        </Text>
                                    ) : (
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            <span style={{ color: "#d97706", fontWeight: 600 }}>ℹ GiroCode: </span>
                                            {language === "en"
                                                ? "Add IBAN in Settings to enable payment QR code"
                                                : "IBAN in Einstellungen hinterlegen für Zahlungs-QR-Code"}
                                        </Text>
                                    )}
                                </div>
                            </Space>
                        </Card>
                    </Card>
                );

            case 3:
                return (
                    <Result
                        status="success"
                        icon={<FileTextOutlined style={{ color: "#1976d2" }} />}
                        title={t("invoiceCreate.successTitle")}
                        subTitle={`${t("invoiceCreate.successSubtitle")} ${invoiceNumber}`}
                        extra={[
                            <Button
                                type="primary"
                                key="view"
                                onClick={() =>
                                    router.push(
                                        `/dashboard/invoices/${createdInvoiceId}`,
                                    )
                                }
                            >
                                {t("invoiceCreate.viewInvoiceBtn")}
                            </Button>,
                            <Button
                                key="pdf"
                                onClick={() =>
                                    router.push(
                                        `/dashboard/invoices/${createdInvoiceId}/pdf`,
                                    )
                                }
                            >
                                {t("invoiceCreate.createPdf")}
                            </Button>,
                            <Button
                                key="new"
                                onClick={() => window.location.reload()}
                            >
                                {t("invoiceCreate.newInvoice")}
                            </Button>,
                        ]}
                    />
                );

            default:
                return null;
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case 0:
                return !!selectedClient;
            case 1:
                return lineItems.length > 0;
            case 2:
                return !!invoiceNumber;
            default:
                return true;
        }
    };

    if (loading) {
        return <Card loading />;
    }

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => router.push("/dashboard/invoices")}
                >
                    {t("invoiceCreate.backBtn")}
                </Button>
                <Title level={4} style={{ margin: 0 }}>
                    {t("invoiceCreate.newInvoiceTitle")}
                </Title>
            </Space>

            <Steps
                current={currentStep}
                style={{ marginBottom: 24 }}
                items={[
                    { title: t("invoiceCreate.stepClient") },
                    { title: t("invoiceCreate.stepPositions") },
                    { title: t("invoiceCreate.stepDetails") },
                    { title: t("invoiceCreate.stepDone") },
                ]}
            />

            {currentStep < 2 && (
                <Card
                    size="small"
                    className="dashboard-ai-card"
                    style={{
                        marginBottom: 20,
                    }}
                >
                    <Space
                        direction="vertical"
                        style={{ width: "100%" }}
                        size={8}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                flexWrap: "wrap",
                                gap: 8,
                            }}
                        >
                            <Space align="center" size={6}>
                                <RobotOutlined
                                    style={{
                                        fontSize: 18,
                                        color: "#1677ff",
                                    }}
                                />
                                <Text strong style={{ fontSize: 14 }}>
                                    {t("invoiceCreate.aiQuickTitle")}
                                </Text>
                            </Space>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {t("invoiceCreate.aiQuickDesc")}
                            </Text>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                                width: "100%",
                                alignItems: "center",
                            }}
                        >
                            <Input
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                onPressEnter={handleAiQuickFill}
                                placeholder={t(
                                    "invoiceCreate.aiQuickPlaceholder",
                                )}
                                allowClear
                                style={{ flex: 1 }}
                            />
                            <Button
                                type="primary"
                                icon={<RobotOutlined />}
                                loading={parsingPrompt}
                                onClick={handleAiQuickFill}
                            >
                                {t("invoiceCreate.aiQuickBtn")}
                            </Button>
                        </div>
                    </Space>
                </Card>
            )}

            {renderStepContent()}

            <Modal
                title={t("invoiceCreate.newClientTitle")}
                open={clientModalOpen}
                onOk={handleCreateClient}
                onCancel={() => {
                    setClientModalOpen(false);
                    clientForm.resetFields();
                }}
                okText={t("clients.create")}
                cancelText={t("clients.cancel")}
                confirmLoading={clientSaving}
                destroyOnHidden
            >
                <Form form={clientForm} layout="vertical" preserve={false}>
                    <Form.Item
                        label={t("clients.name")}
                        name="name"
                        rules={[{ required: true }]}
                    >
                        <Input autoFocus />
                    </Form.Item>
                    <Form.Item label={t("clients.email")} name="email">
                        <Input type="email" />
                    </Form.Item>
                    <Form.Item label={t("clients.phone")} name="phone">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t("clients.address")} name="address_line1">
                        <Input />
                    </Form.Item>
                    <div style={{ display: "flex", gap: 8 }}>
                        <Form.Item
                            label={t("clients.postalCode")}
                            name="postal_code"
                            style={{ flex: "0 0 110px" }}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            label={t("clients.city")}
                            name="city"
                            style={{ flex: 1 }}
                        >
                            <Input />
                        </Form.Item>
                    </div>
                    <Form.Item label={t("clients.country")} name="country">
                        <Input placeholder="Deutschland" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={t("invoiceCreate.newProductTitle")}
                open={productModalOpen}
                onOk={handleCreateProduct}
                onCancel={() => {
                    setProductModalOpen(false);
                    productForm.resetFields();
                }}
                okText={t("products.create")}
                cancelText={t("products.cancel")}
                confirmLoading={productSaving}
                destroyOnHidden
            >
                <Form
                    form={productForm}
                    layout="vertical"
                    preserve={false}
                    initialValues={{
                        unit_of_measure: t("invoiceCreate.unitPiece"),
                    }}
                >
                    <Form.Item
                        label={t("products.name")}
                        name="name"
                        rules={[{ required: true }]}
                    >
                        <Input autoFocus />
                    </Form.Item>
                    <Form.Item label={t("products.description")} name="description">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <div style={{ display: "flex", gap: 8 }}>
                        <Form.Item
                            label={t("products.price")}
                            name="price"
                            rules={[{ required: true }]}
                            style={{ flex: 1 }}
                        >
                            <InputNumber min={0} step={0.01} precision={2} style={{ width: "100%" }} addonAfter="€" />
                        </Form.Item>
                        <Form.Item label={t("products.unit")} name="unit_of_measure" style={{ flex: 1 }}>
                            <Input />
                        </Form.Item>
                    </div>
                    <Form.Item label={t("products.vat")} name="tax_rate_percent">
                        <Select
                            options={[
                                { value: 0, label: "0%" },
                                { value: 7, label: "7%" },
                                { value: 19, label: "19%" },
                            ]}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={t("invoiceCreate.saveAsTemplateTitle")}
                open={templateModalOpen}
                onOk={handleSaveTemplate}
                onCancel={() => {
                    setTemplateModalOpen(false);
                    templateForm.resetFields();
                }}
                okText={t("invoiceCreate.saveAsTemplate")}
                cancelText={t("clients.cancel")}
                confirmLoading={templateSaving}
                destroyOnHidden
            >
                <Form form={templateForm} layout="vertical" preserve={false}>
                    <Form.Item
                        label={t("invoiceCreate.templateName")}
                        name="name"
                        rules={[{ required: true }]}
                    >
                        <Input
                            autoFocus
                            maxLength={120}
                            placeholder={t("invoiceCreate.templateNamePlaceholder")}
                        />
                    </Form.Item>
                    <Text type="secondary">
                        {t("invoiceCreate.saveAsTemplateHint")}
                    </Text>
                </Form>
            </Modal>

            {currentStep < 3 && (
                <div style={{ marginTop: 24, textAlign: "right" }}>
                    <Space>
                        {currentStep > 0 && (
                            <Button
                                onClick={() => setCurrentStep(currentStep - 1)}
                            >
                                <ArrowLeftOutlined /> {t("invoiceCreate.backBtn")}
                            </Button>
                        )}
                        {currentStep < 2 && (
                            <Button
                                type="primary"
                                onClick={() => setCurrentStep(currentStep + 1)}
                                disabled={!canProceed()}
                            >
                                {t("invoiceCreate.nextBtn")} <ArrowRightOutlined />
                            </Button>
                        )}
                        {currentStep === 2 && (
                            <Button
                                type="primary"
                                onClick={handleCreateInvoice}
                                loading={saving}
                                disabled={!canProceed()}
                            >
                                <CheckOutlined /> {t("invoiceCreate.createBtn")}
                            </Button>
                        )}
                    </Space>
                </div>
            )}
        </div>
    );
}
