"use client";

import { Button, Typography } from "antd";
import {
    HomeOutlined,
    SearchOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const { Title, Text } = Typography;

export default function NotFound() {
    const router = useRouter();
    const { language } = useLanguage();
    const isDe = language === "de";

    return (
        <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
            <Navbar showAuth={false} />
            <main
                style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "48px 24px",
                }}
            >
                <div style={{ maxWidth: 520, textAlign: "center" }}>
                    <div
                        style={{
                            display: "inline-grid",
                            placeItems: "center",
                            width: 88,
                            height: 88,
                            borderRadius: 22,
                            background: "linear-gradient(145deg, #eaf0ff, #f6f9ff)",
                            color: "#365fd6",
                            fontSize: 34,
                            fontWeight: 800,
                            marginBottom: 28,
                            letterSpacing: "-0.04em",
                        }}
                    >
                        404
                    </div>
                    <Title level={2} style={{ marginBottom: 8 }}>
                        {isDe ? "Seite nicht gefunden" : "Page not found"}
                    </Title>
                    <Text
                        type="secondary"
                        style={{ display: "block", fontSize: 15, marginBottom: 32 }}
                    >
                        {isDe
                            ? "Diese Seite existiert nicht oder wurde verschoben. Vielleicht finden Sie über die Suche oder die Startseite, was Sie suchen."
                            : "This page does not exist or has moved. Try the search or the homepage to find what you need."}
                    </Text>
                    <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                        <Button
                            type="primary"
                            size="large"
                            icon={<HomeOutlined />}
                            onClick={() => router.push("/")}
                        >
                            {isDe ? "Zur Startseite" : "Go to homepage"}
                        </Button>
                        <Button
                            size="large"
                            icon={<SearchOutlined />}
                            onClick={() => router.push("/tools")}
                        >
                            {isDe ? "Rechner & Tools" : "Calculators & tools"}
                        </Button>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
