"use client";
import { InvoiceIdentifierEditor } from "@/components/dashboard/EInvoiceFields";
import { type EInvoiceData, parseEInvoiceData, parseGTIN } from "@/lib/eRechnung/identifiers";
import { defaultVatRate } from "@/lib/vatDefaults";

import { useEffect, useMemo, useState } from "react";
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
    Tag,
} from "antd";
import {
    PlusOutlined,
    DeleteOutlined,
    ArrowLeftOutlined,
    ArrowRightOutlined,
    CheckOutlined,
    FileTextOutlined,
    RobotOutlined,
    MedicineBoxOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getAllClients } from "@/lib/clientService";
import { getAllProducts } from "@/lib/productService";
import { createInvoice } from "@/lib/invoiceService";
import { getCompanyInfo } from "@/lib/companyService";
import { runInvoiceAssistant, parseInvoiceDraftWithAI } from "@/lib/aiService";
import {
    formatCurrency,
    calculateInvoiceTotals,
    type InvoiceTotals,
} from "@/lib/currencyUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { GoaeLineEditor, goaeCatalogOptions, goaeStateForNumber, type GoaeLineState } from "@/components/medical/GoaeLineEditor";
import { GoaeCheckPanel } from "@/components/medical/GoaeCheckPanel";
import { DiagnosisPicker } from "@/components/medical/DiagnosisPicker";
import { checkGoaeLines, findGoaeEntry, formatFactor, goaeUnitAmount, type GoaeHistoryEntry } from "@/lib/goae";
import type { DiagnosisDisplay, InvoiceDiagnosis } from "@/lib/icd10";
import { activateGoaeCatalog, getGoaeHistory } from "@/lib/medicalService";
import type {
    Client,
    Product,
    InvoiceFormData,
    InvoiceItemFormData,
    UserCompany,
} from "@/types";

const { Title, Text } = Typography;

interface LineItem {
    gtin?: string;
    /** Set for GOÄ lines; price is derived from Einfachsatz × Faktor */
    goae?: GoaeLineState;
    key: string;
    description: string;
    service_summary?: string;
    quantity: number;
    unit_of_measure: string;
    price: number;
    tax_rate_percent: number;
    discount_percent: number;
}

