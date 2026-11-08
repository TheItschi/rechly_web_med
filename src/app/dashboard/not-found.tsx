"use client";

import { Button, Typography } from "antd";
import { HomeOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

const { Title, Text } = Typography;

export default function DashboardNotFound() {
    const router = useRouter();
    const { language } = useLanguage();
    const isDe = language === "de";

    return (
        <div className="dashboard-page">
            <section className="dashboard-welcome">
                <div>
                    <div className="dashboard-eyebrow">404</div>
                    <h1>
                        {isDe ? "Seite nicht gefunden" : "Page not found"}
                    </h1>
                    <p>
                        {isDe
                            ? "Dieser Bereich des Dashboards existiert nicht oder wurde verschoben."
                            : "This dashboard page does not exist or has moved."}
                    </p>
                </div>
            </section>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Button
                    type="primary"
                    size="large"
                    icon={<HomeOutlined />}
                    onClick={() => router.push("/dashboard")}
                >
                    {isDe ? "Zum Dashboard" : "Back to dashboard"}
                </Button>
                <Button
                    size="large"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => router.back()}
                >
                    {isDe ? "Zurück" : "Go back"}
                </Button>
            </div>
        </div>
    );
}
