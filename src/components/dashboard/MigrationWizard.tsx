"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
    Alert,
    Badge,
    Button,
    Card,
    Checkbox,
    Collapse,
    Divider,
    Empty,
    Radio,
    Select,
    Space,
    Table,
    Tabs,
    Tag,
    Typography,
    message } from "antd";
import {
    CheckCircleOutlined,
    CloudDownloadOutlined,
    CloudUploadOutlined,
    DeleteOutlined,
    DownloadOutlined,
    FileExcelOutlined,
    FilePdfOutlined,
    FileTextOutlined,
    InboxOutlined,
    ReloadOutlined,
    RocketOutlined,
    SettingOutlined,
    ShoppingOutlined,
    SwapOutlined,
    TeamOutlined,
    WalletOutlined } from "@ant-design/icons";
import { useLanguage } from "@/contexts/LanguageContext";
import {
    MIGRATION_SOURCES,
    aggregateMigrationInputs,
    autoDetectColumnMapping,
    decodeFileBuffer,
    generateSampleCsvTemplate,
    getFieldDefinitions,
    parseCsvTextToRows,
    type MigrationEntityType,
    type MigrationSourceId,
    type ParsedCsvFileEntry,
    type ParsedMigrationEInvoice,
    type RechlyBackupBundle } from "@/lib/migration/importer";
import type { MigrationImportResult } from "@/app/api/migration/import/route";

const { Title, Text, Paragraph } = Typography;

interface MigrationWizardProps {
    initialSource?: MigrationSourceId;
    compact?: boolean;
    onImportComplete?: (result: MigrationImportResult) => void;
}

