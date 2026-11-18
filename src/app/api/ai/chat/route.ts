import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/appwrite-server";
import {
    AI_PREFS_KEY,
    assertAndRecordAIUsage,
    generateAIText,
    resolveAISettings,
    sanitizeStoredAISettings,
} from "@/lib/server/ai";
import { isLocalProviderAllowed, LOCAL_AI_HOSTED_MESSAGE } from "@/lib/server/security";

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as { prompt?: unknown };
        const prompt =
            typeof body.prompt === "string" ? body.prompt.trim() : "";

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 },
            );
        }

        const sessionClient = await createSessionClient();
        const account = sessionClient.account;
        const user = await sessionClient.account.get();
        const prefs = (user.prefs || {}) as Record<string, unknown>;
        const settings = resolveAISettings(
            sanitizeStoredAISettings(prefs[AI_PREFS_KEY]),
        );

        if (!settings) {
            return NextResponse.json(
                {
                    error: "AI settings are incomplete. Save provider, model, and API key first.",
                },
                { status: 400 },
            );
        }

        if (!isLocalProviderAllowed(settings.provider)) {
            return NextResponse.json(
                { error: LOCAL_AI_HOSTED_MESSAGE },
                { status: 400 },
            );
        }

        await assertAndRecordAIUsage({
            account,
            prefs,
            provider: settings.provider,
            model: settings.model,
            action: "chat_test",
        });

        const response = await generateAIText(settings, prompt);

        return NextResponse.json(response);
    } catch (error) {
        console.error("Error running AI chat:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to run AI request",
            },
            { status: 500 },
        );
    }
}
