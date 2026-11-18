import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/appwrite-server";
import type { AISettingsUpdate } from "@/types";
import {
    AI_MODEL_PRESETS,
    AI_PREFS_KEY,
    buildStoredAISettings,
    getPublicAIUsage,
    isValidAIProvider,
    sanitizeStoredAISettings,
    toPublicAISettings,
} from "@/lib/server/ai";
import {
    isLocalProviderAllowed,
    localAiEndpointsAllowed,
    LOCAL_AI_HOSTED_MESSAGE,
    validateOutboundAiUrl,
} from "@/lib/server/security";

async function getCurrentUserAndPrefs() {
    const sessionClient = await createSessionClient();
    const user = await sessionClient.account.get();

    return {
        account: sessionClient.account,
        user,
        prefs: (user.prefs || {}) as Record<string, unknown>,
    };
}

export async function GET() {
    try {
        const { prefs } = await getCurrentUserAndPrefs();
        const settings = sanitizeStoredAISettings(prefs[AI_PREFS_KEY]);
        const usage = getPublicAIUsage(prefs);

        if (!settings) {
            return NextResponse.json({
                provider: "openai",
                model: AI_MODEL_PRESETS.openai[0],
                system_prompt: undefined,
                api_key_configured: false,
                daily_usage: usage,
                model_presets: AI_MODEL_PRESETS,
                local_ai_allowed: localAiEndpointsAllowed(),
            });
        }

        return NextResponse.json(toPublicAISettings(settings, usage));
    } catch {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 },
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { account, prefs } = await getCurrentUserAndPrefs();
        const existingSettings = sanitizeStoredAISettings(prefs[AI_PREFS_KEY]);
        const body = (await request.json()) as Partial<AISettingsUpdate>;

        if (!isValidAIProvider(body.provider)) {
            return NextResponse.json(
                { error: "Invalid AI provider" },
                { status: 400 },
            );
        }

        const model = typeof body.model === "string" ? body.model.trim() : "";
        if (!model) {
            return NextResponse.json(
                { error: "Model is required" },
                { status: 400 },
            );
        }

        const apiKey =
            typeof body.api_key === "string" ? body.api_key.trim() : "";
        const isLocalProvider = body.provider === "ollama";
        const providerChanged =
            existingSettings?.provider &&
            existingSettings.provider !== body.provider;

        if (providerChanged && !apiKey && !isLocalProvider) {
            return NextResponse.json(
                {
                    error: "Please provide a new API key when changing provider",
                },
                { status: 400 },
            );
        }

        if (!isLocalProviderAllowed(body.provider)) {
            return NextResponse.json(
                { error: LOCAL_AI_HOSTED_MESSAGE },
                { status: 400 },
            );
        }

        if (typeof body.base_url === "string" && body.base_url.trim()) {
            const verdict = validateOutboundAiUrl(body.base_url.trim());
            if (!verdict.ok) {
                return NextResponse.json({ error: verdict.error }, { status: 400 });
            }
        }

        const nextSettings = buildStoredAISettings({
            provider: body.provider,
            model,
            base_url:
                typeof body.base_url === "string" ? body.base_url : undefined,
            system_prompt:
                typeof body.system_prompt === "string"
                    ? body.system_prompt
                    : undefined,
            api_key: apiKey || undefined,
            existing: providerChanged && isLocalProvider ? null : existingSettings,
        });

        if (
            !isLocalProvider &&
            !nextSettings.encrypted_api_key &&
            !nextSettings.api_key
        ) {
            return NextResponse.json(
                { error: "API key is required for the initial AI setup" },
                { status: 400 },
            );
        }

        await account.updatePrefs({
            ...prefs,
            [AI_PREFS_KEY]: nextSettings,
        });

        return NextResponse.json(
            toPublicAISettings(nextSettings, getPublicAIUsage(prefs)),
        );
    } catch (error) {
        console.error("Error saving AI settings:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to save AI settings",
            },
            { status: 500 },
        );
    }
}
