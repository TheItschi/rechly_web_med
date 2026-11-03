import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/appwrite-server";
import type { AIInvoiceDraftParseResult } from "@/types";
import {
    AI_PREFS_KEY,
    assertAndRecordAIUsage,
    generateAIText,
    resolveAISettings,
    sanitizeStoredAISettings,
} from "@/lib/server/ai";

type AssistantAction =
    | "invoice_note"
    | "payment_terms"
    | "payment_reminder"
    | "line_item_description"
    | "overdue_client_reply"
    | "parse_invoice_draft";

type InvoiceLineItemInput = {
    description: string;
    quantity: number;
    unit_of_measure?: string;
    price: number;
};

type InvoiceAssistantBody = {
    action?: AssistantAction;
    companyName?: string;
    clientName?: string;
    clientEmail?: string;
    invoiceNumber?: string;
    issueDate?: string;
    dueDate?: string;
    totalGross?: number;
    currency?: string;
    notes?: string;
    paymentTerms?: string;
    serviceSummary?: string;
    promptText?: string;
    isSmallBusiness?: boolean;
    availableClients?: Array<{ id: string; name: string }>;
    lineItems?: InvoiceLineItemInput[];
    invoices?: Array<{
        invoiceNumber?: string;
        issueDate?: string;
        dueDate?: string;
        totalGross?: number;
        status?: string;
    }>;
};

function parseGermanNumber(raw: string): number {
    const cleaned = raw.trim().replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
    const num = Number.parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
}

function normalizeUnit(raw?: string): string {
    const u = (raw || "").trim().toLowerCase().replace(/\.$/, "");
    if (["std", "stunde", "stunden", "h", "hr", "hour", "hours"].includes(u)) {
        return "Stunde";
    }
    if (["tag", "tage", "t", "day", "days", "pt", "personentag", "personentage"].includes(u)) {
        return "Tag";
    }
    if (["monat", "monate", "mon", "month", "months"].includes(u)) {
        return "Monat";
    }
    if (["pauschal", "pauschale", "flat", "festpreis"].includes(u)) {
        return "Pauschal";
    }
    return "Stück";
}

