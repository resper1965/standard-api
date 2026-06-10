/**
 * drizzle-auth.config.ts
 *
 * Drizzle Kit config para o auth Neon branch (control plane).
 * Aponta para: auth-schema.ts + organization-schema.ts
 * Output: migrations/auth/
 *
 * Uso:
 *   AUTH_DATABASE_URL="..." pnpm db:generate:auth
 *   AUTH_DATABASE_URL="..." pnpm db:migrate:auth
 */
import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: "../../.env" });

// Fallback: também lê de apps/api-gateway/.dev.vars (local dev)
const authUrl =
  process.env.AUTH_DATABASE_URL ??
  (() => {
    try {
      config({ path: "../../apps/api-gateway/.dev.vars" });
      return process.env.AUTH_DATABASE_URL;
    } catch {
      return undefined;
    }
  })();

if (!authUrl) {
  throw new Error(
    "AUTH_DATABASE_URL is not set.\n" +
      "Locally: add AUTH_DATABASE_URL to .env at monorepo root or to apps/api-gateway/.dev.vars\n" +
      "CI: add as GitHub Actions secret AUTH_DATABASE_URL",
  );
}

export default defineConfig({
  schema: ["./src/db/auth-schema.ts", "./src/db/organization-schema.ts"],
  out: "./migrations/auth",
  dialect: "postgresql",
  dbCredentials: { url: authUrl },
  strict: true,
  verbose: true,
});
