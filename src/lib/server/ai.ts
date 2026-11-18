import {
    createCipheriv,
    createDecipheriv,
    createHash,
    randomBytes,
} from "node:crypto";
import type { Models } from "node-appwrite";
import type { AIChatResponse, AIProvider, AISettings } from "@/types";
import { validateOutboundAiUrl } from "@/lib/server/security";

export const AI_PREFS_KEY = "rechly_ai_settings";
export const AI_USAGE_PREFS_KEY = "rechly_ai_usage";
export const DEFAULT_OLLAMA_BASE_URL =
    process.env.OLLAMA_BASE_URL?.trim() || "http://localhost:11434/v1";
const VALID_PROVIDERS: AIProvider[] = [
    "openai",
    "anthropic",
    "openrouter",
    "ollama",
];
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const DEFAULT_DAILY_AI_REQUEST_LIMIT = 100;
export const AI_MODEL_PRESETS: Record<AIProvider, string[]> = {
    openai: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1", "o4-mini"],
    anthropic: [
        "claude-3-5-haiku-latest",
        "claude-3-5-sonnet-latest",
        "claude-3-7-sonnet-latest",
    ],
    openrouter: [
        "openrouter/auto",
        "openai/gpt-4o-mini",
        "anthropic/claude-3.5-sonnet",
        "google/gemini-2.0-flash-001",
    ],
    ollama: [
        "jonprompter/Rechly-DE-3B",
        "rechly-de-3b",
        "qwen2.5:3b",
        "qwen2.5:7b",
        "llama3.2:3b",
        "gemma3:4b",
        "mistral:7b",
        "deepseek-r1:7b",
    ],
};

export type StoredAISettings = {
    provider: AIProvider;
    model: string;
    base_url?: string;
    system_prompt?: string;
    api_key?: string;
    encrypted_api_key?: string;
    encryption_iv?: string;
    encryption_tag?: string;
};

export type ResolvedAISettings = {
    provider: AIProvider;
    model: string;
    base_url?: string;
    system_prompt?: string;
    api_key: string;
};

type AIUsageLog = {
    current_day: string;
    current_day_count: number;
    total_requests: number;
    recent_events: Array<{
        timestamp: string;
        action: string;
        provider: AIProvider;
        model: string;
    }>;
};

function getEncryptionSecret(): string {
    const secret = process.env.AI_SETTINGS_ENCRYPTION_SECRET?.trim();
    if (!secret) {
        throw new Error("AI_SETTINGS_ENCRYPTION_SECRET is not configured");
    }
    return secret;
}

function getDailyAIRateLimit(): number {
    const parsed = Number(process.env.AI_DAILY_REQUEST_LIMIT);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return DEFAULT_DAILY_AI_REQUEST_LIMIT;
    }
    return Math.floor(parsed);
}

function getEncryptionKey(): Buffer {
    return createHash("sha256").update(getEncryptionSecret()).digest();
}

function encryptValue(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
    const encrypted = Buffer.concat([
        cipher.update(value, "utf8"),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
        encrypted_api_key: encrypted.toString("base64"),
        encryption_iv: iv.toString("base64"),
        encryption_tag: tag.toString("base64"),
    };
}

function decryptValue(payload: {
    encrypted_api_key: string;
    encryption_iv: string;
    encryption_tag: string;
}): string {
    const decipher = createDecipheriv(
        ENCRYPTION_ALGORITHM,
        getEncryptionKey(),
        Buffer.from(payload.encryption_iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(payload.encryption_tag, "base64"));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(payload.encrypted_api_key, "base64")),
        decipher.final(),
    ]);

    return decrypted.toString("utf8").trim();
}

export function isValidAIProvider(value: unknown): value is AIProvider {
    return (
        typeof value === "string" &&
        VALID_PROVIDERS.includes(value as AIProvider)
    );
}

