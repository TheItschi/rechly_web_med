import KeywordLandingPage from "@/components/landing/KeywordLandingPage";
import { createPageMetadata } from "@/lib/seo";

const path = "/angebot-schreiben";

export const metadata = createPageMetadata({
    title: "Angebot schreiben: Kostenlose Vorlage, Muster & PDF-Generator",
    description:
        "Professionelles Angebot schreiben in 2 Minuten: Pflichtangaben, Muster-Formulierungen (Einleitung & Schlusssatz), Unterschied zum Kostenvoranschlag & kostenloser Online-Angebotsgenerator (PDF).",
    path,
    type: "article",
    category: "Angebote & Kostenvoranschläge",
    keywords: [
        "Angebot schreiben",
        "Angebot schreiben Vorlage",
        "Angebot erstellen kostenlos",
        "Angebot Muster PDF",
        "Kostenvoranschlag schreiben",
        "Angebot schreiben Kleinunternehmer",
        "Angebot schreiben Handwerker",
        "Angebotsgenerator kostenlos",
    ],
});

export default function AngebotSchreibenPage() {
    return (
        <KeywordLandingPage
            path={path}
            eyebrow="ANGEBOT SCHREIBEN · VORLAGE & GENERATOR"
            title="Angebot schreiben: Aufbau, Muster-Formulierungen & kostenloser PDF-Generator"
            intro="Wer ein Angebot schreibt, stellt die Weichen für den Auftrag: Ein übersichtliches, rechtssicheres Angebot nach DIN 5008 schafft sofort Vertrauen beim Kunden, verhindert spätere Preisdiskussionen und lässt sich bei Auftragsannahme direkt in eine Rechnung umwandeln."
            summary="Mit dem kostenlosen Rechly Angebotsgenerator erstellen Sie direkt im Browser oder in der 100 % lokalen Desktop-App professionelle Angebote und Kostenvoranschläge als PDF – inklusive automatischer Netto-/Brutto-Berechnung, Kleinunternehmer-Modus (§ 19 UStG) und Bindefrist."
            keywordPills={[
                "Angebot schreiben",
                "Angebot Vorlage kostenlos",
                "Angebot Muster PDF",
                "Kostenvoranschlag erstellen",
                "Angebot Kleinunternehmer (§ 19 UStG)",
                "Freibleibendes Angebot",
            ]}
            howTo={{
                title: "In 4 Schritten ein überzeugendes Angebot schreiben",
                steps: [
                    {
                        name: "Absender, Empfänger und Angebotsnummer eintragen",
                        text: "Tragen Sie Ihre vollständigen Firmendaten sowie die Anschrift Ihres potenziellen Auftraggebers ein. Vergeben Sie eine eindeutige Angebotsnummer (z. B. ANG-2026-001) und das aktuelle Ausstellungsdatum.",
                    },
                    {
                        name: "Leistungspositionen transparent aufschlüsseln",
                        text: "Listen Sie alle Leistungen, Arbeitsstunden oder Materialien mit genauer Bezeichnung, Menge, Einheit (Std., Pauschal, Stk.) und Einzelpreis auf. Optionale Zusatzleistungen oder Rabatte weisen Sie separat aus.",
                    },
                    {
                        name: "Steuerregel (19 %/7 % oder § 19 UStG) und Gültigkeitsdauer festlegen",
                        text: "Wählen Sie den passenden Steuersatz oder die Kleinunternehmerregelung nach § 19 UStG. Begrenzen Sie die Bindefrist Ihres Angebots klar (z. B. ‚Dieses Angebot ist gültig bis zum ...‘ oder ‚Angebot freibleibend‘).",
                    },
                    {
                        name: "Als DIN-5008-PDF herunterladen und später per 1-Klick abrechnen",
                        text: "Laden Sie das fertige Angebot im kostenlosen Angebotsgenerator sofort als druckfertiges PDF herunter. Nimmt der Kunde an, machen Sie daraus in Rechly mit einem Klick die fertige Rechnung.",
                    },
                ],
            }}
            sections={[
                {
                    title: "Welche Angaben gehören in jedes professionelle Angebot?",
                    body: [
                        "Anders als bei einer Rechnung nach § 14 UStG schreibt das Gesetz für Angebote keine starren Pflichtfelder vor. Dennoch ist ein kaufmännisches Angebot nach § 145 BGB rechtlich bindend, sobald der Kunde es annimmt. Fehlen wichtige Details, drohen Missverständnisse über Leistungsumfang, Zusatzkosten oder Liefertermine.",
                        "Deshalb sollte jedes seriöse Angebot für Freiberufler, Handwerker, Agenturen und Kleinunternehmer folgende Bestandteile enthalten:",
                    ],
                    bullets: [
                        "Vollständiger Name und Anschrift von Anbieter und Kunde",
                        "Eindeutige Angebotsnummer und Angebotsdatum zur späteren Zuordnung",
                        "Aussagekräftige Betreffzeile (z. B. ‚Angebot Nr. ANG-2026-014 – Webdesign & Umsetzung‘)",
                        "Detaillierte Positionsbeschreibung (Menge, Einheit, Einzelpreis, Gesamtpreis)",
                        "Nettobetrag, Umsatzsteuersatz (19 % / 7 %) und Bruttobetrag – bzw. Hinweis auf § 19 UStG bei Kleinunternehmern",
                        "Voraussichtlicher Liefer- oder Ausführungszeitraum",
                        "Bindefrist / Gültigkeitsdauer des Angebots (z. B. 14 oder 30 Tage)",
                        "Zahlungsbedingungen (z. B. ‚Zahlbar innerhalb von 14 Tagen nach Rechnungsstellung ohne Abzug‘ oder 30 % Anzahlung)",
                    ],
                },
                {
                    title: "Kopiervorlagen: Die besten Formulierungen für Einleitung, Bindefrist & Schlusssatz",
                    body: [
                        "Ein freundlicher, verbindlicher Ton hebt Ihr Angebot von lieblosen Standardtabellen ab. Nutzen Sie diese bewährten Textbausteine direkt für Ihre nächste Angebotsvorlage:",
                        "Einleitungssätze (Kopiervorlage):",
                    ],
                    bullets: [
                        "„Vielen Dank für Ihre Anfrage und das angenehme Gespräch. Gerne unterbreite ich Ihnen folgendes Angebot für die besprochenen Leistungen:“",
                        "„Herzlichen Dank für Ihr Interesse an einer Zusammenarbeit. Basierend auf Ihren Anforderungen kalkuliere ich den Projektumfang wie folgt:“",
                        "Bindefrist & Freibleibend-Klausel: „An dieses Angebot halte ich mich bis zum [Datum, z. B. +14 Tage] gebunden.“ oder „Dieses Angebot ist freibleibend. Zwischenverkauf und Preisänderungen nach Ablauf von 14 Tagen bleiben vorbehalten.“",
                        "Schlusssatz zur Auftragsbestätigung: „Für Rückfragen stehe ich Ihnen jederzeit gerne zur Verfügung. Wenn Ihnen das Angebot zusagt, senden Sie mir bitte eine kurze schriftliche Bestätigung per E-Mail. Ich freue mich auf die Zusammenarbeit!“",
                    ],
                },
                {
                    title: "Angebot vs. Kostenvoranschlag: Was ist der rechtliche Unterschied?",
                    body: [
                        "Viele Selbstständige und Handwerker verwenden die Begriffe ‚Angebot‘ und ‚Kostenvoranschlag‘ synonym – rechtlich gibt es im deutschen BGB jedoch einen entscheidenden Unterschied:",
                        "Ein reguläres Angebot (§ 145 BGB) ist nach Ihren Angaben preislich verbindlich, sofern Sie es nicht ausdrücklich mit einer Freizeichnungsklausel (‚freibleibend‘ oder ‚Abrechnung nach tatsächlichem Aufwand‘) versehen. Ein Kostenvoranschlag (§ 650 BGB) ist dagegen eine fachmännische Kostenschätzung, bei der geringfügige Überschreitungen (in der Rechtsprechung meist bis ca. 15–20 %) nach unverzüglicher Anzeige zulässig sein können.",
                    ],
                    bullets: [
                        "Pauschal- oder Festpreisprojekt → Verbindliches Angebot schreiben",
                        "Schwer kalkulierbare Reparatur- oder Bauarbeiten → Kostenvoranschlag oder Angebot nach Aufmaß / Stundenaufwand",
                        "Unsichere Materialpreise → Angebot mit kurzer Bindefrist (z. B. 10 Tage) oder Klausel ‚Angebot freibleibend‘ versehen",
                    ],
                },
            ]}
            faqs={[
                {
                    question: "Wie erstelle ich kostenlos ein Angebot als PDF ohne Anmeldung?",
                    answer: "Öffnen Sie den kostenlosen Rechly Online-Angebotsgenerator (/tools/angebotsgenerator), tragen Sie Ihre Absender- und Kundendaten sowie die Positionen ein und klicken Sie auf ‚PDF herunterladen‘. Das Tool arbeitet komplett im Browser ohne Registrierung und ohne Wasserzeichen.",
                },
                {
                    question: "Was muss ein Kleinunternehmer (§ 19 UStG) beim Angebot schreiben beachten?",
                    answer: "Als Kleinunternehmer nach § 19 UStG dürfen Sie auch im Angebot keine Umsatzsteuer separat ausweisen. Geben Sie stattdessen die Endpreise an und fügen Sie den Hinweis hinzu: ‚Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.‘",
                },
                {
                    question: "Wie lange ist ein Angebot ohne Fristangabe gültig?",
                    answer: "Ohne eigene Frist gilt nach § 147 BGB bei schriftlichen Angeboten unter Abwesenden der Zeitraum, in dem der Anbieter unter regelmäßigen Umständen mit einer Antwort rechnen darf (meist ca. 1 bis 2 Wochen). Um Streit zu vermeiden, sollten Sie immer ein konkretes Gültigkeitsdatum auf das Angebot schreiben.",
                },
                {
                    question: "Darf ich für das Erstellen eines Angebots oder Kostenvoranschlags Geld verlangen?",
                    answer: "Sowohl ein Angebot als auch ein Kostenvoranschlag (§ 632 Abs. 3 BGB) sind im Zweifel kostenlos. Eine Vergütung können Sie nur verlangen, wenn Sie dies vorab ausdrücklich und nachweisbar mit dem Kunden vereinbart haben.",
                },
                {
                    question: "Kann ich ein Angebot später direkt in eine Rechnung umwandeln?",
                    answer: "Ja. Sowohl in der Rechly Web-App als auch in der kostenlosen Rechly Desktop-Vollversion (/desktop) wandeln Sie ein angenommenes Angebot mit einem Klick in eine fertige DIN-5008-Rechnung oder XRechnung um, ohne Positionen neu abtippen zu müssen.",
                },
            ]}
            clusterLinks={[
                {
                    href: "/tools/angebotsgenerator",
                    title: "Kostenloser Online-Angebotsgenerator (PDF)",
                    description:
                        "Jetzt Angebot oder Kostenvoranschlag direkt im Browser ausfüllen und sofort als PDF herunterladen.",
                },
                {
                    href: "/desktop",
                    title: "Rechly Desktop (Kostenlose Vollversion)",
                    description:
                        "Angebote & Rechnungen 100 % offline auf Windows & Mac verwalten – mit 1-Klick-Umwandlung.",
                },
                {
                    href: "/rechnung-schreiben",
                    title: "Rechnung schreiben (§ 14 UStG)",
                    description:
                        "Alle Pflichtangaben und Vorlagen, sobald Ihr Kunde das Angebot angenommen hat.",
                },
                {
                    href: "/tools/stundensatz-rechner",
                    title: "Stundensatz-Rechner für Selbstständige",
                    description:
                        "Kalkulieren Sie Ihren kostendeckenden Stundensatz vor dem Schreiben Ihres nächsten Angebots.",
                },
            ]}
        />
    );
}
