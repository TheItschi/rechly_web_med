"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, Input } from "antd";
import type { InputRef } from "antd";
import {
    DashboardOutlined,
    FileTextOutlined,
    UserOutlined,
    ShoppingOutlined,
    SettingOutlined,
    TagsOutlined,
    RedoOutlined,
    WalletOutlined,
    BankOutlined,
    SwapOutlined,
    PlusOutlined,
    CalendarOutlined,
    ProjectOutlined,
    ClockCircleOutlined,
    ScheduleOutlined,
    CalculatorOutlined,
    SearchOutlined,
    QuestionCircleOutlined,
} from "@ant-design/icons";
import { useLanguage } from "@/contexts/LanguageContext";

interface Command {
    key: string;
    label: string;
    hint?: string;
    icon: React.ReactNode;
    path: string;
}

export default function CommandPalette({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const router = useRouter();
    const { language } = useLanguage();
    const l = (de: string, en: string) => (language === "de" ? de : en);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const inputRef = useRef<InputRef>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const commands: Command[] = [
            { key: "help", label: l("Hilfe & Anleitungen", "Help (German)"), icon: <QuestionCircleOutlined />, path: "/hilfe" },
            { key: "new-invoice", label: l("Neue Rechnung erstellen", "Create new invoice"), hint: l("Aktion", "Action"), icon: <PlusOutlined />, path: "/dashboard/invoices/create" },
            { key: "new-offer", label: l("Neues Angebot erstellen", "Create new quote"), hint: l("Aktion", "Action"), icon: <PlusOutlined />, path: "/dashboard/offers/create" },
            { key: "home", label: l("Übersicht", "Overview"), icon: <DashboardOutlined />, path: "/dashboard" },
            { key: "invoices", label: l("Rechnungen", "Invoices"), icon: <FileTextOutlined />, path: "/dashboard/invoices" },
            { key: "offers", label: l("Angebote", "Quotes"), icon: <TagsOutlined />, path: "/dashboard/offers" },
            { key: "recurring", label: l("Wiederkehrende Rechnungen", "Recurring invoices"), icon: <RedoOutlined />, path: "/dashboard/recurring" },
            { key: "clients", label: l("Kunden", "Clients"), icon: <UserOutlined />, path: "/dashboard/clients" },
            { key: "products", label: l("Produkte & Leistungen", "Products & services"), icon: <ShoppingOutlined />, path: "/dashboard/products" },
            { key: "expenses", label: l("Ausgaben", "Expenses"), icon: <WalletOutlined />, path: "/dashboard/expenses" },
            { key: "bank", label: l("Bank & Abgleich", "Bank & reconciliation"), icon: <BankOutlined />, path: "/dashboard/bank" },
            { key: "reports", label: l("Berichte & Controlling", "Reports & controlling"), icon: <CalculatorOutlined />, path: "/dashboard/reports" },
            { key: "calendar", label: l("Kalender & Termine", "Calendar & appointments"), icon: <CalendarOutlined />, path: "/dashboard/calendar" },
            { key: "bookings", label: l("Buchungen & Zeiten", "Bookings & hours"), icon: <ScheduleOutlined />, path: "/dashboard/termine/buchungen" },
            { key: "workspace", label: l("Projekte & Aufgaben", "Projects & tasks"), icon: <ProjectOutlined />, path: "/dashboard/workspace" },
            { key: "time", label: l("Zeiterfassung", "Time tracking"), icon: <ClockCircleOutlined />, path: "/dashboard/workspace/time" },
            { key: "migration", label: l("Daten-Umzug & Import", "Migration & import"), icon: <SwapOutlined />, path: "/dashboard/migration" },
            { key: "settings", label: l("Einstellungen", "Settings"), icon: <SettingOutlined />, path: "/dashboard/settings" },
        ];

    const q = query.trim().toLowerCase();
    const filtered = q ? commands.filter((c) => c.label.toLowerCase().includes(q)) : commands;

    useEffect(() => {
        if (open) requestAnimationFrame(() => inputRef.current?.focus());
    }, [open ]);

    const run = (command?: Command) => {
        if (!command) return;
        onClose();
        router.push(command.path);
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((a) => Math.min(a + 1, filtered.length - 1));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
        } else if (event.key === "Enter") {
            event.preventDefault();
            run(filtered[active]);
        }
    };

    useEffect(() => {
        listRef.current
            ?.querySelector(`[data-index="${active}"]`)
            ?.scrollIntoView({ block: "nearest" });
    }, [active]);

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            closable={false}
            width={560}
            style={{ top: 90 }}
            styles={{ body: { padding: 0 } }}
            destroyOnHidden
        >
            <div onKeyDown={onKeyDown}>
                <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                    prefix={<SearchOutlined style={{ color: "#8494ab" }} />}
                    placeholder={l("Seite oder Aktion suchen …", "Search a page or action …")}
                    size="large"
                    variant="borderless"
                    style={{ padding: "14px 16px", fontSize: 16, borderBottom: "1px solid #e5eaf1", borderRadius: 0 }}
                    aria-label={l("Befehl suchen", "Search command")}
                />
                <div ref={listRef} role="listbox" style={{ maxHeight: 380, overflowY: "auto", padding: 8 }}>
                    {filtered.length === 0 && (
                        <p style={{ padding: "18px 12px", color: "#64748b", fontSize: 14, margin: 0 }}>
                            {l("Nichts gefunden.", "Nothing found.")}
                        </p>
                    )}
                    {filtered.map((command, index) => (
                        <button
                            key={command.key}
                            type="button"
                            role="option"
                            aria-selected={index === active}
                            data-index={index}
                            onMouseEnter={() => setActive(index)}
                            onClick={() => run(command)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                width: "100%",
                                textAlign: "left",
                                padding: "10px 12px",
                                border: "none",
                                borderRadius: 8,
                                background: index === active ? "#eef3fd" : "transparent",
                                color: "#162033",
                                fontSize: 14.5,
                                fontWeight: index === active ? 600 : 500,
                                cursor: "pointer",
                            }}
                        >
                            <span style={{ color: "#365fd6", display: "inline-flex" }}>{command.icon}</span>
                            <span style={{ flex: 1 }}>{command.label}</span>
                            {command.hint && (
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#365fd6", background: "#dbe7fd", padding: "2px 7px", borderRadius: 999 }}>
                                    {command.hint}
                                </span>
                            )}
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>{command.path.replace("/dashboard", "") || "/"}</span>
                        </button>
                    ))}
                </div>
                <div
                    style={{
                        display: "flex",
                        gap: 16,
                        padding: "9px 16px",
                        borderTop: "1px solid #e5eaf1",
                        fontSize: 12,
                        color: "#8494ab",
                    }}
                >
                    <span>↑↓ {l("Navigieren", "Navigate")}</span>
                    <span>↵ {l("Öffnen", "Open")}</span>
                    <span>Esc {l("Schließen", "Close")}</span>
                </div>
            </div>
        </Modal>
    );
}
