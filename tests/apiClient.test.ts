import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { apiFetch, ApiError } from "../src/lib/apiClient";
import { isCacheValid, CACHE_DURATION } from "../src/store/cache";

describe("apiClient", () => {
    it("returns parsed JSON on success", async () => {
        const orig = globalThis.fetch;
        mock.method(globalThis, "fetch", async () =>
            new Response(JSON.stringify({ id: "1" }), { status: 200 }),
        );
        try {
            const data = await apiFetch<{ id: string }>("/api/test");
            assert.equal(data.id, "1");
        } finally {
            globalThis.fetch = orig;
        }
    });

    it("throws ApiError with server message on failure", async () => {
        const orig = globalThis.fetch;
        mock.method(globalThis, "fetch", async () =>
            new Response(JSON.stringify({ error: "nope" }), { status: 400 }),
        );
        try {
            await assert.rejects(() => apiFetch("/api/test"), (e: unknown) => {
                assert.ok(e instanceof ApiError);
                assert.equal((e as ApiError).status, 400);
                assert.equal((e as ApiError).message, "nope");
                return true;
            });
        } finally {
            globalThis.fetch = orig;
        }
    });

    it("returns null on 404 when allow404 is set", async () => {
        const orig = globalThis.fetch;
        mock.method(globalThis, "fetch", async () => new Response("x", { status: 404 }));
        try {
            const data = await apiFetch<null>("/api/missing", { allow404: true });
            assert.equal(data, null);
        } finally {
            globalThis.fetch = orig;
        }
    });

    it("throws on 404 without allow404", async () => {
        const orig = globalThis.fetch;
        mock.method(globalThis, "fetch", async () => new Response("x", { status: 404 }));
        try {
            await assert.rejects(() => apiFetch("/api/missing"));
        } finally {
            globalThis.fetch = orig;
        }
    });
});

describe("store cache", () => {
    it("invalidates after TTL and honors force", () => {
        assert.equal(isCacheValid(null), false);
        assert.equal(isCacheValid(Date.now()), true);
        assert.equal(isCacheValid(Date.now() - CACHE_DURATION - 1), false);
        assert.equal(isCacheValid(Date.now(), true), false);
    });
});
