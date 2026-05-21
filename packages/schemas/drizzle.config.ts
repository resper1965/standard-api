import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// dotenv.config() does NOT overwrite env vars that are already set.
// In CI, DATABASE_URL is injected by GitHub Actions and will be preserved.
// Locally, it loads from the root .env file.
config({ path: "../../.env" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. " +
    "In CI: add it as a GitHub Actions secret. " +
    "Locally: create .env at the monorepo root with DATABASE_URL=..."
  );
}

export default defineConfig({
  schema: ["./src/db/schema.ts", "./src/db/auth-schema.ts"],
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
