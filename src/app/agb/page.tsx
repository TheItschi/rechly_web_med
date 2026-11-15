"use client";

import { Typography, Card } from "antd";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const { Title, Paragraph, Text } = Typography;

const content = {
    de: {
        title: "Nutzungsbedingungen",
        section1Title: "1. Geltungsbereich",
        section1Text:
            "Diese Nutzungsbedingungen gelten für die Nutzung von Rechly, einem kostenlosen Open-Source-Projekt zur Rechnungserstellung.",
        section2Title: "2. Leistungsbeschreibung",
        section2Text:
            'Rechly ist ein kostenloses Tool zur Erstellung von Rechnungen. Der Dienst wird "as is" angeboten, ohne Garantie auf Verfügbarkeit oder bestimmte Funktionen.',
        section3Title: "3. Kostenfreiheit",
        section3Text:
            "Rechly ist und bleibt kostenlos. Es gibt keine versteckten Kosten, Premium-Pläne oder Werbung.",
        section4Title: "4. Verantwortung",
        section4Text:
            "Du bist selbst für die Richtigkeit deiner Rechnungen verantwortlich. Rechly übernimmt keine Haftung für steuerliche oder rechtliche Konsequenzen aus der Nutzung der erstellten Rechnungen.",
        section5Title: "5. Datenschutz & Kontolöschung",
        section5Text:
            "Die Verarbeitung deiner Daten erfolgt gemäß unserer Datenschutzerklärung und der DSGVO. Du kannst dein Konto und sämtliche gespeicherten Daten jederzeit selbstständig und sofort in den Kontoeinstellungen löschen.",
        section6Title: "6. Verfügbarkeit",
        section6Text:
            "Als Open-Source-Projekt kann keine 100%ige Verfügbarkeit garantiert werden. Wir bemühen uns aber, den Dienst stabil zu halten.",
        section7Title: "7. Änderungen",
        section7Text:
            "Diese Bedingungen können jederzeit geändert werden. Wesentliche Änderungen werden angekündigt.",
        section8Title: "8. Open Source (AGPL-3.0)",
        section8Text:
            "Rechly ist freie Open-Source-Software unter der AGPL-3.0-Lizenz. Der Quellcode ist auf GitHub verfügbar und kann auch komplett lokal genutzt werden. Beiträge sind willkommen.",
        lastUpdated: "Stand: Oktober 2026",
    },
    en: {
        title: "Terms of Use",
        section1Title: "1. Scope",
        section1Text:
            "These terms of use apply to the use of Rechly, a free open-source project for creating invoices.",
        section2Title: "2. Service Description",
        section2Text:
            'Rechly is a free tool for creating invoices. The service is provided "as is", without guarantee of availability or specific features.',
        section3Title: "3. Free of Charge",
        section3Text:
            "Rechly is and will remain free. There are no hidden costs, premium plans, or advertisements.",
        section4Title: "4. Responsibility",
        section4Text:
            "You are responsible for the accuracy of your invoices. Rechly assumes no liability for tax or legal consequences arising from the use of created invoices.",
        section5Title: "5. Privacy & Account Deletion",
        section5Text:
            "Your data is processed in accordance with our privacy policy and GDPR. You can immediately and permanently delete your account and all stored data yourself at any time in your account settings.",
        section6Title: "6. Availability",
        section6Text:
            "As an open-source project, 100% availability cannot be guaranteed. However, we strive to keep the service stable.",
        section7Title: "7. Changes",
        section7Text:
            "These terms may be changed at any time. Significant changes will be announced.",
        section8Title: "8. Open Source (AGPL-3.0)",
        section8Text:
            "Rechly is free open-source software licensed under AGPL-3.0. The source code is available on GitHub and can also be run completely locally. Contributions are welcome.",
        lastUpdated: "Last updated: October 2026",
    },
};

export default function AgbPage() {
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

                    <Title level={2}>{t.section1Title}</Title>
                    <Paragraph style={{ fontSize: 15 }}>
                        {t.section1Text}
                    </Paragraph>

                    <Title level={2}>{t.section2Title}</Title>
                    <Paragraph style={{ fontSize: 15 }}>
                        {t.section2Text}
                    </Paragraph>

                    <Title level={2}>{t.section3Title}</Title>
                    <Paragraph style={{ fontSize: 15 }}>
                        {t.section3Text}
                    </Paragraph>

                    <Title level={2}>{t.section4Title}</Title>
                    <Paragraph style={{ fontSize: 15 }}>
                        {t.section4Text}
                    </Paragraph>

                    <Title level={2}>{t.section5Title}</Title>
                    <Paragraph style={{ fontSize: 15 }}>
                        {t.section5Text}
                    </Paragraph>

                    <Title level={2}>{t.section6Title}</Title>
                    <Paragraph style={{ fontSize: 15 }}>
                        {t.section6Text}
                    </Paragraph>

                    <Title level={2}>{t.section7Title}</Title>
                    <Paragraph style={{ fontSize: 15 }}>
                        {t.section7Text}
                    </Paragraph>

                    <Title level={2}>{t.section8Title}</Title>
                    <Paragraph style={{ fontSize: 15 }}>
                        {t.section8Text}
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
