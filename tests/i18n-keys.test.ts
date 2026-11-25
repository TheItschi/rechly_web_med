import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { translations } from "../src/i18n";

/** Every literal t("…") key used in src exists in all languages. */
test("all translation keys used in src are defined", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
            const path = join(dir, name);
            if (statSync(path).isDirectory()) walk(path);
            else if (/\.tsx?$/.test(name)) files.push(path);
        }
    };
    walk(join(__dirname, "..", "src"));

    const used = new Set<string>();
    for (const file of files) {
        for (const match of readFileSync(file, "utf8").matchAll(/\bt\(\s*"([\w.-]+)"/g)) used.add(match[1]);
    }
    for (const [language, dictionary] of Object.entries(translations)) {
        const missing = [...used].filter((key) => !(key in dictionary)).sort();
        assert.deepEqual(missing, [], `missing ${language} translations`);
    }
});
