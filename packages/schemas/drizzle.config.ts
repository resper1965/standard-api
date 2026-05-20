import { defineConfig } from "drizzle-kit";

// Only load .env file when DATABASE_URL is not already set (i.e. local dev).
// In CI, GitHub Actions injects DATABASE_URL directly — dotenv must not overwrite it.
if (!process.env.DATABASE_URL) {
  const { config } = await import("dotenv");
  config({ path: "../../.env" });
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. " +
    "In CI: add it as a GitHub Actions secret. " +
    "Locally: create packages/schemas/../../.env with DATABASE_URL=..."
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