export default function MigrationWizard({
    initialSource = "lexoffice",
    compact = false,
    onImportComplete }: MigrationWizardProps) {
    const { language } = useLanguage();
    const isDe = language === "de";

    const [selectedSource, setSelectedSource] =
        useState<MigrationSourceId>(initialSource);
    const [csvFiles, setCsvFiles] = useState<ParsedCsvFileEntry[]>([]);
    const [eInvoices, setEInvoices] = useState<ParsedMigrationEInvoice[]>([]);
    const [eInvoiceMode, setEInvoiceMode] = useState<"outgoing" | "incoming">(
        "outgoing",
    );
    const [backupBundle, setBackupBundle] =
        useState<RechlyBackupBundle | null>(null);
    const [skipDuplicates, setSkipDuplicates] = useState(true);
    const [parsingFiles, setParsingFiles] = useState(false);
    const [importing, setImporting] = useState(false);
    const [downloadingBackup, setDownloadingBackup] = useState(false);
    const [importResult, setImportResult] =
        useState<MigrationImportResult | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const activeSourceGuide = useMemo(
        () =>
            MIGRATION_SOURCES.find((s) => s.id === selectedSource) ||
            MIGRATION_SOURCES[0],
        [selectedSource],
    );

    // Compute combined normalized entities from all loaded CSVs, E-Invoices, and Backup JSON
    const aggregated = useMemo(
        () => aggregateMigrationInputs(csvFiles, eInvoices, eInvoiceMode, backupBundle),
        [csvFiles, eInvoices, eInvoiceMode, backupBundle],
    );

    const handleDownloadFullBackup = async () => {
        setDownloadingBackup(true);
        try {
            const res = await fetch("/api/migration/backup");
            if (!res.ok) {
                throw new Error("Backup failed");
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `rechly-backup-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            message.success(
                isDe
                    ? "Komplett-Backup (.json) wurde heruntergeladen!"
                    : "Full backup (.json) downloaded!",
            );
        } catch {
            message.error(
                isDe
                    ? "Backup konnte nicht erstellt werden."
                    : "Failed to download backup.",
            );
        } finally {
            setDownloadingBackup(false);
        }
    };

    const handleDownloadSampleCsv = (
        entityType: Exclude<MigrationEntityType, "full_backup">,
    ) => {
        const csvContent = "\uFEFF" + generateSampleCsvTemplate(entityType);
        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rechly-muster-${entityType}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const handleFilesSelected = async (fileList: FileList | File[]) => {
        const files = Array.from(fileList);
        if (files.length === 0) return;

        setParsingFiles(true);
        setImportResult(null);

        const newCsvEntries: ParsedCsvFileEntry[] = [];
        const eInvoiceFiles: File[] = [];

        try {
            for (const file of files) {
                const lower = file.name.toLowerCase();

                if (lower.endsWith(".json")) {
                    const text = decodeFileBuffer(await file.arrayBuffer());
                    const parsed = JSON.parse(text) as RechlyBackupBundle;
                    if (
                        parsed &&
                        (parsed.rechlyBackupVersion ||
                            Array.isArray(parsed.clients) ||
                            Array.isArray(parsed.invoices))
                    ) {
                        setBackupBundle(parsed);
                        setSelectedSource("rechly_backup");
                        message.success(
                            isDe
                                ? `Rechly Backup-Datei „${file.name}“ geladen.`
                                : `Loaded Rechly backup file "${file.name}".`,
                        );
                    } else {
                        message.warning(
                            isDe
                                ? `JSON-Datei „${file.name}“ hat kein bekanntes Rechly-Backup-Format.`
                                : `JSON file "${file.name}" is not a valid Rechly backup.`,
                        );
                    }
                    continue;
                }

                if (lower.endsWith(".xml") || lower.endsWith(".pdf")) {
                    eInvoiceFiles.push(file);
                    continue;
                }

                // Default: treat as CSV / TSV
                const csvText = decodeFileBuffer(await file.arrayBuffer());
                const parsedCsv = parseCsvTextToRows(csvText);

                if (parsedCsv.rows.length === 0) {
                    message.warning(
                        isDe
                            ? `Datei „${file.name}“ enthält keine lesbaren Datenzeilen.`
                            : `File "${file.name}" contains no data rows.`,
                    );
                    continue;
                }

                const mapping = autoDetectColumnMapping(
                    parsedCsv.headers,
                    parsedCsv.detectedEntityType,
                );

                newCsvEntries.push({
                    id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    fileName: file.name,
                    headers: parsedCsv.headers,
                    rows: parsedCsv.rows,
                    detectedSource: parsedCsv.detectedSource,
                    entityType: parsedCsv.detectedEntityType,
                    mapping });
            }

            if (newCsvEntries.length > 0) {
                setCsvFiles((prev) => [...prev, ...newCsvEntries]);
            }

            if (eInvoiceFiles.length > 0) {
                const formData = new FormData();
                for (const f of eInvoiceFiles) {
                    formData.append("files", f);
                }
                const res = await fetch("/api/migration/parse-einvoice", {
                    method: "POST",
                    body: formData });
                if (res.ok) {
                    const data = await res.json();
                    if (
                        Array.isArray(data.invoices) &&
                        data.invoices.length > 0
                    ) {
                        setEInvoices((prev) => [...prev, ...data.invoices]);
                        setSelectedSource("einvoice");
                        message.success(
                            isDe
                                ? `${data.invoices.length} E-Rechnung(en) erfolgreich analysiert.`
                                : `${data.invoices.length} e-invoice(s) parsed successfully.`,
                        );
                    }
                    if (
                        Array.isArray(data.failedFiles) &&
                        data.failedFiles.length > 0
                    ) {
                        for (const fail of data.failedFiles) {
                            message.warning(`${fail.fileName}: ${fail.reason}`);
                        }
                    }
                } else {
                    message.error(
                        isDe
                            ? "Fehler beim Lesen der E-Rechnungsdateien."
                            : "Failed to parse e-invoice files.",
                    );
                }
            }
        } catch (err) {
            console.error("File parse error:", err);
            message.error(
                isDe
                    ? "Datei konnte nicht verarbeitet werden."
                    : "Failed to process file.",
            );
        } finally {
            setParsingFiles(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleChangeCsvEntityType = (
        entryId: string,
        newType: Exclude<MigrationEntityType, "full_backup">,
    ) => {
        setCsvFiles((prev) =>
            prev.map((entry) => {
                if (entry.id !== entryId) return entry;
                return {
                    ...entry,
                    entityType: newType,
                    mapping: autoDetectColumnMapping(entry.headers, newType) };
            }),
        );
    };

    const handleChangeColumnMapping = (
        entryId: string,
        fieldKey: string,
        csvHeader: string,
    ) => {
        setCsvFiles((prev) =>
            prev.map((entry) => {
                if (entry.id !== entryId) return entry;
                const nextMapping = { ...entry.mapping };
                if (!csvHeader) {
                    delete nextMapping[fieldKey];
                } else {
                    nextMapping[fieldKey] = csvHeader;
                }
                return {
                    ...entry,
                    mapping: nextMapping };
            }),
        );
    };

    const handleRemoveCsvFile = (entryId: string) => {
        setCsvFiles((prev) => prev.filter((e) => e.id !== entryId));
    };

    const handleResetAll = () => {
        setCsvFiles([]);
        setEInvoices([]);
        setBackupBundle(null);
        setImportResult(null);
    };

    const handleExecuteImport = async () => {
        if (aggregated.totalItems === 0 && !aggregated.hasCompany) {
            message.warning(
                isDe
                    ? "Keine Datensätze zum Importieren vorhanden."
                    : "No records to import.",
            );
            return;
        }

        setImporting(true);
        try {
            const res = await fetch("/api/migration/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    skipDuplicates,
                    company: backupBundle?.company || null,
                    clients: aggregated.clients,
                    products: aggregated.products,
                    invoices: aggregated.invoices,
                    expenses: aggregated.expenses,
                    offers: backupBundle?.offers || [] }) });

            if (!res.ok) {
                throw new Error("Import request failed");
            }

            const result: MigrationImportResult = await res.json();
            setImportResult(result);
            onImportComplete?.(result);

            const totalInserted =
                result.clients.inserted +
                result.products.inserted +
                result.invoices.inserted +
                result.expenses.inserted +
                result.offers.inserted;

            message.success(
                isDe
                    ? `Umzug abgeschlossen! ${totalInserted} Datensätze wurden importiert.`
                    : `Migration complete! ${totalInserted} records imported.`,
            );
        } catch (err) {
            console.error("Import error:", err);
            message.error(
                isDe
                    ? "Import fehlgeschlagen. Bitte prüfe deine Dateien."
                    : "Import failed. Please check your files.",
            );
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Banner: Full Account Backup & Web <-> Desktop Portability */}
            <Card className="border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/70 via-white to-sky-50/60 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Tag color="blue" className="m-0 font-semibold">
                                Web ⇄ Desktop
                            </Tag>
                            <span className="font-semibold text-base text-slate-900 dark:text-slate-100">
                                {isDe
                                    ? "100% Datenhoheit & Komplett-Backup"
                                    : "100% Data Sovereignty & Full Backup"}
                            </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 m-0">
                            {isDe
                                ? "Sichere deinen gesamten Datenbestand (Firmendaten, Kunden, Produkte, Rechnungen, Angebote & Ausgaben) mit einem Klick oder ziehe nahtlos zwischen Rechly Cloud und der lokalen Rechly Desktop-App um."
                                : "Back up your entire business data (company, clients, products, invoices, offers & expenses) in one click or move seamlessly between Rechly Cloud and the local Rechly Desktop app."}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            type="primary"
                            icon={<CloudDownloadOutlined />}
                            loading={downloadingBackup}
                            onClick={handleDownloadFullBackup}
                        >
                            {isDe
                                ? "Komplett-Backup herunterladen (.json)"
                                : "Download Full Backup (.json)"}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Step 1: Source System Selector */}
            <Card
                title={
                    <div className="flex items-center gap-2">
                        <SwapOutlined className="text-indigo-600" />
                        <span>
                            {isDe
                                ? "1. Quelle wählen: Von welchem Programm möchtest du wechseln?"
                                : "1. Select Source: Which tool are you switching from?"}
                        </span>
                    </div>
                }
            >
                <div
                    className={`grid gap-3 ${
                        compact
                            ? "grid-cols-1 sm:grid-cols-2"
                            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                    }`}
                >
                    {MIGRATION_SOURCES.map((source) => {
                        const active = selectedSource === source.id;
                        return (
                            <button
                                key={source.id}
                                type="button"
                                onClick={() => setSelectedSource(source.id)}
                                className={`text-left rounded-xl p-4 border transition-all cursor-pointer ${
                                    active
                                        ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-sm ring-1 ring-indigo-600"
                                        : "border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-white dark:bg-slate-900/60"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                        {source.name}
                                    </span>
                                    <Tag
                                        color={active ? "blue" : "default"}
                                        className="m-0 text-xs"
                                    >
                                        {source.badge}
                                    </Tag>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 m-0 line-clamp-2">
                                    {source.subtitle}
                                </p>
                            </button>
                        );
                    })}
                </div>

                {/* Step-by-step instructions for the selected source */}
                <div className="mt-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
                        <div>
                            <Text strong className="text-sm">
                                {isDe
                                    ? `So exportierst du deine Daten aus ${activeSourceGuide.name}:`
                                    : `How to export your data from ${activeSourceGuide.name}:`}
                            </Text>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <Button
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={() => handleDownloadSampleCsv("clients")}
                            >
                                {isDe ? "Muster Kunden.csv" : "Sample Clients.csv"}
                            </Button>
                            <Button
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={() => handleDownloadSampleCsv("products")}
                            >
                                {isDe ? "Muster Produkte.csv" : "Sample Products.csv"}
                            </Button>
                            <Button
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={() => handleDownloadSampleCsv("invoices")}
                            >
                                {isDe ? "Muster Rechnungen.csv" : "Sample Invoices.csv"}
                            </Button>
                            <Button
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={() => handleDownloadSampleCsv("expenses")}
                            >
                                {isDe ? "Muster Ausgaben.csv" : "Sample Expenses.csv"}
                            </Button>
                        </div>
                    </div>

                    <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-700 dark:text-slate-300 m-0">
                        {(isDe
                            ? activeSourceGuide.stepsDe
                            : activeSourceGuide.stepsEn
                        ).map((step, idx) => (
                            <li key={idx}>{step}</li>
                        ))}
                    </ol>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-3 mb-0 font-medium">
                        💡{" "}
                        {isDe
                            ? activeSourceGuide.tipsDe
                            : activeSourceGuide.tipsEn}
                    </p>
                </div>
            </Card>

            {/* Step 2: Multi-file Drag & Drop Upload Zone */}
            <Card
                title={
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <CloudUploadOutlined className="text-indigo-600" />
                            <span>
                                {isDe
                                    ? "2. Dateien hochladen & Vorschau prüfen"
                                    : "2. Upload Files & Verify Preview"}
                            </span>
                        </div>
                        {(csvFiles.length > 0 ||
                            eInvoices.length > 0 ||
                            backupBundle) && (
                            <Button
                                size="small"
                                icon={<ReloadOutlined />}
                                onClick={handleResetAll}
                            >
                                {isDe ? "Auswahl zurücksetzen" : "Reset files"}
                            </Button>
                        )}
                    </div>
                }
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".csv,.txt,.xml,.pdf,.json"
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files) {
                            void handleFilesSelected(e.target.files);
                        }
                    }}
                />

                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        if (e.dataTransfer.files) {
                            void handleFilesSelected(e.dataTransfer.files);
                        }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                        dragOver
                            ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40"
                            : "border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-900/40"
                    }`}
                >
                    <InboxOutlined className="text-4xl text-indigo-600 mb-2" />
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
                        {parsingFiles
                            ? isDe
                                ? "Dateien werden analysiert..."
                                : "Analyzing files..."
                            : isDe
                              ? "CSV-, XRechnung- (.xml), ZUGFeRD- (.pdf) oder Backup-Dateien (.json) hierher ziehen"
                              : "Drag & drop CSV, XRechnung (.xml), ZUGFeRD (.pdf), or Backup (.json) files here"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                        {isDe
                            ? "Du kannst mehrere Dateien gleichzeitig auswählen (z. B. Kunden.csv + Artikel.csv + Rechnungen.csv oder mehrere E-Rechnungen)."
                            : "You can select multiple files at once (e.g. Clients.csv + Products.csv + Invoices.csv or multiple E-Invoices)."}
                    </p>
                    <Button
                        type="primary"
                        ghost
                        icon={<CloudUploadOutlined />}
                        loading={parsingFiles}
                    >
                        {isDe ? "Dateien auswählen" : "Browse Files"}
                    </Button>
                </div>

                {/* Loaded CSV files & Column Mapping Inspector */}
                {csvFiles.length > 0 && (
                    <div className="mt-6 space-y-4">
                        <Title level={5} className="!mb-2">
                            {isDe
                                ? "Geladene CSV-Dateien & Spalten-Zuordnung"
                                : "Loaded CSV Files & Column Mapping"}
                        </Title>

                        {csvFiles.map((entry) => {
                            const fieldDefs = getFieldDefinitions(
                                entry.entityType,
                            );
                            return (
                                <Card
                                    key={entry.id}
                                    size="small"
                                    className="border-slate-200 dark:border-slate-800"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <FileExcelOutlined className="text-emerald-600 text-lg" />
                                            <Text strong>{entry.fileName}</Text>
                                            <Tag color="geekblue">
                                                {entry.rows.length}{" "}
                                                {isDe ? "Zeilen" : "rows"}
                                            </Tag>
                                            {entry.detectedSource !==
                                                "generic" && (
                                                <Tag color="purple">
                                                    {entry.detectedSource.toUpperCase()}{" "}
                                                    {isDe
                                                        ? "erkannt"
                                                        : "detected"}
                                                </Tag>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Text className="text-xs text-slate-500">
                                                {isDe ? "Datentyp:" : "Type:"}
                                            </Text>
                                            <Select
                                                size="small"
                                                value={entry.entityType}
                                                onChange={(val) =>
                                                    handleChangeCsvEntityType(
                                                        entry.id,
                                                        val,
                                                    )
                                                }
                                                options={[
                                                    {
                                                        value: "clients",
                                                        label: isDe
                                                            ? "Kunden / Kontakte"
                                                            : "Clients / Contacts" },
                                                    {
                                                        value: "products",
                                                        label: isDe
                                                            ? "Produkte / Leistungen"
                                                            : "Products / Services" },
                                                    {
                                                        value: "invoices",
                                                        label: isDe
                                                            ? "Ausgangsrechnungen"
                                                            : "Outgoing Invoices" },
                                                    {
                                                        value: "expenses",
                                                        label: isDe
                                                            ? "Ausgaben / Belege"
                                                            : "Expenses / Bills" },
                                                ]}
                                                style={{ width: 190 }}
                                            />
                                            <Button
                                                size="small"
                                                danger
                                                type="text"
                                                icon={<DeleteOutlined />}
                                                onClick={() =>
                                                    handleRemoveCsvFile(entry.id)
                                                }
                                            />
                                        </div>
                                    </div>

                                    <Collapse
                                        ghost
                                        size="small"
                                        className="mt-2"
                                        items={[
                                            {
                                                key: "mapping",
                                                label: (
                                                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1.5">
                                                        <SettingOutlined />
                                                        {isDe
                                                            ? `Spalten-Zuordnung prüfen / anpassen (${Object.keys(entry.mapping).length} Spalten automatisch erkannt)`
                                                            : `Inspect / customize column mapping (${Object.keys(entry.mapping).length} columns auto-detected)`}
                                                    </span>
                                                ),
                                                children: (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                                                        {fieldDefs.map(
                                                            (field) => (
                                                                <div
                                                                    key={
                                                                        field.key
                                                                    }
                                                                    className="flex flex-col gap-1"
                                                                >
                                                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                                                        {isDe
                                                                            ? field.labelDe
                                                                            : field.labelEn}
                                                                    </label>
                                                                    <Select
                                                                        size="small"
                                                                        allowClear
                                                                        placeholder={
                                                                            isDe
                                                                                ? "— Nicht zugeordnet —"
                                                                                : "— Not mapped —"
                                                                        }
                                                                        value={
                                                                            entry
                                                                                .mapping[
                                                                                field
                                                                                    .key
                                                                            ] ||
                                                                            undefined
                                                                        }
                                                                        onChange={(
                                                                            val,
                                                                        ) =>
                                                                            handleChangeColumnMapping(
                                                                                entry.id,
                                                                                field.key,
                                                                                val ||
                                                                                    "",
                                                                            )
                                                                        }
                                                                        options={entry.headers.map(
                                                                            (
                                                                                h,
                                                                            ) => ({
                                                                                value: h,
                                                                                label: h }),
                                                                        )}
                                                                    />
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                ) },
                                        ]}
                                    />
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Loaded E-Invoice XML / PDF mode switcher */}
                {eInvoices.length > 0 && (
                    <div className="mt-6 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/30 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <FilePdfOutlined className="text-indigo-600 text-lg" />
                                <div>
                                    <Text strong>
                                        {eInvoices.length}{" "}
                                        {isDe
                                            ? "E-Rechnungen (XRechnung / ZUGFeRD) geladen"
                                            : "E-Invoices (XRechnung / ZUGFeRD) loaded"}
                                    </Text>
                                    <p className="text-xs text-slate-500 m-0">
                                        {isDe
                                            ? "Wie sollen diese E-Rechnungen importiert werden?"
                                            : "How should these e-invoices be imported?"}
                                    </p>
                                </div>
                            </div>
                            <Radio.Group
                                value={eInvoiceMode}
                                onChange={(e) => setEInvoiceMode(e.target.value)}
                                optionType="button"
                                buttonStyle="solid"
                            >
                                <Radio.Button value="outgoing">
                                    {isDe
                                        ? "Als eigene Ausgangsrechnungen (+ Kunden)"
                                        : "As Outgoing Invoices (+ Clients)"}
                                </Radio.Button>
                                <Radio.Button value="incoming">
                                    {isDe
                                        ? "Als Eingangsrechnungen (Ausgaben)"
                                        : "As Incoming Bills (Expenses)"}
                                </Radio.Button>
                            </Radio.Group>
                        </div>
                    </div>
                )}

                {/* Loaded Full Backup Bundle Banner */}
                {backupBundle && (
                    <Alert
                        className="mt-6"
                        type="info"
                        showIcon
                        message={
                            isDe
                                ? `Rechly Komplett-Backup vom ${new Date(backupBundle.exportedAt || Date.now()).toLocaleDateString("de-DE")} bereit zur Wiederherstellung`
                                : `Rechly Full Backup ready to restore`
                        }
                        description={
                            isDe
                                ? `Enthält ${backupBundle.clients?.length || 0} Kunden, ${backupBundle.products?.length || 0} Produkte, ${backupBundle.invoices?.length || 0} Rechnungen, ${backupBundle.offers?.length || 0} Angebote und ${backupBundle.expenses?.length || 0} Ausgaben.`
                                : `Contains ${backupBundle.clients?.length || 0} clients, ${backupBundle.products?.length || 0} products, ${backupBundle.invoices?.length || 0} invoices, ${backupBundle.offers?.length || 0} offers, and ${backupBundle.expenses?.length || 0} expenses.`
                        }
                    />
                )}

                {/* Live Tabbed Data Preview */}
                {aggregated.totalItems > 0 && (
                    <div className="mt-6">
                        <Divider className="!my-4" />
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <div>
                                <Title level={5} className="!mb-0">
                                    {isDe
                                        ? "Live-Vorschau der erkannten Daten"
                                        : "Live Preview of Detected Records"}
                                </Title>
                                <Text type="secondary" className="text-xs">
                                    {isDe
                                        ? "Prüfe vor dem Import deine erkannten Kunden, Produkte, Rechnungen und Ausgaben."
                                        : "Review your detected clients, products, invoices, and expenses before importing."}
                                </Text>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                                <Checkbox
                                    checked={skipDuplicates}
                                    onChange={(e) =>
                                        setSkipDuplicates(e.target.checked)
                                    }
                                >
                                    <span className="text-xs font-medium">
                                        {isDe
                                            ? "Duplikate automatisch überspringen (Empfohlen)"
                                            : "Automatically skip duplicates (Recommended)"}
                                    </span>
                                </Checkbox>

                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<RocketOutlined />}
                                    loading={importing}
                                    onClick={handleExecuteImport}
                                >
                                    {isDe
                                        ? `Jetzt ${aggregated.totalItems} Datensätze importieren`
                                        : `Import ${aggregated.totalItems} Records Now`}
                                </Button>
                            </div>
                        </div>

                        <Tabs
                            items={[
                                {
                                    key: "clients",
                                    label: (
                                        <Space size={6}>
                                            <TeamOutlined />
                                            <span>
                                                {isDe ? "Kunden" : "Clients"}
                                            </span>
                                            <Badge
                                                count={
                                                    aggregated.clients.length
                                                }
                                                showZero
                                                color={
                                                    aggregated.clients.length >
                                                    0
                                                        ? "blue"
                                                        : "default"
                                                }
                                            />
                                        </Space>
                                    ),
                                    children:
                                        aggregated.clients.length === 0 ? (
                                            <Empty
                                                description={
                                                    isDe
                                                        ? "Noch keine Kunden geladen"
                                                        : "No clients loaded yet"
                                                }
                                            />
                                        ) : (
                                            <Table
                                                size="small"
                                                rowKey={(r, i) =>
                                                    `${r.name}-${i}`
                                                }
                                                dataSource={aggregated.clients}
                                                pagination={{ pageSize: 6 }}
                                                scroll={{ x: 700 }}
                                                columns={[
                                                    {
                                                        title: isDe
                                                            ? "Name / Firma"
                                                            : "Name / Company",
                                                        dataIndex: "name",
                                                        render: (v) => (
                                                            <Text strong>
                                                                {v}
                                                            </Text>
                                                        ) },
                                                    {
                                                        title: isDe
                                                            ? "Ansprechpartner"
                                                            : "Contact",
                                                        dataIndex:
                                                            "contact_person",
                                                        render: (v) => v || "—" },
                                                    {
                                                        title: isDe
                                                            ? "Adresse"
                                                            : "Address",
                                                        render: (_, r) =>
                                                            `${r.address_line1}, ${r.postal_code} ${r.city}` },
                                                    {
                                                        title: "E-Mail",
                                                        dataIndex: "email",
                                                        render: (v) => v || "—" },
                                                    {
                                                        title: "USt-IdNr. / Leitweg-ID",
                                                        render: (_, r) =>
                                                            r.vat_id ||
                                                            r.leitweg_id ||
                                                            "—" },
                                                ]}
                                            />
                                        ) },
                                {
                                    key: "products",
                                    label: (
                                        <Space size={6}>
                                            <ShoppingOutlined />
                                            <span>
                                                {isDe ? "Produkte" : "Products"}
                                            </span>
                                            <Badge
                                                count={
                                                    aggregated.products.length
                                                }
                                                showZero
                                                color={
                                                    aggregated.products.length >
                                                    0
                                                        ? "blue"
                                                        : "default"
                                                }
                                            />
                                        </Space>
                                    ),
                                    children:
                                        aggregated.products.length === 0 ? (
                                            <Empty
                                                description={
                                                    isDe
                                                        ? "Noch keine Produkte geladen"
                                                        : "No products loaded yet"
                                                }
                                            />
                                        ) : (
                                            <Table
                                                size="small"
                                                rowKey={(r, i) =>
                                                    `${r.name}-${i}`
                                                }
                                                dataSource={aggregated.products}
                                                pagination={{ pageSize: 6 }}
                                                scroll={{ x: 600 }}
                                                columns={[
                                                    {
                                                        title: isDe
                                                            ? "Bezeichnung"
                                                            : "Name",
                                                        dataIndex: "name",
                                                        render: (v) => (
                                                            <Text strong>
                                                                {v}
                                                            </Text>
                                                        ) },
                                                    {
                                                        title: isDe
                                                            ? "Beschreibung"
                                                            : "Description",
                                                        dataIndex:
                                                            "description",
                                                        render: (v) => v || "—" },
                                                    {
                                                        title: isDe
                                                            ? "Nettopreis"
                                                            : "Net Price",
                                                        dataIndex: "price",
                                                        render: (v: number) =>
                                                            `${Number(v).toFixed(2)} €` },
                                                    {
                                                        title: isDe
                                                            ? "MwSt."
                                                            : "VAT",
                                                        dataIndex:
                                                            "tax_rate_percent",
                                                        render: (v: number) =>
                                                            `${v} %` },
                                                    {
                                                        title: isDe
                                                            ? "Einheit"
                                                            : "Unit",
                                                        dataIndex:
                                                            "unit_of_measure" },
                                                ]}
                                            />
                                        ) },
                                {
                                    key: "invoices",
                                    label: (
                                        <Space size={6}>
                                            <FileTextOutlined />
                                            <span>
                                                {isDe
                                                    ? "Rechnungen"
                                                    : "Invoices"}
                                            </span>
                                            <Badge
                                                count={
                                                    aggregated.invoices.length
                                                }
                                                showZero
                                                color={
                                                    aggregated.invoices.length >
                                                    0
                                                        ? "blue"
                                                        : "default"
                                                }
                                            />
                                        </Space>
                                    ),
                                    children:
                                        aggregated.invoices.length === 0 ? (
                                            <Empty
                                                description={
                                                    isDe
                                                        ? "Noch keine Rechnungen geladen"
                                                        : "No invoices loaded yet"
                                                }
                                            />
                                        ) : (
                                            <div className="space-y-2">
                                                <Alert
                                                    type="info"
                                                    showIcon
                                                    message={
                                                        isDe
                                                            ? "Kunden-Automatik aktiv: Falls ein Rechnungsempfänger noch nicht in deiner Kundenliste existiert, legt Rechly ihn beim Import automatisch an."
                                                            : "Auto-Client Creation: If an invoice recipient does not exist in your clients yet, Rechly automatically creates the client record."
                                                    }
                                                />
                                                <Table
                                                    size="small"
                                                    rowKey={(r, i) =>
                                                        `${r.invoice_number}-${i}`
                                                    }
                                                    dataSource={
                                                        aggregated.invoices
                                                    }
                                                    pagination={{ pageSize: 6 }}
                                                    scroll={{ x: 750 }}
                                                    columns={[
                                                        {
                                                            title: isDe
                                                                ? "Rechnungs-Nr."
                                                                : "Invoice No.",
                                                            dataIndex:
                                                                "invoice_number",
                                                            render: (v) => (
                                                                <Text strong>
                                                                    {v}
                                                                </Text>
                                                            ) },
                                                        {
                                                            title: isDe
                                                                ? "Datum"
                                                                : "Date",
                                                            dataIndex:
                                                                "issue_date" },
                                                        {
                                                            title: isDe
                                                                ? "Kunde"
                                                                : "Client",
                                                            dataIndex:
                                                                "client_name" },
                                                        {
                                                            title: isDe
                                                                ? "Netto"
                                                                : "Net",
                                                            dataIndex:
                                                                "subtotal",
                                                            render: (
                                                                v: number,
                                                            ) =>
                                                                `${Number(v).toFixed(2)} €` },
                                                        {
                                                            title: isDe
                                                                ? "MwSt."
                                                                : "VAT",
                                                            dataIndex:
                                                                "total_vat",
                                                            render: (
                                                                v: number,
                                                            ) =>
                                                                `${Number(v).toFixed(2)} €` },
                                                        {
                                                            title: isDe
                                                                ? "Brutto"
                                                                : "Gross",
                                                            dataIndex:
                                                                "total_gross",
                                                            render: (
                                                                v: number,
                                                            ) => (
                                                                <Text strong>
                                                                    {Number(
                                                                        v,
                                                                    ).toFixed(
                                                                        2,
                                                                    )}{" "}
                                                                    €
                                                                </Text>
                                                            ) },
                                                        {
                                                            title: "Status",
                                                            dataIndex: "status",
                                                            render: (
                                                                s: string,
                                                            ) => (
                                                                <Tag
                                                                    color={
                                                                        s ===
                                                                        "paid"
                                                                            ? "green"
                                                                            : s ===
                                                                                "cancelled"
                                                                              ? "red"
                                                                              : "gold"
                                                                    }
                                                                >
                                                                    {s}
                                                                </Tag>
                                                            ) },
                                                    ]}
                                                />
                                            </div>
                                        ) },
                                {
                                    key: "expenses",
                                    label: (
                                        <Space size={6}>
                                            <WalletOutlined />
                                            <span>
                                                {isDe ? "Ausgaben" : "Expenses"}
                                            </span>
                                            <Badge
                                                count={
                                                    aggregated.expenses.length
                                                }
                                                showZero
                                                color={
                                                    aggregated.expenses.length >
                                                    0
                                                        ? "blue"
                                                        : "default"
                                                }
                                            />
                                        </Space>
                                    ),
                                    children:
                                        aggregated.expenses.length === 0 ? (
                                            <Empty
                                                description={
                                                    isDe
                                                        ? "Noch keine Ausgaben geladen"
                                                        : "No expenses loaded yet"
                                                }
                                            />
                                        ) : (
                                            <Table
                                                size="small"
                                                rowKey={(r, i) =>
                                                    `${r.vendor_name}-${r.date}-${i}`
                                                }
                                                dataSource={aggregated.expenses}
                                                pagination={{ pageSize: 6 }}
                                                scroll={{ x: 700 }}
                                                columns={[
                                                    {
                                                        title: isDe
                                                            ? "Datum"
                                                            : "Date",
                                                        dataIndex: "date" },
                                                    {
                                                        title: isDe
                                                            ? "Lieferant"
                                                            : "Vendor",
                                                        dataIndex:
                                                            "vendor_name",
                                                        render: (v) => (
                                                            <Text strong>
                                                                {v}
                                                            </Text>
                                                        ) },
                                                    {
                                                        title: isDe
                                                            ? "Beschreibung"
                                                            : "Description",
                                                        dataIndex:
                                                            "description" },
                                                    {
                                                        title: isDe
                                                            ? "Kategorie"
                                                            : "Category",
                                                        dataIndex: "category",
                                                        render: (c) => (
                                                            <Tag>{c}</Tag>
                                                        ) },
                                                    {
                                                        title: isDe
                                                            ? "Netto"
                                                            : "Net",
                                                        dataIndex: "amount_net",
                                                        render: (v: number) =>
                                                            `${Number(v).toFixed(2)} €` },
                                                    {
                                                        title: isDe
                                                            ? "Brutto"
                                                            : "Gross",
                                                        dataIndex:
                                                            "amount_gross",
                                                        render: (v: number) => (
                                                            <Text strong>
                                                                {Number(
                                                                    v,
                                                                ).toFixed(2)}{" "}
                                                                €
                                                            </Text>
                                                        ) },
                                                ]}
                                            />
                                        ) },
                            ]}
                        />
                    </div>
                )}
            </Card>

            {/* Step 3: Import Result Breakdown */}
            {importResult && (
                <Card className="border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20">
                    <div className="flex items-start gap-3">
                        <CheckCircleOutlined className="text-2xl text-emerald-600 mt-1" />
                        <div className="flex-1">
                            <Title level={4} className="!mb-1">
                                {isDe
                                    ? "Daten-Umzug erfolgreich abgeschlossen!"
                                    : "Data Migration Completed Successfully!"}
                            </Title>
                            <Paragraph className="text-sm text-slate-600 dark:text-slate-300 !mb-4">
                                {isDe
                                    ? "Deine Daten wurden in deinen Rechly-Arbeitsbereich übernommen:"
                                    : "Your records have been imported into your Rechly workspace:"}
                            </Paragraph>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                <div className="rounded-lg bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800">
                                    <div className="text-xs text-slate-500">
                                        {isDe ? "Kunden" : "Clients"}
                                    </div>
                                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                                        +{importResult.clients.inserted + importResult.autoCreatedClients}
                                    </div>
                                    {importResult.clients.skipped > 0 && (
                                        <div className="text-xs text-slate-400">
                                            {importResult.clients.skipped}{" "}
                                            {isDe
                                                ? "übersprungen"
                                                : "skipped"}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-lg bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800">
                                    <div className="text-xs text-slate-500">
                                        {isDe ? "Produkte" : "Products"}
                                    </div>
                                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                                        +{importResult.products.inserted}
                                    </div>
                                    {importResult.products.skipped > 0 && (
                                        <div className="text-xs text-slate-400">
                                            {importResult.products.skipped}{" "}
                                            {isDe
                                                ? "übersprungen"
                                                : "skipped"}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-lg bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800">
                                    <div className="text-xs text-slate-500">
                                        {isDe ? "Rechnungen" : "Invoices"}
                                    </div>
                                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                                        +{importResult.invoices.inserted}
                                    </div>
                                    {importResult.invoices.skipped > 0 && (
                                        <div className="text-xs text-slate-400">
                                            {importResult.invoices.skipped}{" "}
                                            {isDe
                                                ? "übersprungen"
                                                : "skipped"}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-lg bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800">
                                    <div className="text-xs text-slate-500">
                                        {isDe ? "Ausgaben" : "Expenses"}
                                    </div>
                                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                                        +{importResult.expenses.inserted}
                                    </div>
                                    {importResult.expenses.skipped > 0 && (
                                        <div className="text-xs text-slate-400">
                                            {importResult.expenses.skipped}{" "}
                                            {isDe
                                                ? "übersprungen"
                                                : "skipped"}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Space wrap>
                                <Link href="/dashboard/clients">
                                    <Button icon={<TeamOutlined />}>
                                        {isDe
                                            ? "Zu den Kunden"
                                            : "View Clients"}
                                    </Button>
                                </Link>
                                <Link href="/dashboard/products">
                                    <Button icon={<ShoppingOutlined />}>
                                        {isDe
                                            ? "Zu den Produkten"
                                            : "View Products"}
                                    </Button>
                                </Link>
                                <Link href="/dashboard/invoices">
                                    <Button icon={<FileTextOutlined />}>
                                        {isDe
                                            ? "Zu den Rechnungen"
                                            : "View Invoices"}
                                    </Button>
                                </Link>
                                <Link href="/dashboard/expenses">
                                    <Button icon={<WalletOutlined />}>
                                        {isDe
                                            ? "Zu den Ausgaben"
                                            : "View Expenses"}
                                    </Button>
                                </Link>
                            </Space>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
