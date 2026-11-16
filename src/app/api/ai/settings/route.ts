import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/appwrite-server";
import type { AISettingsUpdate } from "@/types";
import {
    AI_MODEL_PRESETS,
    AI_PREFS_KEY,
    buildStoredAISettings,
    getPublicAIUsage,
    isAIDisabled,
    isValidAIProvider,
    sanitizeStoredAISettings,
    toPublicAISettings,
} from "@/lib/server/ai";

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

        if (isAIDisabled(prefs)) {
            return NextResponse.json({
                ...(toPublicAISettings(settings, usage) ?? {
                    provider: "openai",
                    model: AI_MODEL_PRESETS.openai[0],
                    api_key_configured: false,
                    daily_usage: usage,
                    model_presets: AI_MODEL_PRESETS,
                }),
                disabled: true,
            });
        }

        if (!settings) {
            return NextResponse.json({
                provider: "openai",
                model: AI_MODEL_PRESETS.openai[0],
                system_prompt: undefined,
                api_key_configured: false,
                daily_usage: usage,
                model_presets: AI_MODEL_PRESETS,
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

        // "Keine KI nutzen": keep the stored provider settings, only flag them off.
        if (body.provider === "none") {
            const stored = prefs[AI_PREFS_KEY];
            await account.updatePrefs({
                ...prefs,
                [AI_PREFS_KEY]: { ...(stored && typeof stored === "object" ? stored : {}), disabled: true },
            });
            return NextResponse.json({
                ...(toPublicAISettings(existingSettings, getPublicAIUsage(prefs)) ?? {
                    provider: "openai",
                    model: AI_MODEL_PRESETS.openai[0],
                    api_key_configured: false,
                    model_presets: AI_MODEL_PRESETS,
                }),
                disabled: true,
            });
        }

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
