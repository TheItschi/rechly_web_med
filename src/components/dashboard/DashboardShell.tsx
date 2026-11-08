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
    Alert,
    Select,
    Drawer,
    Tag,
    Tooltip,
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
    PlusOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";
import { AppearanceSelect } from "./DashboardAppearance";
import { isDesktopRuntime } from "@/lib/runtime";
import WorkspaceActivity from "@/components/workspace/WorkspaceActivity";

const { Header, Sider, Content } = Layout;

const pageTitles: Record<string, string> = {
    "/dashboard": "dashboard.home",
    "/dashboard/invoices": "dashboard.invoices",
    "/dashboard/offers": "dashboard.offers",
    "/dashboard/recurring": "dashboard.recurring",
    "/dashboard/clients": "dashboard.clients",
    "/dashboard/products": "dashboard.products",
    "/dashboard/expenses": "dashboard.expenses",
    "/dashboard/bank": "dashboard.bank",
    "/dashboard/reports": "dashboard.reports",
    "/dashboard/settings": "dashboard.settings",
    "/dashboard/migration": "dashboard.migration",
};

export default function DashboardShell({
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
                ...(process.env.NEXT_PUBLIC_RECHLY_WORKSPACE_ENABLED === "1"
                    ? [
                          {
                              key: "workspace-menu",
                              icon: <FileTextOutlined />,
                              label:
                                  language === "de"
                                      ? "Arbeitsbereich"
                                      : "Workspace",
                              children: [
                                  {
                                      key: "/dashboard/workspace/overview",
                                      label:
                                          language === "de"
                                              ? "Business-Übersicht"
                                              : "Business overview",
                                  },
                                  {
                                      key: "/dashboard/workspace",
                                      label:
                                          language === "de"
                                              ? "Projekte, Aufgaben & Dokumente"
                                              : "Projects, tasks & documents",
                                  },
                                  {
                                      key: "/dashboard/workspace/time",
                                      label:
                                          language === "de"
                                              ? "Zeiten & Abrechnung"
                                              : "Time & billing",
                                  },
                                  {
                                      key: "/dashboard/workspace/reports",
                                      label:
                                          language === "de"
                                              ? "Projektcontrolling"
                                              : "Project reports",
                                  },
                                  {
                                      key: "/dashboard/workspace/calendar",
                                      label:
                                          language === "de"
                                              ? "Kalender"
                                              : "Calendar",
                                  },
                              ],
                          },
                      ]
                    : []),
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
    ];

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 900);
            if (window.innerWidth < 900) setCollapsed(true);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        if (!loading && !user) router.push("/login");
    }, [user, loading, router]);

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    const handleMobileNavigation = (key: string) => {
        setMobileMenuOpen(false);
        router.push(key);
    };

    const settingsSelected =
        pathname === "/dashboard/settings" ||
        pathname.startsWith("/dashboard/settings/");

    const userMenuItems = [
        {
            key: "profile",
            label: user?.email || t("settings.guest"),
            disabled: true,
        },
        ...(!isDesktopRuntime
            ? [
                  { type: "divider" as const },
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
            <div className="dashboard-loading">
                <Spin size="large" />
            </div>
        );
    }

    if (!user) return null;

    const brand = (
        <div className="dashboard-brand">
            <span className="dashboard-brand-mark">R</span>
            {!collapsed && <span className="dashboard-brand-name">Rechly</span>}
        </div>
    );

    return (
        <Layout className="dashboard-shell">
            {!isMobile && (
                <Sider
                    trigger={null}
                    collapsible
                    collapsed={collapsed}
                    collapsedWidth={84}
                    width={248}
                    className="dashboard-sider"
                >
                    {brand}
                    <div className="dashboard-create-wrap">
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            block={!collapsed}
                            className="dashboard-create-button"
                            onClick={() =>
                                router.push("/dashboard/invoices/create")
                            }
                        >
                            {collapsed ? null : t("dashboard.newInvoice")}
                        </Button>
                    </div>
                    <Menu
                        theme="dark"
                        mode="inline"
                        selectedKeys={[pathname]}
                        items={menuItems}
                        onClick={({ key }) => router.push(key)}
                        className="dashboard-menu"
                    />
                    <div className="dashboard-sider-footer">
                        <button
                            type="button"
                            onClick={() => router.push("/dashboard/settings")}
                            className={`dashboard-sider-settings${settingsSelected ? " dashboard-sider-settings--active" : ""}`}
                            aria-current={settingsSelected ? "page" : undefined}
                        >
                            <SettingOutlined />
                            {!collapsed && <span>{t("dashboard.settings")}</span>}
                        </button>
                        <a
                            href="mailto:admin@rechly.de"
                            className="dashboard-sider-feedback"
                        >
                            {collapsed ? "✉" : t("dashboard.feedbackCta")}
                        </a>
                    </div>
                </Sider>
            )}

            <Drawer
                title={
                    <div className="dashboard-brand dashboard-brand--drawer">
                        <span className="dashboard-brand-mark">R</span>
                        <span className="dashboard-brand-name">Rechly</span>
                    </div>
                }
                placement="left"
                onClose={() => setMobileMenuOpen(false)}
                open={mobileMenuOpen}
                size={290}
                className="dashboard-mobile-drawer"
                styles={{ body: { padding: 0 } }}
            >
                <div className="dashboard-create-wrap">
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        block
                        onClick={() =>
                            handleMobileNavigation("/dashboard/invoices/create")
                        }
                    >
                        {t("dashboard.newInvoice")}
                    </Button>
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={[pathname]}
                    items={menuItems}
                    onClick={({ key }) => handleMobileNavigation(key)}
                    className="dashboard-mobile-menu"
                />
                <div className="dashboard-drawer-footer">
                    <Button
                        block
                        icon={<SettingOutlined />}
                        type={settingsSelected ? "primary" : "default"}
                        onClick={() => handleMobileNavigation("/dashboard/settings")}
                    >
                        {t("dashboard.settings")}
                    </Button>
                    <div className="dashboard-language-mobile">
                        <GlobalOutlined />
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
                    <a href="mailto:admin@rechly.de">
                        {t("dashboard.feedbackCta")}
                    </a>
                </div>
            </Drawer>

            <Layout
                className="dashboard-main"
                style={{
                    marginLeft: isMobile ? 0 : collapsed ? 84 : 248,
                }}
            >
                <Header className="dashboard-header">
                    <div className="dashboard-header-left">
                        <Tooltip
                            title={
                                isMobile || collapsed
                                    ? language === "de"
                                        ? "Navigation öffnen"
                                        : "Open navigation"
                                    : language === "de"
                                      ? "Navigation einklappen"
                                      : "Collapse navigation"
                            }
                        >
                            <Button
                                type="text"
                                className="dashboard-icon-button"
                                icon={
                                    isMobile || collapsed ? (
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
                            />
                        </Tooltip>
                        <div className="dashboard-page-title">
                            {isMobile
                                ? "Rechly"
                                : pageTitles[pathname]
                                  ? t(pageTitles[pathname])
                                  : t("dashboard.home")}
                        </div>
                        {isDesktopRuntime && (
                            <Tag color="green" className="dashboard-offline-tag">
                                Offline · Local
                            </Tag>
                        )}
                    </div>

                    <div className="dashboard-header-actions">
                        <AppearanceSelect />
                        {!isMobile && (
                            <Select
                                value={language}
                                onChange={setLanguage}
                                variant="borderless"
                                className="dashboard-language-select"
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
                            trigger={["click"]}
                        >
                            <button className="dashboard-user-button" type="button">
                                <Avatar
                                    className="dashboard-avatar"
                                    icon={<UserOutlined />}
                                />
                                {!isMobile && (
                                    <span className="dashboard-user-email">
                                        {user?.email || t("settings.guest")}
                                    </span>
                                )}
                            </button>
                        </Dropdown>
                    </div>
                </Header>

                <Content className="dashboard-content">
                    {isAnonymous && (
                        <Alert
                            message={t("dashboard.guestModeActive")}
                            description={
                                <span>
                                    {t("dashboard.guestModeDesc")}
                                    <Link href="/register" style={{ fontWeight: 600 }}>
                                        {t("dashboard.guestModeRegister")}
                                    </Link>
                                    {t("dashboard.guestModeSuffix")}
                                </span>
                            }
                            type="warning"
                            showIcon
                            icon={<WarningOutlined />}
                            className="dashboard-guest-alert"
                        />
                    )}
                    <div className="dashboard-content-inner">
                        <WorkspaceActivity />
                        {children}
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
}
