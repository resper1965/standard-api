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
  },
});
