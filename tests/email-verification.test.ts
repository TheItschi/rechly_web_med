import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";

test("email confirmation uses only the emailed credential and reports backend failures accurately", async (t) => {
    const original = { ...process.env };
    const calls: { headers: Record<string, unknown>; body: unknown }[] = [];
    let upstreamStatus = 200;
    let upstreamType = "";
    const server = createServer(async (req, res) => {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        calls.push({ headers: req.headers, body: JSON.parse(Buffer.concat(chunks).toString()) });
        assert.equal(req.url, "/v1/account/verifications/email");
        assert.equal(req.method, "PUT");
        res.writeHead(upstreamStatus, { "Content-Type": "application/json" });
        res.end(JSON.stringify(upstreamStatus === 200 ? { userId: "test-user" } : {
            code: upstreamStatus, type: upstreamType, message: "Synthetic upstream error",
        }));
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    t.after(async () => {
        await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
        for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
        Object.assign(process.env, original);
    });
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID = "test-project";
    process.env.NEXT_PUBLIC_RECHLY_DESKTOP = "0";
    delete process.env.APPWRITE_API_KEY;
    const { POST } = await import("../src/app/api/auth/verification/confirm/route");
    let requestNumber = 0;
    const confirm = (body: unknown, ip = `verification-test-${++requestNumber}`) => POST(new NextRequest("http://localhost/api/auth/verification/confirm", {
        method: "POST", headers: { "Content-Type": "application/json", "x-real-ip": ip }, body: JSON.stringify(body),
    }));
    const url = new URL("https://rechly.de/verify?userId=test-user&secret=synthetic%2Bsecret%2Fvalue&expire=2026-11-20T14%3A43%3A27.412%2B00%3A00");
    assert.equal(url.searchParams.get("expire"), "2026-11-20T14:43:27.412+00:00");
    const credentials = { userId: url.searchParams.get("userId"), secret: url.searchParams.get("secret") };
    const success = await confirm(credentials);
    assert.equal(success.status, 200);
    assert.deepEqual(await success.json(), { success: true });
    assert.deepEqual(calls[0].body, credentials);
    assert.equal(calls[0].headers["x-appwrite-project"], "test-project");
    assert.equal(calls[0].headers["x-appwrite-key"], undefined);
    assert.equal(calls[0].headers["x-appwrite-session"], undefined);

    // A configured admin key must also never accompany token confirmation.
    process.env.APPWRITE_API_KEY = "synthetic-admin-key-must-not-be-sent";
    await confirm(credentials);
    assert.equal(calls[1].headers["x-appwrite-key"], undefined);

    for (const type of ["user_invalid_token", "user_not_found"]) {
        upstreamStatus = 401; upstreamType = type;
        const result = await confirm(credentials);
        assert.equal(result.status, 400);
        assert.equal((await result.json()).code, "invalid_link");
    }
    upstreamStatus = 429; upstreamType = "general_rate_limit_exceeded";
    const limited = await confirm(credentials);
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get("Retry-After"), "60");
    assert.equal((await limited.json()).code, "rate_limited");

    for (const [status, type] of [[500, "general_unknown"], [401, "general_unauthorized_scope"], [404, "project_not_found"]] as const) {
        upstreamStatus = status; upstreamType = type;
        const result = await confirm(credentials);
        assert.equal(result.status, 503);
        assert.equal((await result.json()).code, "verification_unavailable");
    }
    const beforeInvalid = calls.length;
    for (const body of [null, {}, { userId: [], secret: "x" }, { userId: "test-user", secret: "" }, { userId: "test-user", secret: "x".repeat(257) }]) {
        assert.equal((await confirm(body)).status, 400);
    }
    assert.equal(calls.length, beforeInvalid);
    upstreamStatus = 200;
    for (let i = 0; i < 5; i++) assert.equal((await confirm(credentials, "rate-limit-test")).status, 200);
    const blocked = await confirm(credentials, "rate-limit-test");
    assert.equal(blocked.status, 429);
    assert.equal((await blocked.json()).code, "rate_limited");
});
