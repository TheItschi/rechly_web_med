import KeywordLandingPage from "@/components/landing/KeywordLandingPage";
import { createPageMetadata } from "@/lib/seo";

const path = "/kostenlose-rechnungssoftware";

export const metadata = createPageMetadata({
    title: "Kostenlose Rechnungssoftware (Vollversion) – Gratis ohne Abo",
    description:
        "Dauerhaft kostenlose Rechnungssoftware & Vollversion ohne Limit: E-Rechnung (XRechnung & ZUGFeRD), DATEV-Export, Angebote & offline Desktop-App. 100% gratis!",
    path,
    type: "article",
    keywords: [
        "kostenlose Rechnungssoftware",
        "Rechnungssoftware kostenlos Vollversion",
        "gratis Rechnungsprogramm Vollversion",
        "Rechnungsprogramme kostenlos Vollversion",
        "Rechnungsprogramm Freeware Vollversion",
        "Rechnungssoftware ohne Abo",
    ],
});

export default function KostenloseRechnungssoftwarePage() {
    return (
        <KeywordLandingPage
            path={path}
            eyebrow="KOSTENLOSE RECHNUNGSSOFTWARE"
            title="Kostenlose Rechnungssoftware: Vollversion statt Lockangebot"
            intro="„Kostenlos“ bedeutet bei Rechnungssoftware meist eines von drei Dingen: eine zeitlich begrenzte Testphase, eine Gratis-Stufe mit hartem Rechnungslimit – oder tatsächlich freie Software. Der Unterschied entscheidet darüber, ob du in sechs Monaten zahlst oder nicht."
            summary="Diese Seite ordnet die typischen Gratis-Modelle deutscher Anbieter ein und zeigt, warum Rechly als Open-Source-Software strukturell eine echte kostenlose Vollversion sein kann: Rechnungen, Angebote, wiederkehrende Rechnungen, E-Rechnung, Bankabgleich und DATEV-Export – ohne Rechnungslimit und ohne Ablaufdatum."
            keywordPills={[
                "kostenlose Rechnungssoftware",
                "Rechnungsprogramm kostenlos Vollversion",
                "gratis Rechnungsprogramm Vollversion",
                "Rechnungssoftware Freeware",
                "E-Rechnung kostenlos",
            ]}
            sections={[
                {
                    title: "Die drei Gratis-Modelle am deutschen Markt",
                    body: [
                        "Klassische Anbieter wie Lexware Office oder sevdesk arbeiten mit Testphasen: 14 bis 30 Tage kostenlos, danach beginnt das Abo. Freemium-Anbieter setzen stattdessen Limits – etwa eine Handvoll Rechnungen pro Monat oder gesperrte Funktionen wie Zahlungsabgleich und Exporte.",
                        "Das dritte Modell ist Open Source: Die Software selbst ist frei, das Geschäftsmodell hängt nicht daran, dich nach der zehnten Rechnung zur Kasse zu bitten. Rechly gehört zu dieser Kategorie.",
                    ],
                    bullets: [
                        "Testphase: kostenlos bis zum Stichtag, dann Abo",
                        "Freemium: dauerhaft gratis, aber mit Rechnungslimit oder Funktionssperren",
                        "Open Source: Vollversion ohne künstliche Grenzen",
                    ],
                },
                {
                    title: "Woran du eine echte Vollversion erkennst",
                    body: [
                        "Entscheidend ist nicht das Preisschild am ersten Tag, sondern was passiert, wenn dein Geschäft wächst. Prüfe drei Punkte, bevor du deine Rechnungsdaten in ein Tool gibst.",
                    ],
                    bullets: [
                        "Gibt es ein Limit für Rechnungen, Kunden oder Belege?",
                        "Sind Exporte (PDF, DATEV, E-Rechnung) im Gratis-Umfang enthalten – oder das Druckmittel fürs Upgrade?",
                        "Kommst du an deine Daten heran, wenn du wechseln willst?",
                    ],
                },
                {
                    title: "Was in Rechly kostenlos enthalten ist",
                    body: [
                        "Rechly deckt den kompletten Rechnungsprozess für Freelancer, Selbstständige und kleine Unternehmen ab – auf Deutsch, nach deutschen Regeln, im Web und als Desktop-App mit 100 % Offline-Modus.",
                    ],
                    bullets: [
                        "Rechnungen, Angebote und wiederkehrende Rechnungen mit fortlaufenden Nummern",
                        "E-Rechnung: XRechnung und ZUGFeRD",
                        "Rechnungskorrekturen und Gutschriften nach §14 UStG",
                        "Ausgaben mit Beleg-Scan, Bankabgleich per CSV-Import",
                        "DATEV-Export für die Übergabe an die Steuerberatung",
                        "Kleinunternehmer-Unterstützung nach §19 UStG",
                    ],
                },
                {
                    title: "Wo Open Source zusätzlich Vertrauen schafft",
                    body: [
                        "Bei Rechnungsdaten geht es um dein Geschäft und um personenbezogene Daten deiner Kunden. Offener Quellcode bedeutet: nachvollziehbare Datenverarbeitung statt Blackbox, Hosting in der EU (Frankfurt) und kein Anbieter-Lock-in.",
                        "Wenn ein Anbieter sein Gratis-Modell ändert, sitzt du bei proprietärer Software fest. Bei offener Software bleibt dir das Produkt erhalten.",
                    ],
                },
            ]}
            faqs={[
                {
                    question:
                        "Gibt es wirklich Rechnungssoftware, die dauerhaft kostenlos ist?",
                    answer: "Ja, aber selten als Vollversion. Die meisten Gratis-Angebote sind Testphasen oder limitierte Freemium-Stufen. Rechly ist als Open-Source-Projekt dauerhaft kostenlos nutzbar – ohne Rechnungslimit.",
                },
                {
                    question:
                        "Ist eine kostenlose Vollversion für Unternehmen seriös?",
                    answer: "Open-Source-Software ist im Unternehmensumfeld Standard – von Linux bis nginx. Entscheidend sind nachvollziehbare Entwicklung, EU-Hosting und die Möglichkeit, jederzeit an die eigenen Daten zu kommen.",
                },
                {
                    question:
                        "Kann ich später von einer anderen Software zu Rechly wechseln?",
                    answer: "Ja. Kunden und Produkte lassen sich per CSV importieren, Bankumsätze ebenfalls. Deine bestehenden Rechnungsnummernkreise kannst du fortführen.",
                },
                {
                    question: "Ist die E-Rechnung im kostenlosen Umfang enthalten?",
                    answer: "Ja. XRechnung- und ZUGFeRD-Export gehören zum Kern von Rechly und sind kein Bezahl-Feature – gerade wegen der E-Rechnungspflicht im B2B-Geschäft.",
                },
            ]}
            clusterLinks={[
                {
                    href: "/desktop",
                    title: "Rechly Desktop Vollversion (Windows & Mac)",
                    description:
                        "Kostenloses Offline-Rechnungsprogramm ohne Cloud und ohne Abo direkt herunterladen.",
                },
                {
                    href: "/rechnungsprogramm-kostenlos",
                    title: "Rechnungsprogramm kostenlos",
                    description:
                        "Der Einstiegs-Guide: wann ein kostenloses Rechnungsprogramm sinnvoll ist.",
                },
                {
                    href: "/rechnung-schreiben",
                    title: "Rechnung schreiben",
                    description:
                        "Schritt-für-Schritt-Anleitung mit allen Pflichtangaben nach §14 UStG.",
                },
                {
                    href: "/lexoffice-alternative",
                    title: "lexoffice Alternative",
                    description:
                        "Der direkte Vergleich mit dem bekanntesten Abo-Anbieter.",
                },
            ]}
        />
    );
}
