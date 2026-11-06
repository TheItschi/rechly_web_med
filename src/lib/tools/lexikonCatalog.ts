/**
 * Authoritative German Tax, Invoicing & Accounting Lexikon Catalog (/lexikon/[slug]).
 * Captures massive informational and regulatory search volume in Germany and funnels
 * readers directly into Rechly's free calculators, invoice templates, and generators.
 */

export interface LexikonEntry {
    slug: string;
    term: string;
    title: string;
    metaTitle: string;
    metaDescription: string;
    category: "Rechnungsrecht" | "Steuerrecht & UStG" | "E-Rechnung & GoBD" | "Gründung & Praxis";
    legalReference: string;
    shortDefinition: string;
    keyTakeaways: string[];
    sections: Array<{
        heading: string;
        paragraphs: string[];
        bullets?: string[];
    }>;
    faqs: Array<{
        question: string;
        answer: string;
    }>;
    keywords: string[];
    relatedToolSlugs: string[];
    relatedVorlagenSlugs: string[];
}

export const LEXIKON_CATALOG: LexikonEntry[] = [
    {
        slug: "pflichtangaben-rechnung",
        term: "Pflichtangaben auf Rechnungen (§ 14 UStG)",
        title: "Pflichtangaben auf Rechnungen nach § 14 Abs. 4 UStG – Komplette Checkliste 2026",
        metaTitle: "Pflichtangaben Rechnung (§ 14 UStG): Checkliste & Muster",
        metaDescription:
            "Alle 10 gesetzlichen Pflichtangaben einer Rechnung nach § 14 Abs. 4 UStG im Überblick: Checkliste für Vorsteuerabzug, Ausnahmen bis 250 € & kostenloser Rechnungsgenerator.",
        category: "Rechnungsrecht",
        legalReference: "§ 14 Abs. 4 UStG",
        shortDefinition:
            "Nach § 14 Abs. 4 des Umsatzsteuergesetzes (UStG) muss jede reguläre Rechnung über 250 Euro Brutto zehn zwingende Pflichtangaben enthalten, damit der Rechnungsempfänger zum Vorsteuerabzug berechtigt ist und das Finanzamt den Beleg bei einer Betriebsprüfung anerkennt.",
        keyTakeaways: [
            "Fehlt auch nur eine Pflichtangabe nach § 14 Abs. 4 UStG, kann das Finanzamt dem Kunden den Vorsteuerabzug nach § 15 UStG versagen.",
            "Für Rechnungen bis 250,00 € Brutto gelten die vereinfachten Regeln für Kleinbetragsrechnungen (§ 33 UStDV).",
            "Auch das Liefer- oder Leistungsdatum (Monatsangabe genügt) ist eine zwingende Pflichtangabe – selbst wenn es mit dem Rechnungsdatum identisch ist.",
        ],
        sections: [
            {
                heading: "Die 10 Pflichtangaben nach § 14 Abs. 4 UStG im Detail",
                paragraphs: [
                    "Sobald der Gesamtbetrag einer Rechnung 250,00 Euro (Brutto) übersteigt, prüft das Finanzamt streng nach dem Katalog des § 14 Abs. 4 Satz 1 Nr. 1 bis 10 UStG:",
                ],
                bullets: [
                    "1. Vollständiger Name und vollständige Anschrift des leistenden Unternehmers (Rechnungsaussteller).",
                    "2. Vollständiger Name und vollständige Anschrift des Leistungsempfängers (Kunde).",
                    "3. Steuernummer oder Umsatzsteuer-Identifikationsnummer (USt-IdNr.) des Ausstellers.",
                    "4. Ausstellungsdatum der Rechnung (Rechnungsdatum).",
                    "5. Eine einmalig vergebene, fortlaufende Rechnungsnummer (Rechnungsnummernkreis).",
                    "6. Menge und Art (handelsübliche Bezeichnung) der gelieferten Gegenstände oder Umfang und Art der sonstigen Leistung.",
                    "7. Zeitpunkt der Lieferung oder sonstigen Leistung (Leistungszeitraum / Lieferdatum).",
                    "8. Nach Steuersätzen und einzelnen Steuerbefreiungen aufgeschlüsseltes Netto-Entgelt sowie im Voraus vereinbarte Minderungen (Rabatte/Skonto).",
                    "9. Anzuwendender Steuersatz (19 % oder 7 %) sowie der auf das Entgelt entfallende Steuerbetrag oder im Fall einer Steuerbefreiung ein entsprechender Hinweis (z. B. § 19 UStG oder § 13b UStG).",
                    "10. Hinweis auf die Aufbewahrungspflicht des Leistungsempfängers bei Grundstücksleistungen an Privatpersonen (§ 14b Abs. 1 Satz 5 UStG).",
                ],
            },
            {
                heading: "Folgen fehlerhafter Rechnungen & Rechnungsberichtigung",
                paragraphs: [
                    "Stellt der Kunde fest, dass eine Pflichtangabe fehlt oder falsch ist (z. B. falsche Rechtsform oder fehlendes Leistungsdatum), darf er die Zahlung nach § 273 BGB zurückhalten, bis er eine ordnungsgemäße Rechnung erhält.",
                    "Eine Korrektur erfolgt nach GoBD durch eine Stornorechnung und Neuausstellung oder ein spezifisches Berichtigungsdokument nach § 31 Abs. 5 UStDV.",
                ],
            },
        ],
        faqs: [
            {
                question: "Muss eine Rechnung unterschrieben sein?",
                answer: "Nein. Weder für Papierrechnungen noch für PDF- oder E-Rechnungen schreibt das Umsatzsteuergesetz eine eigenhändige Unterschrift vor.",
            },
            {
                question: "Genügt der Hinweis 'Leistungsdatum entspricht Rechnungsdatum'?",
                answer: "Ja, nach § 31 Abs. 4 UStDV ist dieser Satz ausdrücklich zulässig, sofern die Leistung tatsächlich am Tag der Rechnungsausstellung erbracht oder abgeschlossen wurde.",
            },
        ],
        keywords: ["Pflichtangaben Rechnung", "§ 14 UStG Checkliste", "Rechnung Pflichtangaben 2026"],
        relatedToolSlugs: ["rechnungsgenerator", "stornorechnung-generator", "mehrwertsteuer-rechner"],
        relatedVorlagenSlugs: ["freiberufler", "handwerker", "kleinunternehmer"],
    },
    {
        slug: "kleinbetragsrechnung",
        term: "Kleinbetragsrechnung (§ 33 UStDV)",
        title: "Kleinbetragsrechnung bis 250 Euro (§ 33 UStDV) – Regeln & Pflichtangaben",
        metaTitle: "Kleinbetragsrechnung bis 250 € (§ 33 UStDV): Pflichtangaben",
        metaDescription:
            "Was muss auf einer Kleinbetragsrechnung bis 250 € Brutto stehen? Alle Pflichtangaben nach § 33 UStDV für Kassenbons, Tankbelege, Bewirtung & Quittungen.",
        category: "Rechnungsrecht",
        legalReference: "§ 33 UStDV",
        shortDefinition:
            "Eine Kleinbetragsrechnung nach § 33 der Umsatzsteuer-Durchführungsverordnung (UStDV) ist eine Rechnung, deren Gesamtbetrag 250,00 Euro inklusive Umsatzsteuer (Brutto) nicht übersteigt. Für sie gelten stark vereinfachte Pflichtangaben.",
        keyTakeaways: [
            "Grenze liegt bei exakt 250,00 € Brutto (inklusive 19 % oder 7 % Umsatzsteuer).",
            "Name und Anschrift des Empfängers sowie eine fortlaufende Rechnungsnummer und das Leistungsdatum sind NICHT erforderlich.",
            "Bruttobetrag und Steuersatz (z. B. 'inkl. 19 % MwSt.') genügen – der Steuerbetrag muss nicht separat in Euro ausgewiesen werden.",
        ],
        sections: [
            {
                heading: "Welche 4 Angaben genügen bei einer Kleinbetragsrechnung?",
                paragraphs: [
                    "Damit Kassenbons, Quittungen und kleine Rechnungen im Alltag schnell ausgestellt werden können, verlangt § 33 UStDV lediglich vier Kernangaben:",
                ],
                bullets: [
                    "1. Vollständiger Name und vollständige Anschrift des leistenden Unternehmers.",
                    "2. Das Ausstellungsdatum.",
                    "3. Die Menge und die Art der gelieferten Gegenstände oder der Umfang und die Art der sonstigen Leistung.",
                    "4. Das Entgelt und der darauf entfallende Steuerbetrag für die Lieferung oder sonstige Leistung in einer Summe (Bruttobetrag) sowie der anzuwendende Steuersatz (z. B. 19 % oder 7 %) oder ein Hinweis auf eine Steuerbefreiung.",
                ],
            },
        ],
        faqs: [
            {
                question: "Gilt die 250-Euro-Grenze Netto oder Brutto?",
                answer: "Die Grenze von 250,00 Euro nach § 33 UStDV versteht sich immer als Bruttobetrag inklusive Umsatzsteuer (bei 19 % MwSt. entspricht dies 210,08 € Netto).",
            },
            {
                question: "Wann gilt die Vereinfachung für Kleinbetragsrechnungen NICHT?",
                answer: "Beim innergemeinschaftlichen Versandhandel, bei innergemeinschaftlichen Lieferungen (§ 6a UStG) sowie bei Reverse-Charge-Umsätzen nach § 13b UStG muss auch unter 250 € immer eine vollständige Rechnung ausgestellt werden.",
            },
        ],
        keywords: ["Kleinbetragsrechnung 250 Euro", "§ 33 UStDV Pflichtangaben", "Quittung bis 250 Euro"],
        relatedToolSlugs: ["quittung-erstellen", "bewirtungsbeleg-rechner", "mehrwertsteuer-rechner"],
        relatedVorlagenSlugs: ["kleinunternehmer", "handwerker"],
    },
    {
        slug: "e-rechnung-pflicht",
        term: "E-Rechnungspflicht 2025–2028",
        title: "E-Rechnungspflicht in Deutschland (2025 bis 2028) – Fristen, Ausnahmen & Formate",
        metaTitle: "E-Rechnungspflicht 2025, 2027 & 2028: Fristen & Ausnahmen",
        metaDescription:
            "Alles zur gesetzlichen E-Rechnungspflicht nach dem Wachstumschancengesetz: Empfangspflicht seit 01.01.2025, Übergangsfristen 2027/2028, Ausnahmen für Kleinbeträge & XRechnung/ZUGFeRD.",
        category: "E-Rechnung & GoBD",
        legalReference: "§ 14 Abs. 1 UStG (Wachstumschancengesetz)",
        shortDefinition:
            "Durch das Wachstumschancengesetz ist die elektronische Rechnung (E-Rechnung nach der europäischen Norm EN 16931 wie XRechnung und ZUGFeRD ab Version 2.0.1) seit dem 1. Januar 2025 der gesetzliche Standard für inländische B2B-Umsätze in Deutschland.",
        keyTakeaways: [
            "Ab 01.01.2025:Jedes deutsche Unternehmen (auch Kleinunternehmer!) muss in der Lage sein, strukturierte E-Rechnungen (XRechnung / ZUGFeRD) zu empfangen und auszulesen.",
            "Bis 31.12.2026: Allgemeine Übergangsfrist – Papierrechnungen sowie PDF-Rechnungen (mit Zustimmung des Empfängers) bleiben für den Versand noch zulässig.",
            "Ab 01.01.2027: Verpflichtender E-Rechnungsversand für Unternehmen mit mehr als 800.000 € Vorjahresumsatz.",
            "Ab 01.01.2028: Verpflichtender E-Rechnungsversand für alle B2B-Unternehmen.",
        ],
        sections: [
            {
                heading: "Was gilt gesetzlich als E-Rechnung – und was nicht mehr?",
                paragraphs: [
                    "Das neugefasste Umsatzsteuergesetz unterscheidet streng zwischen einer 'elektronischen Rechnung' und einer 'sonstigen Rechnung': Eine einfache PDF-Datei per E-Mail oder ein eingescanntes Papierdokument ist KEINE E-Rechnung mehr!",
                    "Als echte E-Rechnung gilt nur ein Rechnungsdokument, das in einem strukturierten elektronischen Format gemäß der europäischen Norm CEN EN 16931 ausgestellt, übermittelt und empfangen wird und eine automatische elektronische Weiterverarbeitung ermöglicht. Die beiden führenden Standards in Deutschland sind XRechnung (reines XML) und ZUGFeRD (hybrides PDF/A-3 mit eingebettetem XML).",
                ],
            },
        ],
        faqs: [
            {
                question: "Müssen auch Kleinunternehmer (§ 19 UStG) E-Rechnungen empfangen können?",
                answer: "Ja! Die Empfangspflicht gilt seit dem 1. Januar 2025 ausnahmslos für alle inländischen Unternehmer im B2B-Bereich – auch für Kleinunternehmer, Vermieter und Freiberufler. Mit dem kostenlosen Rechly E-Rechnung Viewer können Sie jede XRechnung oder ZUGFeRD-Datei sofort ohne Softwareinstallation öffnen.",
            },
            {
                question: "Gilt die E-Rechnungspflicht auch für Rechnungen an Privatkunden (B2C)?",
                answer: "Nein. Gegenüber privaten Endverbrauchern (B2C) sowie bei Kleinbetragsrechnungen bis 250 € Brutto (§ 33 UStDV) und Fahrausweisen (§ 34 UStDV) dürfen weiterhin Papier- oder Standard-PDF-Rechnungen genutzt werden.",
            },
        ],
        keywords: ["E-Rechnungspflicht 2025", "E-Rechnung Übergangsfristen 2027 2028", "Wachstumschancengesetz E-Rechnung"],
        relatedToolSlugs: ["e-rechnung-viewer", "rechnungsgenerator", "leitweg-id-pruefen"],
        relatedVorlagenSlugs: ["it-freelancer", "beratung-consulting"],
    },
    {
        slug: "kleinunternehmerregelung",
        term: "Kleinunternehmerregelung (§ 19 UStG)",
        title: "Kleinunternehmerregelung (§ 19 UStG) 2026 – Neue Grenzen (25.000 € / 100.000 €)",
        metaTitle: "Kleinunternehmerregelung 2026 (§ 19 UStG): 25.000 € Grenze",
        metaDescription:
            "Die reformierte Kleinunternehmerregelung nach § 19 UStG ab 2025/2026: Neue Umsatzgrenzen 25.000 € (Vorjahr) und 100.000 € (laufendes Jahr), echte Steuerbefreiung & Rechnungshinweis.",
        category: "Steuerrecht & UStG",
        legalReference: "§ 19 UStG (Jahressteuergesetz 2024)",
        shortDefinition:
            "Die Kleinunternehmerregelung nach § 19 UStG befreit Unternehmer mit geringen Umsätzen von der Pflicht, Umsatzsteuer auf ihren Rechnungen auszuweisen und an das Finanzamt abzuführen. Im Gegenzug entfällt das Recht auf Vorsteuerabzug aus Eingangsrechnungen.",
        keyTakeaways: [
            "Neue Vorjahresgrenze: Maximal 25.000 € Netto-Gesamtumsatz im vorangegangenen Kalenderjahr (früher 22.000 € Brutto).",
            "Neue harte Obergrenze im laufenden Jahr: Maximal 100.000 € Umsatz im laufenden Kalenderjahr. Wird die 100.000-€-Grenze unterjährig überschritten, endet der Kleinunternehmerstatus sofort ab dem Umsatz, der die Grenze überschreitet!",
            "Keine Prognose mehr nötig: Die frühere 50.000-€-Prognosegrenze zu Jahresbeginn wurde durch die harte 100.000-€-Grenze ersetzt.",
        ],
        sections: [
            {
                heading: "Was hat sich durch das Jahressteuergesetz 2024 ab 2025/2026 geändert?",
                paragraphs: [
                    "Mit der Umsetzung der EU-Kleinunternehmerrichtlinie wurde § 19 UStG grundlegend modernisiert: Umsätze von Kleinunternehmern sind nun gesetzlich eine echte Umsatzsteuerbefreiung. Die maßgeblichen Grenzen orientieren sich an Nettoumsätzen (25.000 € im Vorjahr / 100.000 € im laufenden Jahr).",
                    "Auf jeder Kleinunternehmer-Rechnung muss zwingend ein Hinweis auf die Steuerbefreiung stehen, zum Beispiel: 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'",
                ],
            },
        ],
        faqs: [
            {
                question: "Was passiert, wenn ich im laufenden Jahr 30.000 € Umsatz mache?",
                answer: "Solange Sie im Vorjahr unter 25.000 € lagen und im laufenden Jahr die 100.000-€-Grenze nicht überschreiten, bleiben Sie für das gesamte laufende Jahr Kleinunternehmer. Erst ab dem 1. Januar des Folgejahres wechseln Sie dann in die Regelbesteuerung.",
            },
        ],
        keywords: ["Kleinunternehmerregelung 2026", "§ 19 UStG 25000 Euro", "Kleinunternehmer Grenze 100000"],
        relatedToolSlugs: ["kleinunternehmer-rechner", "rechnungsgenerator", "euer-rechner"],
        relatedVorlagenSlugs: ["kleinunternehmer", "dozent-nachhilfe"],
    },
    {
        slug: "gobd-konformitaet",
        term: "GoBD-Konformität",
        title: "GoBD einfach erklärt – Was bedeutet GoBD-konforme Rechnungsstellung?",
        metaTitle: "GoBD einfach erklärt: Regeln für Rechnungen & Buchhaltung",
        metaDescription:
            "Was bedeutet GoBD-konform? Warum Word und Excel bei einer Betriebsprüfung durchfallen, wie Unveränderbarkeit funktioniert und wie Sie Belege rechtssicher archivieren.",
        category: "E-Rechnung & GoBD",
        legalReference: "BMF-Schreiben zu §§ 145–147 AO (GoBD)",
        shortDefinition:
            "Die GoBD ('Grundsätze zur ordnungsmäßigen Führung und Aufbewahrung von Büchern, Aufzeichnungen und Unterlagen in elektronischer Form sowie zum Datenzugriff') regeln verbindlich, wie deutsche Unternehmen, Freiberufler und Kleinunternehmer digitale Rechnungen und Belege erstellen, verbuchen und archivieren müssen.",
        keyTakeaways: [
            "Grundsatz der Unveränderbarkeit: Eine versendete oder gebuchte Rechnung darf nachträglich nicht mehr unprotokolliert geändert oder gelöscht werden.",
            "Aufbewahrung im Originalformat: Digitale Eingangsrechnungen (PDF, XRechnung, ZUGFeRD) müssen digital aufbewahrt werden – ein bloßer Papierausdruck genügt nicht.",
            "Zeitnahe Erfassung: Unbare Geschäftsvorfälle sollten innerhalb von 10 Tagen, Kassenvorgänge täglich festgehalten werden.",
        ],
        sections: [
            {
                heading: "Die 6 wichtigsten Grundsätze der GoBD für Selbstständige",
                paragraphs: [
                    "Jeder Steuerpflichtige mit Gewinneinkünften (egal ob Bilanzierer oder EÜR-Rechner, egal ob Regelbesteuerer oder Kleinunternehmer) muss die GoBD beachten:",
                ],
                bullets: [
                    "Nachvollziehbarkeit und Nachprüfbarkeit: Ein sachverständiger Dritter (Betriebsprüfer) muss sich in angemessener Zeit einen Überblick verschaffen können.",
                    "Vollständigkeit: Alle Ein- und Ausgangsrechnungen müssen lückenlos vorhanden sein.",
                    "Richtigkeit: Geschäftsvorfälle müssen wahrheitsgemäß abgebildet werden.",
                    "Zeitgerechte Buchung und Aufzeichnung: Keine monatelangen Belegsammlungen im Schuhkarton.",
                    "Ordnung: Systematische Ablage für schnellen Datenzugriff (Z1/Z2/Z3-Zugriff).",
                    "Unveränderbarkeit (§ 146 Abs. 4 AO): Korrekturen dürfen nur über nachvollziehbare Stornorechnungen erfolgen.",
                ],
            },
        ],
        faqs: [
            {
                question: "Sind Rechnungen mit Word oder Excel GoBD-konform?",
                answer: "Das reine Schreiben einer Rechnung in Word ist zwar nicht verboten, aber die anschließende Ablage auf einer normalen Festplatte im Dateisystem verstößt gegen den Grundsatz der Unveränderbarkeit, da Dateien jederzeit überschrieben werden können.",
            },
        ],
        keywords: ["GoBD einfach erklärt", "GoBD konforme Rechnung", "Word Rechnung GoBD"],
        relatedToolSlugs: ["rechnungsgenerator", "stornorechnung-generator", "kassenbuch-vorlage"],
        relatedVorlagenSlugs: ["freiberufler", "it-freelancer"],
    },
    {
        slug: "aufbewahrungsfristen",
        term: "Aufbewahrungsfristen (8 & 10 Jahre)",
        title: "Aufbewahrungsfristen für Rechnungen & Geschäftsunterlagen (Neu: 8 Jahre nach BEG IV)",
        metaTitle: "Aufbewahrungsfristen Rechnungen: Neu 8 statt 10 Jahre (BEG IV)",
        metaDescription:
            "Wie lange müssen Rechnungen aufbewahrt werden? Alle neuen Aufbewahrungsfristen nach dem Bürokratieentlastungsgesetz IV (BEG IV): 8 Jahre für Buchungsbelege & Rechnungen, 10 Jahre für Bilanzen.",
        category: "E-Rechnung & GoBD",
        legalReference: "§ 147 AO, § 14b UStG, § 257 HGB (BEG IV)",
        shortDefinition:
            "Durch das Vierte Bürokratieentlastungsgesetz (BEG IV) wurde die gesetzliche Aufbewahrungsfrist für Buchungsbelege sowie Ein- und Ausgangsrechnungen (§ 147 Abs. 3 AO, § 14b UStG, § 257 HGB) in Deutschland von bisher 10 Jahren auf 8 Jahre verkürzt.",
        keyTakeaways: [
            "8 Jahre Aufbewahrungsfrist (neu durch BEG IV): Gilt für alle Ein- und Ausgangsrechnungen, Quittungen, Kassenbons, Kontoauszüge und Lieferscheine mit Belegfunktion.",
            "10 Jahre Aufbewahrungsfrist: Gilt weiterhin für Jahresabschlüsse, Bilanzen, Inventare, Einnahmen-Überschuss-Rechnungen (EÜR) und Lageberichte.",
            "6 Jahre Aufbewahrungsfrist: Gilt für empfangene und abgesandte Handels- und Geschäftsbriefe (z. B. Angebote, Auftragsbestätigungen ohne Belegfunktion).",
            "2 Jahre Aufbewahrungsfrist für Privatpersonen (§ 14b Abs. 1 S. 5 UStG): Bei Handwerkerrechnungen rund um ein Grundstück oder Eigenheim.",
        ],
        sections: [
            {
                heading: "Wann beginnt und endet die 8-jährige Aufbewahrungsfrist?",
                paragraphs: [
                    "Die Aufbewahrungsfrist beginnt immer mit dem Schluss des Kalenderjahres, in dem die Rechnung ausgestellt wurde (§ 147 Abs. 4 AO). Wurde eine Rechnung beispielsweise am 15. März 2026 ausgestellt, beginnt die Frist am 31. Dezember 2026 um 24:00 Uhr und endet nach 8 Jahren am 31. Dezember 2034.",
                ],
            },
        ],
        faqs: [
            {
                question: "Was muss ich bei Thermopapier-Kassenbons beachten?",
                answer: "Da Thermopapier (z. B. Tankquittungen oder Bewirtungsbelege) oft schon nach wenigen Monaten verblasst, müssen Sie den Beleg sofort nach Erhalt digitalisieren (scannen/fotografieren), damit die Lesbarkeit über die vollen 8 Jahre gewährleistet bleibt.",
            },
        ],
        keywords: ["Aufbewahrungsfrist Rechnungen 8 Jahre", "BEG IV Aufbewahrungsfristen", "Wie lange Rechnungen aufbewahren"],
        relatedToolSlugs: ["bewirtungsbeleg-rechner", "kassenbuch-vorlage", "e-rechnung-viewer"],
        relatedVorlagenSlugs: ["handwerker", "dauerrechnung"],
    },
    {
        slug: "rechnungsnummer",
        term: "Fortlaufende Rechnungsnummer",
        title: "Fortlaufende Rechnungsnummer (§ 14 UStG) – Regeln, Formate & Nummernkreise",
        metaTitle: "Fortlaufende Rechnungsnummer (§ 14 UStG): Regeln & Beispiele",
        metaDescription:
            "Muss eine Rechnungsnummer mit 1 beginnen? Sind Lücken erlaubt? Alles zu fortlaufenden Rechnungsnummern nach § 14 UStG und § 31 Abs. 2 UStDV mit besten Format-Beispielen.",
        category: "Rechnungsrecht",
        legalReference: "§ 14 Abs. 4 Nr. 4 UStG & § 31 Abs. 2 UStDV",
        shortDefinition:
            "Nach § 14 Abs. 4 Satz 1 Nr. 4 UStG muss jede Rechnung eine fortlaufende Nummer mit einer oder mehreren Zahlenreihen enthalten, die zur Identifizierung der Rechnung vom Rechnungsaussteller einmalig vergeben wird.",
        keyTakeaways: [
            "Einmaligkeit ist das oberste Gebot: Jede Rechnungsnummer darf im Unternehmen nur ein einziges Mal existieren.",
            "Keine Pflicht zu 1, 2, 3: Sie müssen der Konkurrenz nicht verraten, wie viele Rechnungen Sie schreiben. Kombinationen aus Jahr, Monat oder Kundennummer (z. B. RE-2026-1042) sind ausdrücklich erlaubt.",
            "Mehrere Nummernkreise sind zulässig (§ 31 Abs. 2 UStDV): Sie dürfen eigene Nummernkreise pro Kunde, Projekt oder Filiale anlegen.",
        ],
        sections: [
            {
                heading: "Bewährte Formate für professionelle Rechnungsnummern",
                paragraphs: [
                    "Ein durchdachtes Rechnungsnummern-Schema erleichtert die Zuordnung von Zahlungseingängen auf dem Bankkonto erheblich:",
                ],
                bullets: [
                    "Jahresbasiertes Schema: RE-2026-1001, RE-2026-1002 (Start bei 1001 wirkt etablierter als 0001).",
                    "Datumsbasiertes Schema: 2026-10-24-01 (Jahr-Monat-Tag-Tageszähler – absolut eindeutig, ohne das Gesamtvolumen offenzulegen).",
                    "Kunden-/Projekt-Nummernkreis: KD402-2026-01 (eigener Nummernkreis für Großkunden).",
                ],
            },
        ],
        faqs: [
            {
                question: "Was passiert, wenn eine Lücke in den Rechnungsnummern entsteht?",
                answer: "Eine technisch bedingte Lücke (z. B. durch einen gelöschten Entwurf vor dem Versand) führt nicht zur Ungültigkeit der Rechnung, sollte aber für eine spätere Betriebsprüfung kurz dokumentiert werden. Wurde eine Rechnung bereits versendet, muss sie per Stornorechnung ausgeglichen werden.",
            },
        ],
        keywords: ["fortlaufende Rechnungsnummer", "Rechnungsnummer Aufbau Beispiel", "Rechnungsnummer Lücke"],
        relatedToolSlugs: ["rechnungsgenerator", "stornorechnung-generator"],
        relatedVorlagenSlugs: ["freiberufler", "kleinunternehmer"],
    },
    {
        slug: "handwerkerrechnung-35a",
        term: "Steuerbonus Handwerkerrechnung (§ 35a EStG)",
        title: "Handwerkerrechnung absetzen (§ 35a EStG) – Bis zu 1.200 € Steuerbonus sichern",
        metaTitle: "Handwerkerrechnung absetzen (§ 35a EStG): 20 % Steuerbonus",
        metaDescription:
            "Wie Privatkunden 20 % der Arbeits- und Fahrtkosten (bis zu 1.200 € pro Jahr) von der Steuer abziehen und wie Handwerker ihre Rechnung nach § 35a EStG korrekt ausstellen.",
        category: "Steuerrecht & UStG",
        legalReference: "§ 35a Abs. 3 EStG",
        shortDefinition:
            "Nach § 35a Abs. 3 des Einkommensteuergesetzes (EStG) können Privatpersonen 20 % der in einer Handwerkerrechnung enthaltenen Arbeits-, Fahrt- und Maschinenkosten (maximal 20 % von 6.000 € = 1.200 € pro Jahr) direkt von ihrer Einkommensteuerschuld abziehen.",
        keyTakeaways: [
            "Bis zu 1.200 € direkte Steuererstattung pro Jahr und Haushalt für Renovierungs-, Erhaltungs- und Modernisierungsmaßnahmen.",
            "Zusätzlich bis zu 4.000 € Steuerermäßigung für haushaltsnahe Dienstleistungen (§ 35a Abs. 2 EStG, z. B. Reinigung, Gartenpflege, Winterdienst).",
            "Strenges Barzahlungsverbot (§ 35a Abs. 5 Satz 3 EStG): Die Zahlung MUSS unbar per Überweisung oder Kartenzahlung auf das Konto des Handwerkers erfolgen!",
        ],
        sections: [
            {
                heading: "Welche Anforderungen muss die Handwerkerrechnung erfüllen?",
                paragraphs: [
                    "Damit das Finanzamt den Steuerbonus gewährt, muss der Handwerksbetrieb auf der Rechnung zwingend zwischen begünstigten Lohn-/Fahrtkosten und nicht begünstigten Materialkosten trennen:",
                ],
                bullets: [
                    "Begünstigt (20 % Abzug): Arbeitslohn vor Ort, Anfahrtskosten, Maschinen- und Gerätekosten sowie Verbrauchsmittel (z. B. Abdeckfolie, Reinigungsmittel) inklusive der darauf entfallenden Mehrwertsteuer.",
                    "Nicht begünstigt: Eingebaute Materialien und Waren (z. B. Fliesen, Farbe, Heizkörper, Ersatzteile).",
                    "Unbare Zahlung: Bei Barzahlung gegen Quittung verweigert das Finanzamt den Steuerabzug ausnahmslos!",
                ],
            },
        ],
        faqs: [
            {
                question: "Gilt § 35a EStG auch für Mieter?",
                answer: "Ja! Sowohl Eigentümer als auch Mieter können Handwerkerleistungen in ihrer selbstgenutzten Wohnung steuerlich geltend machen – selbst dann, wenn die Kosten über die jährliche Nebenkostenabrechnung des Vermieters abgerechnet wurden.",
            },
        ],
        keywords: ["Handwerkerrechnung absetzen § 35a EStG", "Lohnanteil Handwerkerrechnung ausweisen", "Haushaltsnahe Dienstleistungen 35a"],
        relatedToolSlugs: ["rechnungsgenerator", "girocode-generator", "fahrtkosten-rechner"],
        relatedVorlagenSlugs: ["handwerker", "gartenbau-hausmeister", "reinigungsgewerbe"],
    },
    {
        slug: "reverse-charge-13b",
        term: "Reverse-Charge-Verfahren (§ 13b UStG)",
        title: "Reverse-Charge-Verfahren (§ 13b UStG) – Steuerschuldnerschaft des Leistungsempfängers",
        metaTitle: "Reverse Charge (§ 13b UStG): Bauleistungen & EU-Rechnungen",
        metaDescription:
            "Wann gilt § 13b UStG (Reverse Charge)? Alles zur Umkehr der Steuerschuldnerschaft bei EU-B2B-Rechnungen, ausländischen Dienstleistern und Bauleistungen (Freistellungsbescheinigung).",
        category: "Steuerrecht & UStG",
        legalReference: "§ 13b UStG",
        shortDefinition:
            "Beim Reverse-Charge-Verfahren (Umkehr der Steuerschuldnerschaft nach § 13b UStG) schuldet nicht der Rechnungsaussteller, sondern der gewerbliche Rechnungsempfänger die Umsatzsteuer gegenüber seinem Finanzamt. Die Rechnung wird daher zwingend als reine Netto-Rechnung (0 % USt.) ausgestellt.",
        keyTakeaways: [
            "Der Leistende stellt eine reine Netto-Rechnung ohne Umsatzsteuer aus.",
            "Pflichthinweis auf der Rechnung: 'Steuerschuldnerschaft des Leistungsempfängers gemäß § 13b UStG'.",
            "Der Leistungsempfänger meldet die Umsatzsteuer in seiner USt-Voranmeldung an und zieht sie bei Vorsteuerabzugsberechtigung im selben Moment wieder als Vorsteuer ab (Nullsummenspiel).",
        ],
        sections: [
            {
                heading: "Die 3 wichtigsten Anwendungsfälle von § 13b UStG in der Praxis",
                paragraphs: [
                    "In Deutschland begegnet Ihnen das Reverse-Charge-Verfahren vor allem in drei Konstellationen:",
                ],
                bullets: [
                    "1. Grenzüberschreitende B2B-Dienstleistungen innerhalb der EU (§ 13b Abs. 1 / Abs. 2 Nr. 1 UStG): Sie beauftragen z. B. SaaS-Anbieter, Werbeplattformen oder Freelancer aus dem EU-Ausland oder erbringen selbst Leistungen an EU-Unternehmen.",
                    "2. Bauleistungen an andere Bauleistende im Inland (§ 13b Abs. 2 Nr. 4 UStG): Subunternehmer am Bau rechnen gegenüber Generalunternehmern mit gültiger USt 1 TG-Bescheinigung netto ab.",
                    "3. Gebäudereinigungsleistungen (§ 13b Abs. 2 Nr. 8 UStG): Wenn der Auftraggeber selbst nachhaltig Gebäudereinigungsleistungen erbringt.",
                ],
            },
        ],
        faqs: [
            {
                question: "Gilt § 13b UStG bei Eingangsrechnungen aus dem Ausland auch für Kleinunternehmer?",
                answer: "Ja, Vorsicht! Wenn ein deutscher Kleinunternehmer (§ 19 UStG) Dienstleistungen oder Software-Abos aus dem Ausland bezieht, schuldet er darauf nach § 13b UStG die deutsche Umsatzsteuer von 19 % – darf diese aber als Kleinunternehmer NICHT als Vorsteuer abziehen!",
            },
        ],
        keywords: ["Reverse Charge § 13b UStG", "Steuerschuldnerschaft des Leistungsempfängers", "Bauleistungen 13b Rechnung"],
        relatedToolSlugs: ["reverse-charge-rechner", "ust-idnr-pruefen", "rechnungsgenerator"],
        relatedVorlagenSlugs: ["bauleistung-13b", "it-freelancer", "reinigungsgewerbe"],
    },
    {
        slug: "ist-vs-soll-versteuerung",
        term: "Ist-Versteuerung vs. Soll-Versteuerung",
        title: "Ist-Versteuerung vs. Soll-Versteuerung (§ 16 & § 20 UStG) – Was spart mehr Liquidität?",
        metaTitle: "Ist-Versteuerung vs. Soll-Versteuerung (§ 20 UStG): Antrag",
        metaDescription:
            "Soll-Versteuerung oder Ist-Versteuerung? Wann Sie die Umsatzsteuer erst nach Zahlungseingang ans Finanzamt abführen müssen (§ 20 UStG) und wer den Antrag stellen darf.",
        category: "Steuerrecht & UStG",
        legalReference: "§ 16 UStG & § 20 UStG",
        shortDefinition:
            "Bei der Soll-Versteuerung (Versteuerung nach vereinbarten Entgelten, § 16 UStG) wird die Umsatzsteuer bereits mit Ausführung der Leistung und Rechnungsstellung ans Finanzamt fällig – noch bevor der Kunde gezahlt hat. Bei der Ist-Versteuerung (Versteuerung nach vereinnahmten Entgelten, § 20 UStG) müssen Sie die Umsatzsteuer erst dann abführen, wenn das Geld tatsächlich auf Ihrem Bankkonto eingegangen ist.",
        keyTakeaways: [
            "Liquiditätsvorteil: Die Ist-Versteuerung schützt Sie davor, Umsatzsteuer für säumige Kunden aus eigener Tasche vorstrecken zu müssen.",
            "Wer darf die Ist-Versteuerung nach § 20 UStG nutzen? Alle Freiberufler (§ 18 EStG unabhängig vom Umsatz!) sowie Gewerbetreibende mit einem Vorjahresumsatz von bis zu 800.000 Euro (erhöht durch das Wachstumschancengesetz).",
        ],
        sections: [
            {
                heading: "Wie beantragt man die Ist-Versteuerung beim Finanzamt?",
                paragraphs: [
                    "Gleich bei der Gründung kreuzen Sie im 'Fragebogen zur steuerlichen Erfassung' auf ELSTER die Berechnung der Umsatzsteuer nach 'vereinnahmten Entgelten (§ 20 UStG)' an. Auch ein späterer Wechsel von der Soll- zur Ist-Versteuerung ist jederzeit durch einen formlosen Antrag beim zuständigen Finanzamt möglich.",
                ],
            },
        ],
        faqs: [
            {
                question: "Bis zu welchem Umsatz dürfen Gewerbetreibende die Ist-Versteuerung nutzen?",
                answer: "Durch das Wachstumschancengesetz wurde die Umsatzgrenze in § 20 Satz 1 Nr. 1 UStG auf 800.000 Euro im vorangegangenen Kalenderjahr angehoben. Für Freiberufler (die nicht buchführungspflichtig sind) gilt überhaupt keine Umsatzobergrenze.",
            },
        ],
        keywords: ["Ist-Versteuerung Soll-Versteuerung Unterschied", "§ 20 UStG Grenze 800000", "vereinnahmte Entgelte"],
        relatedToolSlugs: ["steuerkalender-2026", "euer-rechner", "mehrwertsteuer-rechner"],
        relatedVorlagenSlugs: ["freiberufler", "beratung-consulting"],
    },
    {
        slug: "gutschrift-vs-stornorechnung",
        term: "Gutschrift vs. Stornorechnung",
        title: "Gutschrift vs. Stornorechnung – Warum der falsche Begriff Umsatzsteuer kostet",
        metaTitle: "Gutschrift vs. Stornorechnung (§ 14 UStG): Unterschied & Muster",
        metaDescription:
            "Was ist der Unterschied zwischen einer Gutschrift und einer Stornorechnung (Rechnungskorrektur)? Wann § 14c UStG droht und wie Sie fehlerhafte Rechnungen richtig stornieren.",
        category: "Rechnungsrecht",
        legalReference: "§ 14 Abs. 2 S. 2 UStG & § 14c UStG",
        shortDefinition:
            "Im deutschen Umsatzsteuerrecht bezeichnet eine 'Gutschrift' (§ 14 Abs. 2 Satz 2 UStG) ausschließlich eine Rechnung im umgekehrten Verfahren, bei der der Leistungsempfänger für den Lieferanten abrechnet (z. B. Provisionsgutschrift). Die Korrektur oder Aufhebung einer bereits gestellten Rechnung heißt dagegen zwingend 'Stornorechnung' oder 'Rechnungskorrektur'.",
        keyTakeaways: [
            "Echte Gutschrift (Abrechnungsgutschrift): Positiver Betrag – der Kunde stellt dem Dienstleister den Beleg über dessen Honorar/Provision aus.",
            "Stornorechnung (Rechnungskorrektur): Negativer Betrag – der Rechnungsaussteller hebt eine eigene fehlerhafte Ausgangsrechnung ganz oder teilweise auf.",
            "Pflichtangaben auf der Stornorechnung: Eigene Belegnummer, negativer Betrag und eindeutiger Verweis auf Nummer und Datum der Ursprungsrechnung.",
        ],
        sections: [
            {
                heading: "So stornieren und korrigieren Sie eine Rechnung GoBD-konform in 2 Schritten",
                paragraphs: [
                    "Wenn eine Rechnung bereits an den Kunden verschickt oder verbucht wurde, gehen Sie wie folgt vor:",
                ],
                bullets: [
                    "Schritt 1: Erstellen Sie eine Stornorechnung (Rechnungskorrektur) über den negativen Betrag mit Verweis auf die ursprüngliche Rechnungsnummer (z. B. 'Stornierung zu Rechnung RE-2026-1018 vom 05.10.2026').",
                    "Schritt 2: Erstellen Sie eine neue, korrekte Rechnung unter einer neuen fortlaufenden Rechnungsnummer.",
                ],
            },
        ],
        faqs: [
            {
                question: "Droht bei einer falsch benannten 'Gutschrift' eine doppelte Steuerschuld nach § 14c UStG?",
                answer: "Das Bundesfinanzministerium (BMF) hat zwar klargestellt, dass die bloße Verwendung des Wortes 'Gutschrift' für eine Stornorechnung allein noch keine unberechtigte Steuerschuld nach § 14c UStG auslöst, sofern aus dem Beleg eindeutig hervorgeht, dass eine frühere Rechnung korrigiert wird. Dennoch sollten Sie im Geschäftsverkehr sauber den Begriff 'Stornorechnung' oder 'Rechnungskorrektur' nutzen.",
            },
        ],
        keywords: ["Unterschied Gutschrift Stornorechnung", "Rechnungskorrektur § 14 UStG", "Abrechnungsgutschrift"],
        relatedToolSlugs: ["stornorechnung-generator", "rechnungsgenerator"],
        relatedVorlagenSlugs: ["freiberufler", "it-freelancer"],
    },
    {
        slug: "leistungszeitraum",
        term: "Leistungszeitraum & Lieferdatum",
        title: "Leistungszeitraum & Lieferdatum auf der Rechnung (§ 14 UStG & § 31 UStDV)",
        metaTitle: "Leistungszeitraum & Lieferdatum Rechnung: Muster & § 14 UStG",
        metaDescription:
            "Leistungszeitraum & Lieferdatum auf der Rechnung (§ 14 UStG): Kopiervorlagen ('Leistungsdatum entspricht Rechnungsdatum', Monatsangabe § 31 UStDV) & Beispiele.",
        category: "Rechnungsrecht",
        legalReference: "§ 14 Abs. 4 Nr. 6 UStG & § 31 Abs. 4 UStDV",
        shortDefinition:
            "Der Zeitpunkt der Lieferung oder sonstigen Leistung (Leistungsdatum bzw. Leistungszeitraum) ist nach § 14 Abs. 4 Satz 1 Nr. 6 UStG eine zwingende Pflichtangabe auf jeder Rechnung über 250 Euro Brutto. Nach § 31 Abs. 4 UStDV genügt dabei die Angabe des Kalendermonats, in dem die Leistung ausgeführt wurde.",
        keyTakeaways: [
            "Ohne Angabe des Liefer- oder Leistungszeitpunkts ist die Rechnung nicht zum Vorsteuerabzug berechtigt!",
            "Monatsangabe reicht aus (§ 31 Abs. 4 UStDV): 'Leistungszeitraum: Oktober 2026' ist völlig ausreichend.",
            "Satz 'Leistungsdatum entspricht Rechnungsdatum' ist zulässig, wenn beide Tage tatsächlich übereinstimmen.",
        ],
        sections: [
            {
                heading: "Kopiervorlagen: So geben Sie Leistungszeitraum & Lieferdatum richtig an",
                paragraphs: [
                    "Je nach Art Ihrer Leistung wählen Sie eine dieser finanzamtkonformen Formulierungen nach § 14 Abs. 4 Nr. 6 UStG i.V.m. § 31 Abs. 4 UStDV:",
                ],
                bullets: [
                    "Taggenaue Lieferung / Abnahme: „Lieferdatum / Leistungsdatum: 24.10.2026“",
                    "Identisch mit Rechnungsdatum (§ 31 Abs. 4 UStDV): „Das Leistungsdatum entspricht dem Rechnungsdatum.“",
                    "Laufende Beratung / Monatsabrechnung: „Leistungszeitraum: 01.10.2026 – 31.10.2026“ oder „Leistungsmonat: Oktober 2026“",
                    "Verweis auf Lieferschein (§ 31 Abs. 3 UStDV): „Lieferdatum laut Lieferschein Nr. LS-2026-089 vom 22.10.2026“",
                ],
            },
            {
                heading: "Warum prüft das Finanzamt den Leistungszeitraum so genau?",
                paragraphs: [
                    "Umsatzsteuerlich entsteht die Steuer grundsätzlich mit Ablauf des Voranmeldungszeitraums, in dem die Leistung ausgeführt wurde (§ 13 Abs. 1 Nr. 1a UStG) – nicht erst mit dem Rechnungsdatum! Deshalb benötigt der Betriebsprüfer das Leistungsdatum, um zu prüfen, ob Umsatzsteuer und Vorsteuer im richtigen Monat oder Quartal angemeldet wurden.",
                ],
            },
        ],
        faqs: [
            {
                question: "Welches Leistungsdatum gilt bei einem mehrwöchigen Projekt oder Werkvertrag?",
                answer: "Bei Werkleistungen und Projekten ist der Tag der Vollendung bzw. der Abnahme durch den Auftraggeber (§ 640 BGB) der maßgebliche Leistungszeitpunkt. Bei laufender Beratung auf Stundenbasis geben Sie den jeweiligen Leistungsmonat an (z. B. '01.10.2026 – 31.10.2026').",
            },
        ],
        keywords: ["Leistungszeitraum Rechnung Pflichtangabe", "Leistungsdatum entspricht Rechnungsdatum", "§ 31 Abs. 4 UStDV"],
        relatedToolSlugs: ["rechnungsgenerator", "lieferschein-generator"],
        relatedVorlagenSlugs: ["schlussrechnung", "dauerrechnung"],
    },
    {
        slug: "zahlungsziel-und-verzug",
        term: "Zahlungsziel & Zahlungsverzug (§ 286 BGB)",
        title: "Zahlungsziel, Fälligkeit & Zahlungsverzug (§ 286 & § 288 BGB) – Wann darf man mahnen?",
        metaTitle: "Zahlungsziel Rechnung & Verzug (§ 286 BGB): Muster & Fristen",
        metaDescription:
            "Zahlungsziel auf Rechnung richtig formulieren (§ 271 & § 286 BGB): Mustertexte, Fälligkeit bei Handwerkerrechnungen, 30-Tage-Regel & 40 € Verzugspauschale.",
        category: "Rechnungsrecht",
        legalReference: "§§ 271, 286, 288 BGB",
        shortDefinition:
            "Nach § 271 BGB ist eine Rechnung grundsätzlich sofort mit Erhalt zur Zahlung fällig. In Zahlungsverzug (§ 286 BGB) gerät der Schuldner jedoch erst durch eine Mahnung, durch das Überschreiten eines kalendermäßig bestimmten Zahlungsziels oder automatisch 30 Tage nach Fälligkeit und Zugang der Rechnung.",
        keyTakeaways: [
            "Kalendermäßiges Zahlungsziel spart die 1. Mahnung: Formulieren Sie auf der Rechnung ein konkretes Datum ('Zahlbar bis zum 07.11.2026'), gerät der Kunde am 08.11. automatisch ohne Mahnung in Verzug (§ 286 Abs. 2 Nr. 1 BGB).",
            "Gesetzliche Verzugszinsen (§ 288 BGB): Im B2B-Geschäft 9 Prozentpunkte über dem Basiszinssatz, gegenüber Verbrauchern (B2C) 5 Prozentpunkte über dem Basiszinssatz.",
            "40-Euro-Verzugspauschale (§ 288 Abs. 5 BGB): Gegenüber Geschäftskunden (B2B) haben Sie bei Verzug sofort Anspruch auf 40,00 € Pauschalschadensersatz.",
        ],
        sections: [
            {
                heading: "Kopiervorlagen: Zahlungsziel auf der Rechnung rechtssicher formulieren",
                paragraphs: [
                    "Nutzen Sie auf Ihren Rechnungen ein konkretes Kalenderdatum statt einer bloßen Tagesfrist, um den Zahlungseingang spürbar zu beschleunigen:",
                ],
                bullets: [
                    "Standard mit Kalenderdatum (Empfehlung): „Bitte überweisen Sie den Rechnungsbetrag ohne Abzug bis zum [Datum, z. B. 20.11.2026] auf das unten genannte Konto.“",
                    "Zahlungsziel für Handwerkerrechnungen (§ 641 BGB nach Abnahme): „Die Vergütung ist gemäß § 641 BGB mit der Abnahme sofort fällig. Bitte überweisen Sie den Betrag bis zum [Datum] unter Angabe der Rechnungsnummer.“",
                    "Mit 30-Tage-Verzugshinweis für Privatkunden (§ 286 Abs. 3 BGB): „Zahlbar bis zum [Datum]. Wir weisen darauf hin, dass Sie gemäß § 286 Abs. 3 BGB spätestens 30 Tage nach Fälligkeit und Zugang dieser Rechnung automatisch in Zahlungsverzug geraten.“",
                ],
            },
            {
                heading: "Warum 'Zahlbar innerhalb von 14 Tagen' rechtlich eine Falle sein kann",
                paragraphs: [
                    "Nach der Rechtsprechung des Bundesgerichtshofs (BGH) reicht die bloße einseitige Angabe 'Zahlbar innerhalb von 14 Tagen ab Rechnungsdatum' auf einer Rechnung oft noch nicht für einen automatischen Verzug nach § 286 Abs. 2 Nr. 1 BGB aus, wenn diese Frist nicht bereits vorab im Vertrag oder in den AGB vereinbart wurde.",
                    "Auf der sicheren Seite sind Sie, wenn Sie das Zahlungsziel bereits im Angebot/Vertrag verankern und bei Überschreitung sofort mit unserem kostenlosen Mahnungs-Generator eine rechtssichere Zahlungserinnerung versenden.",
                ],
            },
        ],
        faqs: [
            {
                question: "Wann greift die gesetzliche 30-Tage-Verzugsregel automatisch?",
                answer: "Nach § 286 Abs. 3 BGB kommt ein Geschäftskunde (B2B) spätestens 30 Tage nach Fälligkeit und Zugang einer Rechnung automatisch in Zahlungsverzug. Bei Privatkunden (B2C) gilt dies nur, wenn Sie auf der Rechnung ausdrücklich auf diese 30-Tage-Folge hingewiesen haben!",
            },
        ],
        keywords: ["Zahlungsziel Rechnung Formulierung", "Zahlungsverzug § 286 BGB", "40 Euro Verzugspauschale B2B"],
        relatedToolSlugs: ["verzugszinsen-rechner", "mahnung-generator", "skontorechner"],
        relatedVorlagenSlugs: ["handwerker", "it-freelancer"],
    },
    {
        slug: "freiberufler-vs-gewerbe",
        term: "Freiberufler vs. Gewerbetreibende (§ 18 EStG)",
        title: "Freiberufler (§ 18 EStG) vs. Gewerbe – Katalogberufe, Gewerbesteuer & Buchhaltung",
        metaTitle: "Freiberufler vs. Gewerbe (§ 18 EStG): Katalogberufe & Steuern",
        metaDescription:
            "Bin ich Freiberufler (§ 18 EStG) oder Gewerbetreibender? Alle Katalogberufe, Vorteile bei Gewerbesteuer, IHK-Pflicht, Bilanzierungspflicht und Ist-Versteuerung im Vergleich.",
        category: "Gründung & Praxis",
        legalReference: "§ 18 EStG & § 15 EStG",
        shortDefinition:
            "In Deutschland unterscheidet das Steuerrecht zwischen Einkünften aus selbständiger Arbeit (Freiberufler nach § 18 EStG) und Einkünften aus Gewerbebetrieb (§ 15 EStG). Freiberufler genießen massive Privilegien: Sie zahlen keine Gewerbesteuer, unterliegen keiner Bilanzierungspflicht und dürfen dauerhaft die einfache Einnahmen-Überschuss-Rechnung (EÜR) sowie die Ist-Versteuerung nutzen.",
        keyTakeaways: [
            "Keine Gewerbesteuer & kein Gewerbeschein: Freiberufler melden ihre Tätigkeit lediglich über den Fragebogen zur steuerlichen Erfassung beim Finanzamt an.",
            "Dauerhafte EÜR (§ 4 Abs. 3 EStG): Auch bei Millionenumsätzen müssen Freiberufler keine doppelte Buchführung oder Bilanz erstellen.",
            "Keine IHK-Zwangsmitgliedschaft (Kammerpflicht besteht nur für verkammerte Berufe wie Ärzte, Anwälte, Architekten oder Steuerberater).",
        ],
        sections: [
            {
                heading: "Wer zählt nach § 18 EStG zu den freien Berufen?",
                paragraphs: [
                    "Das Einkommensteuergesetz unterteilt die freien Berufe in drei Gruppen:",
                ],
                bullets: [
                    "1. Katalogberufe: Ärzte, Zahnärzte, Physiotherapeuten, Heilpraktiker, Rechtsanwälte, Notare, Ingenieure, Architekten, Wirtschaftsprüfer, Steuerberater, beratende Volks- und Betriebswirte, Journalisten, Bildberichterstatter, Dolmetscher, Übersetzer.",
                    "2. Katalogähnliche Berufe: Z. B. diplomierte/akademische Softwareentwickler und Systemarchitekten (bei ingenieurähnlicher Tätigkeit), Designer.",
                    "3. Wissenschaftliche, künstlerische, schriftstellerische, unterrichtende oder erzieherische Tätigkeiten (z. B. Dozenten, Coaches, Texter, Musiker, Fotografen bei künstlerischer Gestaltung).",
                ],
            },
        ],
        faqs: [
            {
                question: "Was ist die 'Abfärbetheorie' (§ 15 Abs. 3 Nr. 1 EStG) bei Personengesellschaften?",
                answer: "Vorsicht bei einer GbR oder Partnerschaft: Erzielt eine freiberufliche GbR auch nur geringe gewerbliche Umsätze (über der Bagatellgrenze von 3 % des Gesamtumsatzes und 24.500 €), 'färben' diese auf die gesamten Einkünfte ab und machen die gesamte GbR gewerbesteuerpflichtig!",
            },
        ],
        keywords: ["Freiberufler vs Gewerbe Unterschied", "Katalogberufe § 18 EStG", "Freiberufler Gewerbesteuer"],
        relatedToolSlugs: ["gewerbesteuer-rechner", "euer-rechner", "stundensatz-rechner"],
        relatedVorlagenSlugs: ["freiberufler", "it-freelancer", "heilberufe-therapeuten"],
    },
    {
        slug: "xrechnung-vs-zugferd",
        term: "XRechnung vs. ZUGFeRD",
        title: "XRechnung vs. ZUGFeRD – Welches E-Rechnungsformat ist das richtige für Sie?",
        metaTitle: "XRechnung vs. ZUGFeRD (EN 16931): Vergleich & Unterschiede",
        metaDescription:
            "Was ist der Unterschied zwischen XRechnung und ZUGFeRD 2.2/2.3? Welches Format Sie für Behörden (Leitweg-ID) und B2B-Kunden brauchen – inkl. kostenlosem Generator & Viewer.",
        category: "E-Rechnung & GoBD",
        legalReference: "CEN EN 16931 & ERechV",
        shortDefinition:
            "Sowohl XRechnung als auch ZUGFeRD (ab Version 2.0.1 im Profil Comfort/EN 16931 oder Extended) erfüllen vollständig die europäische Norm EN 16931 und die deutsche E-Rechnungspflicht. Während XRechnung ein reiner XML-Datensatz ohne Sichtbild ist, kombiniert ZUGFeRD als hybrides Format ein menschenlesbares PDF/A-3-Dokument mit einer eingebetteten XML-Datei.",
        keyTakeaways: [
            "XRechnung (reines XML): Ideal und oft Pflicht für öffentliche Auftraggeber (Bund, Länder, Kommunen) mit Leitweg-ID.",
            "ZUGFeRD (PDF/A-3 + eingebettetes XML): Ideal für den B2B-Alltag, da der Empfänger die Rechnung wie gewohnt im PDF-Reader ansehen UND maschinell in DATEV/Buchhaltung einlesen kann.",
            "Beide Formate können Sie kostenlos im Rechly E-Rechnung Viewer öffnen und im Rechnungsgenerator erstellen.",
        ],
        sections: [
            {
                heading: "Wann nutzen Sie XRechnung und wann ZUGFeRD?",
                paragraphs: [
                    "Im öffentlichen Sektor (B2G) verlangen Bundes- und Landesbehörden über Portale wie ZRE oder OZG-RE fast immer eine XRechnung inklusive gültiger Leitweg-ID im Feld BT-10.",
                    "Im normalen Geschäftsverkehr zwischen Unternehmen (B2B) hat sich ZUGFeRD 2.2 / 2.3 als Favorit etabliert, weil auch kleinere Geschäftspartner ohne spezielles ERP-System den PDF-Teil sofort lesen können.",
                ],
            },
        ],
        faqs: [
            {
                question: "Ist das ZUGFeRD-Profil 'MINIMUM' oder 'BASIC WL' für die E-Rechnungspflicht ausreichend?",
                answer: "Nein! Nur die ZUGFeRD-Profile 'BASIC', 'EN 16931 (COMFORT)', 'EXTENDED' und 'XRECHNUNG' erfüllen die gesetzlichen Anforderungen der Norm EN 16931 nach § 14 Abs. 1 UStG.",
            },
        ],
        keywords: ["XRechnung vs ZUGFeRD Unterschied", "EN 16931 Format", "Hybride E-Rechnung PDF/A-3"],
        relatedToolSlugs: ["e-rechnung-viewer", "rechnungsgenerator", "leitweg-id-pruefen"],
        relatedVorlagenSlugs: ["it-freelancer", "beratung-consulting"],
    },
    {
        slug: "zusammenfassende-meldung",
        term: "Zusammenfassende Meldung (ZM · § 18a UStG)",
        title: "Zusammenfassende Meldung (ZM nach § 18a UStG) – Fristen & Pflichten bei EU-Rechnungen",
        metaTitle: "Zusammenfassende Meldung (ZM § 18a UStG): Fristen & ELSTER",
        metaDescription:
            "Wer muss eine Zusammenfassende Meldung (ZM) abgeben? Alles zu § 18a UStG bei innergemeinschaftlichen Lieferungen und Reverse-Charge-Leistungen (§ 13b) ins EU-Ausland.",
        category: "Steuerrecht & UStG",
        legalReference: "§ 18a UStG",
        shortDefinition:
            "Die Zusammenfassende Meldung (ZM) nach § 18a UStG ist eine verpflichtende elektronische Meldung an das Bundeszentralamt für Steuern (BZSt), in der deutsche Unternehmer alle innergemeinschaftlichen Warenlieferungen sowie grenzüberschreitenden B2B-Dienstleistungen (§ 13b UStG) an Kunden im EU-Ausland samt deren USt-IdNr. auflisten müssen.",
        keyTakeaways: [
            "Abgabefrist: Immer bis zum 25. Tag nach Ablauf des jeweiligen Meldezeitraums (Monat oder Quartal) elektronisch via ELSTER.",
            "Dauerfristverlängerung gilt NICHT für die ZM: Selbst wenn Sie für Ihre USt-Voranmeldung eine Dauerfristverlängerung haben, bleibt es für die ZM streng beim 25. des Folgemonats!",
            "Gültige USt-IdNr. des EU-Kunden ist zwingende Voraussetzung (vorab im Rechly USt-IdNr.-Prüfer validieren!).",
        ],
        sections: [
            {
                heading: "Wie funktioniert der EU-Abgleich über das MIAS-System?",
                paragraphs: [
                    "Mit der Zusammenfassenden Meldung prüfen die Finanzbehörden aller 27 EU-Mitgliedstaaten vollautomatisch, ob der ausländische Rechnungsempfänger den steuerfreien Umsatz bzw. die Reverse-Charge-Leistung in seinem Heimatland ordnungsgemäß versteuert hat. Stimmt die gemeldete USt-IdNr. nicht, droht die Versagung der Steuerfreiheit!",
                ],
            },
        ],
        faqs: [
            {
                question: "Muss ich eine Nullmeldung abgeben, wenn ich in einem Quartal keine EU-Umsätze hatte?",
                answer: "Nein! Im Gegensatz zur Umsatzsteuer-Voranmeldung muss eine Zusammenfassende Meldung (ZM) nur für solche Zeiträume übermittelt werden, in denen Sie tatsächlich meldepflichtige EU-Umsätze ausgeführt haben.",
            },
        ],
        keywords: ["Zusammenfassende Meldung § 18a UStG", "ZM Frist 25.", "EU Rechnung melden ELSTER"],
        relatedToolSlugs: ["ust-idnr-pruefen", "reverse-charge-rechner", "steuerkalender-2026"],
        relatedVorlagenSlugs: ["it-freelancer", "beratung-consulting"],
    },
];

export function getLexikonBySlug(slug: string): LexikonEntry | undefined {
    return LEXIKON_CATALOG.find((e) => e.slug === slug);
}
