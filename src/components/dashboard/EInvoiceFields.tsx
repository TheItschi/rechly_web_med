"use client";
import HelpLink from "./HelpLink";

import { Button, Collapse, Form, Input, Select, Space, Typography } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { parseIdentifier, type EInvoiceData } from "@/lib/eRechnung/identifiers";
import { euCountryCodeOptions } from "@/lib/euCountries";

export function IdentifierFields({ path, label, prefix = [] }: { path: (string | number)[]; label: string; prefix?: (string | number)[] }) {
    const { t } = useLanguage();
    const form = Form.useFormInstance();
    return <Space align="start" wrap>
        <Form.Item name={[...path, "value"]} label={label} tooltip={t("einvoice.identifierHelp")}
            dependencies={[[...prefix, ...path, "scheme"]]} rules={[{ validator: async (_, value) => {
                parseIdentifier({ value, scheme: form.getFieldValue([...prefix, ...path, "scheme"]) });
            } }]}>
            <Input maxLength={200} autoComplete="off" />
        </Form.Item>
        <Form.Item name={[...path, "scheme"]} label={t("einvoice.scheme")}>
            <Select allowClear style={{ width: 170 }} placeholder={t("einvoice.noScheme")}
                options={[{ value: "0088", label: "GLN · 0088" }]} />
        </Form.Item>
    </Space>;
}

export function DeliveryFields({ path, prefix = [] }: { path: (string | number)[]; prefix?: (string | number)[] }) {
    const { t, language } = useLanguage();
    return <>
        <Space wrap align="start">
            {(["name", "street", "postal_code", "city"] as const).map(field =>
                <Form.Item key={field} name={[...path, field]} label={t(`einvoice.${field}`)}
                    rules={[{ required: true, whitespace: true }]}>
                    <Input maxLength={200} />
                </Form.Item>)}
            <Form.Item name={[...path, "country"]} label={t("einvoice.country")} initialValue="DE"
                rules={[{ required: true }]}>
                <Select showSearch style={{ width: 190 }} options={euCountryCodeOptions(language)} />
            </Form.Item>
        </Space>
        <IdentifierFields path={[...path, "identifier"]} prefix={prefix} label={t("einvoice.deliveryId")} />
    </>;
}

/** Reuses the surrounding customer/company form, preserving its normal save behavior. */
export default function EInvoiceFields({ seller = false }: { seller?: boolean }) {
    const { t } = useLanguage();
    return <Collapse style={{ marginBottom: 24 }} items={[{ key: "identifiers", label: t("einvoice.advanced"), children: <>
        <Typography.Paragraph type="secondary">{t("einvoice.optionalHelp")}</Typography.Paragraph>
        <HelpLink href="/hilfe/e-rechnung-und-aufbewahrung#kennungen" label="Kennungen und Lieferorte erklärt" />
        <IdentifierFields path={["e_invoice", seller ? "seller_identifier" : "buyer_identifier"]}
            label={t(seller ? "einvoice.sellerId" : "einvoice.buyerId")} />
        {!seller && <Form.List name={["e_invoice", "delivery_locations"]}>
            {(fields, { add, remove }) => <>
                {fields.map(field => <div key={field.key} style={{ borderTop: "1px solid #8884", paddingTop: 16 }}>
                    <DeliveryFields path={[field.name]} prefix={["e_invoice", "delivery_locations"]} />
                    <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(field.name)}>{t("einvoice.removeLocation")}</Button>
                </div>)}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ country: "DE" })}>{t("einvoice.addLocation")}</Button>
            </>}
        </Form.List>}
    </> }]} />;
}

export function InvoiceIdentifierEditor({ initial, value, onChange }: { initial?: EInvoiceData; value?: EInvoiceData; onChange: (value: EInvoiceData) => void }) {
    const { t } = useLanguage();
    const [form] = Form.useForm();
    return <Collapse style={{ marginBottom: 16 }} items={[{ key: "invoice-identifiers", label: t("einvoice.advanced"), children:
        <Form form={form} layout="vertical" initialValues={value ?? { buyer_identifier: initial?.buyer_identifier }}
            onValuesChange={(_, values) => onChange(values)}>
            <Typography.Paragraph type="secondary">{t("einvoice.optionalHelp")}</Typography.Paragraph>
        <HelpLink href="/hilfe/e-rechnung-und-aufbewahrung#kennungen" label="Kennungen und Lieferorte erklärt" />
            <IdentifierFields path={["buyer_identifier"]} label={t("einvoice.buyerId")} />
            <Form.Item label={t("einvoice.delivery")}>
                <Select allowClear defaultValue={value?.delivery ? "custom" : undefined} placeholder={t("einvoice.noDelivery")} onChange={(value) => {
                    const delivery = value === "custom" ? { country: "DE" } : initial?.delivery_locations?.[Number(value)];
                    form.setFieldValue("delivery", delivery);
                    onChange(form.getFieldsValue(true));
                }} options={[
                    ...(initial?.delivery_locations || []).map((location, i) => ({ value: String(i), label: location.name })),
                    { value: "custom", label: t("einvoice.customDelivery") },
                ]} />
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prev, next) => prev.delivery !== next.delivery}>
                {() => form.getFieldValue("delivery") ? <DeliveryFields path={["delivery"]} /> : null}
            </Form.Item>
        </Form>
    }]} />;
}