export function sanitizeStoredAISettings(
    value: unknown,
): StoredAISettings | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const candidate = value as Partial<StoredAISettings>;
    if (
        !isValidAIProvider(candidate.provider) ||
        typeof candidate.model !== "string"
    ) {
        return null;
    }

    const model = candidate.model.trim();
    if (!model) {
        return null;
    }

    return {
        provider: candidate.provider,
        model,
        base_url:
            typeof candidate.base_url === "string"
                ? candidate.base_url.trim() || undefined
                : undefined,
        system_prompt:
            typeof candidate.system_prompt === "string"
                ? candidate.system_prompt.trim() || undefined
                : undefined,
        api_key:
            typeof candidate.api_key === "string"
                ? candidate.api_key.trim() || undefined
                : undefined,
        encrypted_api_key:
            typeof candidate.encrypted_api_key === "string"
                ? candidate.encrypted_api_key
                : undefined,
        encryption_iv:
            typeof candidate.encryption_iv === "string"
                ? candidate.encryption_iv
                : undefined,
        encryption_tag:
            typeof candidate.encryption_tag === "string"
                ? candidate.encryption_tag
                : undefined,
    };
}

export function toPublicAISettings(
    settings: StoredAISettings | null,
    usage?: { used: number; limit: number; remaining: number },
): AISettings | null {
    if (!settings) {
        return null;
    }

    return {
        provider: settings.provider,
        model: settings.model,
        base_url: settings.base_url,
        system_prompt: settings.system_prompt,
        api_key_configured: Boolean(
            settings.provider === "ollama" ||
            settings.api_key ||
            (settings.encrypted_api_key &&
                settings.encryption_iv &&
                settings.encryption_tag),
        ),
        daily_usage: usage,
        model_presets: AI_MODEL_PRESETS,
    };
}

export function buildStoredAISettings(input: {
    provider: AIProvider;
    model: string;
    base_url?: string;
    system_prompt?: string;
    api_key?: string;
    existing?: StoredAISettings | null;
}): StoredAISettings {
    const apiKey = input.api_key?.trim();
    const existing = input.existing;

    const nextSettings: StoredAISettings = {
        provider: input.provider,
        model: input.model.trim(),
        base_url: input.base_url?.trim() || undefined,
        system_prompt: input.system_prompt?.trim() || undefined,
    };

    if (apiKey) {
        Object.assign(nextSettings, encryptValue(apiKey));
    } else if (
        existing?.encrypted_api_key &&
        existing.encryption_iv &&
        existing.encryption_tag
    ) {
        nextSettings.encrypted_api_key = existing.encrypted_api_key;
        nextSettings.encryption_iv = existing.encryption_iv;
        nextSettings.encryption_tag = existing.encryption_tag;
    } else if (existing?.api_key) {
        Object.assign(nextSettings, encryptValue(existing.api_key));
    }

    return nextSettings;
}

export function resolveAISettings(
    settings: StoredAISettings | null,
): ResolvedAISettings | null {
    if (!settings) {
        return null;
    }

    let apiKey: string | undefined;
    if (
        settings.encrypted_api_key &&
        settings.encryption_iv &&
        settings.encryption_tag
    ) {
        apiKey = decryptValue({
            encrypted_api_key: settings.encrypted_api_key,
            encryption_iv: settings.encryption_iv,
            encryption_tag: settings.encryption_tag,
        });
    } else if (settings.api_key) {
        apiKey = settings.api_key;
    } else if (settings.provider === "ollama") {
        apiKey = "ollama";
    }

    if (!apiKey) {
        return null;
    }

    return {
        provider: settings.provider,
        model: settings.model,
        base_url: settings.base_url,
        system_prompt: settings.system_prompt,
        api_key: apiKey,
    };
}

function normalizeOllamaBaseUrl(rawUrl?: string): string {
    const base = (rawUrl?.trim() || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, "");
    if (base.endsWith("/v1")) {
        return base;
    }
    return `${base}/v1`;
}

async function runOpenAICompatibleChat(
    settings: ResolvedAISettings,
    prompt: string,
    baseUrl: string,
): Promise<string> {
    // SSRF guard: baseUrl can be user-configured (Ollama). Fixed provider URLs pass trivially.
    const verdict = validateOutboundAiUrl(baseUrl);
    if (!verdict.ok) throw new Error(verdict.error);
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${settings.api_key}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: settings.model,
            temperature: 0.3,
            messages: [
                ...(settings.system_prompt
                    ? [{ role: "system", content: settings.system_prompt }]
                    : []),
                { role: "user", content: prompt },
            ],
        }),
        signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "AI provider request failed");
    }

    const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();

    if (!content) {
        throw new Error("AI provider returned an empty response");
    }

    return content;
}

