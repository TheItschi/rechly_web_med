export interface HomeFaqItem {
    question: string;
    answer: string;
}

export const homeFaqsDe: HomeFaqItem[] = [
    {
        question: "Ist Rechly wirklich kostenlos?",
        answer: "Ja. Die Rechnungssoftware ist kostenlos nutzbar und unter AGPL-3.0 als Open Source veröffentlicht. Es ist kein Rechly-Abo nötig. Wenn du optionale externe KI-Anbieter verwendest oder Rechly selbst hostest, können bei diesen Anbietern eigene Kosten entstehen.",
    },
    {
        question: "Unterstützt Rechly XRechnung und ZUGFeRD?",
        answer: "Ja. Du kannst Rechnungsdaten als XRechnung und ZUGFeRD exportieren und Rechnungen als PDF ausgeben. Prüfe vor dem Versand die Anforderungen deines Empfängers und die Vollständigkeit deiner Angaben.",
    },
    {
        question: "Können meine Kunden online Termine buchen?",
        answer: "Ja. Du kannst eine öffentliche Buchungsseite mit deinen Leistungen und verfügbaren Zeiten einrichten. Du bestimmst Arbeitszeiten, Puffer, Buchungsfristen und die automatische oder manuelle Bestätigung. Kunden brauchen kein Konto und können ihren Termin innerhalb deiner Fristen über einen privaten Link verschieben oder stornieren.",
    },
    {
        question: "Was unterscheidet die Web- und die Desktop-App?",
        answer: "Rechly Web läuft im Browser und bietet unter anderem die öffentlich erreichbare Terminbuchung. Mit Rechly Desktop für Windows und macOS bearbeitest du Rechnungen lokal und offline. Eine automatische Synchronisierung zwischen Web und Desktop ist damit nicht verbunden.",
    },
    {
        question: "Kann ich Daten aus einer anderen Software übernehmen?",
        answer: "Ja. Der Datenimport unterstützt Kunden, Produkte und Belege aus passenden CSV- und Rechnungsdateien. Dazu gehören unterstützte Exportformate von sevdesk und Lexware Office. Du prüfst die erkannten Daten vor dem Speichern. Welche Daten übertragbar sind, hängt von deiner Exportdatei ab.",
    },
    {
        question: "Wie behalte ich die Kontrolle über meine Daten?",
        answer: "Der Quellcode ist öffentlich einsehbar. Du kannst die Web-App selbst hosten oder deine Rechnungen mit der Desktop-App lokal verwalten. Für die gehostete Web-App erklärt die Datenschutzerklärung, welche Daten verarbeitet und welche Dienste eingesetzt werden.",
    },
];

export const homeFaqsEn: HomeFaqItem[] = [
    {
        question: "Is Rechly really free?",
        answer: "Yes. The invoicing software is free to use and open source under AGPL-3.0. No Rechly subscription is required. Optional external AI providers and your own hosting infrastructure may have their own costs.",
    },
    {
        question: "Does Rechly support XRechnung and ZUGFeRD?",
        answer: "Yes. You can export invoice data in XRechnung and ZUGFeRD formats and generate PDF invoices. Check your recipient's requirements and the completeness of your invoice details before sending.",
    },
    {
        question: "Can my clients book appointments online?",
        answer: "Yes. Create a public booking page with your services and available times. Set working hours, buffers, booking windows and automatic or manual approval. Clients do not need an account and can reschedule or cancel through a private link within your notice periods.",
    },
    {
        question: "How do the web and desktop apps differ?",
        answer: "Rechly Web runs in your browser and includes publicly accessible appointment booking. Rechly Desktop for Windows and macOS lets you work on invoices locally and offline. This does not include automatic synchronisation between the web and desktop apps.",
    },
    {
        question: "Can I import data from another application?",
        answer: "Yes. Import clients, products and documents from compatible CSV and invoice files, including supported sevdesk and Lexware Office exports. Review the detected data before saving. What can be transferred depends on your export file.",
    },
    {
        question: "How do I stay in control of my data?",
        answer: "The source code is public. You can self-host the web app or manage invoices locally with the desktop app. For the hosted web app, the privacy policy explains which data is processed and which services are used.",
    },
];