function parseInvoiceDraftHeuristic(
    promptText: string,
    availableClients: Array<{ id: string; name: string }> = [],
    defaultTaxRate = 19,
): AIInvoiceDraftParseResult {
    const text = promptText.trim();
    let matchedClientId: string | null = null;
    let matchedClientName: string | null = null;

    // 1. Match known clients first
    for (const c of availableClients) {
        if (c.name && text.toLowerCase().includes(c.name.toLowerCase())) {
            matchedClientId = c.id;
            matchedClientName = c.name;
            break;
        }
    }

    // 2. If not matched, look for "Rechnung an <Client>:" or "für <Client>,"
    if (!matchedClientName) {
        const clientMatch = text.match(
            /(?:rechnung\s+an|kunde|für|an)\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß0-9\s.&-]+?)(?:[:,;]|(?=\s+\d))/i,
        );
        if (clientMatch?.[1]) {
            matchedClientName = clientMatch[1].trim();
            const fuzzy = availableClients.find(
                (c) =>
                    c.name.toLowerCase().includes(matchedClientName!.toLowerCase()) ||
                    matchedClientName!.toLowerCase().includes(c.name.toLowerCase()),
            );
            if (fuzzy) {
                matchedClientId = fuzzy.id;
                matchedClientName = fuzzy.name;
            }
        }
    }

    // 3. Extract due days (e.g. "zahlbar in 14 Tagen", "Zahlungsziel 30 Tage")
    let dueDays: number | null = null;
    const dueMatch = text.match(
        /(?:zahlbar\s+in|zahlungsziel|innerhalb\s+von|fällig\s+in)\s+(\d{1,3})\s*tagen?/i,
    );
    if (dueMatch?.[1]) {
        dueDays = Number.parseInt(dueMatch[1], 10);
    }

    // 4. Extract Skonto or payment terms
    let paymentTerms: string | null = null;
    const skontoMatch = text.match(/(\d+(?:[.,]\d+)?)\s*%\s*skonto/i);
    if (dueDays && skontoMatch?.[1]) {
        paymentTerms = `Zahlbar innerhalb von ${dueDays} Tagen. ${skontoMatch[1]}% Skonto bei Zahlung innerhalb von 7 Tagen.`;
    } else if (dueDays) {
        paymentTerms = `Zahlbar innerhalb von ${dueDays} Tagen ohne Abzug.`;
    }

    // 5. Extract line items
    // Strip client prefix and payment suffix to isolate line item segments
    const bodyText = text
        .replace(/^(?:rechnung\s+an|kunde|für)\s+[^:,;]+[:,;]\s*/i, "")
        .replace(
            /[,;.]?\s*(?:zahlbar\s+in|zahlungsziel|innerhalb\s+von|fällig\s+in)\s+\d{1,3}\s*tagen?.*$/i,
            "",
        );

    const segments = bodyText
        .split(/(?:\s+und\s+|\s*\+\s*|;\s*|\n+)/i)
        .map((s) => s.trim())
        .filter(Boolean);

    const items: AIInvoiceDraftParseResult["items"] = [];

    for (const seg of segments) {
        // Pattern A: "8 Std. Webdesign à 110€" or "12 Stunden Beratung zu je 95,50 EUR"
        const matchA = seg.match(
            /^(\d+(?:[.,]\d+)?)\s*(std\.?|stunden?|h|tage?|t|monate?|stü?ck|stk\.?|x|pauschal)?\s+(.+?)\s+(?:à|a|zu(?:\s+je)?|für|je|@|-)\s*(\d+(?:[.,]\d+)?)\s*(?:€|eur|euro)?/i,
        );
        if (matchA) {
            const quantity = parseGermanNumber(matchA[1]) || 1;
            const unit = normalizeUnit(matchA[2]);
            const description = matchA[3].replace(/^[,;-]\s*/, "").trim();
            const price = parseGermanNumber(matchA[4]);
            if (description && price > 0) {
                items.push({
                    description,
                    quantity,
                    unit_of_measure: unit,
                    price,
                    tax_rate_percent: defaultTaxRate,
                });
                continue;
            }
        }

        // Pattern B: "Hosting Pauschal 250€" or "Webdesign 1.200 €"
        const matchB = seg.match(
            /^(.+?)\s+(pauschal|stunde|tag|monat|stück)?\s*(\d+(?:[.,]\d+)?)\s*(?:€|eur|euro)\b/i,
        );
        if (matchB) {
            const rawDesc = matchB[1].replace(/^\d+\s*x\s+/i, "").trim();
            const qtyPrefix = matchB[1].match(/^(\d+(?:[.,]\d+)?)\s*x\s+/i);
            const quantity = qtyPrefix ? parseGermanNumber(qtyPrefix[1]) : 1;
            const unit = matchB[2] ? normalizeUnit(matchB[2]) : "Pauschal";
            const price = parseGermanNumber(matchB[3]);
            if (rawDesc && price > 0) {
                items.push({
                    description: rawDesc,
                    quantity,
                    unit_of_measure: unit,
                    price,
                    tax_rate_percent: defaultTaxRate,
                });
            }
        }
    }

    return {
        client_id: matchedClientId,
        client_name: matchedClientName,
        due_days: dueDays,
        payment_terms: paymentTerms,
        notes: null,
        items,
    };
}

