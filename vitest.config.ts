import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@standard/assessment-engine": resolve(
        __dirname,
        "packages/assessment-engine/src/index.ts",
      ),
      "@standard/schemas": resolve(__dirname, "packages/schemas/src/index.ts"),
      "@standard/scf-core": resolve(
        __dirname,
        "packages/scf-core/src/index.ts",
      ),
      "@standard/domain": resolve(__dirname, "packages/domain/src/index.ts"),
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
    },
  },
});
