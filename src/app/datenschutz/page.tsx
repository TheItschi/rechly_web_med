"use client";

import { Typography, Card } from "antd";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const { Title, Paragraph, Text } = Typography;

const content = {
    de: {
        title: "Datenschutzerklärung",
        section1Title: "1. Datenschutz auf einen Blick",
        section1Text:
            "Diese Datenschutzerklärung klärt über die Art, den Umfang und Zweck der Verarbeitung personenbezogener Daten innerhalb dieses Projekts auf.",
        section2Title: "2. Verantwortlicher",
        section2Text:
            "Verantwortlich für die Datenverarbeitung ist der Betreiber dieses Open-Source-Projekts (siehe Impressum).",
        section3Title: "3. Erhobene Daten",
        section3Text:
            "Bei der Nutzung von Rechly werden folgende Daten verarbeitet:",
        section3Items: [
            "E-Mail-Adresse (für Account-Erstellung)",
            "Rechnungsdaten (die du selbst eingibst)",
            "Kundendaten (die du selbst eingibst)",
        ],
        section4Title: "4. Hosting und Auftragsverarbeiter",
        section4Text:
            "Die Rechly-Webanwendung wird auf der Infrastruktur von Vercel Inc. bereitgestellt. Die Anwendungsdaten (Accounts, Kunden, Rechnungen und Belege) werden in einer selbst betriebenen Appwrite-Instanz auf einem eigenen Server bei der Hetzner Online GmbH in Deutschland gespeichert. Alle Anwendungsdaten bleiben in der EU. Für den Versand transaktionaler E-Mails (z. B. Bestätigungs- und Passwort-zurücksetzen-E-Mails) nutzen wir Resend (EU-Region). Mit den genannten Anbietern bestehen Auftragsverarbeitungsverträge; Übermittlungen in Drittländer erfolgen allenfalls auf Grundlage geeigneter Garantien (z. B. EU-US Data Privacy Framework oder EU-Standardvertragsklauseln).",
        section5Title: "5. Cookies und optionale Analyse",
        section5Text:
            "Technisch notwendige Cookies werden für Authentifizierung und Grundfunktionen eingesetzt. Nur mit deiner ausdrücklichen Einwilligung nutzen wir Google Analytics (Google Ireland Limited) und Vercel Web Analytics (Vercel Inc.), um Seitenaufrufe und die technische Qualität des Angebots zu messen. Google Analytics kann Geräte- und Browserinformationen, aufgerufene Seiten, gekürzte IP-Informationen und Online-Kennungen verarbeiten. Das _ga-Cookie ist auf höchstens 13 Monate begrenzt; nutzer- und ereignisbezogene Daten werden bei Google Analytics höchstens 14 Monate aufbewahrt. Google-Signale und Werbepersonalisierung sind deaktiviert. Vercel Web Analytics arbeitet laut Anbieter ohne Cookies und ohne dauerhafte Zuordnung zu Personen oder IP-Adressen; der täglich gebildete Besucher-Hash wird nach 24 Stunden verworfen. Rechtsgrundlage ist deine Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TDDDG. Du kannst sie jederzeit mit Wirkung für die Zukunft in den Cookie-Einstellungen widerrufen; dann wird die Analyse gestoppt und verfügbare Analyse-Cookies werden gelöscht. Für mögliche Übermittlungen in die USA stützen sich Google und Vercel auf ihre Zertifizierungen nach dem EU-US Data Privacy Framework und, soweit erforderlich, auf EU-Standardvertragsklauseln.",
        section6Title: "6. Deine Rechte",
        section6Text:
            "Du hast das Recht auf Auskunft, Berichtigung, Löschung und Datenübertragbarkeit deiner Daten. Kontaktiere uns über die im Impressum genannte E-Mail-Adresse.",
        section7Title: "7. Selbstständige Konto- und Datenlöschung",
        section7Text:
            "Du kannst dein Konto und sämtliche zugehörigen Daten (Rechnungen, Angebote, Kunden, Produkte, Ausgaben, Belege und Einstellungen) jederzeit selbstständig in den Kontoeinstellungen („Einstellungen → Konto → Konto löschen“) mit einem Klick sofort und unwiderruflich löschen – ohne manuelle Prüfung oder Wartezeit.",
        lastUpdated: "Stand: November 2026",
    },
    en: {
        title: "Privacy Policy",
        section1Title: "1. Privacy at a Glance",
        section1Text:
            "This privacy policy explains the nature, scope, and purpose of personal data processing within this project.",
        section2Title: "2. Data Controller",
        section2Text:
            "The operator of this open-source project is responsible for data processing (see Imprint).",
        section3Title: "3. Collected Data",
        section3Text: "When using Rechly, the following data is processed:",
        section3Items: [
            "Email address (for account creation)",
            "Invoice data (that you enter yourself)",
            "Customer data (that you enter yourself)",
        ],
        section4Title: "4. Hosting and Processors",
        section4Text:
            "The Rechly web application is served on infrastructure provided by Vercel Inc. Application data (accounts, customers, invoices and receipts) is stored in a self-operated Appwrite instance on our own server hosted by Hetzner Online GmbH in Germany. All application data remains in the EU. Transactional emails (e.g. verification and password-reset messages) are sent via Resend (EU region). Data processing agreements are in place with these providers; any transfers to third countries take place only on the basis of appropriate safeguards (e.g. the EU-US Data Privacy Framework or EU Standard Contractual Clauses).",
        section5Title: "5. Cookies and Optional Analytics",
        section5Text:
            "Technically necessary cookies are used for authentication and basic functions. Only with your explicit consent do we use Google Analytics (Google Ireland Limited) and Vercel Web Analytics (Vercel Inc.) to measure page views and the technical quality of the service. Google Analytics may process device and browser information, visited pages, shortened IP information, and online identifiers. The _ga cookie is limited to a maximum of 13 months; user- and event-related Google Analytics data is retained for no longer than 14 months. Google Signals and advertising personalization are disabled. According to Vercel, Web Analytics uses no cookies and does not permanently associate data with individuals or IP addresses; its daily visitor hash is discarded after 24 hours. Processing is based on your consent under Article 6(1)(a) GDPR and applicable cookie law. You can withdraw consent at any time with future effect in Cookie Settings; analytics will then stop and available analytics cookies will be deleted. For potential transfers to the United States, Google and Vercel rely on their EU-US Data Privacy Framework certifications and, where required, EU Standard Contractual Clauses.",
        section6Title: "6. Your Rights",
        section6Text:
            "You have the right to access, rectification, deletion, and data portability of your data. Contact us via the email address listed in the Imprint.",
        section7Title: "7. Self-Service Account and Data Deletion",
        section7Text:
            "You can immediately and permanently delete your account and all associated data (invoices, quotes, customers, products, expenses, receipts, and settings) yourself at any time in the account settings (\"Settings → Account → Delete Account\") with a single click, without manual review or waiting period.",
        lastUpdated: "Last updated: November 2026",
    },
};

export default function DatenschutzPage() {
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
                <Card style={{ borderRadius: 12, border: "1px solid #f0f0f0" }}>
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
                    <ul style={{ fontSize: 15, paddingLeft: 20 }}>
                        {t.section3Items.map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>

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
