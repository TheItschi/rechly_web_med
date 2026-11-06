/**
 * Programmatic Industry Invoice Templates (Branchen-Rechnungsvorlagen) for Germany.
 * Powers both `/vorlagen` and `/vorlagen/[slug]` as well as presets in `/tools/rechnungsgenerator`.
 */

export type TaxMode = "standard" | "kleinunternehmer" | "reverse_charge" | "reverse_charge_13b" | "tax_exempt_4";

export interface TemplateLineItem {
    description: string;
    quantity: number;
    unit: string;
    price: number;
    vatRate: number;
    isLabor35a?: boolean;
}

export interface VorlagePresetItem {
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    taxRate: 0 | 7 | 19;
    isLabor35a?: boolean;
}

export interface InvoiceTemplateDefinition {
    slug: string;
    title: string;
    shortTitle: string;
    eyebrow: string;
    category: "Handwerk & Bau" | "Freelancer & Kreativ" | "Dienstleistung & Heilberufe" | "Spezialrechnungen";
    badge: string;
    description: string;
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    presetData: {
        invoiceTitle: string;
        senderName: string;
        senderAddress: string;
        senderTaxId: string;
        recipientName: string;
        recipientAddress: string;
        taxMode: "standard" | "kleinunternehmer" | "reverse_charge_13b" | "tax_exempt_4";
        show35aHighlight: boolean;
        items: TemplateLineItem[];
        legalNote: string;
    };
    legalChecklist: string[];
    guideSections: Array<{
        title: string;
        body: string[];
        bullets?: string[];
    }>;
    faqs: Array<{
        question: string;
        answer: string;
    }>;
    relatedToolSlugs: string[];
}

