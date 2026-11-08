import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // New code should use src/lib/logger.ts instead of raw console.log
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Allow intentionally unused function args prefixed with _ (e.g. compat shims)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // CLI scripts, Electron main process and manual test scripts log to stdout by design
    files: ["scripts/**/*", "desktop/**/*", "tests/einvoice.integration.ts", "tests/*.cjs"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "dist/**", // Generated Electron packages include bundled dependencies.
    "next-env.d.ts",
    // Python virtual environment (Django static JS triggers false positives)
    ".venv/**",
    ".cache/**",
    "services/**",
  ]),
]);

export default eslintConfig;
