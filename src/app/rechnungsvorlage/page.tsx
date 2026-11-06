import KeywordLandingPage from "@/components/landing/KeywordLandingPage";
import { createPageMetadata } from "@/lib/seo";

const path = "/rechnungsvorlage";

export const metadata = createPageMetadata({
    title: "Rechnungsvorlage kostenlos (PDF, Word & Online-Generator)",
    description:
        "14 kostenlose Rechnungsvorlagen & Muster nach § 14 UStG (Kleinunternehmer, Handwerker, Reinigung & Privat): Sofort online ausfüllen & als PDF oder XRechnung laden!",
    path,
    type: "article",
    keywords: [
        "Rechnungsvorlage kostenlos",
        "Rechnung Vorlage",
        "Rechnungsvorlage Word",
        "Rechnungsvorlage Excel",
        "Rechnung Muster PDF",
        "Rechnungsvordruck kostenlos",
        "Rechnungsvorlage Kleinunternehmer",
    ],
});

export default function RechnungsvorlagePage() {
    return (
        <KeywordLandingPage
            path={path}
            eyebrow="RECHNUNGSVORLAGE KOSTENLOS · DIN 5008 & § 14 USTG"
            title="Rechnungsvorlage kostenlos: Muster für jede Branche (PDF, Word & Online)"
            intro="Wer eine Rechnungsvorlage sucht, möchte ohne Umwege eine saubere, finanzamtkonforme Rechnung erstellen. Entscheidend ist, dass alle Pflichtangaben nach § 14 UStG (bzw. § 19 UStG für Kleinunternehmer) enthalten sind, damit das Finanzamt die Rechnung problemlos anerkennt."
            summary="Bei Rechly wählen Sie aus 14 spezialisierten Branchen-Vorlagen (Handwerk, Gebäudereinigung, Bau § 13b, Kleinunternehmer, Freiberufler & Privat) und füllen Ihre Rechnung direkt kostenlos im Browser aus – inklusive fehlerfreiem PDF- und XRechnung-Download."
            keywordPills={[
                "Rechnungsvorlage kostenlos",
                "Rechnung Muster PDF",
                "Rechnungsvorlage Kleinunternehmer",
                "Handwerkerrechnung Vorlage",
                "Rechnungsvordruck DIN 5008",
                "E-Rechnung Vorlage",
            ]}
            howTo={{
                title: "So füllen Sie Ihre kostenlose Rechnungsvorlage in 2 Minuten aus",
                steps: [
                    {
                        name: "Branchen-Vorlage oder Standard-Muster wählen",
                        text: "Starten Sie mit unserem Standard-Muster (19 %/7 % USt.), der Kleinunternehmer-Vorlage (§ 19 UStG), der Handwerkerrechnung (§ 35a EStG) oder der Bauleistungsvorlage (§ 13b UStG).",
                    },
                    {
                        name: "Absender, Empfänger und Rechnungsnummer eintragen",
                        text: "Ergänzen Sie Ihre Adresse, Steuernummer/USt-IdNr., das Leistungsdatum und die fortlaufende Rechnungsnummer direkt im Formular.",
                    },
                    {
                        name: "Positionen eingeben & automatisch berechnen lassen",
                        text: "Anders als in starren Word-Vorlagen berechnet Rechly Netto, Mehrwertsteuer, Rabatte und Lohnanteile automatisch auf den Cent genau.",
                    },
                    {
                        name: "Sofort als DIN-5008-PDF oder XRechnung speichern",
                        text: "Laden Sie Ihre fertige Rechnung ohne Anmeldung und ohne Wasserzeichen als PDF (inkl. GiroCode QR) oder als XRechnung 3.0 XML herunter.",
                    },
                ],
            }}
            sections={[
                {
                    title: "Warum eine Rechnungsvorlage oft nur der Anfang ist",
                    body: [
                        "Eine Vorlage ist hilfreich, wenn du die Struktur einer Rechnung schnell aufsetzen willst. Für den laufenden Betrieb reicht sie aber oft nicht aus, weil Kundendaten, Rechnungsnummern, Leistungsbeschreibungen und Zahlungsbedingungen immer wieder manuell angepasst werden müssen.",
                        "Je mehr wiederkehrende Abrechnung entsteht, desto wichtiger wird es, aus der Vorlage einen reproduzierbaren Prozess zu machen. Genau dadurch sinkt das Risiko von Lücken und Copy-paste-Fehlern.",
                    ],
                    bullets: [
                        "Pflichtangaben nicht bei jeder Rechnung neu zusammensuchen",
                        "Kundendaten sauber wiederverwenden",
                        "Leistungsbeschreibungen konsistent halten",
                        "PDF-Erstellung und Versand direkt anschließen",
                    ],
                },
                {
                    title: "Was eine gute Rechnungsvorlage in Deutschland abdecken sollte",
                    body: [
                        "Im deutschen Markt ist nicht nur das Layout wichtig, sondern vor allem die inhaltliche Vollständigkeit. Eine gute Rechnungsvorlage muss Platz für Absender, Empfänger, Datum, Rechnungsnummer, Leistungsbeschreibung, Zahlungsziel und steuerlich relevante Hinweise bieten.",
                        "Für kleine Unternehmen und Freelancer ist dabei entscheidend, dass diese Informationen nicht isoliert in einer Datei liegen, sondern im Alltag zuverlässig wiederverwendet werden können.",
                    ],
                },
                {
                    title: "Wie Rechly aus der Vorlage einen Ablauf macht",
                    body: [
                        "Rechly hilft dabei, die Logik einer Rechnungsvorlage in einen echten Workflow zu überführen. Kunden werden zentral gepflegt, Positionen strukturiert verwaltet und Rechnungen als PDF ausgegeben, ohne dass du jedes Mal bei Null startest.",
                        "Wenn später Zahlungen offen bleiben, endet der Prozess nicht an der Vorlage. Dann greifen Follow-up- und Erinnerungsschritte direkt auf dieselben Rechnungsdaten zurück.",
                    ],
                    bullets: [
                        "Vorlage + Kundendaten + PDF in einem System",
                        "Besser geeignet für wiederkehrende Abrechnung",
                        "Saubere Grundlage für Erinnerungen und Nachverfolgung",
                    ],
                },
            ]}
            faqs={[
                {
                    question:
                        "Reicht eine einfache Rechnungsvorlage für den Alltag aus?",
                    answer: "Für den Einstieg oft ja. Sobald du aber regelmäßig Rechnungen schreibst, hilft eine strukturierte Software deutlich mehr als eine statische Vorlage.",
                },
                {
                    question:
                        "Kann ich mit Rechly statt einer Vorlage direkt Rechnungen erzeugen?",
                    answer: "Ja. Rechly ist dafür gedacht, Rechnungsdaten, Kundeninformationen und PDF-Ausgabe in einem laufenden Workflow zu bündeln.",
                },
                {
                    question:
                        "Ist eine Rechnungsvorlage automatisch rechtssicher?",
                    answer: "Nein. Eine Vorlage kann nur die Struktur unterstützen. Ob deine konkreten Rechnungen inhaltlich vollständig und passend für deinen Fall sind, musst du fachlich prüfen.",
                },
            ]}
            clusterLinks={[
                {
                    href: "/vorlagen",
                    title: "Alle 14 Branchen-Rechnungsvorlagen",
                    description:
                        "Direkter Zugriff auf alle kostenlosen Muster für Handwerk, Reinigung, Bau, IT & Heilberufe.",
                },
                {
                    href: "/vorlagen/kleinunternehmer",
                    title: "Kleinunternehmer Rechnungsvorlage (§ 19 UStG)",
                    description:
                        "Kostenloses Muster ohne Umsatzsteuer mit fertigem §-19-UStG-Pflichthinweis.",
                },
                {
                    href: "/vorlagen/handwerker",
                    title: "Handwerkerrechnung Vorlage (§ 35a EStG)",
                    description:
                        "Muster mit separatem Ausweis von Arbeits- und Fahrtkosten für den Steuerbonus.",
                },
                {
                    href: "/vorlagen/reinigungsgewerbe",
                    title: "Rechnung Gebäudereinigung & Haushaltshilfe Muster",
                    description:
                        "Vorlage für Reinigungsfirmen, Putzfrauen und haushaltsnahe Dienstleistungen.",
                },
                {
                    href: "/tools/rechnungsgenerator",
                    title: "Kostenloser Online-Rechnungsgenerator",
                    description:
                        "Jetzt Rechnung ohne Anmeldung direkt im Browser ausfüllen und als PDF speichern.",
                },
                {
                    href: "/desktop",
                    title: "Rechly Desktop (Kostenlose Vollversion)",
                    description:
                        "Alle Vorlagen & Kunden dauerhaft 100 % offline auf Windows und Mac verwalten.",
                },
            ]}
        />
    );
}
