import { defineConfig } from "vitest/config";
import { resolve } from "path";

const pkg = (name: string) =>
  resolve(__dirname, `packages/${name}/src/index.ts`);

export default defineConfig({
  resolve: {
    alias: {
      "@standard/assessment-engine": pkg("assessment-engine"),
      "@standard/schemas": pkg("schemas"),
      "@standard/scf-core": pkg("scf-core"),
      "@standard/domain": pkg("domain"),
      "@standard/agent-runtime": pkg("agent-runtime"),
      "@standard/auth": pkg("auth"),
      "@standard/contracts": pkg("contracts"),
      "@standard/document-ingestion": pkg("document-ingestion"),
      "@standard/email": pkg("email"),
      "@standard/gap-analysis": pkg("gap-analysis"),
      "@standard/kb": pkg("kb"),
      "@standard/maturity": pkg("maturity"),
      "@standard/observability": pkg("observability"),
      "@standard/poam": pkg("poam"),
      "@standard/privacy": pkg("privacy"),
      "@standard/reporting": pkg("reporting"),
      "@standard/scf-data": pkg("scf-data"),
      "@standard/sdk": pkg("sdk"),
      "@standard/security": pkg("security"),
      "@standard/soa": pkg("soa"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: [
      "packages/*/src/**/*.test.ts",
      "apps/*/src/**/*.test.ts",
      "workers/*/src/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["packages/*/src/**/*.ts", "apps/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.d.ts", "**/node_modules/**"],
      thresholds: {
        lines: 30,
        functions: 30,
        branches: 30,
        statements: 30,
      },
    },
  },
});