export default function InvoiceCreatePage() {
    const router = useRouter();
    const { t } = useLanguage();

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
    const [notes, setNotes] = useState("");
    const [paymentTerms, setPaymentTerms] = useState("");
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

    // Privatliquidation: diagnoses (ICD-10-GM) and GOÄ history of the patient
    const [diagnoses, setDiagnoses] = useState<InvoiceDiagnosis[]>([]);
    const [diagnosisDisplay, setDiagnosisDisplay] = useState<DiagnosisDisplay>("both");
    const [goaeHistory, setGoaeHistory] = useState<GoaeHistoryEntry[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    // Bumped once an uploaded GOÄ catalogue is active, so options and checks recompute.
    const [goaeCatalogVersion, setGoaeCatalogVersion] = useState(0);

    useEffect(() => {
        activateGoaeCatalog()
            .then(() => setGoaeCatalogVersion((v) => v + 1))
            .catch(() => undefined);
    }, []);

    useEffect(() => {
        if (!selectedClient?.id) {
            setGoaeHistory([]);
            return;
        }
        let cancelled = false;
        setLoadingHistory(true);
        getGoaeHistory(selectedClient.id)
            .then((h) => !cancelled && setGoaeHistory(h))
            .catch(() => !cancelled && setGoaeHistory([]))
            .finally(() => !cancelled && setLoadingHistory(false));
        return () => {
            cancelled = true;
        };
    }, [selectedClient?.id]);

    useEffect(() => {
        loadData();
        generateInvoiceNumber();
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
            setProducts(productsData);
            setCompany(companyData);
            setPaymentTerms(companyData?.payment_terms_default || "");
        } catch (error) {
            console.error("Error loading data:", error);
            message.error(t("invoiceCreate.loadError"));
        } finally {
            setLoading(false);
        }
    };

    const generateInvoiceNumber = () => {
        const year = dayjs().format("YYYY");
        const month = dayjs().format("MM");
        const random = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, "0");
        setInvoiceNumber(`RE-${year}${month}-${random}`);
    };

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

    const goaePrice = (g: GoaeLineState) =>
        goaeUnitAmount(g.factor, { points: findGoaeEntry(g.number)?.points, baseFee: g.baseFee });

    const addGoaeLine = (number = "") => {
        const goae = goaeStateForNumber(number, dayjs().format("YYYY-MM-DD"));
        const entry = findGoaeEntry(number);
        setLineItems((items) => [
            ...items,
            {
                key: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                description: entry?.title ?? "",
                service_summary: "",
                quantity: 1,
                unit_of_measure: t("invoiceCreate.unitPiece"),
                price: goaePrice(goae),
                // Heilbehandlungen sind nach § 4 Nr. 14 UStG umsatzsteuerfrei.
                tax_rate_percent: 0,
                discount_percent: 0,
                goae,
            },
        ]);
    };

    const updateGoae = (key: string, next: GoaeLineState, catalogTitle?: string) => {
        setLineItems((items) =>
            items.map((item) => {
                if (item.key !== key) return item;
                const previousTitle = item.goae ? findGoaeEntry(item.goae.number)?.title : undefined;
                const description = catalogTitle && (!item.description.trim() || item.description === previousTitle)
                    ? catalogTitle
                    : item.description;
                return { ...item, goae: next, description, price: goaePrice(next) };
            }),
        );
    };

    const goaeFindings = useMemo(
        () => {
            const goaeLines = lineItems.filter((i) => i.goae);
            if (!goaeLines.length) return [];
            return checkGoaeLines(
                goaeLines.map((i) => ({
                    key: i.key,
                    number: i.goae!.number,
                    factor: i.goae!.factor,
                    quantity: i.quantity,
                    serviceDate: i.goae!.serviceDate,
                    justification: i.goae!.justification,
                    feeType: i.goae!.feeType,
                    feeAgreement: i.goae!.feeAgreement,
                })),
                { history: goaeHistory, invoiceDate: invoiceDate.format("YYYY-MM-DD"), diagnosisCount: diagnoses.length },
            );
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps -- catalogue version invalidates the global catalogue
        [lineItems, goaeHistory, invoiceDate, diagnoses.length, goaeCatalogVersion],
    );
    const goaeErrorKeys = useMemo(
        () => new Set(goaeFindings.filter((f) => f.severity === "error").flatMap((f) => f.lineKeys)),
        [goaeFindings],
    );
    const goaeErrorCount = goaeFindings.filter((f) => f.severity === "error").length;

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

    const totals: InvoiceTotals = calculateInvoiceTotals(
        lineItems.map((item) => ({
            quantity: item.quantity,
            price: item.price,
            tax_rate_percent: item.tax_rate_percent,
            discount_percent: item.discount_percent,
        })),
    );

    const handleCreateInvoice = async () => {
        if (goaeErrorCount > 0) {
            const proceed = await new Promise<boolean>((resolve) =>
                Modal.confirm({
                    title: "GOÄ-Prüfung meldet Fehler",
                    content: `${goaeErrorCount} Regelverstöße gefunden (siehe Schritt „Positionen“). Rechnung trotzdem als Entwurf anlegen?`,
                    okText: "Trotzdem anlegen",
                    cancelText: "Zurück",
                    onOk: () => resolve(true),
                    onCancel: () => resolve(false),
                }),
            );
            if (!proceed) return;
        }
        return submitInvoice();
    };

    const submitInvoice = async () => {
        if (!selectedClient || !selectedClient.id) {
            message.error(t("invoiceCreate.selectClientError"));
            return;
        }
        if (lineItems.length === 0) {
            message.error(t("invoiceCreate.addItemsError"));
            return;
        }

        setSaving(true);
        try {
            const items: InvoiceItemFormData[] = lineItems.map((item) => ({
                gtin: parseGTIN(item.gtin),
                ...(item.goae
                    ? {
                          goae: {
                              number: item.goae.number,
                              factor: item.goae.factor,
                              base_fee: item.goae.baseFee ?? 0,
                              fee_type: item.goae.feeType,
                              service_date: item.goae.serviceDate,
                              justification: item.goae.justification?.trim() || undefined,
                              fee_agreement: item.goae.feeAgreement || undefined,
                          },
                      }
                    : {}),
                description: item.description,
                quantity: item.quantity,
                unit_of_measure: item.unit_of_measure,
                price: item.price,
                tax_rate_percent: item.tax_rate_percent,
                discount_percent: item.discount_percent,
            }));

            const invoiceData: InvoiceFormData = {
                client_id: selectedClient.id,
                e_invoice: eInvoice === undefined ? undefined : {
                    ...parseEInvoiceData(eInvoice),
                    // An explicitly cleared buyer ID must not reapply the customer default.
                    ...(Object.hasOwn(eInvoice, "buyer_identifier") ? { buyer_identifier: eInvoice.buyer_identifier || { value: "" } } : {}),
                },
                invoice_number: invoiceNumber,
                issue_date: invoiceDate.format("YYYY-MM-DD"),
                due_date: dueDate.format("YYYY-MM-DD"),
                notes: notes || undefined,
                payment_terms: paymentTerms || undefined,
                medical: diagnoses.length ? { diagnoses, diagnosis_display: diagnosisDisplay } : undefined,
                items,
            };

            const newInvoiceId = await createInvoice(invoiceData);

            setCreatedInvoiceId(newInvoiceId);
            setCurrentStep(3);
            message.success(t("invoiceCreate.created"));
        } catch (error) {
            console.error("Error creating invoice:", error);
            const errorMsg = error instanceof Error ? error.message : t("invoiceCreate.createError");
            message.error(errorMsg);
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
                    {record.goae && (
                        <GoaeLineEditor
                            value={record.goae}
                            hasError={goaeErrorKeys.has(record.key)}
                            onChange={(next, title) => updateGoae(record.key, next, title)}
                        />
                    )}
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
            render: (_: unknown, record: LineItem) => record.goae ? (
                <Space direction="vertical" size={0}>
                    <Text strong>{formatCurrency(record.price)}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{formatFactor(record.goae.factor)}-fach</Text>
                </Space>
            ) : (
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
                        <Select
                            showSearch
                            style={{ width: "100%" }}
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
                        <Card
                            size="small"
                            title={<Space><MedicineBoxOutlined /> Diagnosen (ICD-10-GM)</Space>}
                            style={{ marginBottom: 16 }}
                        >
                            <DiagnosisPicker
                                diagnoses={diagnoses}
                                display={diagnosisDisplay}
                                onChange={setDiagnoses}
                                onDisplayChange={setDiagnosisDisplay}
                            />
                        </Card>
                        <Space style={{ marginBottom: 16 }} wrap>
                            <Select
                                showSearch
                                style={{ width: 340 }}
                                placeholder="GOÄ-Ziffer hinzufügen …"
                                value={undefined}
                                onChange={(n: string) => addGoaeLine(n)}
                                optionFilterProp="label"
                                options={goaeCatalogOptions()}
                                key={goaeCatalogVersion}
                                popupMatchSelectWidth={520}
                            />
                            <Button icon={<PlusOutlined />} onClick={() => addGoaeLine()}>
                                Freie GOÄ-Ziffer
                            </Button>
                            <Select
                                style={{ width: 300 }}
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
                                onClick={addLineItem}
                            >
                                {t("invoiceCreate.freePosition")}
                            </Button>
                        </Space>

                        {lineItems.some((i) => i.goae) && (
                            <div style={{ marginBottom: 16 }}>
                                <GoaeCheckPanel findings={goaeFindings} loadingHistory={loadingHistory} />
                            </div>
                        )}

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
                    <Card title={t("invoiceCreate.invoiceDetails")}>
                        <Form layout="vertical">
                            <Space style={{ width: "100%" }}>
                                <Form.Item
                                    label={t("invoiceCreate.invoiceNumber")}
                                    style={{ flex: 1 }}
                                >
                                    <Input
                                        value={invoiceNumber}
                                        onChange={(e) =>
                                            setInvoiceNumber(e.target.value)
                                        }
                                    />
                                </Form.Item>
                            </Space>

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

                        <Card size="small" style={{ background: "#f5f5f5" }}>
                            <Space
                                direction="vertical"
                                style={{ width: "100%" }}
                            >
                                <div>
                                    <Text type="secondary">{t("invoiceCreate.client")}</Text>
                                    <br />
                                    <Text strong>{selectedClient?.name}</Text>
                                </div>
                                {diagnoses.length > 0 && (
                                    <div>
                                        <Text type="secondary">Diagnosen</Text>
                                        <br />
                                        {diagnoses.map((d, i) => <Tag key={i}>{d.code || d.text}</Tag>)}
                                    </div>
                                )}
                                {goaeErrorCount > 0 && (
                                    <div>
                                        <Tag color="red">{goaeErrorCount} GOÄ-Prüffehler</Tag>
                                    </div>
                                )}
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
                    style={{
                        marginBottom: 20,
                        background:
                            "linear-gradient(135deg, rgba(230, 244, 255, 0.6) 0%, rgba(255, 255, 255, 0.9) 100%)",
                        border: "1px solid #91caff",
                        borderRadius: 10,
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
