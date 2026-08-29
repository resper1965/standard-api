/**
 * Boots an in-memory PGlite database with the real migration chain applied,
 * so a test asserts against the SQL that production actually runs — not against
 * a hand-rolled CREATE TABLE that can drift from it.
 *
 * Mirrors the runner in apps/api-gateway/tests/helpers.ts. Duplicated rather
 * than shared because packages/schemas must not depend on an app.
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "../db/schema.js";

const migrationsDir = () => {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (path.dirname(dir) !== dir) {
    const candidate = path.resolve(dir, "infra/docker/postgres/migrations");
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  throw new Error("migrations directory not found");
};

export const makeTestDb = async () => {
  const client = new PGlite();
  const dir = migrationsDir();
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql") && !f.endsWith(".down.sql"))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    // Production-only migrations (pg_partman etc.) opt out with this marker.
    if (sql.includes("-- pglite-skip")) continue;
    for (const chunk of sql.split("--> statement-breakpoint")) {
      if (chunk.trim()) await client.exec(chunk.trim());
    }
  }

  // Drizzle's relational config extractor crashes on non-table exports (the
  // re-exported `z`), so hand it only real objects.
  const filtered = Object.fromEntries(
    Object.entries(schema).filter(
      ([key, value]) =>
        value !== null &&
        typeof value === "object" &&
        Object.getPrototypeOf(value) !== null &&
        key !== "z",
    ),
  );

  return { client, db: drizzle(client, { schema: filtered }) };
};
