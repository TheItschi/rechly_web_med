"use client";

import { Typography, Card } from "antd";
import Link from "next/link";
import {
    FileTextOutlined,
    TeamOutlined,
    CloudOutlined,
    DesktopOutlined,
    SafetyOutlined,
    CalculatorOutlined,
    DownloadOutlined,
    GlobalOutlined,
    CalendarOutlined,
    ProjectOutlined,
    ImportOutlined,
    RobotOutlined,
} from "@ant-design/icons";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const { Title, Text, Paragraph } = Typography;

export default function FeaturesPage() {
    const { language } = useLanguage();

    const features =
        language === "de"
            ? [
                  { icon: <CalendarOutlined style={{ fontSize: 28, color: "#2855d9" }} />, title: "Online-Terminbuchung", desc: "Eigene Buchungsseite mit freien Zeiten, Arbeitszeiten und Puffern. Automatisch oder manuell bestätigen; Kunden können innerhalb deiner Fristen selbst umbuchen und stornieren." },
                  { icon: <ProjectOutlined style={{ fontSize: 28, color: "#2855d9" }} />, title: "Projekte & Zeiterfassung", desc: "Aufgaben, Projekte und Arbeitszeiten organisieren und erfasste Leistungen zur Abrechnung vorbereiten." },
                  { icon: <ImportOutlined style={{ fontSize: 28, color: "#2855d9" }} />, title: "Daten aus anderer Software übernehmen", desc: "Kunden, Produkte und Belege aus unterstützten CSV- und Rechnungsdateien importieren. Erkannte Daten vor dem Speichern prüfen." },
                  { icon: <RobotOutlined style={{ fontSize: 28, color: "#2855d9" }} />, title: "Optionale KI-Rechnungshilfe", desc: "Rechnungsdaten aus Text vorbereiten: mit eigenem KI-Anbieter oder lokal über Ollama. Du entscheidest, ob du KI nutzt." },
                  {
                      icon: (
                          <FileTextOutlined
                              style={{ fontSize: 28, color: "#1890ff" }}
                          />
                      ),
                      title: "Professionelle Rechnungen",
                      desc: "Erstelle Rechnungen mit Kunden- und Leistungsdaten, Beträgen und Steuern. Exportiere als PDF, XRechnung oder ZUGFeRD.",
                  },
                  {
                      icon: (
                          <DownloadOutlined
                              style={{ fontSize: 28, color: "#52c41a" }}
                          />
                      ),
                      title: "PDF-Export",
                      desc: "Exportiere Rechnungen als hochwertige PDF-Dateien. Perfekt zum Versenden per E-Mail.",
                  },
                  {
                      icon: (
                          <TeamOutlined
                              style={{ fontSize: 28, color: "#722ed1" }}
                          />
                      ),
                      title: "Kundenverwaltung",
                      desc: "Speichere Kundendaten einmalig und verwende sie bei jeder Rechnung wieder.",
                  },
                  {
                      icon: (
                          <CalculatorOutlined
                              style={{ fontSize: 28, color: "#fa8c16" }}
                          />
                      ),
                      title: "Automatische Berechnung",
                      desc: "Netto, Brutto, MwSt. – alles wird automatisch berechnet. Verschiedene Steuersätze möglich.",
                  },
                  {
                      icon: (
                          <CloudOutlined
                              style={{ fontSize: 28, color: "#13c2c2" }}
                          />
                      ),
                      title: "Cloud-Synchronisation",
                      desc: "Deine Daten werden sicher in der Cloud gespeichert. Zugriff von überall.",
                  },
                  {
                      icon: (
                          <DesktopOutlined
                              style={{ fontSize: 28, color: "#1677ff" }}
                          />
                      ),
                      title: "Desktop-App (100 % offline)",
                      desc: "Alle Daten bleiben lokal auf deinem Rechner. Keine Cloud, kein Login für Windows und Mac.",
                  },
                  {
                      icon: (
                          <SafetyOutlined
                              style={{ fontSize: 28, color: "#f5222d" }}
                          />
                      ),
                      title: "Datenschutzfreundlich",
                      desc: "Transparenter Open-Source-Code und europäische Infrastruktur. Alternativ kannst du Rechly selbst hosten.",
                  },
                  {
                      icon: (
                          <GlobalOutlined
                              style={{ fontSize: 28, color: "#1890ff" }}
                          />
                      ),
                      title: "Mehrsprachig",
                      desc: "App und Rechnungen auf Deutsch und Englisch verfügbar.",
                  },
              ]
            : [
                  { icon: <CalendarOutlined style={{ fontSize: 28, color: "#2855d9" }} />, title: "Online appointment booking", desc: "Your own booking page with available times, working hours and buffers. Use automatic or manual approval; clients can reschedule and cancel within your notice periods." },
                  { icon: <ProjectOutlined style={{ fontSize: 28, color: "#2855d9" }} />, title: "Projects & time tracking", desc: "Organise tasks, projects and working hours, then prepare recorded work for invoicing." },
                  { icon: <ImportOutlined style={{ fontSize: 28, color: "#2855d9" }} />, title: "Import your existing data", desc: "Import clients, products and documents from supported CSV and invoice files. Review detected data before saving." },
                  { icon: <RobotOutlined style={{ fontSize: 28, color: "#2855d9" }} />, title: "Optional AI invoice assistance", desc: "Prepare invoice details from text with your own AI provider or locally through Ollama. Using AI is your choice." },
                  {
                      icon: (
                          <FileTextOutlined
                              style={{ fontSize: 28, color: "#1890ff" }}
                          />
                      ),
                      title: "Professional Invoices",
                      desc: "Create invoices with client and service details, amounts and taxes. Export PDF, XRechnung or ZUGFeRD files.",
                  },
                  {
                      icon: (
                          <DownloadOutlined
                              style={{ fontSize: 28, color: "#52c41a" }}
                          />
                      ),
                      title: "PDF Export",
                      desc: "Export invoices as high-quality PDF files. Perfect for sending via email.",
                  },
                  {
                      icon: (
                          <TeamOutlined
                              style={{ fontSize: 28, color: "#722ed1" }}
                          />
                      ),
                      title: "Client Management",
                      desc: "Save client data once and reuse it for every invoice.",
                  },
                  {
                      icon: (
                          <CalculatorOutlined
                              style={{ fontSize: 28, color: "#fa8c16" }}
                          />
                      ),
                      title: "Automatic Calculations",
                      desc: "Net, gross, VAT – everything calculated automatically. Multiple tax rates supported.",
                  },
                  {
                      icon: (
                          <CloudOutlined
                              style={{ fontSize: 28, color: "#13c2c2" }}
                          />
                      ),
                      title: "Cloud Sync",
                      desc: "Your data is securely stored in the cloud. Access from anywhere.",
                  },
                  {
                      icon: (
                          <DesktopOutlined
                              style={{ fontSize: 28, color: "#1677ff" }}
                          />
                      ),
                      title: "Desktop App (100% offline)",
                      desc: "All data stays locally on your computer. No cloud, no login for Windows and Mac.",
                  },
                  {
                      icon: (
                          <SafetyOutlined
                              style={{ fontSize: 28, color: "#f5222d" }}
                          />
                      ),
                      title: "Privacy-friendly",
                      desc: "Transparent open-source code and European infrastructure. You can also self-host Rechly.",
                  },
                  {
                      icon: (
                          <GlobalOutlined
                              style={{ fontSize: 28, color: "#1890ff" }}
                          />
                      ),
                      title: "Multilingual",
                      desc: "App and invoices available in German and English.",
                  },
              ];

    return (
        <div style={{ minHeight: "100vh", background: "#fff" }}>
            <Navbar />

            <main>
                {/* Hero */}
            <section
                style={{
                    paddingTop: 120,
                    paddingBottom: 60,
                    paddingLeft: 24,
                    paddingRight: 24,
                    textAlign: "center",
                    maxWidth: 600,
                    margin: "0 auto",
                }}
            >
                <Title
                    style={{
                        fontSize: 40,
                        fontWeight: 700,
                        margin: "0 0 16px",
                        color: "#111",
                    }}
                >
                    {language === "de" ? "Funktionen" : "Features"}
                </Title>
                <Paragraph style={{ fontSize: 18, color: "#64748b" }}>
                    {language === "de"
                        ? "Alles was du brauchst, um professionelle Rechnungen zu erstellen."
                        : "Everything you need to create professional invoices."}
                </Paragraph>
            </section>

            {/* Features Grid */}
            <section
                style={{
                    padding: "0 24px 80px",
                    maxWidth: 900,
                    margin: "0 auto",
                }}
            >
                <Title
                    level={2}
                    style={{
                        textAlign: "center",
                        fontSize: 28,
                        marginBottom: 28,
                    }}
                >
                    {language === "de"
                        ? "Alle Funktionen im Überblick"
                        : "All features at a glance"}
                </Title>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(240px, 1fr))",
                        gap: 20,
                    }}
                >
                    {features.map((feature, i) => (
                        <Card
                            key={i}
                            style={{
                                borderRadius: 12,
                                border: "1px solid #f0f0f0",
                            }}
                            styles={{ body: { padding: 24 } }}
                        >
                            <div style={{ marginBottom: 16 }}>
                                {feature.icon}
                            </div>
                            <Title
                                level={3}
                                style={{ marginBottom: 8, fontWeight: 600 }}
                            >
                                {feature.title}
                            </Title>
                            <Text
                                style={{
                                    color: "#64748b",
                                    fontSize: 14,
                                    lineHeight: 1.6,
                                }}
                            >
                                {feature.desc}
                            </Text>
                        </Card>
                    ))}
                </div>

                <div style={{ textAlign: "center", marginTop: 40 }}>
                    <Link
                        href="/#download"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "12px 28px",
                            backgroundColor: "#1677ff",
                            color: "#fff",
                            borderRadius: 8,
                            fontWeight: 500,
                            textDecoration: "none",
                            fontSize: 15,
                        }}
                    >
                        <DesktopOutlined />
                        <span>
                            {language === "de"
                                ? "Desktop-App herunterladen (Windows & Mac)"
                                : "Download Desktop App (Windows & Mac)"}
                        </span>
                    </Link>
                </div>
            </section>
            </main>

            <Footer />
        </div>
    );
}
