import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: [
      "tests/version.test.ts",
      "tests/control-search.test.ts",
      "tests/mapping-integrity.test.ts"
    ],
  },
});
