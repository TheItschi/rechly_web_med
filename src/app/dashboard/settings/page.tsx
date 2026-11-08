"use client";
import EInvoiceFields from "@/components/dashboard/EInvoiceFields";

import { useEffect, useState } from "react";
import {
    Card,
    Form,
    Input,
    Button,
    Select,
    AutoComplete,
    Alert,
    Space,
    message,
    Typography,
    Divider,
    Upload,
    Image,
    Tabs,
    Modal,
    Row,
    Col,
    Progress,
    Switch,
} from "antd";
import {
    SaveOutlined,
    UploadOutlined,
    DeleteOutlined,
    UserOutlined,
    BankOutlined,
    RobotOutlined,
    ExclamationCircleOutlined,
    SwapOutlined,
    CalendarOutlined,
} from "@ant-design/icons";
import MigrationWizard from "@/components/dashboard/MigrationWizard";
import OnlineBookingSettingsTab from "@/components/termine/OnlineBookingSettingsTab";
import { isTermineEnabled } from "@/lib/features";
import type { UploadProps } from "antd";
import { getCompanyInfo, saveCompanyInfo } from "@/lib/companyService";
import { getAISettings, saveAISettings, testAI } from "@/lib/aiService";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AIProvider, UserCompany } from "@/types";

const { Title, Text } = Typography;

