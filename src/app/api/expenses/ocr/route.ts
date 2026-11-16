import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/appwrite-server";
import {
    AI_DISABLED_MESSAGE,
    AI_PREFS_KEY,
    isAIDisabled,
    DEFAULT_OLLAMA_BASE_URL,
    resolveAISettings,
    sanitizeStoredAISettings,
} from "@/lib/server/ai";

export async function POST(request: NextRequest) {
    try {
        let account;
        let user;
        try {
            const sessionClient = await createSessionClient();
            account = sessionClient.account;
            user = await account.get();
        } catch {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 },
            );
        }

        const body = await request.json();
        const { imageBase64, mimeType } = body;

        if (!imageBase64 || !mimeType) {
            return NextResponse.json(
                { error: "imageBase64 and mimeType required" },
                { status: 400 },
            );
        }

        const prefs = (user.prefs || {}) as Record<string, unknown>;
        if (isAIDisabled(prefs)) {
            return NextResponse.json({ error: AI_DISABLED_MESSAGE }, { status: 403 });
        }
        const userSettings = resolveAISettings(
            sanitizeStoredAISettings(prefs[AI_PREFS_KEY]),
        );

        const apiKey =
            userSettings?.api_key ||
            process.env.OPENAI_API_KEY ||
            process.env.ANTHROPIC_API_KEY;

        const isOllama = userSettings?.provider === "ollama";

        if (!apiKey && !isOllama) {
            return NextResponse.json(
                { error: "ai_not_configured" },
                { status: 422 },
            );
        }

        const prompt = `Extract the following information from this receipt/invoice image and return JSON only:
{
  "vendor_name": "string",
  "date": "YYYY-MM-DD",
  "amount_gross": number,
  "vat_rate": number (19, 7, or 0),
  "description": "string"
}
If any field is unclear, use null. Return only valid JSON.`;

        let result: {
            vendor_name?: string;
            date?: string;
            amount_gross?: number;
            vat_rate?: number;
            description?: string;
        } = {};

        if (userSettings?.provider === "anthropic" || (!userSettings && process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY)) {
            const anthropicKey = userSettings?.api_key || process.env.ANTHROPIC_API_KEY!;
            const anthropicModel = userSettings?.model || "claude-3-haiku-20240307";

            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": anthropicKey,
                    "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                    model: anthropicModel,
                    max_tokens: 300,
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "image",
                                    source: {
                                        type: "base64",
                                        media_type: mimeType,
                                        data: imageBase64,
                                    },
                                },
                                { type: "text", text: prompt },
                            ],
                        },
                    ],
                }),
            });

            if (!res.ok) {
                return NextResponse.json(
                    { error: "ai_not_configured" },
                    { status: 422 },
                );
            }

            const json = await res.json();
            const content = json.content?.[0]?.text || "{}";
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    result = JSON.parse(jsonMatch[0]);
                } catch {
                    // fall through
                }
            }
        } else {
            // OpenAI, OpenRouter, Ollama, or default OpenAI env var
            let baseUrl = "https://api.openai.com/v1";
            const effectiveKey = apiKey || "ollama";
            let model = "gpt-4o-mini";

            if (userSettings?.provider === "ollama") {
                baseUrl = (userSettings.base_url || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, "");
                if (!baseUrl.endsWith("/v1")) baseUrl = `${baseUrl}/v1`;
                model = userSettings.model || "qwen2.5-vl:7b";
            } else if (userSettings?.provider === "openrouter") {
                baseUrl = "https://openrouter.ai/api/v1";
                model = userSettings.model || "openai/gpt-4o-mini";
            } else if (userSettings?.provider === "openai") {
                model = userSettings.model || "gpt-4o-mini";
            }

            const res = await fetch(`${baseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${effectiveKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: `data:${mimeType};base64,${imageBase64}`,
                                    },
                                },
                            ],
                        },
                    ],
                    max_tokens: 300,
                }),
            });

            if (!res.ok) {
                return NextResponse.json(
                    { error: "ai_not_configured" },
                    { status: 422 },
                );
            }

            const json = await res.json();
            const content = json.choices?.[0]?.message?.content || "{}";
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    result = JSON.parse(jsonMatch[0]);
                } catch {
                    // fall through
                }
            }
        }

        return NextResponse.json({
            vendor_name: result.vendor_name || null,
            date: result.date || null,
            amount_gross: result.amount_gross || null,
            vat_rate: result.vat_rate || null,
            description: result.description || null,
        });
    } catch (error) {
        console.error("OCR error:", error);
        return NextResponse.json({ error: "OCR failed" }, { status: 500 });
    }
}
