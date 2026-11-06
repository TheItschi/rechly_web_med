"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Card,
    Form,
    Input,
    Button,
    Typography,
    Steps,
    message,
    Spin,
} from "antd";
import {
    BankOutlined,
    UserOutlined,
    EnvironmentOutlined,
    CheckCircleOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { getCompanyInfo, saveCompanyInfo } from "@/lib/companyService";
import { useLanguage } from "@/contexts/LanguageContext";

const { Title, Text, Paragraph } = Typography;

export default function OnboardingPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { language } = useLanguage();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    const content = {
        de: {
            title: "Willkommen bei Rechly!",
            subtitle:
                "Richte dein Unternehmensprofil ein, um Rechnungen erstellen zu können.",
            step1: "Unternehmen",
            step2: "Kontakt",
            step3: "Fertig",
            companyName: "Firmenname",
            companyNamePlaceholder: "z.B. Musterfirma GmbH",
            companyNameRequired: "Bitte Firmennamen eingeben",
            ownerName: "Inhaber / Geschäftsführer",
            ownerNamePlaceholder: "Max Mustermann",
            street: "Straße & Hausnummer",
            streetPlaceholder: "Musterstraße 123",
            streetRequired: "Bitte Adresse eingeben",
            postalCode: "PLZ",
            postalCodePlaceholder: "12345",
            postalCodeRequired: "Bitte PLZ eingeben",
            city: "Stadt",
            cityPlaceholder: "Berlin",
            cityRequired: "Bitte Stadt eingeben",
            country: "Land",
            countryPlaceholder: "Deutschland",
            email: "E-Mail",
            emailPlaceholder: "kontakt@firma.de",
            phone: "Telefon",
            phonePlaceholder: "+49 123 456789",
            taxId: "Steuernummer",
            taxIdPlaceholder: "12/345/67890",
            vatId: "USt-IdNr.",
            vatIdPlaceholder: "DE123456789",
            bankName: "Bank",
            bankNamePlaceholder: "Sparkasse",
            iban: "IBAN",
            ibanPlaceholder: "DE89 3704 0044 0532 0130 00",
            ibanHelp:
                "Wird für den GiroCode (SEPA-QR-Zahlungscode) auf Ihren Rechnungen verwendet.",
            bic: "BIC",
            bicPlaceholder: "COBADEFFXXX",
            next: "Weiter",
            back: "Zurück",
            finish: "Loslegen",
            skip: "Später ausfüllen",
            successTitle: "Alles bereit!",
            successText: "Du kannst jetzt deine erste Rechnung erstellen.",
            gotoDashboard: "Zum Dashboard",
        },
        en: {
            title: "Welcome to Rechly!",
            subtitle: "Set up your company profile to start creating invoices.",
            step1: "Company",
            step2: "Contact",
            step3: "Done",
            companyName: "Company Name",
            companyNamePlaceholder: "e.g. Acme Inc.",
            companyNameRequired: "Please enter company name",
            ownerName: "Owner / Director",
            ownerNamePlaceholder: "John Doe",
            street: "Street & Number",
            streetPlaceholder: "123 Main Street",
            streetRequired: "Please enter address",
            postalCode: "Postal Code",
            postalCodePlaceholder: "12345",
            postalCodeRequired: "Please enter postal code",
            city: "City",
            cityPlaceholder: "Berlin",
            cityRequired: "Please enter city",
            country: "Country",
            countryPlaceholder: "Germany",
            email: "Email",
            emailPlaceholder: "contact@company.com",
            phone: "Phone",
            phonePlaceholder: "+49 123 456789",
            taxId: "Tax ID",
            taxIdPlaceholder: "12/345/67890",
            vatId: "VAT ID",
            vatIdPlaceholder: "DE123456789",
            bankName: "Bank",
            bankNamePlaceholder: "Deutsche Bank",
            iban: "IBAN",
            ibanPlaceholder: "DE89 3704 0044 0532 0130 00",
            ibanHelp:
                "Used for the GiroCode (SEPA QR payment code) on your invoices.",
            bic: "BIC",
            bicPlaceholder: "COBADEFFXXX",
            next: "Next",
            back: "Back",
            finish: "Get Started",
            skip: "Fill in later",
            successTitle: "All set!",
            successText: "You can now create your first invoice.",
            gotoDashboard: "Go to Dashboard",
        },
    };

    const t = content[language];

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
            return;
        }

        if (user) {
            checkExistingCompany();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading, router]);

    const checkExistingCompany = async () => {
        try {
            const companyInfo = await getCompanyInfo();
            if (companyInfo?.name) {
                // Already has company info, redirect to dashboard
                router.push("/dashboard");
                return;
            }
        } catch (error) {
            console.error("Error checking company info:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = async () => {
        try {
            await form.validateFields();
            if (currentStep < 2) {
                setCurrentStep(currentStep + 1);
            }
        } catch {
            // Validation failed
        }
    };

    const handleBack = () => {
        setCurrentStep(currentStep - 1);
    };

    const handleFinish = async () => {
        setSaving(true);
        try {
            const values = form.getFieldsValue(true);
            await saveCompanyInfo({
                name: values.company_name,
                managing_directors: values.owner_name,
                address_line1: values.street,
                postal_code: values.postal_code,
                city: values.city,
                country: values.country || "Deutschland",
                email: values.email,
                phone: values.phone,
                tax_number: values.tax_id,
                vat_id: values.vat_id,
                bank_name: values.bank_name,
                bank_iban: values.iban,
                bank_bic: values.bic,
                payment_terms_default:
                    "Zahlbar innerhalb von 14 Tagen ohne Abzug.",
            });
            setCurrentStep(2);
        } catch (error) {
            console.error("Error saving company info:", error);
            message.error("Fehler beim Speichern");
        } finally {
            setSaving(false);
        }
    };

    const handleSkip = () => {
        router.push("/dashboard");
    };

    if (authLoading || loading) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                    background: "#f5f5f5",
                }}
            >
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "linear-gradient(135deg, #1976d2 0%, #64b5f6 100%)",
                padding: "40px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Card
                style={{
                    width: "100%",
                    maxWidth: 600,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                }}
            >
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <Title
                        level={2}
                        style={{ marginBottom: 8, color: "#1976d2" }}
                    >
                        {t.title}
                    </Title>
                    <Text type="secondary">{t.subtitle}</Text>
                </div>

                <Steps
                    current={currentStep}
                    style={{ marginBottom: 32 }}
                    items={[
                        { title: t.step1, icon: <BankOutlined /> },
                        { title: t.step2, icon: <UserOutlined /> },
                        { title: t.step3, icon: <CheckCircleOutlined /> },
                    ]}
                />

                <Form form={form} layout="vertical" size="large">
                    {/* Step 1: Company Info */}
                    {currentStep === 0 && (
                        <div>
                            <Form.Item
                                name="company_name"
                                label={t.companyName}
                                rules={[
                                    {
                                        required: true,
                                        message: t.companyNameRequired,
                                    },
                                ]}
                            >
                                <Input
                                    prefix={<BankOutlined />}
                                    placeholder={t.companyNamePlaceholder}
                                />
                            </Form.Item>

                            <Form.Item name="owner_name" label={t.ownerName}>
                                <Input
                                    prefix={<UserOutlined />}
                                    placeholder={t.ownerNamePlaceholder}
                                />
                            </Form.Item>

                            <Form.Item
                                name="street"
                                label={t.street}
                                rules={[
                                    {
                                        required: true,
                                        message: t.streetRequired,
                                    },
                                ]}
                            >
                                <Input
                                    prefix={<EnvironmentOutlined />}
                                    placeholder={t.streetPlaceholder}
                                />
                            </Form.Item>

                            <div style={{ display: "flex", gap: 16 }}>
                                <Form.Item
                                    name="postal_code"
                                    label={t.postalCode}
                                    style={{ flex: 1 }}
                                    rules={[
                                        {
                                            required: true,
                                            message: t.postalCodeRequired,
                                        },
                                    ]}
                                >
                                    <Input
                                        placeholder={t.postalCodePlaceholder}
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="city"
                                    label={t.city}
                                    style={{ flex: 2 }}
                                    rules={[
                                        {
                                            required: true,
                                            message: t.cityRequired,
                                        },
                                    ]}
                                >
                                    <Input placeholder={t.cityPlaceholder} />
                                </Form.Item>
                            </div>

                            <Form.Item name="country" label={t.country}>
                                <Input placeholder={t.countryPlaceholder} />
                            </Form.Item>
                        </div>
                    )}

                    {/* Step 2: Contact & Bank Info */}
                    {currentStep === 1 && (
                        <div>
                            <div style={{ display: "flex", gap: 16 }}>
                                <Form.Item
                                    name="email"
                                    label={t.email}
                                    style={{ flex: 1 }}
                                >
                                    <Input placeholder={t.emailPlaceholder} />
                                </Form.Item>

                                <Form.Item
                                    name="phone"
                                    label={t.phone}
                                    style={{ flex: 1 }}
                                >
                                    <Input placeholder={t.phonePlaceholder} />
                                </Form.Item>
                            </div>

                            <div style={{ display: "flex", gap: 16 }}>
                                <Form.Item
                                    name="tax_id"
                                    label={t.taxId}
                                    style={{ flex: 1 }}
                                >
                                    <Input placeholder={t.taxIdPlaceholder} />
                                </Form.Item>

                                <Form.Item
                                    name="vat_id"
                                    label={t.vatId}
                                    style={{ flex: 1 }}
                                >
                                    <Input placeholder={t.vatIdPlaceholder} />
                                </Form.Item>
                            </div>

                            <Form.Item name="bank_name" label={t.bankName}>
                                <Input placeholder={t.bankNamePlaceholder} />
                            </Form.Item>

                            <Form.Item
                                name="iban"
                                label={t.iban}
                                extra={t.ibanHelp}
                            >
                                <Input placeholder={t.ibanPlaceholder} />
                            </Form.Item>

                            <Form.Item name="bic" label={t.bic}>
                                <Input placeholder={t.bicPlaceholder} />
                            </Form.Item>
                        </div>
                    )}

                    {/* Step 3: Success */}
                    {currentStep === 2 && (
                        <div style={{ textAlign: "center", padding: "40px 0" }}>
                            <CheckCircleOutlined
                                style={{
                                    fontSize: 64,
                                    color: "#52c41a",
                                    marginBottom: 24,
                                }}
                            />
                            <Title level={3}>{t.successTitle}</Title>
                            <Paragraph type="secondary">
                                {t.successText}
                            </Paragraph>
                        </div>
                    )}
                </Form>

                {/* Navigation Buttons */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: 24,
                    }}
                >
                    {currentStep === 0 && (
                        <>
                            <Button onClick={handleSkip}>{t.skip}</Button>
                            <Button type="primary" onClick={handleNext}>
                                {t.next}
                            </Button>
                        </>
                    )}

                    {currentStep === 1 && (
                        <>
                            <Button onClick={handleBack}>{t.back}</Button>
                            <Button
                                type="primary"
                                onClick={handleFinish}
                                loading={saving}
                            >
                                {t.finish}
                            </Button>
                        </>
                    )}

                    {currentStep === 2 && (
                        <Button
                            type="primary"
                            block
                            size="large"
                            onClick={() => router.push("/dashboard")}
                        >
                            {t.gotoDashboard}
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
