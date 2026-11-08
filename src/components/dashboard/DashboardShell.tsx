"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    Layout,
    Menu,
    Button,
    Dropdown,
    Avatar,
    Spin,
    theme,
    Alert,
    Select,
    Drawer,
    Tag,
} from "antd";
import {
    CalculatorOutlined,
    DashboardOutlined,
    FileTextOutlined,
    UserOutlined,
    ShoppingOutlined,
    SettingOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    LogoutOutlined,
    WarningOutlined,
    GlobalOutlined,
    TagsOutlined,
    RedoOutlined,
    WalletOutlined,
    BankOutlined,
    SwapOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";
import { AppearanceSelect } from "./DashboardAppearance";
import { isDesktopRuntime } from "@/lib/runtime";
import WorkspaceActivity from "@/components/workspace/WorkspaceActivity";

const { Header, Sider, Content } = Layout;

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, loading, logout, isAnonymous } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const [collapsed, setCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    // Menu items with translations - grouped
    const menuItems = [
        {
            key: "/dashboard",
            icon: <DashboardOutlined />,
            label: t("dashboard.home"),
        },
        {
            key: "group-documents",
            type: "group" as const,
            label: t("dashboard.navDocuments"),
            children: [
                {
                    key: "/dashboard/offers",
                    icon: <TagsOutlined />,
                    label: t("dashboard.offers"),
                },
                {
                    key: "/dashboard/invoices",
                    icon: <FileTextOutlined />,
                    label: t("dashboard.invoices"),
                },
                {
                    key: "/dashboard/recurring",
                    icon: <RedoOutlined />,
                    label: t("dashboard.recurring"),
                },
            ],
        },
        {
            key: "group-accounting",
            type: "group" as const,
            label: t("dashboard.navAccounting"),
            children: [
                {
                    key: "/dashboard/expenses",
                    icon: <WalletOutlined />,
                    label: t("dashboard.expenses"),
                },
                {
                    key: "/dashboard/bank",
                    icon: <BankOutlined />,
                    label: t("dashboard.bank"),
                },
                {
                    key: "/dashboard/reports",
                    icon: <CalculatorOutlined />,
                    label: t("dashboard.reports"),
                },
            ],
        },
        {
            key: "group-management",
            type: "group" as const,
            label: "",
            children: [
                {
                    key: "/dashboard/clients",
                    icon: <UserOutlined />,
                    label: t("dashboard.clients"),
                },
                ...(process.env.NEXT_PUBLIC_RECHLY_WORKSPACE_ENABLED === "1" ? [{
                    key: "workspace-menu",
                    icon: <FileTextOutlined />,
                    label: language === "de" ? "Arbeitsbereich" : "Workspace",
                    children: [
                        { key: "/dashboard/workspace/overview", label: language === "de" ? "Business-Übersicht" : "Business overview" },
                        { key: "/dashboard/workspace", label: language === "de" ? "Projekte, Aufgaben & Dokumente" : "Projects, tasks & documents" },
                        { key: "/dashboard/workspace/time", label: language === "de" ? "Zeiten & Abrechnung" : "Time & billing" },
                        { key: "/dashboard/workspace/reports", label: language === "de" ? "Projektcontrolling" : "Project reports" },
                        { key: "/dashboard/workspace/calendar", label: language === "de" ? "Kalender" : "Calendar" },
                    ],
                }] : []),
                {
                    key: "/dashboard/products",
                    icon: <ShoppingOutlined />,
                    label: t("dashboard.products"),
                },
                {
                    key: "/dashboard/migration",
                    icon: <SwapOutlined />,
                    label: t("dashboard.migration"),
                },
            ],
        },
        {
            key: "/dashboard/settings",
            icon: <SettingOutlined />,
            label: t("dashboard.settings"),
        },
    ];

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth < 768) {
                setCollapsed(true);
            }
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    const handleMobileNavigation = (key: string) => {
        setMobileMenuOpen(false);
        router.push(key);
    };

    const userMenuItems = [
        {
            key: "profile",
            label: user?.email || t("settings.guest"),
            disabled: true,
        },
        ...(!isDesktopRuntime
            ? [
                  {
                      type: "divider" as const,
                  },
                  {
                      key: "logout",
                      icon: <LogoutOutlined />,
                      label: t("auth.logout"),
                      onClick: handleLogout,
                  },
              ]
            : []),
    ];

    if (loading) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                }}
            >
                <Spin size="large" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <Layout style={{ minHeight: "100vh" }}>
            {/* Desktop Sider - hidden on mobile */}
            {!isMobile && (
                <Sider
                    trigger={null}
                    collapsible
                    collapsed={collapsed}
                    breakpoint="lg"
                    collapsedWidth={80}
                    style={{
                        overflow: "auto",
                        height: "100vh",
                        position: "fixed",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        zIndex: 100,
                    }}
                >
                    <div
                        style={{
                            height: 64,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderBottom: "1px solid rgba(255,255,255,0.1)",
                        }}
                    >
                        <span
                            style={{
                                color: "#fff",
                                fontSize: collapsed ? 18 : 24,
                                fontWeight: "bold",
                            }}
                        >
                            {collapsed ? "R" : "Rechly"}
                        </span>
                    </div>
                    <Menu
                        theme="dark"
                        mode="inline"
                        selectedKeys={[pathname]}
                        items={menuItems}
                        onClick={({ key }) => router.push(key)}
                    />
                    <div
                        style={{
                            position: "absolute",
                            bottom: 16,
                            left: 0,
                            right: 0,
                            padding: collapsed ? "0 8px" : "0 16px",
                            textAlign: "center",
                        }}
                    >
                        <a
                            href="mailto:admin@rechly.de"
                            style={{
                                color: "rgba(255,255,255,0.45)",
                                fontSize: 12,
                                textDecoration: "none",
                                lineHeight: 1.4,
                                display: "block",
                            }}
                        >
                            {collapsed
                                ? "✉"
                                : t("dashboard.feedbackCta")}
                        </a>
                    </div>
                </Sider>
            )}

            {/* Mobile Drawer Menu */}
            <Drawer
                title={
                    <span style={{ fontWeight: "bold", fontSize: 20 }}>
                        Rechly
                    </span>
                }
                placement="left"
                onClose={() => setMobileMenuOpen(false)}
                open={mobileMenuOpen}
                size={280}
                styles={{
                    body: { padding: 0 },
                }}
            >
                <Menu
                    mode="inline"
                    selectedKeys={[pathname]}
                    items={menuItems}
                    onClick={({ key }) => handleMobileNavigation(key)}
                    style={{ border: "none" }}
                />
                <div
                    style={{
                        padding: "16px 24px",
                        borderTop: "1px solid #f0f0f0",
                        marginTop: 16,
                    }}
                >
                    <div
                        style={{
                            marginBottom: 16,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <GlobalOutlined style={{ color: "#666" }} />
                        <Select
                            value={language}
                            onChange={setLanguage}
                            style={{ flex: 1 }}
                            options={[
                                { value: "de", label: "🇩🇪 Deutsch" },
                                { value: "en", label: "🇬🇧 English" },
                            ]}
                        />
                    </div>
                    {!isDesktopRuntime && (
                        <Button
                            block
                            icon={<LogoutOutlined />}
                            onClick={handleLogout}
                        >
                            {t("auth.logout")}
                        </Button>
                    )}
                    <div style={{ marginTop: 16, textAlign: "center" }}>
                        <a
                            href="mailto:admin@rechly.de"
                            style={{
                                color: "#64748b",
                                fontSize: 13,
                                textDecoration: "none",
                            }}
                        >
                            {t("dashboard.feedbackCta")}
                        </a>
                    </div>
                </div>
            </Drawer>

            <Layout
                style={{
                    marginLeft: isMobile ? 0 : collapsed ? 80 : 200,
                    transition: "margin-left 0.2s",
                }}
            >
                <Header
                    style={{
                        padding: isMobile ? "0 12px" : "0 24px",
                        background: colorBgContainer,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        position: "sticky",
                        top: 0,
                        zIndex: 99,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                        gap: 8,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <Button
                            type="text"
                            icon={
                                isMobile ? (
                                    <MenuUnfoldOutlined />
                                ) : collapsed ? (
                                    <MenuUnfoldOutlined />
                                ) : (
                                    <MenuFoldOutlined />
                                )
                            }
                            onClick={() =>
                                isMobile
                                    ? setMobileMenuOpen(true)
                                    : setCollapsed(!collapsed)
                            }
                            style={{ fontSize: 16 }}
                        />
                        {isMobile && (
                            <span
                                style={{
                                    fontWeight: 600,
                                    fontSize: 16,
                                    color: "inherit",
                                }}
                            >
                                Rechly
                            </span>
                        )}
                        {isDesktopRuntime && (
                            <Tag color="green" style={{ marginInlineStart: 4 }}>
                                Offline · Local
                            </Tag>
                        )}
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        {/* Language selector - desktop only in header */}
                        <AppearanceSelect />
                        {!isMobile && (
                            <Select
                                value={language}
                                onChange={setLanguage}
                                variant="borderless"
                                style={{ width: 80 }}
                                suffixIcon={<GlobalOutlined />}
                                options={[
                                    { value: "de", label: "DE" },
                                    { value: "en", label: "EN" },
                                ]}
                            />
                        )}
                        <Dropdown
                            menu={{ items: userMenuItems }}
                            placement="bottomRight"
                        >
                            <Avatar
                                style={{
                                    backgroundColor: "#1976d2",
                                    cursor: "pointer",
                                }}
                                icon={<UserOutlined />}
                            />
                        </Dropdown>
                    </div>
                </Header>
                {isAnonymous && (
                    <Alert
                        message={t("dashboard.guestModeActive")}
                        description={
                            <span>
                                {t("dashboard.guestModeDesc")}
                                <Link
                                    href="/register"
                                    style={{ fontWeight: 500 }}
                                >
                                    {t("dashboard.guestModeRegister")}
                                </Link>
                                {t("dashboard.guestModeSuffix")}
                            </span>
                        }
                        type="warning"
                        showIcon
                        icon={<WarningOutlined />}
                        style={{
                            margin: isMobile ? "12px 12px 0" : "16px 24px 0",
                            borderRadius: 8,
                        }}
                    />
                )}
                <Content
                    style={{
                        margin: isMobile ? 12 : 24,
                        padding: isMobile ? 16 : 24,
                        background: colorBgContainer,
                        borderRadius: borderRadiusLG,
                        minHeight: isAnonymous
                            ? "calc(100vh - 180px)"
                            : "calc(100vh - 112px)",
                    }}
                >
                    <WorkspaceActivity />
                    {children}
                </Content>
            </Layout>
        </Layout>
    );
}
