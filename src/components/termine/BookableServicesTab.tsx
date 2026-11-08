"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    Button,
    Card,
    Col,
    Form,
    Input,
    InputNumber,
    Modal,
    Row,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Typography,
    message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, SyncOutlined } from "@ant-design/icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { del, get, patch, post } from "@/lib/termine/client";
import type { Product, ProductFormData } from "@/types";

export interface BookableServiceRow {
    $id: string;
    name: string;
    description?: string;
    category?: string;
    durationMinutes: number;
    priceCents: number;
    currency: string;
    prepMinutes: number;
    cleanupMinutes: number;
    active: boolean;
    publicVisible: boolean;
    staffIds: string[];
    sortOrder: number;
    productId?: string;
    taxRatePercent?: number;
}

interface StaffItem {
    $id: string;
    name: string;
}

export default function BookableServicesTab({
    products,
    onCreateProduct,
    prefillProduct,
    onClearPrefill,
    onServicesChanged,
}: {
    products: Product[];
    onCreateProduct: (data: ProductFormData) => Promise<Product>;
    prefillProduct?: Product | null;
    onClearPrefill?: () => void;
    onServicesChanged?: (services: BookableServiceRow[]) => void;
}) {
    const { language } = useLanguage();
    const l = (de: string, en: string) => (language === "de" ? de : en);

    const [rows, setRows] = useState<BookableServiceRow[]>([]);
    const [staff, setStaff] = useState<StaffItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<BookableServiceRow | null>(null);
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [s, st] = await Promise.all([
                get<{ services: BookableServiceRow[] }>("/api/termine/services"),
                get<{ staff: StaffItem[] }>("/api/termine/staff"),
            ]);
            setRows(s.services);
            setStaff(st.staff);
            onServicesChanged?.(s.services);
        } catch (e) {
            message.error(e instanceof Error ? e.message : l("Laden fehlgeschlagen.", "Failed to load services."));
        } finally {
            setLoading(false);
        }
    }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (!prefillProduct) return;
        const existing = rows.find((r) => r.productId === prefillProduct.id);
        if (existing) {
            openEdit(existing);
        } else {
            setEditing(null);
            form.resetFields();
            form.setFieldsValue({
                productId: prefillProduct.id,
                name: prefillProduct.name,
                description: prefillProduct.description || "",
                durationMinutes: 60,
                priceEur: prefillProduct.price,
                taxRatePercent: prefillProduct.tax_rate_percent ?? 19,
                prepMinutes: 0,
                cleanupMinutes: 0,
                active: true,
                publicVisible: true,
                staffIds: staff.map((s) => s.$id),
            });
            setOpen(true);
        }
        onClearPrefill?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefillProduct]);

    function openNew() {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({
            durationMinutes: 30,
            priceEur: 0,
            taxRatePercent: 19,
            prepMinutes: 0,
            cleanupMinutes: 0,
            active: true,
            publicVisible: true,
            staffIds: staff.map((s) => s.$id),
        });
        setOpen(true);
    }

    function openEdit(r: BookableServiceRow) {
        setEditing(r);
        form.setFieldsValue({
            ...r,
            priceEur: (r.priceCents ?? 0) / 100,
            taxRatePercent: r.taxRatePercent ?? 19,
        });
        setOpen(true);
    }

    async function save() {
        try {
            const v = await form.validateFields();
            const payload = {
                name: v.name,
                description: v.description,
                category: v.category,
                durationMinutes: v.durationMinutes,
                priceCents: Math.round(Number(v.priceEur ?? 0) * 100),
                prepMinutes: v.prepMinutes ?? 0,
                cleanupMinutes: v.cleanupMinutes ?? 0,
                active: v.active,
                publicVisible: v.publicVisible,
                staffIds: v.staffIds ?? [],
                productId: v.productId || undefined,
                taxRatePercent: v.taxRatePercent ?? 19,
            };
            if (editing) await patch(`/api/termine/services/${editing.$id}`, payload);
            else await post("/api/termine/services", payload);
            message.success(l("Buchbare Leistung gespeichert.", "Bookable service saved."));
            setOpen(false);
            await load();
        } catch (e) {
            if (e instanceof Error && !String(e).includes("validate")) message.error(e.message);
        }
    }

    async function syncToProductCatalog(service: BookableServiceRow) {
        try {
            const created = await onCreateProduct({
                name: service.name,
                description: service.description || "",
                price: (service.priceCents || 0) / 100,
                tax_rate_percent: service.taxRatePercent ?? 19,
                unit_of_measure: "Stück",
            });
            if (created?.id) {
                await patch(`/api/termine/services/${service.$id}`, {
                    productId: created.id,
                    taxRatePercent: service.taxRatePercent ?? 19,
                });
                message.success(
                    l(
                        "Als Rechnungsposition angelegt und verknüpft.",
                        "Created in Product catalog and linked.",
                    ),
                );
                await load();
            }
        } catch (e) {
            message.error(e instanceof Error ? e.message : l("Synchronisation fehlgeschlagen.", "Sync failed."));
        }
    }

    return (
        <div>
            <Space wrap style={{ justifyContent: "space-between", width: "100%", marginBottom: 16 }}>
                <Typography.Text type="secondary">
                    {l(
                        "Leistungen für Ihren Online-Buchungskalender — direkt verknüpft mit Ihrem Produktkatalog und Ihren USt.-Sätzen für die 1-Klick-Rechnungserstellung.",
                        "Services for your online booking calendar — linked with your Product catalog and VAT rates for 1-click invoicing.",
                    )}
                </Typography.Text>
                <Space wrap>
                    <Link href="/dashboard/termine/buchungen?tab=staff">
                        <Button>{l("Mitarbeiter verwalten", "Manage staff")}</Button>
                    </Link>
                    <Link href="/dashboard/termine/buchungen?tab=availability">
                        <Button>{l("Arbeitszeiten", "Working hours")}</Button>
                    </Link>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>
                        {l("Neue buchbare Leistung", "New bookable service")}
                    </Button>
                </Space>
            </Space>

            <Card>
                <Table
                    rowKey="$id"
                    loading={loading}
                    dataSource={rows}
                    pagination={false}
                    scroll={{ x: 760 }}
                    columns={[
                        { title: l("Leistung", "Service"), dataIndex: "name" },
                        {
                            title: l("Dauer", "Duration"),
                            render: (_: unknown, r: BookableServiceRow) =>
                                `${r.durationMinutes} min${
                                    r.prepMinutes || r.cleanupMinutes
                                        ? ` (+${(r.prepMinutes || 0) + (r.cleanupMinutes || 0)} min ${l("Puffer", "buffer")})`
                                        : ""
                                }`,
                        },
                        {
                            title: l("Preis (netto)", "Price (net)"),
                            render: (_: unknown, r: BookableServiceRow) =>
                                `${(r.priceCents / 100).toFixed(2).replace(".", ",")} ${r.currency}`,
                        },
                        {
                            title: l("USt.", "VAT"),
                            render: (_: unknown, r: BookableServiceRow) => {
                                const linked = products.find((p) => p.id === r.productId);
                                const rate = r.taxRatePercent ?? linked?.tax_rate_percent ?? 19;
                                return `${rate}%`;
                            },
                        },
                        {
                            title: l("Produktkatalog", "Product link"),
                            render: (_: unknown, r: BookableServiceRow) => {
                                const linked = products.find((p) => p.id === r.productId);
                                return linked ? (
                                    <Tag color="blue">{linked.name}</Tag>
                                ) : (
                                    <Button
                                        size="small"
                                        type="link"
                                        icon={<SyncOutlined />}
                                        onClick={() => void syncToProductCatalog(r)}
                                    >
                                        {l("In Produkte übernehmen", "Add to Products")}
                                    </Button>
                                );
                            },
                        },
                        {
                            title: "Status",
                            render: (_: unknown, r: BookableServiceRow) => (
                                <Space>
                                    {r.active ? (
                                        <Tag color="success">{l("Aktiv", "Active")}</Tag>
                                    ) : (
                                        <Tag>{l("Inaktiv", "Inactive")}</Tag>
                                    )}
                                    {r.publicVisible ? (
                                        <Tag color="processing">{l("Öffentlich", "Public")}</Tag>
                                    ) : (
                                        <Tag>{l("Intern", "Internal")}</Tag>
                                    )}
                                </Space>
                            ),
                        },
                        {
                            title: l("Aktionen", "Actions"),
                            render: (_: unknown, r: BookableServiceRow) => (
                                <Space>
                                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
                                        {l("Bearbeiten", "Edit")}
                                    </Button>
                                    <Button
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={async () => {
                                            try {
                                                await del(`/api/termine/services/${r.$id}`);
                                                message.success(l("Gelöscht.", "Deleted."));
                                                await load();
                                            } catch (e) {
                                                message.error(
                                                    e instanceof Error
                                                        ? e.message
                                                        : l("Löschen fehlgeschlagen.", "Delete failed."),
                                                );
                                            }
                                        }}
                                    />
                                </Space>
                            ),
                        },
                    ]}
                    locale={{
                        emptyText: l(
                            "Noch keine buchbaren Leistungen angelegt. Sie können bestehende Produkte direkt übernehmen.",
                            "No bookable services yet. You can import existing products with 1 click.",
                        ),
                    }}
                />
            </Card>

            <Modal
                title={
                    editing
                        ? l("Buchbare Leistung bearbeiten", "Edit bookable service")
                        : l("Neue buchbare Leistung", "New bookable service")
                }
                open={open}
                onOk={() => void save()}
                onCancel={() => setOpen(false)}
                okText={l("Speichern", "Save")}
                width={580}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="productId"
                        label={l(
                            "Mit Produkt / Rechnungsposition verknüpfen (optional)",
                            "Link to Product / Invoice item (optional)",
                        )}
                    >
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            placeholder={l("Aus Produktkatalog übernehmen …", "Import from Products …")}
                            options={products.map((p) => ({
                                value: p.id,
                                label: `${p.name} (${p.price.toFixed(2)} € · ${p.tax_rate_percent}% USt.)`,
                            }))}
                            onChange={(id) => {
                                const prod = products.find((p) => p.id === id);
                                if (prod) {
                                    form.setFieldsValue({
                                        name: prod.name,
                                        description: prod.description || "",
                                        priceEur: prod.price,
                                        taxRatePercent: prod.tax_rate_percent,
                                    });
                                }
                            }}
                        />
                    </Form.Item>
                    <Form.Item
                        name="name"
                        label="Name"
                        rules={[{ required: true, message: l("Name erforderlich.", "Name required.") }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item name="category" label={l("Kategorie (optional)", "Category (optional)")}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label={l("Beschreibung", "Description")}>
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={8}>
                            <Form.Item
                                name="durationMinutes"
                                label={l("Dauer (Min.)", "Duration (min)")}
                                rules={[{ required: true }]}
                            >
                                <InputNumber min={5} max={1440} step={5} style={{ width: "100%" }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="priceEur" label={l("Preis (EUR)", "Price (EUR)")}>
                                <InputNumber min={0} max={100000} step={1} style={{ width: "100%" }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="taxRatePercent" label={l("USt.-Satz", "VAT rate")}>
                                <Select
                                    options={[
                                        { value: 19, label: "19 %" },
                                        { value: 7, label: "7 %" },
                                        { value: 0, label: "0 %" },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="prepMinutes" label={l("Vorbereitung (Min.)", "Prep buffer (min)")}>
                                <InputNumber min={0} max={240} style={{ width: "100%" }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="cleanupMinutes" label={l("Nachbereitung (Min.)", "Cleanup buffer (min)")}>
                                <InputNumber min={0} max={240} style={{ width: "100%" }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="staffIds" label={l("Zuständige Mitarbeiter", "Assigned staff")}>
                        <Select
                            mode="multiple"
                            allowClear
                            options={staff.map((s) => ({ value: s.$id, label: s.name }))}
                        />
                    </Form.Item>
                    <Space size="large">
                        <Form.Item name="active" label={l("Aktiv", "Active")} valuePropName="checked">
                            <Switch />
                        </Form.Item>
                        <Form.Item
                            name="publicVisible"
                            label={l("Öffentlich buchbar", "Publicly bookable")}
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Space>
                </Form>
            </Modal>
        </div>
    );
}
