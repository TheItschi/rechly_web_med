"use client";

import { Typography, Card, Space, Button } from "antd";
import {
    GithubOutlined,
    LinkedinOutlined,
    MailOutlined,
} from "@ant-design/icons";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { getContactEmail, getOptionalLinkedInUrl, getRepoUrl } from "@/lib/env";

const { Title, Paragraph, Text } = Typography;
const contactEmail = getContactEmail();
const linkedInUrl = getOptionalLinkedInUrl();
const repoUrl = getRepoUrl();

const content = {
    de: {
        title: "Impressum",
        aboutTitle: "Über das Projekt",
        aboutText:
            "Rechly ist ein privates, nicht-kommerzielles Open-Source-Projekt. Es wird als Hobbyprojekt von einem Studenten entwickelt und ist kostenlos nutzbar.",
        aboutNote:
            "Da es sich um ein rein privates Projekt ohne geschäftsmäßige Absichten handelt, besteht keine Impressumspflicht gemäß § 5 DDG.",
        contactTitle: "Kontakt",
        liabilityContentTitle: "Haftung für Inhalte",
        liabilityContentText:
            "Die Inhalte dieser Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte kann jedoch keine Gewähr übernommen werden.",
        liabilityLinksTitle: "Haftung für Links",
        liabilityLinksText:
            "Diese Website enthält Links zu externen Websites Dritter, auf deren Inhalte kein Einfluss besteht. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.",
        lastUpdated: "Stand: Dezember 2025",
    },
    en: {
        title: "Imprint",
        aboutTitle: "About the Project",
        aboutText:
            "Rechly is a private, non-commercial open-source project. It is developed as a hobby project by a student and is free to use.",
        aboutNote:
            "As this is a purely private project without commercial intent, there is no legal imprint requirement under German law (§ 5 DDG).",
        contactTitle: "Contact",
        liabilityContentTitle: "Liability for Content",
        liabilityContentText:
            "The contents of these pages were created with the utmost care. However, no guarantee can be given for the correctness, completeness, and timeliness of the content.",
        liabilityLinksTitle: "Liability for Links",
        liabilityLinksText:
            "This website contains links to external third-party websites over whose content we have no influence. The respective provider is always responsible for the content of linked pages.",
        lastUpdated: "Last updated: December 2025",
    },
};

export default function ImpressumPage() {
    const { language } = useLanguage();
    const t = content[language];

    return (
        <div style={{ minHeight: "100vh", background: "#fff" }}>
            <Navbar showAuth={false} />

            <main
                style={{
                    paddingTop: 100,
                    paddingBottom: 60,
                    paddingLeft: 24,
                    paddingRight: 24,
                    maxWidth: 700,
                    margin: "0 auto",
                }}
            >
                <Card className="legal-prose" style={{ borderRadius: 10 }}>
                    <Title level={1} style={{ marginBottom: 24 }}>
                        {t.title}
                    </Title>

                    <Title level={2}>{t.aboutTitle}</Title>
                    <Paragraph style={{ fontSize: 15 }}>
                        {t.aboutText}
                    </Paragraph>

                    <Paragraph style={{ fontSize: 15, color: "#64748b" }}>
                        {t.aboutNote}
                    </Paragraph>

                    <Title level={2}>{t.contactTitle}</Title>
                    <Space
                        direction="vertical"
                        size="small"
                        style={{ marginBottom: 24 }}
                    >
                        <Button
                            type="link"
                            icon={<MailOutlined />}
                            href={`mailto:${contactEmail}`}
                            style={{ padding: 0, height: "auto" }}
                        >
                            {contactEmail}
                        </Button>
                        <Button
                            type="link"
                            icon={<GithubOutlined />}
                            href={repoUrl}
                            target="_blank"
                            style={{ padding: 0, height: "auto" }}
                        >
                            {repoUrl.replace(/^https?:\/\//, "")}
                        </Button>
                        {linkedInUrl ? (
                            <Button
                                type="link"
                                icon={<LinkedinOutlined />}
                                href={linkedInUrl}
                                target="_blank"
                                style={{ padding: 0, height: "auto" }}
                            >
                                {linkedInUrl.replace(/^https?:\/\//, "")}
                            </Button>
                        ) : null}
                    </Space>

                    <Title level={2}>{t.liabilityContentTitle}</Title>
                    <Paragraph style={{ fontSize: 15 }}>
                        {t.liabilityContentText}
                    </Paragraph>

                    <Title level={2}>{t.liabilityLinksTitle}</Title>
                    <Paragraph style={{ fontSize: 15 }}>
                        {t.liabilityLinksText}
                    </Paragraph>

                    <Text
                        type="secondary"
                        style={{
                            fontSize: 13,
                            marginTop: 24,
                            display: "block",
                        }}
                    >
                        {t.lastUpdated}
                    </Text>
                </Card>
            </main>

            <Footer />
        </div>
    );
}
