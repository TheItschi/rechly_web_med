import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    base64DecodedSize,
    isLocalProviderAllowed,
    isOversizedBase64,
    isPrivateOrLoopbackHost,
    LOCAL_AI_HOSTED_MESSAGE,
    rateLimit,
    validateOutboundAiUrl,
} from "../src/lib/server/security";

describe("rateLimit", () => {
    it("allows up to max hits then blocks with a retry hint", () => {
        const key = `test:${Date.now()}:a`;
        for (let i = 0; i < 3; i++) assert.equal(rateLimit(key, 3, 60_000).ok, true);
        const blocked = rateLimit(key, 3, 60_000);
        assert.equal(blocked.ok, false);
        assert.ok((blocked.retryAfterSec ?? 0) >= 1);
    });

    it("keeps separate budgets per key", () => {
        const a = `test:${Date.now()}:b1`;
        const b = `test:${Date.now()}:b2`;
        assert.equal(rateLimit(a, 1, 60_000).ok, true);
        assert.equal(rateLimit(a, 1, 60_000).ok, false);
        assert.equal(rateLimit(b, 1, 60_000).ok, true);
    });
});

describe("isPrivateOrLoopbackHost", () => {
    it("flags loopback, private, link-local and metadata hosts", () => {
        for (const host of [
            "localhost",
            "app.localhost",
            "127.0.0.1",
            "127.5.0.9",
            "::1",
            "[::1]",
            "10.0.0.5",
            "172.16.3.4",
            "172.31.255.1",
            "192.168.1.10",
            "169.254.169.254",
            "0.0.0.0",
            "metadata.google.internal",
            "printer.local",
            "db.internal",
            "fe80::1",
            "fd00::1",
        ]) {
            assert.equal(isPrivateOrLoopbackHost(host), true, host);
        }
    });

    it("allows public hosts", () => {
        for (const host of ["api.openai.com", "openrouter.ai", "8.8.8.8", "172.32.0.1", "11.0.0.1", "example.com"]) {
            assert.equal(isPrivateOrLoopbackHost(host), false, host);
        }
    });
});

describe("validateOutboundAiUrl", () => {
    it("rejects non-http(s) and malformed URLs", () => {
        assert.equal(validateOutboundAiUrl("not a url").ok, false);
        assert.equal(validateOutboundAiUrl("file:///etc/passwd").ok, false);
        assert.equal(validateOutboundAiUrl("gopher://example.com").ok, false);
    });

    it("blocks private targets unless local endpoints are allowed, but never cloud metadata", () => {
        assert.equal(validateOutboundAiUrl("http://127.0.0.1:11434/v1", { allowLocal: false }).ok, false);
        assert.equal(validateOutboundAiUrl("http://192.168.1.5:11434/v1", { allowLocal: false }).ok, false);
        assert.equal(validateOutboundAiUrl("http://127.0.0.1:11434/v1", { allowLocal: true }).ok, true);
        assert.equal(validateOutboundAiUrl("http://169.254.169.254/latest/meta-data", { allowLocal: true }).ok, false);
        assert.equal(validateOutboundAiUrl("https://api.example.com/v1").ok, true);
    });
});

describe("isLocalProviderAllowed (hosted Ollama policy)", () => {
    it("blocks only ollama when local endpoints are not allowed", () => {
        assert.equal(isLocalProviderAllowed("ollama", false), false);
        assert.equal(isLocalProviderAllowed("openai", false), true);
        assert.equal(isLocalProviderAllowed("anthropic", false), true);
        assert.equal(isLocalProviderAllowed("openrouter", false), true);
    });

    it("allows ollama on desktop/local installs", () => {
        assert.equal(isLocalProviderAllowed("ollama", true), true);
    });

    it("ships an actionable hosted message naming the alternatives", () => {
        assert.match(LOCAL_AI_HOSTED_MESSAGE, /Desktop/);
        assert.match(LOCAL_AI_HOSTED_MESSAGE, /OpenAI/);
    });
});

describe("base64 size helpers", () => {
    it("estimates decoded size including padding", () => {
        assert.equal(base64DecodedSize(Buffer.from("hello").toString("base64")), 5);
        assert.equal(base64DecodedSize(""), 0);
    });

    it("flags payloads over the cap without decoding them", () => {
        const big = "A".repeat(2_000_000);
        assert.equal(isOversizedBase64(big, 1_000_000), true);
        assert.equal(isOversizedBase64("aGVsbG8=", 1_000_000), false);
        assert.equal(isOversizedBase64(undefined, 10), false);
    });
});