function buildPrompt(
    body: Required<Pick<InvoiceAssistantBody, "action">> & InvoiceAssistantBody,
): string {
    const amount =
        typeof body.totalGross === "number" && Number.isFinite(body.totalGross)
            ? body.totalGross.toFixed(2)
            : "unbekannt";
    const lineSummary = (body.lineItems || [])
        .map(
            (item) =>
                `- ${item.description}: ${item.quantity} ${item.unit_of_measure || "Einheit"} zu ${item.price.toFixed(2)} EUR`,
        )
        .join("\n");
    const invoiceSummary = (body.invoices || [])
        .map(
            (invoice) =>
                `- ${invoice.invoiceNumber || "Unbekannt"}: fällig ${invoice.dueDate || "Unbekannt"}, Betrag ${typeof invoice.totalGross === "number" ? invoice.totalGross.toFixed(2) : "unbekannt"} ${body.currency || "EUR"}, Status ${invoice.status || "offen"}`,
        )
        .join("\n");

    if (body.action === "line_item_description") {
        return [
            "Schreibe eine professionelle Positionsbeschreibung für eine Rechnung auf Deutsch.",
            "Die Antwort soll direkt einsetzbar sein, ohne Einleitung, ohne Aufzählung, in einem Satz oder kurzen Absatz.",
            `Kurze Leistungszusammenfassung: ${body.serviceSummary || ""}`,
            `Unternehmen: ${body.companyName || "Unbekannt"}`,
            `Patient: ${body.clientName || "Unbekannt"}`,
            typeof body.totalGross === "number"
                ? `Gesamtangebot bisher: ${body.totalGross.toFixed(2)} ${body.currency || "EUR"}`
                : "",
            "Formuliere die Beschreibung konkret, professionell und abrechnungsfähig.",
        ]
            .filter(Boolean)
            .join("\n\n");
    }

    if (body.action === "invoice_note") {
        return [
            "Schreibe kurze professionelle Rechnungsnotizen auf Deutsch.",
            "Die Antwort soll direkt einsetzbar sein und keine Einleitung enthalten.",
            `Unternehmen: ${body.companyName || "Unbekannt"}`,
            `Patient: ${body.clientName || "Unbekannt"}`,
            `Rechnungsnummer: ${body.invoiceNumber || "Unbekannt"}`,
            `Rechnungsdatum: ${body.issueDate || "Unbekannt"}`,
            `Fälligkeitsdatum: ${body.dueDate || "Unbekannt"}`,
            `Gesamtbetrag: ${amount} ${body.currency || "EUR"}`,
            lineSummary ? `Positionen:\n${lineSummary}` : "",
            "Erzeuge 3 bis 5 Sätze, freundlich und sachlich.",
        ]
            .filter(Boolean)
            .join("\n\n");
    }

    if (body.action === "payment_terms") {
        return [
            "Formuliere professionelle Zahlungsbedingungen auf Deutsch für eine Rechnung.",
            "Die Antwort soll direkt einsetzbar sein und keine Aufzählung enthalten, außer wenn es klar sinnvoll ist.",
            `Unternehmen: ${body.companyName || "Unbekannt"}`,
            `Patient: ${body.clientName || "Unbekannt"}`,
            `Rechnungsnummer: ${body.invoiceNumber || "Unbekannt"}`,
            `Rechnungsdatum: ${body.issueDate || "Unbekannt"}`,
            `Fälligkeitsdatum: ${body.dueDate || "Unbekannt"}`,
            `Gesamtbetrag: ${amount} ${body.currency || "EUR"}`,
            body.notes ? `Kontextnotizen: ${body.notes}` : "",
            "Schreibe einen kurzen Absatz mit Zahlungsziel, Verwendungszweck und höflichem Hinweis auf fristgerechte Zahlung.",
        ]
            .filter(Boolean)
            .join("\n\n");
    }

    if (body.action === "overdue_client_reply") {
        return [
            "Entwirf eine professionelle Nachricht auf Deutsch an einen Patienten mit überfälligen Rechnungen.",
            "Struktur: zuerst eine Betreffzeile in der Form 'Betreff: ...', dann eine Leerzeile, dann der Nachrichtentext.",
            `Unternehmen: ${body.companyName || "Unbekannt"}`,
            `Patient: ${body.clientName || "Unbekannt"}`,
            `Patienten-E-Mail: ${body.clientEmail || "Nicht hinterlegt"}`,
            invoiceSummary ? `Überfällige Rechnungen:\n${invoiceSummary}` : "",
            "Ton: freundlich, bestimmt, professionell. Bitte um kurze Rückmeldung und Zahlungsausgleich. Keine Markdown-Formatierung.",
        ]
            .filter(Boolean)
            .join("\n\n");
    }

    if (body.action === "parse_invoice_draft") {
        const clientList = (body.availableClients || [])
            .slice(0, 50)
            .map((c) => `- ID: "${c.id}", Name: "${c.name}"`)
            .join("\n");
        const defaultVat = body.isSmallBusiness ? 0 : 19;

        return [
            "Du bist ein präziser deutscher Buchhaltungs-KI-Assistent. Extrahiere aus dem folgenden Freitext einen strukturierten Rechnungsentwurf.",
            "Gib AUSSCHLIESSLICH valides JSON ohne Markdown-Codeblöcke und ohne Erklärungen zurück.",
            clientList ? `Bekannte Patienten:\n${clientList}` : "",
            `Standard-Umsatzsteuersatz: ${defaultVat}%`,
            `Freitext-Eingabe: "${body.promptText || ""}"`,
            `Erwartetes JSON-Schema:
{
  "client_id": "Exakte ID aus Bekannte Patienten falls passend, sonst null",
  "client_name": "Erkannter Patientenname oder null",
  "due_days": 14,
  "payment_terms": "Formulierte Zahlungsbedingungen falls erwähnt, sonst null",
  "notes": "Kurze freundliche Rechnungsnotiz passend zum Auftrag oder null",
  "items": [
    {
      "description": "Professionell formulierte Leistungsbeschreibung auf Deutsch",
      "quantity": 1,
      "unit_of_measure": "Stunde | Stück | Tag | Monat | Pauschal",
      "price": 100.0,
      "tax_rate_percent": ${defaultVat}
    }
  ]
}`,
        ]
            .filter(Boolean)
            .join("\n\n");
    }

    return [
        "Entwirf eine professionelle Zahlungserinnerung auf Deutsch als E-Mail.",
        "Struktur: zuerst eine Betreffzeile in der Form 'Betreff: ...', dann eine Leerzeile, dann der E-Mail-Text.",
        `Unternehmen: ${body.companyName || "Unbekannt"}`,
        `Patient: ${body.clientName || "Unbekannt"}`,
        `Patienten-E-Mail: ${body.clientEmail || "Nicht hinterlegt"}`,
        `Rechnungsnummer: ${body.invoiceNumber || "Unbekannt"}`,
        `Rechnungsdatum: ${body.issueDate || "Unbekannt"}`,
        `Fälligkeitsdatum: ${body.dueDate || "Unbekannt"}`,
        `Gesamtbetrag: ${amount} ${body.currency || "EUR"}`,
        body.paymentTerms
            ? `Bisherige Zahlungsbedingungen: ${body.paymentTerms}`
            : "",
        body.notes ? `Notizen: ${body.notes}` : "",
        "Ton: freundlich, bestimmt, professionell. Keine rechtliche Drohung und keine Markdown-Formatierung.",
    ]
        .filter(Boolean)
        .join("\n\n");
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as InvoiceAssistantBody;
        if (
            body.action !== "invoice_note" &&
            body.action !== "payment_terms" &&
            body.action !== "payment_reminder" &&
            body.action !== "line_item_description" &&
            body.action !== "overdue_client_reply" &&
            body.action !== "parse_invoice_draft"
        ) {
            return NextResponse.json(
                { error: "Invalid assistant action" },
                { status: 400 },
            );
        }

        const sessionClient = await createSessionClient();
        const user = await sessionClient.account.get();
        const prefs = (user.prefs || {}) as Record<string, unknown>;
        const account = sessionClient.account;
        const settings = resolveAISettings(
            sanitizeStoredAISettings(prefs[AI_PREFS_KEY]),
        );

        if (body.action === "parse_invoice_draft") {
            const promptText = body.promptText?.trim() || "";
            if (!promptText) {
                return NextResponse.json(
                    { error: "Prompt text is required" },
                    { status: 400 },
                );
            }

            const defaultTaxRate = body.isSmallBusiness ? 0 : 19;
            const heuristic = parseInvoiceDraftHeuristic(
                promptText,
                body.availableClients || [],
                defaultTaxRate,
            );

            if (settings) {
                try {
                    await assertAndRecordAIUsage({
                        account,
                        prefs,
                        provider: settings.provider,
                        model: settings.model,
                        action: body.action,
                    });

                    const aiRes = await generateAIText(
                        settings,
                        buildPrompt(
                            body as Required<Pick<InvoiceAssistantBody, "action">> &
                                InvoiceAssistantBody,
                        ),
                    );

                    const jsonMatch = aiRes.content.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(
                            jsonMatch[0],
                        ) as Partial<AIInvoiceDraftParseResult>;
                        const merged: AIInvoiceDraftParseResult = {
                            client_id:
                                parsed.client_id || heuristic.client_id || null,
                            client_name:
                                parsed.client_name ||
                                heuristic.client_name ||
                                null,
                            due_days:
                                typeof parsed.due_days === "number"
                                    ? parsed.due_days
                                    : heuristic.due_days,
                            payment_terms:
                                parsed.payment_terms ||
                                heuristic.payment_terms ||
                                null,
                            notes: parsed.notes || heuristic.notes || null,
                            items:
                                Array.isArray(parsed.items) &&
                                parsed.items.length > 0
                                    ? parsed.items.map((item) => ({
                                          description:
                                              String(
                                                  item.description || "Leistung",
                                              ).trim(),
                                          quantity:
                                              Number(item.quantity) > 0
                                                  ? Number(item.quantity)
                                                  : 1,
                                          unit_of_measure: normalizeUnit(
                                              item.unit_of_measure,
                                          ),
                                          price:
                                              Number(item.price) >= 0
                                                  ? Number(item.price)
                                                  : 0,
                                          tax_rate_percent:
                                              body.isSmallBusiness
                                                  ? 0
                                                  : [0, 7, 19].includes(
                                                          Number(
                                                              item.tax_rate_percent,
                                                          ),
                                                      )
                                                    ? Number(
                                                          item.tax_rate_percent,
                                                      )
                                                    : defaultTaxRate,
                                      }))
                                    : heuristic.items,
                        };

                        return NextResponse.json({
                            content: JSON.stringify(merged),
                            parsed: merged,
                            provider: aiRes.provider,
                            model: aiRes.model,
                        });
                    }
                } catch (aiErr) {
                    console.warn(
                        "AI parse_invoice_draft fell back to deterministic parser:",
                        aiErr,
                    );
                }
            }

            return NextResponse.json({
                content: JSON.stringify(heuristic),
                parsed: heuristic,
                provider: settings?.provider || "ollama",
                model: settings?.model || "local-parser",
            });
        }

        if (!settings) {
            return NextResponse.json(
                {
                    error: "AI settings are incomplete. Save provider, model, and API key first.",
                },
                { status: 400 },
            );
        }

        await assertAndRecordAIUsage({
            account,
            prefs,
            provider: settings.provider,
            model: settings.model,
            action: body.action,
        });

        const response = await generateAIText(
            settings,
            buildPrompt(
                body as Required<Pick<InvoiceAssistantBody, "action">> &
                    InvoiceAssistantBody,
            ),
        );
        return NextResponse.json(response);
    } catch (error) {
        console.error("Error running invoice assistant:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to run invoice assistant",
            },
            { status: 500 },
        );
    }
}