export const VORLAGEN_CATALOG: InvoiceTemplateDefinition[] = [
    {
        slug: "handwerker",
        title: "Rechnungsvorlage Handwerker (§ 35a EStG Lohnkosten & Material trennen)",
        shortTitle: "Handwerker-Rechnung (§ 35a EStG)",
        eyebrow: "HANDWERK & GEWERBE",
        category: "Handwerk & Bau",
        badge: "Inkl. § 35a EStG Ausweis",
        description:
            "Kostenlose Rechnungsvorlage für Handwerksbetriebe: Arbeitskosten, Fahrtkosten und Material sauber getrennt ausweisen, damit Privatkunden 20 % Steuerbonus nach § 35a EStG absetzen können.",
        metaTitle: "Handwerkerrechnung Vorlage & Muster kostenlos (§ 35a PDF)",
        metaDescription:
            "Kostenlose Handwerkerrechnung Vorlage & Muster (PDF): Lohnkosten und Material nach § 35a EStG sauber trennen, online ausfüllen und als PDF oder XRechnung laden!",
        keywords: [
            "Rechnungsvorlage Handwerker",
            "Handwerkerrechnung Vorlage kostenlos",
            "Handwerkerrechnung § 35a EStG Muster",
            "Lohnkosten auf Rechnung ausweisen",
            "Handwerker Rechnung schreiben PDF",
        ],
        presetData: {
            invoiceTitle: "RECHNUNG",
            senderName: "Meisterbetrieb Elektro & Sanitär Weber GmbH",
            senderAddress: "Handwerkerstraße 18\n50667 Köln",
            senderTaxId: "DE298374651",
            recipientName: "Familie Thomas & Julia Schneider",
            recipientAddress: "Lindenallee 42\n50937 Köln",
            taxMode: "standard",
            show35aHighlight: true,
            items: [
                {
                    description: "Monteurstunden: Demontage Altgerät & Installation Wärmepumpen-Inneneinheit (Arbeitsleistung)",
                    quantity: 8.5,
                    unit: "Std.",
                    price: 68.0,
                    vatRate: 19,
                    isLabor35a: true,
                },
                {
                    description: "An- und Abfahrtspauschale Kundendienstfahrzeug inkl. Rüstzeit",
                    quantity: 1,
                    unit: "Pausch.",
                    price: 45.0,
                    vatRate: 19,
                    isLabor35a: true,
                },
                {
                    description: "Kupferrohrleitung, Sicherheitsgruppe & Dämmmaterial (Materialanteil)",
                    quantity: 1,
                    unit: "Pausch.",
                    price: 380.0,
                    vatRate: 19,
                    isLabor35a: false,
                },
            ],
            legalNote:
                "Steuerhinweis gemäß § 35a EStG: Bitte begleichen Sie diese Rechnung ausschließlich per Banküberweisung. Bei Barzahlung erkennt das Finanzamt die Steuerermäßigung für Handwerkerleistungen nicht an.",
        },
        legalChecklist: [
            "Trennung von Arbeitskosten (Lohn + Fahrt + Maschinenkosten) und Materialkosten für § 35a EStG",
            "Hinweis auf zweijährige Aufbewahrungspflicht für Privatkunden (§ 14b Abs. 1 Satz 5 UStG)",
            "Verbot der Barzahlung für den Steuerabzug nach § 35a Abs. 5 Satz 3 EStG erwähnen",
            "Vollständiger Leistungszeitraum bzw. Datum der Abnahme",
        ],
        guideSections: [
            {
                title: "Warum Handwerkerrechnungen Lohn und Material trennen müssen",
                body: [
                    "Privatkunden können 20 % der Arbeits-, Fahrt- und Maschinenkosten einer Handwerkerrechnung (maximal 1.200 € pro Jahr bei 6.000 € Lohnkosten) gemäß § 35a Abs. 3 EStG direkt von ihrer Einkommensteuerschuld abziehen.",
                    "Materialkosten sind von dieser Steuerförderung ausdrücklich ausgeschlossen. Weisen Sie auf Ihrer Handwerkerrechnung die Arbeitsstunden und Anfahrtskosten separat aus, bieten Sie Ihren Kunden einen enormen finanziellen Mehrwert und vermeiden nachträgliche Korrekturwünsche.",
                ],
                bullets: [
                    "Begünstigt: Arbeitslohn, Fahrtkosten, Maschinen- und Gerätekosten sowie Verbrauchsmittel (z. B. Abdeckfolie, Reiniger)",
                    "Nicht begünstigt: Eingebaute Materialien, Ersatzteile, Fliesen, Armaturen oder Farben",
                    "Zwingend erforderlich: Unbare Zahlung per Überweisung oder GiroCode auf das Geschäftskonto",
                ],
            },
            {
                title: "Aufbewahrungspflicht-Hinweis bei Arbeiten am Grundstück",
                body: [
                    "Führen Sie Werklieferungen oder sonstige Leistungen im Zusammenhang mit einem Grundstück für Privatpersonen aus, müssen Sie den Kunden nach § 14 Abs. 4 Satz 1 Nr. 9 UStG darauf hinweisen, dass er die Rechnung zwei Jahre lang aufzubewahren hat.",
                ],
            },
        ],
        faqs: [
            {
                question: "Muss ich bei einem Pauschalpreis trotzdem den Lohnanteil ausweisen?",
                answer: "Ja, auch bei vereinbarten Pauschalpreisen darf und sollte der enthaltene Arbeits- und Fahrtkostenanteil prozentual oder betragsmäßig in der Fußzeile der Rechnung geschätzt und separat ausgewiesen werden, damit das Finanzamt den Abzug nach § 35a EStG anerkennt.",
            },
            {
                question: "Darf eine Handwerkerrechnung bar bezahlt werden?",
                answer: "Zivilrechtlich ja, aber steuerlich verliert der Privatkunde bei Barzahlung vollständig den Steuerbonus nach § 35a EStG. Empfehlen Sie daher immer die Überweisung per SEPA-GiroCode.",
            },
        ],
        relatedToolSlugs: ["rechnungsgenerator", "bautagebuch-vorlage", "stundensatz-rechner", "girocode-generator"],
    },
    {
        slug: "bauleistung-13b",
        title: "Rechnungsvorlage Bauleistungen nach § 13b UStG (Reverse Charge am Bau)",
        shortTitle: "Bauleistung (§ 13b UStG)",
        eyebrow: "BAUGEWERBE & SUBUNTERNEHMER",
        category: "Handwerk & Bau",
        badge: "0 % USt Reverse Charge",
        description:
            "Rechtssichere Vorlage für Bauleistungen zwischen Bauunternehmen nach § 13b Abs. 2 Nr. 4 UStG: Netto-Abrechnung mit amtlichem Pflichthinweis zur Steuerschuldnerschaft des Leistungsempfängers.",
        metaTitle: "§ 13b UStG Rechnung Muster & Vorlage: Bauleistungen (PDF)",
        metaDescription:
            "Kostenlose Rechnungsvorlage & Muster für § 13b UStG Bauleistungen (Subunternehmer): Netto-Rechnung mit Pflichttext zur Steuerschuldnerschaft sofort als PDF laden.",
        keywords: [
            "Rechnungsvorlage 13b Bauleistungen",
            "§ 13b UStG Rechnung Muster",
            "Subunternehmer Bau Rechnung schreiben",
            "Steuerschuldnerschaft des Leistungsempfängers Bau",
            "Freistellungsbescheinigung 48b EStG Rechnung",
        ],
        presetData: {
            invoiceTitle: "RECHNUNG (§ 13b UStG)",
            senderName: "Trockenbau & Innenausbau Kalski",
            senderAddress: "Gewerbering 9\n44135 Dortmund",
            senderTaxId: "314/5123/4891",
            recipientName: "Hochbau Westfalen Generalunternehmer GmbH",
            recipientAddress: "Baustraße 100\n44141 Dortmund",
            taxMode: "reverse_charge_13b",
            show35aHighlight: false,
            items: [
                {
                    description: "BV Bürokomplex Süd: Erstellen von GK-Ständerwerkswänden (d=100mm, doppelt beplankt inkl. Dämmung)",
                    quantity: 145,
                    unit: "m²",
                    price: 54.0,
                    vatRate: 0,
                },
                {
                    description: "Einbau von Türzargen inkl. Verstärkungsprofilen im Trockenbau",
                    quantity: 6,
                    unit: "Stk.",
                    price: 115.0,
                    vatRate: 0,
                },
            ],
            legalNote:
                "Steuerschuldnerschaft des Leistungsempfängers gemäß § 13b Abs. 2 Nr. 4 i.V.m. Abs. 5 UStG (Bauleistungen). Eine gültige Freistellungsbescheinigung zum Steuerabzug bei Bauleistungen gemäß § 48b EStG liegt vor.",
        },
        legalChecklist: [
            "Kein Umsatzsteuerausweis (nur Nettobetrag berechnen!)",
            "Zwingender Pflichttext: 'Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)'",
            "Nachweis des Auftraggebers (Vordruck USt 1 TG), dass dieser nachhaltig Bauleistungen erbringt",
            "Hinweis auf gültige Freistellungsbescheinigung nach § 48b EStG (verhindert 15 % Bauabzugsteuer)",
        ],
        guideSections: [
            {
                title: "Wann greift § 13b UStG bei Bauleistungen im Inland?",
                body: [
                    "Erbringt ein Bauunternehmer oder Subunternehmer nachhaltige Bauleistungen (Werklieferungen oder sonstige Leistungen, die der Herstellung, Instandsetzung, Instandhaltung, Änderung oder Beseitigung von Bauwerken dienen) an einen anderen Unternehmer, der selbst nachhaltig Bauleistungen erbringt, kehrt sich die Steuerschuldnerschaft um.",
                    "Der leistende Subunternehmer stellt eine reine Nettorechnung ohne Umsatzsteuer aus. Der Generalunternehmer (Leistungsempfänger) berechnet die 19 % Umsatzsteuer selbst, meldet sie in seiner USt-VA an und zieht sie bei Vorsteuerabzugsberechtigung gleichzeitig wieder ab.",
                ],
                bullets: [
                    "Prüfen Sie vorab die Bescheinigung 'USt 1 TG' Ihres Auftraggebers",
                    "Legen Sie Ihre Freistellungsbescheinigung nach § 48b EStG bei, sonst muss der Auftraggeber 15 % Bauabzugsteuer einbehalten",
                    "Bloße Materiallieferungen oder reine Planungsleistungen (Architekten/Statiker) fallen NICHT unter § 13b UStG",
                ],
            },
        ],
        faqs: [
            {
                question: "Was passiert, wenn ich trotz § 13b UStG versehentlich 19 % MwSt. ausweise?",
                answer: "Dann schulden Sie die unrichtig ausgewiesene Steuer nach § 14c Abs. 1 UStG dem Finanzamt, während Ihr Auftraggeber diese Umsatzsteuer NICHT als Vorsteuer abziehen darf. Die Rechnung muss zwingend storniert und netto neu ausgestellt werden.",
            },
        ],
        relatedToolSlugs: ["reverse-charge-rechner", "rechnungsgenerator", "bautagebuch-vorlage"],
    },
    {
        slug: "kleinunternehmer",
        title: "Rechnungsvorlage Kleinunternehmer (§ 19 UStG ohne Umsatzsteuer 2026)",
        shortTitle: "Kleinunternehmer (§ 19 UStG)",
        eyebrow: "KLEINUNTERNEHMERREGELUNG",
        category: "Freelancer & Kreativ",
        badge: "Reform 2025/2026",
        description:
            "Kostenlose Rechnungsvorlage für Kleinunternehmer nach § 19 UStG: Ohne Mehrwertsteuer, mit rechtssicherem Pflichthinweis und angepassten Umsatzgrenzen (25.000 € / 100.000 €).",
        metaTitle: "Kleinunternehmer Rechnungsvorlage & Muster (§ 19 UStG PDF)",
        metaDescription:
            "Kostenlose Kleinunternehmer Rechnungsvorlage & Muster nach § 19 UStG (2026): Ohne MwSt., inklusive Pflichthinweis, sofort online ausfüllen & als PDF herunterladen!",
        keywords: [
            "Rechnungsvorlage Kleinunternehmer",
            "Kleinunternehmer Rechnung Muster kostenlos",
            "§ 19 UStG Rechnungstext",
            "Rechnung ohne MwSt Vorlage",
            "Kleinunternehmerregelung 2026 Rechnung",
        ],
        presetData: {
            invoiceTitle: "RECHNUNG",
            senderName: "Lisa Bergmann – Kommunikationsdesign & Illustration",
            senderAddress: "Kastanienallee 77\n10435 Berlin",
            senderTaxId: "31/234/56789",
            recipientName: "Café Morgenrot UG (haftungsbeschränkt)",
            recipientAddress: "Rosenthaler Str. 14\n10119 Berlin",
            taxMode: "kleinunternehmer",
            show35aHighlight: false,
            items: [
                {
                    description: "Konzeption & Gestaltung Corporate Design (Logo, Farbpalette, Typografie)",
                    quantity: 1,
                    unit: "Pausch.",
                    price: 850.0,
                    vatRate: 0,
                },
                {
                    description: "Gestaltung Speisekarten & Druckdatenerstellung (DIN A4, 6-seitig)",
                    quantity: 4,
                    unit: "Std.",
                    price: 75.0,
                    vatRate: 0,
                },
            ],
            legalNote:
                "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Steuerbefreiung für Kleinunternehmer).",
        },
        legalChecklist: [
            "Kein Umsatzsteuersatz (keine 19 % oder 7 %) und kein Umsatzsteuerbetrag",
            "Keine Trennung in Netto und Brutto (Endbetrag = Rechnungsbetrag)",
            "Zwingender Hinweis auf § 19 UStG (Grund für den fehlenden Steuerausweis)",
            "Vollständige Pflichtangaben nach § 14 UStG (Steuernummer, fortlaufende Rechnungsnummer, Leistungsdatum)",
        ],
        guideSections: [
            {
                title: "Die neuen Kleinunternehmer-Grenzen seit 2025/2026 (25.000 € / 100.000 €)",
                body: [
                    "Durch das Jahressteuergesetz wurde § 19 UStG grundlegend reformiert: Die Umsatzgrenze des Vorjahres liegt nun bei 25.000 € (zuvor 22.000 €) und im laufenden Kalenderjahr bei 100.000 € (harte Grenze).",
                    "Solange Sie unter diesen Netto-Grenzen bleiben, sind Ihre Umsätze von der Umsatzsteuer befreit. Sie dürfen auf Ihren Rechnungen keinerlei Mehrwertsteuer ausweisen und müssen zwingend auf § 19 UStG hinweisen.",
                ],
                bullets: [
                    "Formulierung 1: 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'",
                    "Formulierung 2: 'Steuerbefreit gemäß § 19 UStG (Kleinunternehmerregelung).'",
                    "Formulierung 3: 'Kein Ausweis von Umsatzsteuer, da Kleinunternehmer nach § 19 UStG.'",
                ],
            },
        ],
        faqs: [
            {
                question: "Müssen Kleinunternehmer auch E-Rechnungen empfangen und erstellen?",
                answer: "Empfangen müssen auch Kleinunternehmer E-Rechnungen seit dem 01.01.2025. Von der Pflicht zur aktiven Ausstellung elektronischer Rechnungen sind steuerfreie Umsätze nach § 19 UStG jedoch nach aktuellem § 34a UStDV weitgehend befreit – freiwillig ist die XRechnung (z. B. an Behörden) aber jederzeit möglich.",
            },
        ],
        relatedToolSlugs: ["kleinunternehmer-rechner", "rechnungsgenerator", "euer-rechner"],
    },
    {
        slug: "freiberufler",
        title: "Rechnungsvorlage Freiberufler & Katalogberufe (§ 18 EStG Honorarrechnung)",
        shortTitle: "Freiberufler (Honorarrechnung)",
        eyebrow: "FREIE BERUFE & HONORARE",
        category: "Freelancer & Kreativ",
        badge: "Honorarrechnung",
        description:
            "Professionelle Honorarrechnung Vorlage für Freiberufler (Ingenieure, Architekten, Texter, Berater, Journalisten): Ohne Handelsregistereintrag, mit 7 % oder 19 % USt.",
        metaTitle: "Honorarrechnung & Freiberufler Rechnungsvorlage (PDF Muster)",
        metaDescription:
            "Honorarrechnung Vorlage für Freiberufler nach § 18 EStG: Korrekte Pflichtangaben, Steuersatz 7 % (Urheberrecht) oder 19 % wählen und sofort als PDF exportieren.",
        keywords: [
            "Rechnungsvorlage Freiberufler",
            "Honorarrechnung Vorlage kostenlos",
            "Freiberufler Rechnung schreiben",
            "Honorarnote Muster Deutschland",
            "7 Prozent Umsatzsteuer Freiberufler",
        ],
        presetData: {
            invoiceTitle: "HONORARRECHNUNG",
            senderName: "Dr. Markus Lindner – Freier Fachjournalist & Lektor",
            senderAddress: "Goethestraße 19\n60313 Frankfurt am Main",
            senderTaxId: "DE812938475",
            recipientName: "Fachverlag Wirtschaft & Technik GmbH",
            recipientAddress: "Mainzer Landstraße 120\n60327 Frankfurt am Main",
            taxMode: "standard",
            show35aHighlight: false,
            items: [
                {
                    description: "Verfassen des Fachbeitrags 'KI in der deutschen Industrie' inkl. Einräumung der Nutzungsrechte (§ 12 Abs. 2 Nr. 7c UStG)",
                    quantity: 1,
                    unit: "Pausch.",
                    price: 1200.0,
                    vatRate: 7,
                },
                {
                    description: "Redaktionelles Lektorat & Faktenprüfung Sonderheft 03/2026",
                    quantity: 6,
                    unit: "Std.",
                    price: 95.0,
                    vatRate: 19,
                },
            ],
            legalNote:
                "Vielen Dank für den Auftrag. Bitte überweisen Sie das Honorar innerhalb von 14 Tagen unter Angabe der Rechnungsnummer.",
        },
        legalChecklist: [
            "Vollständiger bürgerlicher Vor- und Zunahme des Freiberuflers",
            "Prüfung des Steuersatzes: 7 % bei Einräumung urheberrechtlicher Nutzungsrechte (§ 12 Abs. 2 Nr. 7c UStG) vs. 19 % bei Beratung/Lektorat",
            "Hinweis für Auftraggeber bei künstlerisch/publizistischen Leistungen (mögliche KSK-Abgabepflicht des Auftraggebers)",
        ],
        guideSections: [
            {
                title: "Besonderheiten bei der Honorarrechnung für Freiberufler",
                body: [
                    "Freiberufler nach § 18 EStG unterliegen nicht der Gewerbesteuer und sind nicht im Handelsregister eingetragen. Auf der Rechnung muss daher stets der volle Vor- und Nachname erscheinen (auch wenn eine Berufs- oder Atelierbezeichnung geführt wird).",
                    "Kreativ- und Medienfreiberufler (Journalisten, Autoren, Designer, Fotografen) profitieren häufig vom ermäßigten Umsatzsteuersatz von 7 %, sofern die Einräumung oder Übertragung von Rechten nach dem Urheberrechtsgesetz im Vordergrund steht.",
                ],
            },
        ],
        faqs: [
            {
                question: "Heißt es bei Freiberuflern Rechnung oder Honorarrechnung?",
                answer: "Steuerrechtlich nach § 14 UStG sind beide Begriffe vollkommen gleichwertig. Der Begriff 'Honorarrechnung' oder 'Liquidation' ist in freien Berufen historisch üblich.",
            },
        ],
        relatedToolSlugs: ["rechnungsgenerator", "stundensatz-rechner", "euer-rechner"],
    },
    {
        slug: "it-freelancer",
        title: "Rechnungsvorlage IT-Freelancer, Softwareentwickler & Webdesigner",
        shortTitle: "IT-Freelancer & Entwickler",
        eyebrow: "IT, DEV & TECH CONSULTING",
        category: "Freelancer & Kreativ",
        badge: "Inkl. Stundennachweis",
        description:
            "Maßgeschneiderte Rechnungsvorlage für Softwareentwickler, DevOps-Engineers, IT-Berater und Webdesigner: Tagessätze, Sprint-Abrechnung, Hosting-Weiterberechnung & XRechnung.",
        metaTitle: "Rechnungsvorlage IT-Freelancer & Webdesign: Muster (PDF)",
        metaDescription:
            "Kostenlose Rechnungsvorlage für IT-Freelancer & Softwareentwickler: Tagessätze, Stunden und Lizenzen sauber abrechnen und als PDF oder XRechnung exportieren.",
        keywords: [
            "Rechnungsvorlage IT Freelancer",
            "Rechnungsvorlage Softwareentwickler",
            "Rechnungsvorlage Webdesign",
            "Tagessatz IT Rechnung Muster",
            "Freelancer Rechnung schreiben IT",
        ],
        presetData: {
            invoiceTitle: "RECHNUNG",
            senderName: "Janik Hofmann – Senior Full-Stack Engineering",
            senderAddress: "Paul-Lincke-Ufer 33\n10999 Berlin",
            senderTaxId: "DE345981234",
            recipientName: "FinTech Solutions Germany GmbH",
            recipientAddress: "Friedrichstraße 88\n10117 Berlin",
            taxMode: "standard",
            show35aHighlight: false,
            items: [
                {
                    description: "Software-Architektur & TypeScript/Next.js Entwicklung (Sprint 14 & 15 laut Tätigkeitsnachweis)",
                    quantity: 12,
                    unit: "Tage",
                    price: 880.0,
                    vatRate: 19,
                },
                {
                    description: "Code-Review, Security-Audit & CI/CD Pipeline-Optimierung",
                    quantity: 8,
                    unit: "Std.",
                    price: 115.0,
                    vatRate: 19,
                },
            ],
            legalNote:
                "Leistungszeitraum: 01.10.2026 – 31.10.2026. Der unterzeichnete Stundennachweis (Timesheet) liegt dieser Rechnung als Anlage bei.",
        },
        legalChecklist: [
            "Präziser Leistungszeitraum (z. B. Kalendermonat der Sprint-Leistung)",
            "Verweis auf freigegebenen Stundenzettel / Activity Report zur Vermeidung von Rückfragen",
            "Klare Trennung zwischen Dienstvertrag (§ 611 BGB Zeitaufwand) und Werkvertrag (§ 631 BGB Abnahme)",
        ],
        guideSections: [
            {
                title: "Worauf IT-Freelancer wegen Scheinselbstständigkeit achten sollten",
                body: [
                    "Formulieren Sie Ihre Rechnungspositionen ergebnis- und fachbezogen (z. B. 'Konzeption und Implementierung des Zahlungsmoduls') statt wie ein weisungsgebundener Arbeitnehmer ('Arbeitszeit nach Anweisung').",
                    "Nutzen Sie bei Abrechnung nach Aufwand unseren kostenlosen Stundenzettel-Generator als prüfbare Anlage.",
                ],
            },
        ],
        faqs: [
            {
                question: "Muss ich für Agenturen oder Konzerne eine XRechnung oder ZUGFeRD liefern?",
                answer: "Immer mehr Enterprise-Kunden und IT-Provider verlangen strukturierte E-Rechnungen nach EN 16931. Mit unserem Generator laden Sie sowohl das PDF als auch die XRechnung-XML mit einem Klick herunter.",
            },
        ],
        relatedToolSlugs: ["rechnungsgenerator", "stundenzettel-generator", "stundensatz-rechner", "reverse-charge-rechner"],
    },
    {
        slug: "fotograf-medien",
        title: "Rechnungsvorlage Fotograf, Videograf & Designer (Nutzungsrechte 7% vs. 19%)",
        shortTitle: "Fotograf & Designer (7% / 19%)",
        eyebrow: "FOTOGRAFIE, FILM & DESIGN",
        category: "Freelancer & Kreativ",
        badge: "Urheberrecht 7% / 19%",
        description:
            "Spezial-Rechnungsvorlage für Fotografen, Videografen und Grafikdesigner: Richtige Unterscheidung zwischen 7 % USt (Nutzungsrechte) und 19 % USt (Auftragsproduktion / Event).",
        metaTitle: "Rechnungsvorlage Fotograf & Grafikdesigner: Muster (PDF)",
        metaDescription:
            "Rechnungsvorlage für Fotografen, Videografen & Designer: 7 % Urheberrecht vs. 19 % Auftragsfotografie richtig ausweisen und Lizenzumfang rechtssicher dokumentieren.",
        keywords: [
            "Rechnungsvorlage Fotograf",
            "Fotograf Rechnung 7 oder 19 Prozent",
            "Rechnungsvorlage Grafikdesign Nutzungsrechte",
            "Videograf Rechnung Muster",
            "Buyout Nutzungsrechte Rechnung",
        ],
        presetData: {
            invoiceTitle: "RECHNUNG & LIZENZVERGABE",
            senderName: "Studio Lichtblick – Elena Vance Fotografie",
            senderAddress: "Schanzenstraße 52\n20357 Hamburg",
            senderTaxId: "DE276543981",
            recipientName: "Nordic Lifestyle Brand GmbH",
            recipientAddress: "Jungfernstieg 22\n20354 Hamburg",
            taxMode: "standard",
            show35aHighlight: false,
            items: [
                {
                    description: "Fotoshooting Herbstkampagne (1 Tag vor Ort inkl. Kamera-, Licht- & Studioequipment)",
                    quantity: 1,
                    unit: "Tag",
                    price: 1100.0,
                    vatRate: 19,
                },
                {
                    description: "High-End Retusche & Farbkorrektur von 25 ausgewählten Kampagnenmotiven",
                    quantity: 25,
                    unit: "Stk.",
                    price: 35.0,
                    vatRate: 19,
                },
                {
                    description: "Einräumung der einfachen Nutzungsrechte (Online, Social Media & Print DACH, 2 Jahre)",
                    quantity: 1,
                    unit: "Pausch.",
                    price: 650.0,
                    vatRate: 19,
                },
            ],
            legalNote:
                "Hinweis zum Urheberrecht: Die eingeräumten Nutzungsrechte gehen gemäß § 158 Abs. 1 BGB erst mit vollständiger Bezahlung des Rechnungsbetrags auf den Auftraggeber über.",
        },
        legalChecklist: [
            "Eigentums- und Nutzungsrechtsvorbehalt bis zur vollständigen Zahlung (§ 158 BGB)",
            "Präzise Definition von Nutzungsart (Print/Online), Nutzungsgebiet (z.B. DACH/Weltweit) und Nutzungsdauer",
            "Steuersatz-Prüfung: Gewerbliche Fotografie nach § 2 Nr. 1 GewStDV meist 19 %, künstlerische Werk-Nutzungsrechte teils 7 %",
        ],
        guideSections: [
            {
                title: "Warum der Nutzungsrechtsvorbehalt auf jede Design- & Foto-Rechnung gehört",
                body: [
                    "Nutzt ein Kunde Ihre Fotos, Videos oder Designs bereits vor Begleichung der Rechnung, schützt Sie der Vermerk 'Nutzungsrechte gelten erst mit vollständiger Bezahlung als eingeräumt' vor Zahlungsausfällen.",
                ],
            },
        ],
        faqs: [
            {
                question: "Wann gilt bei Fotografen 19 % und wann 7 % Umsatzsteuer?",
                answer: "Bei klassischer Auftrags-, Produkt-, Event- und Hochzeitsfotografie gilt regelmäßig der Regelsteuersatz von 19 %, da die handwerklich-technische Herstellung im Vordergrund steht. Nur bei rein künstlerischer Fotografie oder isolierter Lizenzierung urheberrechtlich geschützter Werke greifen 7 %.",
            },
        ],
        relatedToolSlugs: ["rechnungsgenerator", "angebotsgenerator", "stundensatz-rechner"],
    },
    {
        slug: "reinigungsgewerbe",
        title: "Rechnungsvorlage Gebäudereinigung & Reinigungskraft (§ 13b & § 35a)",
        shortTitle: "Gebäudereinigung & Putzhilfe",
        eyebrow: "REINIGUNG & FACILITY MANAGEMENT",
        category: "Handwerk & Bau",
        badge: "Privat (§ 35a) & B2B (§ 13b)",
        description:
            "Rechnungsvorlage für Gebäudereiniger, Büroreinigung, Fensterputzer und Haushaltshilfen: Sowohl für Gewerbekunden als auch mit 20 % Steuervorteil (§ 35a EStG) für Privathaushalte.",
        metaTitle: "Rechnung Gebäudereinigung & Reinigungsfirma: Muster & Vorlage",
        metaDescription:
            "Kostenlose Rechnungsvorlage & Muster für Gebäudereinigung, Reinigungsfirma, Putzfrau & Haushaltshilfe (§ 35a EStG & § 13b UStG): Online ausfüllen & als PDF laden!",
        keywords: [
            "Rechnung Gebäudereinigung Muster",
            "Rechnung Reinigungsfirma Muster",
            "Rechnung Putzfrau Muster",
            "Rechnung Haushaltshilfe Muster",
            "Rechnungsvorlage Gebäudereinigung",
            "Rechnungsvorlage Reinigungskraft",
            "Büroreinigung Rechnung Muster",
            "Haushaltshilfe Rechnung § 35a EStG",
            "Reinigungsarbeiten in Rechnung stellen",
        ],
        presetData: {
            invoiceTitle: "RECHNUNG",
            senderName: "KlarGlanz Gebäudeservice & Objektpflege",
            senderAddress: "Industrieweg 5\n70173 Stuttgart",
            senderTaxId: "DE219876543",
            recipientName: "Kanzlei am Schlossplatz Partnerschaft mbB",
            recipientAddress: "Schlossplatz 4\n70173 Stuttgart",
            taxMode: "standard",
            show35aHighlight: true,
            items: [
                {
                    description: "Unterhaltsreinigung Büroräume (4x monatlich à 3,5 Std. im Oktober 2026)",
                    quantity: 14,
                    unit: "Std.",
                    price: 34.0,
                    vatRate: 19,
                    isLabor35a: true,
                },
                {
                    description: "Glas- und Rahmenreinigung straßenseitig inkl. Hebebühneneinsatz",
                    quantity: 1,
                    unit: "Pausch.",
                    price: 160.0,
                    vatRate: 19,
                    isLabor35a: true,
                },
                {
                    description: "Hygiene- & Verbrauchsmaterial (Papierhandtücher, Flüssigseife, Desinfektion)",
                    quantity: 1,
                    unit: "Pausch.",
                    price: 48.0,
                    vatRate: 19,
                    isLabor35a: false,
                },
            ],
            legalNote:
                "Leistungszeitraum: Oktober 2026. Bei haushaltsnahen Dienstleistungen nach § 35a EStG sind die ausgewiesenen Arbeitskosten bei Überweisung steuerlich absetzbar.",
        },
        legalChecklist: [
            "Bei B2B an andere Reinigungsbetriebe: Reverse Charge nach § 13b Abs. 2 Nr. 8 UStG beachten!",
            "Bei normalen Gewerbekunden (Büros, Praxen): Regulär 19 % Umsatzsteuer",
            "Bei Privathaushalten: Arbeitskosten separat für § 35a EStG ausweisen",
        ],
        guideSections: [
            {
                title: "Sonderfall § 13b Abs. 2 Nr. 8 UStG in der Gebäudereinigung",
                body: [
                    "Reinigen Sie im Subauftrag für ein anderes Gebäudereinigungsunternehmen (das den Nachweis USt 1 TG besitzt), greift genau wie am Bau das Reverse-Charge-Verfahren ohne Mehrwertsteuer. Reinigen Sie dagegen für ein normales Büro, eine Arztpraxis oder Privatkunden, stellen Sie regulär mit 19 % USt (oder als Kleinunternehmer nach § 19 UStG) ab.",
                ],
            },
        ],
        faqs: [
            {
                question: "Wie oft sollte die Unterhaltsreinigung abgerechnet werden?",
                answer: "Üblich ist eine monatliche Sammelrechnung am Monatsende oder eine Dauerrechnung bei festen monatlichen Pauschalen.",
            },
        ],
        relatedToolSlugs: ["rechnungsgenerator", "stundenzettel-generator", "kleinunternehmer-rechner"],
    },
    {
        slug: "heilberufe-therapeuten",
        title: "Rechnungsvorlage Heilpraktiker, Physiotherapie & Coaching (§ 4 Nr. 14 UStG)",
        shortTitle: "Heilberufe (§ 4 Nr. 14 UStG)",
        eyebrow: "GESUNDHEIT, THERAPIE & PRAXIS",
        category: "Dienstleistung & Heilberufe",
        badge: "Steuerfrei § 4 Nr. 14 UStG",
        description:
            "Rechnungsvorlage für Heilpraktiker, Physiotherapeuten, Psychotherapeuten, Osteopathen und Ärzte: Umsatzsteuerfreie Heilbehandlung nach § 4 Nr. 14 UStG korrekt ausweisen.",
        metaTitle: "Rechnungsvorlage Heilpraktiker & Physiotherapie (§ 4 Nr. 14)",
        metaDescription:
            "Kostenlose Rechnungsvorlage für Heilpraktiker, Physiotherapie & Psychotherapie: Steuerfreie Heilbehandlung nach § 4 Nr. 14 UStG rechtssicher abrechnen.",
        keywords: [
            "Rechnungsvorlage Heilpraktiker",
            "Rechnungsvorlage Physiotherapie Privatpatient",
            "§ 4 Nr. 14 UStG Rechnungstext",
            "Psychotherapie Privatrechnung Muster",
            "Heilbehandlung umsatzsteuerfrei Rechnung",
        ],
        presetData: {
            invoiceTitle: "LIQUIDATION / PRIVATRECHNUNG",
            senderName: "Praxis für Osteopathie & Naturheilkunde – Miriam Roth (Heilpraktikerin)",
            senderAddress: "Parkstraße 8\n80339 München",
            senderTaxId: "145/210/98765",
            recipientName: "Herrn Sebastian Krüger",
            recipientAddress: "Nymphenburger Str. 90\n80636 München",
            taxMode: "tax_exempt_4",
            show35aHighlight: false,
            items: [
                {
                    description: "Eingehende Anamnese und osteopathische Differentialdiagnostik (GebüH Ziff. 1 / 35.1)",
                    quantity: 1,
                    unit: "Sitzung",
                    price: 55.0,
                    vatRate: 0,
                },
                {
                    description: "Parietale und viszerale osteopathische Behandlung (GebüH Ziff. 35.4)",
                    quantity: 2,
                    unit: "Sitzung",
                    price: 85.0,
                    vatRate: 0,
                },
            ],
            legalNote:
                "Heilbehandlungen im Bereich der Humanmedizin sind gemäß § 4 Nr. 14 Buchst. a UStG von der Umsatzsteuer befreit.",
        },
        legalChecklist: [
            "Zwingender Hinweis auf Steuerbefreiung nach § 4 Nr. 14 UStG",
            "Abgrenzung: Reine Wellness-, Präventions- oder Coaching-Leistungen ohne therapeutische Indikation unterliegen 19 % USt (sofern kein Kleinunternehmer)!",
            "Behandlungsdaten (Einzeltermine) für die Erstattung durch PKV / Beihilfe aufführen",
        ],
        guideSections: [
            {
                title: "Wann sind Behandlungen nach § 4 Nr. 14 UStG umsatzsteuerfrei?",
                body: [
                    "Steuerfrei sind ausschließlich medizinisch indizierte Heilbehandlungen (Diagnose, Therapie und Heilung von Krankheiten oder Gesundheitsstörungen) durch zugelassene Ärzte, Zahnärzte, Heilpraktiker, Physiotherapeuten oder Hebammen.",
                    "Für Physiotherapeuten und Masseure ist bei Selbstzahlern ein ärztliches Rezept bzw. eine Privatverordnung eines Arztes oder Heilpraktikers erforderlich, um die therapeutische Notwendigkeit gegenüber dem Finanzamt zu belegen.",
                ],
            },
        ],
        faqs: [
            {
                question: "Muss die Diagnose auf die Rechnung?",
                answer: "Für die Vorlage bei privaten Krankenversicherungen (PKV), Zusatzversicherungen oder der Beihilfe benötigen Patienten in der Regel die Diagnose sowie die Gebührenziffern (GOÄ / GebüH).",
            },
        ],
        relatedToolSlugs: ["rechnungsgenerator", "quittung-erstellen", "euer-rechner"],
    },
    {
        slug: "dozent-nachhilfe",
        title: "Rechnungsvorlage Dozent, Trainer, Lehrer & Nachhilfe (§ 4 Nr. 21 UStG)",
        shortTitle: "Dozent & Nachhilfe (§ 4 Nr. 21)",
        eyebrow: "BILDUNG, LEHRE & SEMINARE",
        category: "Dienstleistung & Heilberufe",
        badge: "Honorar & § 4 Nr. 21 UStG",
        description:
            "Honorarrechnung Vorlage für freiberufliche Dozenten, Lehrbeauftragte, Musiklehrer und Nachhilfelehrer: Mit Umsatzsteuerbefreiung nach § 4 Nr. 21 UStG oder § 19 UStG.",
        metaTitle: "Honorarrechnung Dozent, Lehrer & Nachhilfe: Vorlage (PDF)",
        metaDescription:
            "Honorarrechnung Vorlage für Dozenten, Trainer & Nachhilfelehrer: Unterrichtseinheiten (UE) und Umsatzsteuerbefreiung nach § 4 Nr. 21 UStG korrekt abrechnen.",
        keywords: [
            "Rechnungsvorlage Dozent",
            "Honorarrechnung Dozent Muster",
            "Rechnungsvorlage Nachhilfe",
            "§ 4 Nr. 21 UStG Rechnungstext Dozent",
            "Unterrichtseinheiten abrechnen Vorlage",
        ],
        presetData: {
            invoiceTitle: "HONORARABRECHNUNG LEHRAUFTRAG",
            senderName: "Dipl.-Kfm. Christian Becker – Freiberuflicher Dozent",
            senderAddress: "Universitätsstraße 31\n48143 Münster",
            senderTaxId: "337/5012/9912",
            recipientName: "Akademie für berufliche Weiterbildung Westfalen gGmbH",
            recipientAddress: "Hafenweg 16\n48155 Münster",
            taxMode: "tax_exempt_4",
            show35aHighlight: false,
            items: [
                {
                    description: "Durchführung Fachseminar 'Rechnungswesen & Controlling' (Lehrgang IHK-Fachwirt, 24 Unterrichtseinheiten à 45 Min.)",
                    quantity: 24,
                    unit: "UE",
                    price: 52.0,
                    vatRate: 0,
                },
                {
                    description: "Erstellung und Korrektur der Abschlussklausuren",
                    quantity: 1,
                    unit: "Pausch.",
                    price: 180.0,
                    vatRate: 0,
                },
            ],
            legalNote:
                "Umsatzsteuerfreie Unterrichtsleistung gemäß § 4 Nr. 21 Buchst. b Doppelbuchst. bb UStG.",
        },
        legalChecklist: [
            "Angabe der Unterrichtseinheiten (UE à 45 Min.) oder Zeitstunden sowie der Kurstage",
            "Vorliegen einer Bescheinigung der Bildungseinrichtung nach § 4 Nr. 21 UStG prüfen",
            "Hinweis auf Rentenversicherungspflicht für selbstständige Lehrer/Dozenten (§ 2 Satz 1 Nr. 1 SGB VI) im eigenen Stundensatz kalkulieren!",
        ],
        guideSections: [
            {
                title: "Umsatzsteuerbefreiung für Dozenten nach § 4 Nr. 21 UStG",
                body: [
                    "Selbstständige Lehrer und Dozenten, die an Hochschulen, öffentlichen Schulen, Volkshochschulen oder anerkannten privaten Bildungseinrichtungen (mit Bescheinigung der Landesbehörde) unterrichten, rechnen ihre Lehrleistungen nach § 4 Nr. 21 Buchst. b UStG umsatzsteuerfrei ab.",
                ],
            },
        ],
        faqs: [
            {
                question: "Sind Dozenten rentenversicherungspflichtig?",
                answer: "Ja, selbstständige Lehrer und Dozenten, die keinen sozialversicherungspflichtigen Arbeitnehmer beschäftigen, unterliegen kraft Gesetzes nach § 2 Satz 1 Nr. 1 SGB VI der gesetzlichen Rentenversicherungspflicht (18,6 %).",
            },
        ],
        relatedToolSlugs: ["rechnungsgenerator", "stundensatz-rechner", "fahrtkosten-rechner"],
    },
    {
        slug: "gartenbau-hausmeister",
        title: "Rechnungsvorlage Gartenbau (GaLaBau) & Hausmeisterservice",
        shortTitle: "Gartenbau & Hausmeister",
        eyebrow: "GALABAU & OBJEKTBETREUUNG",
        category: "Handwerk & Bau",
        badge: "Inkl. § 35a EStG Grünpflege",
        description:
            "Rechnungsvorlage für Garten- und Landschaftsbau, Baumpflege, Winterdienst und Hausmeisterservice: Grünpflege, Arbeitsstunden, Grünschnitt-Entsorgung & § 35a EStG.",
        metaTitle: "Rechnungsvorlage Gartenbau & Hausmeister: Muster (PDF)",
        metaDescription:
            "Kostenlose Rechnungsvorlage für Gartenbau (GaLaBau), Winterdienst & Hausmeisterservice: Arbeitslohn nach § 35a EStG, Pflanzen (7 % / 19 %) und Entsorgung abrechnen.",
        keywords: [
            "Rechnungsvorlage Gartenbau",
            "Rechnungsvorlage Hausmeisterservice",
            "GaLaBau Rechnung Muster",
            "Winterdienst Rechnung schreiben",
            "Gartenarbeiten steuerlich absetzen § 35a",
        ],
        presetData: {
            invoiceTitle: "RECHNUNG",
            senderName: "GrünWerk Garten- & Landschaftsbau Meisterbetrieb",
            senderAddress: "Baumschulweg 11\n30159 Hannover",
            senderTaxId: "DE254637189",
            recipientName: "WEG Wohnanlage Parkblick c/o Hausverwaltung Meyer",
            recipientAddress: "Georgstraße 25\n30159 Hannover",
            taxMode: "standard",
            show35aHighlight: true,
            items: [
                {
                    description: "Herbstschnitt Hecken- und Strauchbestand inkl. Rasenmahd (Arbeitsleistung)",
                    quantity: 9,
                    unit: "Std.",
                    price: 52.0,
                    vatRate: 19,
                    isLabor35a: true,
                },
                {
                    description: "Einsatz Häcksler & Motorsägen inkl. Betriebsstoffe (Maschinenkosten)",
                    quantity: 1,
                    unit: "Pausch.",
                    price: 65.0,
                    vatRate: 19,
                    isLabor35a: true,
                },
                {
                    description: "Abtransport & Deponiegebühren Grünschnitt (3,5 m³)",
                    quantity: 3.5,
                    unit: "m³",
                    price: 28.0,
                    vatRate: 19,
                    isLabor35a: false,
                },
            ],
            legalNote:
                "Für Eigentümer und Mieter: Die ausgewiesenen Arbeits- und Maschinenkosten sind als haushaltsnahe Dienstleistungen bzw. Handwerkerleistungen nach § 35a EStG steuerlich begünstigt.",
        },
        legalChecklist: [
            "Arbeits- und Maschinenkosten separat für die Betriebskostenabrechnung (§ 35a EStG) der Hausverwaltung ausweisen",
            "Vorsicht bei Pflanzenlieferung: Reine Pflanzenlieferung ohne Einpflanzen = 7 % USt, Komplett-Gartenanlage (Werklieferung) = einheitlich 19 % USt!",
            "Zweijähriger Aufbewahrungshinweis nach § 14b UStG bei Privatgrundstücken",
        ],
        guideSections: [
            {
                title: "7 % oder 19 % Umsatzsteuer auf Pflanzen im Gartenbau?",
                body: [
                    "Liefern Sie lediglich Pflanzen, Bäume oder Saatgut ohne weitere Bodenbearbeitung, gilt der ermäßigte Steuersatz von 7 %.",
                    "Übernehmen Sie jedoch die Planung, Bodenvorbereitung und das Einpflanzen im Rahmen einer Gartengestaltung, handelt es sich umsatzsteuerlich um eine einheitliche Werklieferung, die insgesamt (inklusive der Pflanzen) dem Regelsteuersatz von 19 % unterliegt.",
                ],
            },
        ],
        faqs: [
            {
                question: "Zählt Winterdienst zu § 35a EStG?",
                answer: "Ja, Schneeräumen und Streuen auf dem Grundstück sowie auf den angrenzenden öffentlichen Gehwegen zählen als haushaltsnahe Dienstleistungen nach § 35a EStG.",
            },
        ],
        relatedToolSlugs: ["rechnungsgenerator", "bautagebuch-vorlage", "mehrwertsteuer-rechner"],
    },
    {
        slug: "privatperson",
        title: "Rechnung schreiben als Privatperson (Privatrechnung ohne Gewerbe)",
        shortTitle: "Privatperson (ohne Gewerbe)",
        eyebrow: "PRIVATVERKAUF & EINMALIGE TÄTIGKEIT",
        category: "Spezialrechnungen",
        badge: "Ohne Umsatzsteuer",
        description:
            "Kostenlose Vorlage für eine Privatrechnung ohne Gewerbe: Gebrauchtwagen, Technik, Möbel oder einmalige Nachbarschafts-/Gefälligkeitsleistung rechtssicher mit Gewährleistungsausschluss abrechnen.",
        metaTitle: "Rechnung schreiben als Privatperson: Vorlage & Muster (PDF)",
        metaDescription:
            "Privatrechnung ohne Gewerbe online erstellen: Vorlage für Privatverkauf an Firmen oder einmalige Leistungen – ohne Umsatzsteuer und mit Sachmängelhaftungsausschluss.",
        keywords: [
            "Rechnung schreiben als Privatperson",
            "Privatrechnung Vorlage kostenlos",
            "Rechnung ohne Gewerbe schreiben",
            "Privatverkauf an Firma Rechnung Muster",
            "Einmalige Dienstleistung Privatperson Rechnung",
        ],
        presetData: {
            invoiceTitle: "PRIVATRECHNUNG / KAUFBELEG",
            senderName: "Lukas Hartmann (Privatverkauf)",
            senderAddress: "Schillerstraße 21\n04109 Leipzig",
            senderTaxId: "",
            recipientName: "Mediahaus Kreativ GmbH",
            recipientAddress: "Karl-Liebknecht-Str. 45\n04107 Leipzig",
            taxMode: "kleinunternehmer",
            show35aHighlight: false,
            items: [
                {
                    description: "Verkauf aus Privatbesitz: Apple MacBook Pro 16 Zoll (M3 Max, 36 GB RAM, 1 TB SSD, Seriennr. C02X98765)",
                    quantity: 1,
                    unit: "Stk.",
                    price: 2150.0,
                    vatRate: 0,
                },
            ],
            legalNote:
                "Hinweis: Dies ist ein privater Verkauf bzw. eine einmalige nicht-unternehmerische Leistung. Es erfolgt kein Ausweis der Umsatzsteuer, da der Aussteller kein Unternehmer im Sinne des § 2 UStG ist. Der Verkauf erfolgt unter Ausschluss jeglicher Sachmängelhaftung.",
        },
        legalChecklist: [
            "Kein Umsatzsteuerausweis (sonst schulden Sie die Steuer nach § 14c Abs. 2 UStG!)",
            "Kein Verweis auf § 19 UStG (denn § 19 gilt für Unternehmer – schreiben Sie stattdessen: 'Privatverkauf ohne Umsatzsteuer, da kein Unternehmer nach § 2 UStG')",
            "Bei gebrauchten Gegenständen: Wirksamer Ausschluss der Sachmängelhaftung (Gewährleistung)",
            "Freigrenze für sonstige Einkünfte nach § 22 Nr. 3 EStG (256 € pro Jahr) bzw. privates Veräußerungsgeschäft (§ 23 EStG) beachten",
        ],
        guideSections: [
            {
                title: "Darf man als Privatperson überhaupt eine Rechnung ausstellen?",
                body: [
                    "Ja! Wenn Sie beispielsweise gebrauchtes Equipment (Laptop, Kamera, Möbel, Fahrzeug) aus Ihrem Privatvermögen an ein Unternehmen oder einen Selbstständigen verkaufen, benötigt der Käufer einen ordentlichen Buchungsbeleg für seine Betriebsausgaben.",
                    "Auch bei einer einmaligen, nicht auf Wiederholung angelegten Tätigkeit (keine Nachhaltigkeit im Sinne des § 15 EStG / § 2 UStG) dürfen Sie eine Privatrechnung ausstellen. Solange Ihre Einkünfte aus solchen gelegentlichen Leistungen unter 256 € im Kalenderjahr liegen (§ 22 Nr. 3 EStG), bleiben sie sogar einkommensteuerfrei.",
                ],
            },
        ],
        faqs: [
            {
                question: "Muss ich auf einer Privatrechnung meine private Steuer-ID angeben?",
                answer: "Nein! Ihre persönliche elfstellige Steuer-Identifikationsnummer (§ 139b AO) gehört bei einem Privatverkauf nicht auf die Rechnung.",
            },
        ],
        relatedToolSlugs: ["rechnungsgenerator", "quittung-erstellen", "eigenbeleg-vorlage"],
    },
    {
        slug: "kuenstler-musiker-dj",
        title: "Rechnungsvorlage Künstler, Musiker, Bands & DJs (Gage & KSK)",
        shortTitle: "Künstler, Musiker & DJs",
        eyebrow: "KULTUR, MUSIK & EVENTS",
        category: "Freelancer & Kreativ",
        badge: "Gagenabrechnung",
        description:
            "Rechnungsvorlage für Musiker, DJs, Bands, Schauspieler und bildende Künstler: Gagenabrechnung, Fahrtkosten, § 4 Nr. 20a UStG / 7 % / 19 % USt und Künstlersozialkasse.",
        metaTitle: "Rechnungsvorlage Musiker, DJ & Künstler: Gagen-Muster (PDF)",
        metaDescription:
            "Kostenlose Rechnungsvorlage für Musiker, DJs, Bands & Künstler: Gagen, Technik-Pauschalen und Reisekosten rechtssicher abrechnen und als PDF herunterladen.",
        keywords: [
            "Rechnungsvorlage Musiker",
            "Rechnungsvorlage DJ",
            "Künstler Rechnung schreiben",
            "Gagenabrechnung Vorlage Band",
            "DJ Rechnung 7 oder 19 Prozent",
        ],
        presetData: {
            invoiceTitle: "GAGEN- & HONORARRECHNUNG",
            senderName: "Alex Rivera – Live-Music & Event-DJ",
            senderAddress: "Eppendorfer Weg 102\n20259 Hamburg",
            senderTaxId: "DE310293847",
            recipientName: "Eventagentur Elbklang GmbH",
            recipientAddress: "Große Elbstraße 60\n22767 Hamburg",
            taxMode: "standard",
            show35aHighlight: false,
            items: [
                {
                    description: "Musikalischer Live-Auftritt / DJ-Set Firmenjubiläum am 16.10.2026 (20:00 – 02:00 Uhr)",
                    quantity: 1,
                    unit: "Pausch.",
                    price: 950.0,
                    vatRate: 19,
                },
                {
                    description: "Bereitstellung Ton- und Lichtanlage (PA-System bis 150 Personen inkl. Auf- und Abbau)",
                    quantity: 1,
                    unit: "Pausch.",
                    price: 250.0,
                    vatRate: 19,
                },
                {
                    description: "Fahrtkostenpauschale Hin- und Rückfahrt (120 km à 0,30 €)",
                    quantity: 120,
                    unit: "km",
                    price: 0.3,
                    vatRate: 19,
                },
            ],
            legalNote:
                "Vielen Dank für das gelungene Event! Bitte überweisen Sie den Betrag innerhalb von 14 Tagen auf das unten angegebene Konto.",
        },
        legalChecklist: [
            "Reisekosten teilen als Nebenleistung stets den Umsatzsteuersatz der Hauptleistung (19 % oder 7 %)!",
            "Prüfung: Reine Unterhaltungs-DJs auf Partys/Hochzeiten unterliegen 19 % USt (oder § 19 UStG Kleinunternehmer)",
            "Solokünstler / Bands mit eigener künstlerischer Darbietung können unter bestimmten Voraussetzungen § 4 Nr. 20a UStG (mit Bescheinigung) nutzen",
        ],
        guideSections: [
            {
                title: "Umsatzsteuer und Künstlersozialabgabe (KSK) bei Events",
                body: [
                    "Bucht ein Unternehmen regelmäßig Künstler, Musiker, Texter oder Fotografen, muss das beauftragende Unternehmen auf die gezahlten Netto-Honorare (inklusive Nebenkosten wie Reisekosten!) die Künstlersozialabgabe (2026: 5,0 %) an die Künstlersozialkasse abführen.",
                ],
            },
        ],
        faqs: [
            {
                question: "Darf ich die Künstlersozialabgabe auf meiner Rechnung aufschlagen?",
                answer: "Nein! Schuldner der Künstlersozialabgabe ist ausschließlich der verwertende Auftraggeber gegenüber der KSK. Der Künstler darf sie weder in Rechnung stellen noch vom Honorar abgezogen bekommen (§ 32 SGB I).",
            },
        ],
        relatedToolSlugs: ["rechnungsgenerator", "fahrtkosten-rechner", "kleinunternehmer-rechner"],
    },
    {
        slug: "beratung-consulting",
        title: "Rechnungsvorlage Unternehmensberatung, Coaching & Agenturen",
        shortTitle: "Beratung, Coaching & Agentur",
        eyebrow: "CONSULTING, MARKETING & COACHING",
        category: "Dienstleistung & Heilberufe",
        badge: "Retainer & Projekt",
        description:
            "Professionelle Rechnungsvorlage für Unternehmensberater, Business Coaches, Marketing-Agenturen und SEO/SEA-Experten: Workshops, Tagessätze, Retainer & Media-Budget.",
        metaTitle: "Rechnungsvorlage Beratung, Coaching & Agentur: Muster (PDF)",
        metaDescription:
            "Kostenlose Rechnungsvorlage für Unternehmensberatung, Coaching & Marketing-Agenturen: Workshops, Beratungsstunden und durchlaufende Posten sauber abrechnen.",
        keywords: [
            "Rechnungsvorlage Unternehmensberatung",
            "Rechnungsvorlage Agentur Marketing",
            "Rechnungsvorlage Coaching",
            "Beraterhonorar Rechnung Muster",
            "Durchlaufender Posten Rechnung Agentur",
        ],
        presetData: {
            invoiceTitle: "RECHNUNG",
            senderName: "Vanguard Strategy & Growth Consulting GmbH",
            senderAddress: "Königsallee 60\n40212 Düsseldorf",
            senderTaxId: "DE299887766",
            recipientName: "Mittelstand Maschinenbau AG",
            recipientAddress: "Düsseldorfer Str. 15\n40545 Düsseldorf",
            taxMode: "standard",
            show35aHighlight: false,
            items: [
                {
                    description: "Strategie-Workshop 'Digitale Vertriebstransformation' (ganztägig vor Ort inkl. Ergebnisdokumentation)",
                    quantity: 2,
                    unit: "Tage",
                    price: 1650.0,
                    vatRate: 19,
                },
                {
                    description: "Monatliches Performance- & KPI-Monitoring (Retainer Oktober 2026)",
                    quantity: 1,
                    unit: "Monat",
                    price: 1200.0,
                    vatRate: 19,
                },
            ],
            legalNote:
                "Zahlbar innerhalb von 14 Tagen nach Rechnungserhalt ohne Abzug.",
        },
        legalChecklist: [
            "Konkrete Leistungsbeschreibung statt pauschaler 'Beratung' (Finanzämter prüfen vage Beraterrechnungen besonders streng auf Betriebsausgabenabzug!)",
            "Saubere Trennung zwischen Agenturhonorar und echten durchlaufenden Posten (§ 10 Abs. 1 Satz 5 UStG, z. B. Werbebudget im Namen und auf Rechnung des Kunden)",
        ],
        guideSections: [
            {
                title: "Vorsicht bei vagen Leistungsbeschreibungen ('Beratung pauschal')",
                body: [
                    "Nach ständiger Rechtsprechung des Bundesfinanzhofs (BFH) berechtigt eine Rechnung, auf der lediglich 'Beratungsleistungen im Monat Oktober' steht, den Kunden NICHT zum Vorsteuerabzug!",
                    "Bezeichnen Sie Projekt, Workshop-Thema, Leistungszeitraum und ggf. das zugrundeliegende Angebot stets so konkret, dass das Finanzamt die Leistung eindeutig identifizieren kann.",
                ],
            },
        ],
        faqs: [
            {
                question: "Wann ist Werbebudget (Google/Meta Ads) ein durchlaufender Posten?",
                answer: "Nur dann, wenn das Werbekonto direkt auf den Namen und für Rechnung Ihres Kunden läuft und Sie den Betrag lediglich verauslagen. Buchen Sie Ads im eigenen Namen und berechnen sie weiter, handelt es sich um eine umsatzsteuerpflichtige Nebenleistung (19 % USt).",
            },
        ],
        relatedToolSlugs: ["rechnungsgenerator", "angebotsgenerator", "stundensatz-rechner"],
    },
    {
        slug: "abschlagsrechnung",
        title: "Abschlagsrechnung & Teilrechnung Vorlage (VOB/B & § 632a BGB)",
        shortTitle: "Abschlagsrechnung (Teilzahlung)",
        eyebrow: "PROJEKT- & BAUABRECHNUNG",
        category: "Spezialrechnungen",
        badge: "1. / 2. Abschlag",
        description:
            "Kostenlose Vorlage für eine Abschlagsrechnung (Anzahlung / Teilrechnung) nach § 632a BGB und § 16 VOB/B: Liquidität während laufender Projekte rechtssicher sichern.",
        metaTitle: "Abschlagsrechnung Vorlage & Muster kostenlos (§ 632a PDF)",
        metaDescription:
            "Abschlagsrechnung & Anzahlungsrechnung online erstellen: Vorlage nach § 632a BGB und VOB/B mit Umsatzsteuerausweis für Handwerk, Bau, Agenturen und IT-Projekte.",
        keywords: [
            "Abschlagsrechnung Vorlage",
            "Abschlagsrechnung Muster kostenlos",
            "Anzahlungsrechnung schreiben",
            "Teilrechnung Vorlage PDF",
            "§ 632a BGB Abschlagszahlung Rechnung",
        ],
        presetData: {
            invoiceTitle: "1. ABSCHLAGSRECHNUNG",
            senderName: "Holzbau & Zimmerei Meisterbetrieb Albrecht",
            senderAddress: "Sägewerkstraße 3\n83022 Rosenheim",
            senderTaxId: "DE245123890",
            recipientName: "Bauherrschaft Familie Dr. Weber",
            recipientAddress: "Alpenblick 7\n83026 Rosenheim",
            taxMode: "standard",
            show35aHighlight: false,
            items: [
                {
                    description: "1. Abschlagszahlung (40 %) gemäß Angebot Nr. AN-2026-042 vom 15.09.2026 für Dachstuhl-Erneuerung nach Fertigstellung des Abbunds",
                    quantity: 1,
                    unit: "Abschlag",
                    price: 8400.0,
                    vatRate: 19,
                },
            ],
            legalNote:
                "Es handelt sich um die 1. Abschlagsrechnung gemäß § 632a BGB zu Auftrag AN-2026-042 (Gesamtauftragsvolumen netto: 21.000,00 €). Die Endabrechnung erfolgt nach Abnahme in der Schlussrechnung.",
        },
        legalChecklist: [
            "Eindeutige Bezeichnung als 'Abschlagsrechnung' oder 'Anzahlungsrechnung' (z. B. '1. Abschlagsrechnung')",
            "Verweis auf das zugrundeliegende Angebot / den Werkvertrag und den Leistungsstand",
            "Voller Umsatzsteuerausweis auch auf der Abschlagsrechnung (§ 14 Abs. 5 UStG)!",
        ],
        guideSections: [
            {
                title: "Ihr gesetzliches Recht auf Abschlagszahlungen nach § 632a BGB",
                body: [
                    "Bei Werkverträgen (§ 632a BGB) haben Sie einen gesetzlichen Anspruch auf Abschlagszahlungen in Höhe des Wertes der von Ihnen bereits erbrachten und nach dem Vertrag geschuldeten Leistungen.",
                    "Wichtig für die spätere Schlussrechnung: In der Schlussrechnung müssen alle zuvor gestellten und vereinnahmten Abschläge inklusive der darauf entfallenden Umsatzsteuerbeträge offen wieder abgezogen werden!",
                ],
            },
        ],
        faqs: [
            {
                question: "Wann muss ich die Umsatzsteuer aus einer Abschlagsrechnung ans Finanzamt abführen?",
                answer: "Sowohl bei Soll- als auch bei Ist-Versteuerung entsteht die Umsatzsteuer für Anzahlungen und Abschläge nach § 13 Abs. 1 Nr. 1a Satz 4 UStG in dem Voranmeldungszeitraum, in dem das Geld tatsächlich auf Ihrem Konto eingeht.",
            },
        ],
        relatedToolSlugs: ["rechnungsgenerator", "angebotsgenerator", "bautagebuch-vorlage"],
    },
    {
        slug: "schlussrechnung",
        title: "Schlussrechnung Vorlage (Endabrechnung mit Abzug von Abschlägen)",
        shortTitle: "Schlussrechnung (Endabrechnung)",
        eyebrow: "PROJEKTABSCHLUSS & VOB/B",
        category: "Spezialrechnungen",
        badge: "Inkl. Abschlags-Abzug",
        description:
            "Rechtssichere Schlussrechnung Vorlage nach § 14 Abs. 5 UStG: Gesamtleistung aufführen, erhaltene Abschlagszahlungen (Netto + USt) sauber abziehen und Restzahlung ausweisen.",
        metaTitle: "Schlussrechnung Vorlage & Muster (mit Abschlags-Abzug PDF)",
        metaDescription:
            "Schlussrechnung nach § 14 Abs. 5 UStG und VOB/B online erstellen: Gesamtleistung abzüglich gezahlter Abschläge und Umsatzsteuer fehlerfrei berechnen.",
        keywords: [
            "Schlussrechnung Vorlage",
            "Schlussrechnung Muster mit Abschlagszahlungen",
            "Endrechnung erstellen Handwerker",
            "§ 14 Abs. 5 UStG Schlussrechnung",
            "Abschlagszahlungen in Schlussrechnung abziehen",
        ],
        presetData: {
            invoiceTitle: "SCHLUSSRECHNUNG",
            senderName: "Holzbau & Zimmerei Meisterbetrieb Albrecht",
            senderAddress: "Sägewerkstraße 3\n83022 Rosenheim",
            senderTaxId: "DE245123890",
            recipientName: "Bauherrschaft Familie Dr. Weber",
            recipientAddress: "Alpenblick 7\n83026 Rosenheim",
            taxMode: "standard",
            show35aHighlight: true,
            items: [
                {
                    description: "Gesamtleistung: Dachstuhl-Erneuerung inkl. Konstruktionsvollholz & Dacheindeckung (Materialanteil)",
                    quantity: 1,
                    unit: "Pausch.",
                    price: 13000.0,
                    vatRate: 19,
                    isLabor35a: false,
                },
                {
                    description: "Gesamtleistung: Zimmererarbeiten, Richtfest & Montage vor Ort (Arbeitsleistung § 35a EStG)",
                    quantity: 1,
                    unit: "Pausch.",
                    price: 8000.0,
                    vatRate: 19,
                    isLabor35a: true,
                },
                {
                    description: "ABZUG: Bereits erhaltene 1. Abschlagszahlung (Rechnung RE-2026-051 vom 01.10.2026, bezahlt am 08.10.2026)",
                    quantity: 1,
                    unit: "Abzug",
                    price: -8400.0,
                    vatRate: 19,
                    isLabor35a: false,
                },
            ],
            legalNote:
                "Schlussrechnung nach erfolgreicher Endabnahme am 22.10.2026. Die bereits geleistete Abschlagszahlung in Höhe von 8.400,00 € netto (zzgl. 1.596,00 € USt = 9.996,00 € brutto) wurde gemäß § 14 Abs. 5 Satz 2 UStG in Abzug gebracht.",
        },
        legalChecklist: [
            "Aufführung der gesamten erbrachten Leistung (nicht nur der Restleistung!)",
            "Offener Abzug aller bereits vereinnahmten Teilentgelte / Abschläge jeweils mit Netto- und Steuerbetrag (§ 14 Abs. 5 Satz 2 UStG)",
            "Datum der tatsächlichen Bau- oder Projekt-Endabnahme angeben",
        ],
        guideSections: [
            {
                title: "Der häufigste Steuerfehler bei Schlussrechnungen (§ 14 Abs. 5 UStG)",
                body: [
                    "Wenn Sie in einer Schlussrechnung die bereits bezahlten Abschläge nicht korrekt offen mit Netto- und Umsatzsteuerbetrag abziehen, schulden Sie dem Finanzamt die Umsatzsteuer auf den Gesamtbetrag ein zweites Mal (§ 14c Abs. 1 UStG)!",
                    "Durch eine negative Abzugsposition in unserem Rechnungsgenerator werden sowohl die Netto-Bemessungsgrundlage als auch die Umsatzsteuer automatisch centgenau reduziert.",
                ],
            },
        ],
        faqs: [
            {
                question: "Muss ich nicht bezahlte Abschlagsrechnungen in der Schlussrechnung abziehen?",
                answer: "In der Schlussrechnung ziehen Sie nur tatsächlich vereinnahmte (bezahlte) Abschläge ab. Noch offene Abschlagsrechnungen erklären Sie in der Schlussrechnung ausdrücklich für gegenstandslos.",
            },
        ],
        relatedToolSlugs: ["rechnungsgenerator", "bautagebuch-vorlage", "verzugszinsen-rechner"],
    },
    {
        slug: "dauerrechnung",
        title: "Dauerrechnung Vorlage (Miete, Leasing & Wartungsvertrag § 14 UStG)",
        shortTitle: "Dauerrechnung (Miete & Abo)",
        eyebrow: "DAUERSCHULDVERHÄLTNISSE",
        category: "Spezialrechnungen",
        badge: "Für ganzes Kalenderjahr",
        description:
            "Kostenlose Dauerrechnung Vorlage für gewerbliche Vermieter, Wartungsverträge, Hosting-Abos und monatliche Retainer: Einmal jährlich ausstellen und Vorsteuerabzug sichern.",
        metaTitle: "Dauerrechnung Vorlage & Muster kostenlos (Miete & Wartung)",
        metaDescription:
            "Dauerrechnung für Gewerbemiete, Leasing & Wartungsverträge online erstellen: Vorlage mit Gültigkeitszeitraum und allen Pflichtangaben nach § 14 UStG.",
        keywords: [
            "Dauerrechnung Vorlage",
            "Dauerrechnung Miete Gewerbe Muster",
            "Dauerrechnung erstellen PDF",
            "Wartungsvertrag Dauerrechnung Pflichtangaben",
            "Dauerrechnung Leistungszeitraum",
        ],
        presetData: {
            invoiceTitle: "DAUERRECHNUNG 2026",
            senderName: "ImmoInvest Gewerbeobjekte GmbH & Co. KG",
            senderAddress: "Maximilianstraße 12\n80539 München",
            senderTaxId: "DE192837465",
            recipientName: "Designagentur Pixelwerk GmbH",
            recipientAddress: "Leopoldstraße 44\n80802 München",
            taxMode: "standard",
            show35aHighlight: false,
            items: [
                {
                    description: "Monatliche Nettokaltmiete Büroeinheit 3. OG (145 m²) gemäß Gewerbemietvertrag (Option zur Umsatzsteuer nach § 9 UStG)",
                    quantity: 1,
                    unit: "Monat",
                    price: 2100.0,
                    vatRate: 19,
                },
                {
                    description: "Monatliche Betriebskosten- und Heizkostenvorauszahlung",
                    quantity: 1,
                    unit: "Monat",
                    price: 350.0,
                    vatRate: 19,
                },
            ],
            legalNote:
                "Gültigkeitszeitraum dieser Dauerrechnung: 01.01.2026 bis 31.12.2026 (bzw. bis auf Widerruf). Der ausgewiesene Gesamtbetrag ist jeweils monatlich im Voraus bis zum 3. Werktag eines jeden Kalendermonats fällig.",
        },
        legalChecklist: [
            "Ausdrückliche Kennzeichnung als 'Dauerrechnung' mit exaktem Gültigkeitszeitraum (z. B. 01.01.2026 – 31.12.2026)",
            "Monatlicher Fälligkeitstermin und Zahlungsintervall klar benennen",
            "Bei neuer Preis- oder Nebenkostenanpassung muss eine neue Dauerrechnung mit neuer Rechnungsnummer ausgestellt werden",
        ],
        guideSections: [
            {
                title: "Wie funktioniert eine Dauerrechnung für den Vorsteuerabzug?",
                body: [
                    "Bei wiederkehrenden Leistungen (Gewerberaummiete mit Umsatzsteueroption nach § 9 UStG, IT-Wartungsverträge, monatliche SEO-Retainer) erspart die Dauerrechnung den monatlichen Rechnungsversand.",
                    "Der Leistungsempfänger kann aus der Dauerrechnung in jedem Monat, in dem er die Rate bezahlt, die enthaltene Vorsteuer beim Finanzamt geltend machen.",
                ],
            },
        ],
        faqs: [
            {
                question: "Muss ich jedes Jahr eine neue Dauerrechnung ausstellen?",
                answer: "Befristen Sie die Dauerrechnung auf ein Kalenderjahr (z. B. 01.01.2026 bis 31.12.2026), stellen Sie zum Jahresbeginn ein neues Dokument aus. Alternativ kann sie 'gültig ab 01.01.2026 bis zum Eingang einer geänderten Dauerrechnung' formuliert werden.",
            },
        ],
        relatedToolSlugs: ["rechnungsgenerator", "sepa-xml-generator", "girocode-generator"],
    },
];

export function getVorlageBySlug(slug: string): InvoiceTemplateDefinition | undefined {
    return VORLAGEN_CATALOG.find((v) => v.slug === slug);
}
