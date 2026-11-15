"use client";

import { ConfigProvider } from "antd";

export default function PublicTheme({ children }: { children: React.ReactNode }) {
    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#2855d9",
                    colorLink: "#2855d9",
                    colorText: "#152438",
                    colorTextSecondary: "#526174",
                    colorBorder: "#dbe3ee",
                    colorBorderSecondary: "#e3e9f1",
                    borderRadius: 8,
                    fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                },
                components: {
                    Button: { primaryShadow: "0 6px 16px rgba(40, 85, 217, 0.20)" },
                    Card: { borderRadiusLG: 10 },
                    Table: { headerBg: "#f8fafc", rowHoverBg: "#f6f8fc" },
                },
            }}
        >
            {children}
        </ConfigProvider>
    );
}