export default function SettingsPage() {
    const { user, logout, deleteAccount } = useAuth();
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState("company");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(true);
    const [aiSaving, setAiSaving] = useState(false);
    const [aiTesting, setAiTesting] = useState(false);
    const [aiKeyConfigured, setAiKeyConfigured] = useState(false);
    const [aiResponse, setAiResponse] = useState<string>("");
    const [aiDailyUsage, setAiDailyUsage] = useState<{
        used: number;
        limit: number;
        remaining: number;
    } | null>(null);
    const [aiModelPresets, setAiModelPresets] = useState<
        Record<AIProvider, string[]>
    >({
        openai: [],
        anthropic: [],
        openrouter: [],
        ollama: [],
    });
    const [form] = Form.useForm();
    const [aiForm] = Form.useForm();
    const watchedProvider = Form.useWatch("provider", aiForm);
    const selectedProvider = (
        typeof watchedProvider === "string" ? watchedProvider : "openai"
    ) as AIProvider;

    useEffect(() => {
        const tabParam = new URLSearchParams(window.location.search).get("tab");
        if (tabParam && ["company", "booking", "ai", "migration", "account"].includes(tabParam)) {
            setActiveTab(tabParam);
        }
        loadCompanyInfo();
        loadAISettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadCompanyInfo = async () => {
        try {
            setLoading(true);
            const data = await getCompanyInfo();
            if (data) {
                form.setFieldsValue(data);
                setLogoPreview(data.logo_base64 || null);
            }
        } catch (error) {
            console.error("Error loading company info:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadAISettings = async () => {
        try {
            setAiLoading(true);
            const data = await getAISettings();
            if (data) {
                aiForm.setFieldsValue({
                    provider: data.provider,
                    model: data.model,
                    base_url: data.base_url || "http://localhost:11434/v1",
                    system_prompt: data.system_prompt,
                });
                setAiKeyConfigured(data.api_key_configured);
                setAiDailyUsage(data.daily_usage || null);
                if (data.model_presets) {
                    setAiModelPresets(data.model_presets);
                }
            }
        } catch (error) {
            console.error("Error loading AI settings:", error);
            message.error(t("settings.aiLoadError"));
        } finally {
            setAiLoading(false);
        }
    };

    const handleSave = async (
        values: Omit<UserCompany, "id" | "created_at" | "updated_at">,
    ) => {
        setSaving(true);
        try {
            await saveCompanyInfo({
                ...values,
                logo_base64: logoPreview || undefined,
            });
            message.success(t("settings.saved"));
        } catch (error) {
            console.error("Error saving settings:", error);
            message.error(t("settings.saveError"));
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload: UploadProps["beforeUpload"] = (file) => {
        const isImage = file.type.startsWith("image/");
        if (!isImage) {
            message.error(t("settings.imageOnly"));
            return false;
        }

        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            message.error(t("settings.imageTooLarge"));
            return false;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            setLogoPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        return false; // Prevent auto upload
    };

    const handleRemoveLogo = () => {
        setLogoPreview(null);
    };

    const handleLogout = async () => {
        await logout();
        window.location.href = "/login";
    };

    const handleDeleteAccount = () => {
        Modal.confirm({
            title: t("settings.deleteAccountTitle"),
            icon: <ExclamationCircleOutlined />,
            content: (
                <div>
                    <p>{t("settings.deleteAccountConfirm")}</p>
                    <p style={{ color: "#ff4d4f", fontWeight: 500 }}>
                        {t("settings.deleteAccountWarning")}
                    </p>
                </div>
            ),
            okText: t("settings.deleteAccountButton"),
            okType: "danger",
            cancelText: t("settings.deleteAccountCancel"),
            onOk: async () => {
                setDeleting(true);
                try {
                    await deleteAccount();
                    message.success(t("settings.accountDeleted"));
                    window.location.href = "/";
                } catch (error) {
                    console.error("Error deleting account:", error);
                    message.error(t("settings.deleteError"));
                    throw error; // Keep confirmation open; do not imply completion on failure.
                } finally {
                    setDeleting(false);
                }
            },
        });
    };

    const handleSaveAISettings = async (values: {
        provider: AIProvider;
        model: string;
        base_url?: string;
        api_key?: string;
        system_prompt?: string;
    }) => {
        setAiSaving(true);
        try {
            const saved = await saveAISettings(values);
            aiForm.setFieldValue("api_key", "");
            setAiKeyConfigured(saved.api_key_configured);
            setAiDailyUsage(saved.daily_usage || null);
            if (saved.model_presets) {
                setAiModelPresets(saved.model_presets);
            }
            message.success(t("settings.aiSaved"));
        } catch (error) {
            console.error("Error saving AI settings:", error);
            message.error(
                error instanceof Error
                    ? error.message
                    : t("settings.aiTestError"),
            );
        } finally {
            setAiSaving(false);
        }
    };

    const handleTestAI = async () => {
        const prompt = aiForm.getFieldValue("test_prompt")?.trim();
        if (!prompt) {
            message.error(t("settings.required"));
            return;
        }

        setAiTesting(true);
        try {
            const result = await testAI(prompt);
            setAiResponse(result.content);
            const refreshedSettings = await getAISettings();
            if (refreshedSettings?.daily_usage) {
                setAiDailyUsage(refreshedSettings.daily_usage);
            }
            message.success(t("settings.aiTestSuccess"));
        } catch (error) {
            console.error("Error testing AI:", error);
            setAiResponse("");
            message.error(
                error instanceof Error
                    ? error.message
                    : t("settings.aiTestError"),
            );
        } finally {
            setAiTesting(false);
        }
    };

    const providerOptions = [
        { value: "ollama", label: t("settings.aiProviderOllama") },
        { value: "openai", label: t("settings.aiProviderOpenAI") },
        { value: "anthropic", label: t("settings.aiProviderAnthropic") },
        { value: "openrouter", label: t("settings.aiProviderOpenRouter") },
    ];
    const modelOptions = (aiModelPresets[selectedProvider] || []).map(
        (model) => ({ value: model, label: model }),
    );

    const tabItems = [
        {
            key: "company",
            label: (
                <span>
                    <BankOutlined /> {t("settings.company")}
                </span>
            ),
            children: (
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                    disabled={loading}
                >
                    {/* Logo */}
                    <Card size="small" style={{ marginBottom: 16 }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 16,
                            }}
                        >
                            {logoPreview ? (
                                <Image
                                    src={logoPreview}
                                    alt="Logo"
                                    width={80}
                                    height={80}
                                    style={{ objectFit: "contain" }}
                                />
                            ) : (
                                <div
                                    className="dashboard-logo-placeholder"
                                    style={{
                                        width: 80,
                                        height: 80,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        borderRadius: 8,
                                    }}
                                >
                                    <BankOutlined
                                        style={{ fontSize: 32, color: "var(--dash-muted)" }}
                                    />
                                </div>
                            )}
                            <Space direction="vertical">
                                <Upload
                                    beforeUpload={handleLogoUpload}
                                    showUploadList={false}
                                    accept="image/*"
                                >
                                    <Button icon={<UploadOutlined />}>
                                        {t("settings.uploadLogo")}
                                    </Button>
                                </Upload>
                                {logoPreview && (
                                    <Button
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={handleRemoveLogo}
                                    >
                                        {t("settings.removeLogo")}
                                    </Button>
                                )}
                            </Space>
                        </div>
                    </Card>

                    {/* Company Name */}
                    <Form.Item
                        name="name"
                        label={t("settings.companyName")}
                        rules={[
                            { required: true, message: t("settings.required") },
                        ]}
                    >
                        <Input placeholder={t("settings.companyName")} />
                    </Form.Item>

                    <Form.Item
                        name="legal_form"
                        label={t("settings.legalForm")}
                    >
                        <Input
                            placeholder={t("settings.legalFormPlaceholder")}
                        />
                    </Form.Item>

                    <Divider>{t("settings.address")}</Divider>

                    <Form.Item
                        name="address_line1"
                        label={t("settings.address")}
                        rules={[
                            { required: true, message: t("settings.required") },
                        ]}
                    >
                        <Input placeholder={t("settings.streetNumber")} />
                    </Form.Item>

                    <Form.Item
                        name="address_line2"
                        label={t("settings.addressExtra")}
                    >
                        <Input placeholder={t("settings.addressExtra")} />
                    </Form.Item>

                    <Row gutter={[12, 0]}>
                        <Col xs={24} sm={8}>
                            <Form.Item
                                name="postal_code"
                                label={t("settings.postalCode")}
                                rules={[
                                    {
                                        required: true,
                                        message: t("settings.required"),
                                    },
                                ]}
                            >
                                <Input placeholder="12345" />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={16}>
                            <Form.Item
                                name="city"
                                label={t("settings.city")}
                                rules={[
                                    {
                                        required: true,
                                        message: t("settings.required"),
                                    },
                                ]}
                            >
                                <Input placeholder={t("settings.city")} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="country" label={t("settings.country")}>
                        <Input placeholder={t("settings.country")} />
                    </Form.Item>

                    <Divider>{t("settings.contact")}</Divider>

                    <Form.Item
                        name="email"
                        label={t("settings.email")}
                        rules={[
                            { required: true, message: t("settings.required") },
                            {
                                type: "email",
                                message: t("settings.invalidEmail"),
                            },
                        ]}
                    >
                        <Input placeholder="info@company.com" />
                    </Form.Item>

                    <Form.Item name="phone" label={t("settings.phone")}>
                        <Input placeholder="+49 30 123456" />
                    </Form.Item>

                    <Form.Item name="website" label={t("settings.website")}>
                        <Input placeholder="https://www.company.com" />
                    </Form.Item>

                    <Divider>{t("settings.taxInfo")}</Divider>

                    <Row gutter={[12, 0]}>
                        <Col xs={24} sm={12}>
                            <EInvoiceFields seller />
                            <Form.Item
                                name="vat_id"
                                label={t("settings.vatId")}
                            >
                                <Input placeholder="DE123456789" />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="tax_number"
                                label={t("settings.taxNumber")}
                            >
                                <Input placeholder="12/345/67890" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="commercial_register_number"
                        label={t("settings.commercialRegister")}
                    >
                        <Input placeholder="HRB 12345" />
                    </Form.Item>

                    <Form.Item
                        name="registry_court"
                        label={t("settings.registryCourt")}
                    >
                        <Input placeholder={t("settings.registryCourt")} />
                    </Form.Item>

                    <Form.Item
                        name="managing_directors"
                        label={t("settings.managingDirectors")}
                    >
                        <Input placeholder={t("settings.managingDirectors")} />
                    </Form.Item>

                    <Divider>{t("settings.bankDetails")}</Divider>

                    <Form.Item name="bank_name" label={t("settings.bankName")}>
                        <Input placeholder={t("settings.bankName")} />
                    </Form.Item>

                    <Form.Item
                        name="bank_iban"
                        label={t("settings.iban")}
                        extra={t("settings.ibanGirocodeHelp")}
                        rules={[
                            { required: true, message: t("settings.required") },
                        ]}
                    >
                        <Input placeholder="DE89 3704 0044 0532 0130 00" />
                    </Form.Item>

                    <Form.Item name="bank_bic" label={t("settings.bic")}>
                        <Input placeholder="COBADEFFXXX" />
                    </Form.Item>

                    <Divider>{t("settings.invoiceSettings")}</Divider>

                    <Form.Item
                        name="payment_terms_default"
                        label={t("settings.paymentTerms")}
                        rules={[
                            { required: true, message: t("settings.required") },
                        ]}
                    >
                        <Input.TextArea
                            placeholder={t("settings.paymentTermsPlaceholder")}
                            rows={2}
                        />
                    </Form.Item>

                    <Form.Item
                        name="is_small_business"
                        label={t("settings.smallBusiness")}
                        valuePropName="checked"
                        extra={t("settings.smallBusinessHint")}
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item style={{ marginTop: 24 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SaveOutlined />}
                            loading={saving}
                            size="large"
                        >
                            {t("settings.save")}
                        </Button>
                    </Form.Item>
                </Form>
            ),
        },
        ...(isTermineEnabled()
            ? [
                  {
                      key: "booking",
                      label: (
                          <span>
                              <CalendarOutlined />{" "}
                              {language === "de" ? "Online-Buchung & Termine" : "Online Booking"}
                          </span>
                      ),
                      children: <OnlineBookingSettingsTab />,
                  },
              ]
            : []),
        {
            key: "ai",
            label: (
                <span>
                    <RobotOutlined /> {t("settings.ai")}
                </span>
            ),
            children: (
                <Form
                    form={aiForm}
                    layout="vertical"
                    onFinish={handleSaveAISettings}
                    disabled={aiLoading}
                    initialValues={{
                        provider: "openai",
                        model: "gpt-4o-mini",
                        system_prompt:
                            "You are Rechly AI. Help the user write invoice-related text clearly and concisely.",
                    }}
                >
                    <Card>
                        <Title level={5}>{t("settings.aiTitle")}</Title>
                        <Text type="secondary">
                            {t("settings.aiDescription")}
                        </Text>

                        <Divider />

                        {aiDailyUsage ? (
                            <Card size="small" style={{ marginBottom: 16 }}>
                                <Space
                                    direction="vertical"
                                    style={{ width: "100%" }}
                                    size={4}
                                >
                                    <Text strong>
                                        {t("settings.aiUsageTitle")}
                                    </Text>
                                    <Text type="secondary">
                                        {t("settings.aiUsageSummary")
                                            .replace(
                                                "{used}",
                                                String(aiDailyUsage.used),
                                            )
                                            .replace(
                                                "{limit}",
                                                String(aiDailyUsage.limit),
                                            )
                                            .replace(
                                                "{remaining}",
                                                String(aiDailyUsage.remaining),
                                            )}
                                    </Text>
                                    <Progress
                                        percent={Math.min(
                                            100,
                                            aiDailyUsage.limit > 0
                                                ? (aiDailyUsage.used /
                                                      aiDailyUsage.limit) *
                                                      100
                                                : 0,
                                        )}
                                        showInfo={false}
                                        status={
                                            aiDailyUsage.remaining === 0
                                                ? "exception"
                                                : aiDailyUsage.remaining <= 10
                                                  ? "active"
                                                  : "normal"
                                        }
                                    />
                                </Space>
                            </Card>
                        ) : null}

                        <Form.Item
                            name="provider"
                            label={t("settings.aiProvider")}
                            rules={[
                                {
                                    required: true,
                                    message: t("settings.required"),
                                },
                            ]}
                        >
                            <Select
                                options={providerOptions}
                                onChange={(value: AIProvider) => {
                                    const presets = aiModelPresets[value] || [];
                                    const currentModel =
                                        aiForm.getFieldValue("model");
                                    if (
                                        presets.length > 0 &&
                                        !presets.includes(currentModel)
                                    ) {
                                        aiForm.setFieldValue(
                                            "model",
                                            presets[0],
                                        );
                                    }
                                    if (
                                        value === "ollama" &&
                                        !aiForm.getFieldValue("base_url")
                                    ) {
                                        aiForm.setFieldValue(
                                            "base_url",
                                            "http://localhost:11434/v1",
                                        );
                                    }
                                }}
                            />
                        </Form.Item>

                        {selectedProvider === "ollama" && (
                            <>
                                <Alert
                                    type="success"
                                    showIcon
                                    style={{ marginBottom: 12 }}
                                    message={t("settings.aiLocalPrivacyBadge")}
                                />
                                <Card
                                    size="small"
                                    className="dashboard-success-panel"
                                    style={{
                                        marginBottom: 16,
                                    }}
                                >
                                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                                        <Text strong style={{ color: "var(--dash-positive)" }}>
                                            ⭐ Empfohlenes Modell: <code>jonprompter/Rechly-DE-3B</code>
                                        </Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Speziell trainiert für deutsche Rechnungen, GoBD & §19 UStG.
                                            Terminal-Befehl zum Starten:
                                        </Text>
                                        <Text code style={{ fontSize: 12 }}>
                                            ollama run jonprompter/Rechly-DE-3B
                                        </Text>
                                        <Space size={12} style={{ marginTop: 4 }}>
                                            <a
                                                href="https://ollama.com/jonprompter/Rechly-DE-3B"
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ fontSize: 12 }}
                                            >
                                                Ollama Modell-Seite ↗
                                            </a>
                                            <a
                                                href="https://huggingface.co/jonprompter/rechly-de-3b"
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ fontSize: 12 }}
                                            >
                                                Hugging Face Repo ↗
                                            </a>
                                        </Space>
                                    </Space>
                                </Card>
                            </>
                        )}

                        <Form.Item
                            name="model"
                            label={t("settings.aiModel")}
                            rules={[
                                {
                                    required: true,
                                    message: t("settings.required"),
                                },
                            ]}
                        >
                            <AutoComplete
                                options={modelOptions}
                                placeholder={t("settings.aiModelPlaceholder")}
                                filterOption={(inputValue, option) =>
                                    (option?.value ?? "")
                                        .toLowerCase()
                                        .includes(inputValue.toLowerCase())
                                }
                            />
                        </Form.Item>

                        {selectedProvider === "ollama" && (
                            <Form.Item
                                name="base_url"
                                label={t("settings.aiBaseUrl")}
                                extra={t("settings.aiBaseUrlHelp")}
                            >
                                <Input placeholder="http://localhost:11434/v1" />
                            </Form.Item>
                        )}

                        <Form.Item
                            name="api_key"
                            label={t("settings.aiApiKey")}
                            extra={
                                selectedProvider === "ollama"
                                    ? "Optional für lokale Server (Standard: nicht benötigt)"
                                    : t("settings.aiApiKeyHelp")
                            }
                        >
                            <Input.Password
                                placeholder={
                                    selectedProvider === "ollama"
                                        ? "Optional..."
                                        : "sk-..."
                                }
                            />
                        </Form.Item>

                        <Text type={aiKeyConfigured ? "success" : "secondary"}>
                            {aiKeyConfigured
                                ? t("settings.aiConfigured")
                                : t("settings.aiNotConfigured")}
                        </Text>

                        <Form.Item
                            name="system_prompt"
                            label={t("settings.aiSystemPrompt")}
                            style={{ marginTop: 16 }}
                        >
                            <Input.TextArea
                                rows={3}
                                placeholder={t(
                                    "settings.aiSystemPromptPlaceholder",
                                )}
                            />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0 }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<SaveOutlined />}
                                loading={aiSaving}
                            >
                                {t("settings.aiSave")}
                            </Button>
                        </Form.Item>
                    </Card>

                    <Card style={{ marginTop: 16 }}>
                        <Title level={5}>{t("settings.aiTestRun")}</Title>

                        <Form.Item
                            name="test_prompt"
                            label={t("settings.aiTestPrompt")}
                            rules={[
                                {
                                    required: true,
                                    message: t("settings.required"),
                                },
                            ]}
                        >
                            <Input.TextArea
                                rows={4}
                                placeholder={t(
                                    "settings.aiTestPromptPlaceholder",
                                )}
                            />
                        </Form.Item>

                        <Space direction="vertical" style={{ width: "100%" }}>
                            <Button
                                onClick={handleTestAI}
                                loading={aiTesting}
                                icon={<RobotOutlined />}
                            >
                                {t("settings.aiTestRun")}
                            </Button>

                            {aiResponse ? (
                                <Card size="small">
                                    <Text strong>
                                        {t("settings.aiResponse")}
                                    </Text>
                                    <div
                                        style={{
                                            whiteSpace: "pre-wrap",
                                            marginTop: 8,
                                        }}
                                    >
                                        {aiResponse}
                                    </div>
                                </Card>
                            ) : null}
                        </Space>
                    </Card>
                </Form>
            ),
        },
        {
            key: "account",
            label: (
                <span>
                    <UserOutlined /> {t("settings.account")}
                </span>
            ),
            children: (
                <div>
                    <Card>
                        <Title level={5}>{t("settings.accountInfo")}</Title>
                        <Space direction="vertical" style={{ width: "100%" }}>
                            <div>
                                <Text type="secondary">
                                    {t("settings.accountEmail")}
                                </Text>
                                <br />
                                <Text strong>
                                    {user?.email || t("settings.guest")}
                                </Text>
                            </div>
                            <div>
                                <Text type="secondary">
                                    {t("settings.accountId")}
                                </Text>
                                <br />
                                <Text code>{user?.$id}</Text>
                            </div>
                        </Space>
                    </Card>

                    <Card style={{ marginTop: 16 }}>
                        <Title level={5}>{t("settings.logout")}</Title>
                        <Text type="secondary">{t("settings.logoutDesc")}</Text>
                        <div style={{ marginTop: 16 }}>
                            <Button danger onClick={handleLogout}>
                                {t("settings.logout")}
                            </Button>
                        </div>
                    </Card>

                    <Card
                        style={{
                            marginTop: 16,
                            borderColor: "#ff4d4f",
                        }}
                    >
                        <Title level={5} style={{ color: "#ff4d4f" }}>
                            {t("settings.deleteAccount")}
                        </Title>
                        <Text type="secondary">
                            {t("settings.deleteAccountWarning")}
                        </Text>
                        <div style={{ marginTop: 16 }}>
                            <Button
                                danger
                                type="primary"
                                onClick={handleDeleteAccount}
                                loading={deleting}
                                icon={<DeleteOutlined />}
                            >
                                {t("settings.deleteAccount")}
                            </Button>
                        </div>
                    </Card>
                </div>
            ),
        },
        {
            key: "migration",
            label: (
                <span>
                    <SwapOutlined /> {t("dashboard.migration")}
                </span>
            ),
            children: <MigrationWizard compact />,
        },
    ];

    return (
        <div>
            <Title level={4}>{t("settings.title")}</Title>
            <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        </div>
    );
}
