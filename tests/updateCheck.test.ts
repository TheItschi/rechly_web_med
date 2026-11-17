import test from "node:test";
import assert from "node:assert/strict";
import {
    assessUpdate,
    compareSemver,
    isLoopbackHostname,
    parseGithubRepo,
    parseSemver,
} from "../src/lib/updateCheck";

test("parseSemver accepts optional v prefix and suffixes", () => {
    assert.deepEqual(parseSemver("v1.2.3"), [1, 2, 3]);
    assert.deepEqual(parseSemver("0.1.0"), [0, 1, 0]);
    assert.deepEqual(parseSemver("2.0.0-beta.1"), [2, 0, 0]);
    assert.equal(parseSemver("main"), null);
    assert.equal(parseSemver("1.2"), null);
});

test("compareSemver orders versions", () => {
    assert.ok(compareSemver("v0.2.0", "0.1.0")! > 0);
    assert.ok(compareSemver("0.1.0", "0.2.0")! < 0);
    assert.equal(compareSemver("1.0.0", "v1.0.0"), 0);
    assert.equal(compareSemver("abc", "1.0.0"), null);
});

test("parseGithubRepo handles https, ssh, and owner/repo", () => {
    assert.equal(parseGithubRepo("https://github.com/myaxyo/rechly_web.git"), "myaxyo/rechly_web");
    assert.equal(parseGithubRepo("https://github.com/myaxyo/rechly_web/"), "myaxyo/rechly_web");
    assert.equal(parseGithubRepo("git@github.com:myaxyo/rechly_web.git"), "myaxyo/rechly_web");
    assert.equal(parseGithubRepo("myaxyo/rechly_web"), "myaxyo/rechly_web");
    assert.equal(parseGithubRepo("https://example.com/a/b"), null);
});

test("assessUpdate prefers a newer release tag", () => {
    const result = assessUpdate({
        currentVersion: "0.1.0",
        currentCommit: "aaa1111",
        latestRelease: { tag: "v0.2.0", url: "https://github.com/o/r/releases/tag/v0.2.0" },
        latestMainCommit: "bbb2222",
        repo: "o/r",
    });
    assert.equal(result.updateAvailable, true);
    assert.equal(result.kind, "release");
    assert.equal(result.latestVersion, "0.2.0");
});

test("assessUpdate falls back to main-commit drift when no newer release", () => {
    const result = assessUpdate({
        currentVersion: "0.1.0",
        currentCommit: "aaa1111",
        latestRelease: null,
        latestMainCommit: "bbb2222ccc",
        repo: "o/r",
    });
    assert.equal(result.updateAvailable, true);
    assert.equal(result.kind, "commit");
    assert.match(result.url!, /compare\/aaa1111\.\.\.bbb2222ccc/);
});

test("assessUpdate treats short and full SHAs of the same commit as equal", () => {
    const result = assessUpdate({
        currentVersion: "0.1.0",
        currentCommit: "aaa1111",
        latestRelease: { tag: "v0.1.0", url: "https://example.com" },
        latestMainCommit: "aaa1111ffff",
        repo: "o/r",
    });
    assert.equal(result.updateAvailable, false);
});

test("assessUpdate stays quiet when commit is unknown (packaged install)", () => {
    const result = assessUpdate({
        currentVersion: "0.1.0",
        currentCommit: null,
        latestRelease: null,
        latestMainCommit: "bbb2222",
        repo: "o/r",
    });
    assert.equal(result.updateAvailable, false);
});

test("isLoopbackHostname matches laptop hosts only", () => {
    assert.equal(isLoopbackHostname("localhost"), true);
    assert.equal(isLoopbackHostname("127.0.0.1"), true);
    assert.equal(isLoopbackHostname("[::1]"), true);
    assert.equal(isLoopbackHostname("rechly.de"), false);
    assert.equal(isLoopbackHostname("192.168.1.10"), false);
});
