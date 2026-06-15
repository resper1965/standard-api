import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.wrangler/**",
      "**/coverage/**",
      "apps/web/**",
      "workers/smoke-tester/**",
      "scratch/**",
      "evals/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,js}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "no-console": "off",
    },
  },
  // Drizzle adapter and MCP tool files require @ts-nocheck due to Zod v4
  // cross-package type resolution producing 'unknown' for optional fields in CI.
  // This is a compile-environment issue, not a logic bug.
  {
    files: ["apps/api-gateway/src/**/*.ts"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
];
