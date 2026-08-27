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
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "packages/*/src/**/*.test.ts",
      "apps/*/src/**/*.test.ts",
      "workers/*/src/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      // These use a bespoke tsx runner (tests/test-kit.ts) that executes on
      // import — they are run via `pnpm test:contracts` / `pnpm test`, not vitest.
      "tests/contracts/**",
      "tests/e2e-synthetic/**",
    ],
    coverage: {
      provider: "v8",
      // "json" emits coverage/coverage-final.json, the Istanbul per-function
      // format `fallow audit --coverage` needs. Without it the PR Risk Audit
      // estimates CRAP from export references, which reads every exported
      // function as untested and rises when code is decomposed.
      reporter: ["text", "json-summary", "json"],
      include: ["packages/*/src/**/*.ts", "apps/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.d.ts", "**/node_modules/**"],
      // Floors set one point under the measured value, so each one is true and
      // any real regression trips it. A flat 30 across all four was not a
      // floor: lines and statements sat at 39 and branches at 83, so branch
      // coverage could halve and still pass, while functions sat at 21.87 and
      // failed - which nothing noticed, because no CI job ran coverage until
      // #134 added one.
      //
      // Ratchet: when a metric climbs, raise its floor in the same PR. Never
      // lower one to make a red build green; that is how a gate becomes
      // decoration.
      //
      // Measured 2026-08-27 on 6b90be9:
      //   lines 39.28 · statements 39.28 · functions 21.87 · branches 83.33
      thresholds: {
        lines: 38,
        statements: 38,
        functions: 21,
        branches: 82,
      },
    },
  },
});
