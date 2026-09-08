import { defineConfig } from "vitest/config";

// Local config so `pnpm test` inside this worker resolves its own suites.
// Without it vitest inherits the repo-root config, whose `include` globs are
// relative to the monorepo root and match nothing from here — which is why
// these tests silently never ran (2026-08-26 audit, finding M-03).
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Every test in malware-integration.test.ts opens with
    // `await import("@standard/document-ingestion")`, and the first one to run
    // pays for transforming that workspace package. On an idle machine that is
    // well inside the 5s default; under the parallel load of a full `pnpm test`
    // it is not, and the file's first test failed with "Test timed out in
    // 5000ms" — intermittently, and never in isolation, which is what made it
    // read as a mystery rather than as a cold import.
    //
    // The budget is raised rather than the import hoisted: a slow transform is
    // not a defect these tests exist to catch, and the repo already made the
    // same call for the migration-heavy hooks in @standard/schemas.
    testTimeout: 30_000,
  },
});
