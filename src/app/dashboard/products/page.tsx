"use client";

import DecimalInput from "@/components/DecimalInput";

import { useEffect, useState } from "react";
import {
    Table,
    Button,
    Input,
    Space,
    Modal,
    Form,
    Select,
    message,
    Popconfirm,
    Typography,
    Row,
    Col,
    Progress,
    Upload,
    Alert,
    Divider,
} from "antd";
import type { UploadProps } from "antd";
import type { TableProps } from "antd";
import {
    PlusOutlined,
    SearchOutlined,
    EditOutlined,
    DeleteOutlined,
    UploadOutlined,
    DownloadOutlined,
} from "@ant-design/icons";
import { useProductStore } from "@/store";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency } from "@/lib/currencyUtils";
import type {
    Product,
    ProductBulkUploadResult,
    ProductCsvPreviewRow,
    ProductFormData,
} from "@/types";

const { Title } = Typography;

export default function ProductsPage() {
    const { t } = useLanguage();
    const [searchText, setSearchText] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvPreviewRows, setCsvPreviewRows] = useState<
        ProductCsvPreviewRow[]
    >([]);
    const [csvPreviewErrors, setCsvPreviewErrors] = useState<string[]>([]);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [uploadingCsv, setUploadingCsv] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [bulkUploadResult, setBulkUploadResult] =
        useState<ProductBulkUploadResult | null>(null);

    const unitOptions = [
        { value: "Stück", label: t("products.unit.piece") },
        { value: "Stunde", label: t("products.unit.hour") },
        { value: "Tag", label: t("products.unit.day") },
        { value: "Monat", label: t("products.unit.month") },
        { value: "Pauschal", label: t("products.unit.flatRate") },
        { value: "kg", label: t("products.unit.kg") },
        { value: "m", label: t("products.unit.m") },
        { value: "m²", label: t("products.unit.sqm") },
        { value: "Liter", label: t("products.unit.liter") },
    ];

    const taxRateOptions = [
        { value: 19, label: t("products.vat.standard") },
        { value: 7, label: t("products.vat.reduced") },
        { value: 0, label: t("products.vat.exempt") },
    ];

    // Zustand store
    const {
        products,
        loading,
        fetchProducts,
        addProduct,
        editProduct,
        removeProduct,
    } = useProductStore();

    // Filter products based on search
    const filteredProducts = products.filter(
        (product) =>
            product.name.toLowerCase().includes(searchText.toLowerCase()) ||
            product.description
                ?.toLowerCase()
                .includes(searchText.toLowerCase()),
    );

    useEffect(() => {
        fetchProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const parseCsvLine = (line: string): string[] => {
        const out: string[] = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i += 1;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === "," && !inQuotes) {
                out.push(current.trim());
                current = "";
            } else {
                current += char;
            }
        }
        out.push(current.trim());
        return out;
    };

    const validatePreviewRow = (
        row: Record<string, string>,
        line: number,
    ): ProductCsvPreviewRow => {
        const errors: string[] = [];
        const name = (row.name || "").trim();
        const description = (row.description || "").trim();
        const price = Number(String(row.price || "").replace(",", "."));
        const taxRate = Number(
            String(row.tax_rate_percent || "").replace(",", "."),
        );
        const unit = (row.unit_of_measure || "Stück").trim() || "Stück";

        if (!name) errors.push("name is required");
        if (!Number.isFinite(price) || price < 0)
            errors.push("price must be a non-negative number");
        if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100)
            errors.push("tax_rate_percent must be between 0 and 100");

        return {
            row: line,
            name,
            description,
            price: Number.isFinite(price) ? price : 0,
            tax_rate_percent: Number.isFinite(taxRate) ? taxRate : 0,
            unit_of_measure: unit,
            errors,
        };
    };

    const buildCsvPreview = async (file: File) => {
        const raw = await file.text();
        const lines = raw
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

        if (lines.length < 2) {
            setCsvPreviewRows([]);
            setCsvPreviewErrors(["CSV needs at least header + 1 data row"]);
            return;
        }

        const headers = parseCsvLine(lines[0]).map((header) =>
            header.toLowerCase(),
        );
        const requiredHeaders = [
            "name",
            "price",
            "tax_rate_percent",
            "unit_of_measure",
        ];
        const missing = requiredHeaders.filter(
            (header) => !headers.includes(header),
        );

        if (missing.length > 0) {
            setCsvPreviewRows([]);
            setCsvPreviewErrors([
                `Missing required columns: ${missing.join(", ")}`,
            ]);
            return;
        }

        const previewRows = lines.slice(1, 16).map((line, index) => {
            const values = parseCsvLine(line);
            const rowObj: Record<string, string> = {};
            headers.forEach((header, colIndex) => {
                rowObj[header] = values[colIndex] || "";
            });
            return validatePreviewRow(rowObj, index + 2);
        });

        setCsvPreviewErrors([]);
        setCsvPreviewRows(previewRows);
    };

    const downloadSampleCsv = () => {
        const sample = [
            "name,description,price,tax_rate_percent,unit_of_measure",
            'Website Audit,"Technical and SEO audit",450,19,Stück',
            'Monthly Maintenance,"Maintenance package",99.99,19,Monat',
            'Consulting Hour,"Strategic consulting",120,19,Stunde',
        ].join("\n");

        const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "products-sample.csv";
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const uploadProps: UploadProps = {
        accept: ".csv,text/csv",
        maxCount: 1,
        beforeUpload: async (file) => {
            setCsvFile(file as File);
            setBulkUploadResult(null);
            await buildCsvPreview(file as File);
            return false;
        },
        onRemove: () => {
            setCsvFile(null);
            setCsvPreviewRows([]);
            setCsvPreviewErrors([]);
        },
        fileList: csvFile
            ? [
                  {
                      uid: "products-csv",
                      name: csvFile.name,
                      status: "done",
                  },
              ]
            : [],
    };

    const startCsvUpload = async () => {
        if (!csvFile) {
            message.warning("Please choose a CSV file first.");
            return;
        }

        if (
            csvPreviewErrors.length > 0 ||
            csvPreviewRows.some((r) => r.errors.length > 0)
        ) {
            message.error("Fix CSV validation errors before uploading.");
            return;
        }

        setUploadingCsv(true);
        setUploadProgress(0);
        setBulkUploadResult(null);

        const formData = new FormData();
        formData.append("file", csvFile);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/products/bulk-upload", true);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percent);
            }
        };

        xhr.onload = async () => {
            setUploadingCsv(false);
            setUploadProgress(100);

            try {
                const data = JSON.parse(
                    xhr.responseText || "{}",
                ) as ProductBulkUploadResult & { error?: string };

                if (xhr.status >= 200 && xhr.status < 300) {
                    setBulkUploadResult(data);
                    message.success(
                        `Imported ${data.insertedRows} products (${data.failedRows} failed).`,
                    );
                    await fetchProducts(true);
                } else {
                    message.error(data.error || "Bulk upload failed.");
                }
            } catch {
                message.error("Bulk upload response could not be parsed.");
            }
        };

        xhr.onerror = () => {
            setUploadingCsv(false);
            message.error("Upload failed. Please try again.");
        };

        xhr.send(formData);
    };

    const openCreateModal = () => {
        setEditingProduct(null);
        form.resetFields();
        form.setFieldsValue({
            tax_rate_percent: 19,
            unit_of_measure: "Stück",
        });
        setModalOpen(true);
    };

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        form.setFieldsValue(product);
        setModalOpen(true);
    };

    const handleSubmit = async (values: ProductFormData) => {
        setSubmitting(true);
        try {
            if (editingProduct) {
                await editProduct(editingProduct.id!, values);
                message.success(t("products.updated"));
            } else {
                await addProduct(values);
                message.success(t("products.created"));
            }
            setModalOpen(false);
        } catch (error) {
            console.error("Error saving product:", error);
            message.error(t("products.saveError"));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await removeProduct(id);
            message.success(t("products.deleted"));
        } catch (error) {
            console.error("Error deleting product:", error);
            message.error(t("products.deleteError"));
        }
    };

    const columns: TableProps<Product>["columns"] = [
        {
            title: t("products.name"),
            dataIndex: "name",
            key: "name",
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: t("products.description"),
            dataIndex: "description",
            key: "description",
            responsive: ["md"],
            ellipsis: true,
        },
        {
            title: t("products.price"),
            dataIndex: "price",
            key: "price",
            render: (price) => formatCurrency(price),
            sorter: (a, b) => a.price - b.price,
            align: "right",
        },
        {
            title: t("products.vat"),
            dataIndex: "tax_rate_percent",
            key: "tax_rate_percent",
            render: (rate) => `${rate}%`,
            responsive: ["sm"],
        },
        {
            title: t("products.unit"),
            dataIndex: "unit_of_measure",
            key: "unit_of_measure",
            responsive: ["lg"],
        },
        {
            title: t("products.actions"),
            key: "actions",
            width: 120,
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(record)}
                    />
                    <Popconfirm
                        title={t("products.deleteConfirm")}
                        description={t("products.deleteDesc")}
                        onConfirm={() => handleDelete(record.id!)}
                        okText={t("products.delete")}
                        cancelText={t("products.cancel")}
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Title level={4}>{t("products.title")}</Title>

            {/* Toolbar */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={16} md={12}>
                    <Input
                        placeholder={t("products.search")}
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
                    <Space
                        style={{ width: "100%", justifyContent: "flex-end" }}
                    >
                        <Button
                            icon={<DownloadOutlined />}
                            onClick={downloadSampleCsv}
                        >
                            Download sample CSV
                        </Button>
                        <Button
                            icon={<UploadOutlined />}
                            onClick={() => setPreviewModalOpen(true)}
                        >
                            CSV Upload
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={openCreateModal}
                        >
                            {t("products.new")}
                        </Button>
                    </Space>
                </Col>
            </Row>

            {/* Table */}
            <Table
                columns={columns}
                dataSource={filteredProducts}
                rowKey="id"
                loading={loading}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total, range) =>
                        t("products.pagination")
                            .replace("{0}", String(range[0]))
                            .replace("{1}", String(range[1]))
                            .replace("{2}", String(total)),
                }}
            />

            {/* Create/Edit Modal */}
            <Modal
                title={
                    editingProduct
                        ? t("products.editTitle")
                        : t("products.newTitle")
                }
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
                width={500}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    style={{ marginTop: 16 }}
                >
                    <Form.Item
                        name="name"
                        label={t("products.name")}
                        rules={[
                            { required: true, message: t("products.required") },
                        ]}
                    >
                        <Input placeholder={t("products.productName")} />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label={t("products.description")}
                    >
                        <Input.TextArea
                            placeholder={t("products.descPlaceholder")}
                            rows={3}
                        />
                    </Form.Item>

                    <Row gutter={[12, 0]}>
                        <Col xs={24} sm={14}>
                            <Form.Item
                                name="price"
                                label={t("products.priceLabel")}
                                rules={[
                                    {
                                        required: true,
                                        message: t("products.required"),
                                    },
                                ]}
                            >
                                <DecimalInput
                                    placeholder="0,00"
                                    step={0.01}
                                    min={0}
                                    precision={2}
                                    style={{ width: "100%" }}
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={10}>
                            <Form.Item
                                name="tax_rate_percent"
                                label={t("products.vatRate")}
                                rules={[
                                    {
                                        required: true,
                                        message: t("products.required"),
                                    },
                                ]}
                            >
                                <Select options={taxRateOptions} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="unit_of_measure"
                        label={t("products.unit")}
                        rules={[
                            { required: true, message: t("products.required") },
                        ]}
                    >
                        <Select options={unitOptions} />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
                        <Space>
                            <Button onClick={() => setModalOpen(false)}>
                                {t("products.cancel")}
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={submitting}
                            >
                                {editingProduct
                                    ? t("products.save")
                                    : t("products.create")}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="CSV Bulk Upload"
                open={previewModalOpen}
                onCancel={() => setPreviewModalOpen(false)}
                onOk={startCsvUpload}
                okText="Upload"
                confirmLoading={uploadingCsv}
                width={900}
            >
                <Space direction="vertical" style={{ width: "100%" }}>
                    <Upload {...uploadProps}>
                        <Button icon={<UploadOutlined />}>
                            Select CSV file
                        </Button>
                    </Upload>

                    {uploadingCsv ? (
                        <Progress percent={uploadProgress} />
                    ) : null}

                    {csvPreviewErrors.map((error, index) => (
                        <Alert
                            key={`${error}-${index}`}
                            type="error"
                            message={error}
                        />
                    ))}

                    {csvPreviewRows.length > 0 ? (
                        <>
                            <Divider style={{ margin: "8px 0" }} />
                            <Table<ProductCsvPreviewRow>
                                size="small"
                                rowKey="row"
                                pagination={false}
                                dataSource={csvPreviewRows}
                                columns={[
                                    {
                                        title: "Row",
                                        dataIndex: "row",
                                        width: 70,
                                    },
                                    { title: "Name", dataIndex: "name" },
                                    {
                                        title: "Price",
                                        dataIndex: "price",
                                        width: 120,
                                        render: (value) =>
                                            formatCurrency(value),
                                    },
                                    {
                                        title: "VAT",
                                        dataIndex: "tax_rate_percent",
                                        width: 90,
                                        render: (value) => `${value}%`,
                                    },
                                    {
                                        title: "Unit",
                                        dataIndex: "unit_of_measure",
                                        width: 100,
                                    },
                                    {
                                        title: "Validation",
                                        dataIndex: "errors",
                                        render: (errors: string[]) =>
                                            errors.length > 0 ? (
                                                <span
                                                    style={{ color: "#ff4d4f" }}
                                                >
                                                    {errors.join("; ")}
                                                </span>
                                            ) : (
                                                <span
                                                    style={{ color: "#52c41a" }}
                                                >
                                                    valid
                                                </span>
                                            ),
                                    },
                                ]}
                            />
                        </>
                    ) : null}

                    {bulkUploadResult ? (
                        <Alert
                            type={
                                bulkUploadResult.failedRows > 0
                                    ? "warning"
                                    : "success"
                            }
                            message={`Processed: ${bulkUploadResult.processedRows}, Inserted: ${bulkUploadResult.insertedRows}, Failed: ${bulkUploadResult.failedRows}`}
                            description={
                                <div>
                                    {bulkUploadResult.mlTrigger
                                        ? `ML recompute: ${bulkUploadResult.mlTrigger.success ? "success" : "not completed"}${bulkUploadResult.mlTrigger.details ? ` (${bulkUploadResult.mlTrigger.details})` : ""}`
                                        : null}
                                    {bulkUploadResult.errors.length > 0 ? (
                                        <ul
                                            style={{
                                                marginTop: 8,
                                                marginBottom: 0,
                                                paddingLeft: 18,
                                            }}
                                        >
                                            {bulkUploadResult.errors
                                                .slice(0, 10)
                                                .map((error) => (
                                                    <li
                                                        key={`${error.row}-${error.message}`}
                                                    >
                                                        Row {error.row}:{" "}
                                                        {error.message}
                                                    </li>
                                                ))}
                                        </ul>
                                    ) : null}
                                </div>
                            }
                        />
                    ) : null}
                </Space>
            </Modal>
        </div>
    );
}
