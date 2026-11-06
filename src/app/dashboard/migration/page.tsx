"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Typography } from "antd";
import MigrationWizard from "@/components/dashboard/MigrationWizard";
import { useLanguage } from "@/contexts/LanguageContext";
import type { MigrationSourceId } from "@/lib/migration/importer";

const { Title, Text } = Typography;

function MigrationPageContent() {
    const { language } = useLanguage();
    const isDe = language === "de";
    const searchParams = useSearchParams();
    const rawSource = searchParams.get("source") as MigrationSourceId | null;

    const validSources: MigrationSourceId[] = [
        "lexoffice",
        "sevdesk",
        "fastbill",
        "papierkram",
        "datev",
        "einvoice",
        "rechly_backup",
        "generic",
    ];
    const initialSource: MigrationSourceId =
        rawSource && validSources.includes(rawSource) ? rawSource : "lexoffice";

    return (
        <div className="space-y-6">
            <div>
                <Title level={2} className="!mb-1">
                    {isDe
                        ? "Daten-Umzug & Komplett-Import"
                        : "Data Migration & Full Import"}
                </Title>
                <Text type="secondary">
                    {isDe
                        ? "Wechsle in wenigen Minuten von Lexware Office (lexoffice), sevdesk, FastBill, Papierkram oder DATEV zu Rechly – inklusive Kunden, Produkten, Rechnungen, E-Rechnungen und Komplett-Backup."
                        : "Switch from Lexware Office (lexoffice), sevdesk, FastBill, Papierkram, or DATEV to Rechly in minutes — including clients, products, invoices, e-invoices, and full backup."}
                </Text>
            </div>

            <MigrationWizard initialSource={initialSource} />
        </div>
    );
}

export default function MigrationPage() {
    return (
        <Suspense fallback={null}>
            <MigrationPageContent />
        </Suspense>
    );
}