async function runAnthropicChat(
    settings: ResolvedAISettings,
    prompt: string,
): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key": settings.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        body: JSON.stringify({
            model: settings.model,
            max_tokens: 800,
            system: settings.system_prompt,
            messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "AI provider request failed");
    }

    const payload = (await response.json()) as {
        content?: Array<{ type?: string; text?: string }>;
    };

    const content = payload.content
        ?.filter((item) => item.type === "text" && item.text)
        .map((item) => item.text?.trim())
        .filter(Boolean)
        .join("\n\n");

    if (!content) {
        throw new Error("AI provider returned an empty response");
    }

    return content;
}

export async function generateAIText(
    settings: ResolvedAISettings,
    prompt: string,
): Promise<AIChatResponse> {
    let content: string;

    if (settings.provider === "anthropic") {
        content = await runAnthropicChat(settings, prompt);
    } else if (settings.provider === "openrouter") {
        content = await runOpenAICompatibleChat(
            settings,
            prompt,
            "https://openrouter.ai/api/v1",
        );
    } else if (settings.provider === "ollama") {
        content = await runOpenAICompatibleChat(
            settings,
            prompt,
            normalizeOllamaBaseUrl(settings.base_url),
        );
    } else {
        content = await runOpenAICompatibleChat(
            settings,
            prompt,
            "https://api.openai.com/v1",
        );
    }

    return {
        content,
        provider: settings.provider,
        model: settings.model,
    };
}

function sanitizeAIUsageLog(value: unknown): AIUsageLog {
    if (!value || typeof value !== "object") {
        return {
            current_day: new Date().toISOString().slice(0, 10),
            current_day_count: 0,
            total_requests: 0,
            recent_events: [],
        };
    }

    const candidate = value as Partial<AIUsageLog>;
    return {
        current_day:
            typeof candidate.current_day === "string"
                ? candidate.current_day
                : new Date().toISOString().slice(0, 10),
        current_day_count:
            typeof candidate.current_day_count === "number"
                ? candidate.current_day_count
                : 0,
        total_requests:
            typeof candidate.total_requests === "number"
                ? candidate.total_requests
                : 0,
        recent_events: Array.isArray(candidate.recent_events)
            ? candidate.recent_events
                  .filter(
                      (event): event is AIUsageLog["recent_events"][number] =>
                          Boolean(event) &&
                          typeof event === "object" &&
                          typeof event.timestamp === "string" &&
                          typeof event.action === "string" &&
                          isValidAIProvider(event.provider) &&
                          typeof event.model === "string",
                  )
                  .slice(0, 20)
            : [],
    };
}

export function getPublicAIUsage(prefs: Record<string, unknown>) {
    const today = new Date().toISOString().slice(0, 10);
    const usage = sanitizeAIUsageLog(prefs[AI_USAGE_PREFS_KEY]);
    const limit = getDailyAIRateLimit();
    const used = usage.current_day === today ? usage.current_day_count : 0;

    return {
        used,
        limit,
        remaining: Math.max(0, limit - used),
    };
}

export async function assertAndRecordAIUsage(options: {
    account: {
        updatePrefs: (
            prefs: Models.Preferences,
        ) => Promise<Models.User<Models.Preferences>>;
    };
    prefs: Record<string, unknown>;
    provider: AIProvider;
    model: string;
    action: string;
}) {
    const today = new Date().toISOString().slice(0, 10);
    const usage = sanitizeAIUsageLog(options.prefs[AI_USAGE_PREFS_KEY]);
    const dailyLimit = getDailyAIRateLimit();
    const currentDayCount =
        usage.current_day === today ? usage.current_day_count : 0;

    if (currentDayCount >= dailyLimit) {
        throw new Error(
            `Daily AI request limit reached (${dailyLimit}). Try again tomorrow or raise AI_DAILY_REQUEST_LIMIT.`,
        );
    }

    const nextUsage: AIUsageLog = {
        current_day: today,
        current_day_count: currentDayCount + 1,
        total_requests: usage.total_requests + 1,
        recent_events: [
            {
                timestamp: new Date().toISOString(),
                action: options.action,
                provider: options.provider,
                model: options.model,
            },
            ...usage.recent_events,
        ].slice(0, 20),
    };

    await options.account.updatePrefs({
        ...options.prefs,
        [AI_USAGE_PREFS_KEY]: nextUsage,
    });

    return {
        currentDayCount: nextUsage.current_day_count,
        dailyLimit,
    };
}
