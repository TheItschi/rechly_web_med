import KeywordLandingPage from "@/components/landing/KeywordLandingPage";
import { createPageMetadata } from "@/lib/seo";

const path = "/lexoffice-alternative";

export const metadata = createPageMetadata({
    title: "lexoffice Alternative kostenlos: Open Source & ohne Abo",
    description:
        "Kostenlose lexoffice Alternative für Freelancer & KMU: Rechnungen, E-Rechnung (XRechnung/ZUGFeRD), DATEV-Export & 100% offline Desktop-App. Kein Abo!",
    path,
    type: "article",
    keywords: [
        "lexoffice Alternative",
        "lexoffice Alternative kostenlos",
        "Alternative zu lexoffice",
        "Rechnungssoftware ohne Abo",
        "Open Source Rechnungssoftware",
    ],
});

export default function LexofficeAlternativePage() {
    return (
        <KeywordLandingPage
            path={path}
            eyebrow="LEXOFFICE ALTERNATIVE"
            title="lexoffice Alternative: wenn du eine offenere Rechnungssoftware suchst"
            intro="Wer nach einer lexoffice Alternative sucht, will meistens nicht einfach irgendein anderes Tool. Die eigentliche Frage lautet oft: Welche Rechnungssoftware passt besser zu meinem Setup, meinem Budget und meinem Wunsch nach Kontrolle über Daten, Funktionen und Workflow?"
            summary="Rechly ist in diesem Vergleich interessant, wenn du keine große All-in-one-Oberfläche suchst, sondern eine fokussierte Rechnungssoftware mit Open-Source-Ansatz, klaren Workflows und KI-Funktionen, die du mit eigenem Anbieter und eigenem Schlüssel steuern kannst."
            keywordPills={[
                "lexoffice Alternative",
                "Alternative zu lexoffice",
                "Open Source Rechnungssoftware",
                "Rechnungssoftware Vergleich",
            ]}
            sections={[
                {
                    title: "Warum Nutzer nach einer lexoffice Alternative suchen",
                    body: [
                        "Vergleichssuchen entstehen selten aus Neugier allein. Häufig geht es darum, dass ein bestehendes Tool zu umfangreich wirkt, preislich nicht mehr passt oder zu wenig Kontrolle über den Ablauf und die Integrationen lässt.",
                        "Gerade kleine Teams, Freelancer und Nebenprojekte brauchen oft keine große Suite, sondern einen ruhigen Rechnungsprozess mit Kundendaten, PDFs, Erinnerungen und sauberer Nachverfolgung offener Zahlungen.",
                    ],
                    bullets: [
                        "Weniger Overhead in der Oberfläche",
                        "Klarere Fokussierung auf Rechnungen und Follow-ups",
                        "Offenerer Umgang mit Hosting und Quellcode",
                        "Mehr Kontrolle über KI-Provider und API-Schlüssel",
                    ],
                },
                {
                    title: "Wann Rechly als Alternative sinnvoll ist",
                    body: [
                        "Rechly ist dann interessant, wenn du einen schmaleren Stack bevorzugst und Rechnungsprozesse nicht in einer Black-Box-Umgebung abbilden willst. Der Fokus liegt auf deutscher Rechnungserstellung, Kundenverwaltung, PDF-Export und operativen Schritten bei offenen Rechnungen.",
                        "Dazu kommt der Open-Source-Ansatz. Das ist vor allem für Nutzer relevant, die nachvollziehen möchten, wie das System arbeitet, es selbst hosten wollen oder KI-Funktionen mit eigener Anbieterwahl koppeln möchten.",
                    ],
                    bullets: [
                        "Open Source statt rein geschlossener SaaS-Logik",
                        "KI-Funktionen mit eigenem Provider-Setup",
                        "Geeignet für Freelancer, Solos und kleine Teams",
                        "Fokus auf Rechnungsworkflow statt Funktionsballast",
                    ],
                },
                {
                    title: "In 2 Minuten von Lexware Office (lexoffice) zu Rechly umziehen",
                    body: [
                        "Die größte Hürde beim Wechsel der Rechnungssoftware sind bestehende Stammdaten. Deshalb besitzt Rechly einen integrierten Daten-Umzugs-Assistenten speziell für Lexware Office (lexoffice), sevdesk, FastBill, Papierkram und DATEV.",
                        "Du exportierst deine Kundenliste, Artikel und Rechnungen als CSV oder E-Rechnung (XRechnung / ZUGFeRD) und ziehst die Dateien einfach per Drag & Drop in Rechly. Alle Spalten, Steuersätze, Leitweg-IDs und Kundenverknüpfungen werden automatisch erkannt.",
                    ],
                    bullets: [
                        "Automatische Spaltenerkennung für Lexware-Office-Exporte (inkl. Windows-1252-Umlaute)",
                        "Kunden, Artikel/Leistungen, Ausgangsrechnungen und Ausgaben in einem Schritt importieren",
                        "Batch-Import bestehender XRechnung- (.xml) und ZUGFeRD-Dateien (.pdf)",
                        "Jederzeit 1-Klick Komplett-Backup (.json) für den Wechsel zwischen Cloud & Desktop-App",
                    ],
                },
            ]}
            faqs={[
                {
                    question:
                        "Kann ich meine Kunden, Produkte und Rechnungen aus lexoffice importieren?",
                    answer: "Ja! Im Rechly-Dashboard findest du unter »Daten-Umzug & Import« einen Assistenten für Lexware Office (lexoffice). Du lädst einfach deine exportierten CSV-Dateien oder ZUGFeRD/XRechnung-Belege hoch und Rechly übernimmt Kunden, Produkte, Rechnungen und Ausgaben automatisch.",
                },
                {
                    question:
                        "Ist Rechly ein direkter 1:1-Ersatz für jede lexoffice-Nutzung?",
                    answer: "Nein. Ob Rechly passt, hängt davon ab, welche Teile deines aktuellen Setups dir wichtig sind. Rechly ist besonders dann interessant, wenn du einen fokussierten Rechnungsworkflow und einen offenen Produktansatz suchst.",
                },
                {
                    question:
                        "Warum ist Open Source bei einer Alternative relevant?",
                    answer: "Weil Open Source mehr Transparenz und Kontrolle ermöglicht. Gerade bei Daten, Hosting und KI-Anbindungen kann das ein echter Unterschied sein.",
                },
                {
                    question:
                        "Für wen ist diese lexoffice Alternative gedacht?",
                    answer: "Vor allem für Freelancer, Selbstständige, Nebenprojekte und kleine Teams, die Rechnungen sauber organisieren wollen, ohne ein überladenes System zu pflegen.",
                },
            ]}
            clusterLinks={[
                {
                    href: "/sevdesk-alternative",
                    title: "sevdesk Alternative",
                    description:
                        "Für eine zweite Vergleichssuche mit ähnlicher Kaufintention rund um Rechnungssoftware.",
                },
                {
                    href: "/rechnungsprogramm-kostenlos",
                    title: "Rechnungsprogramm kostenlos",
                    description:
                        "Wenn du statt Vergleichsmarketing ein wirklich kostenloses Rechnungsprogramm bewerten willst.",
                },
            ]}
        />
    );
}
