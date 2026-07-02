/**
 * migrate-auth-raw.ts
 *
 * Applies the hand-written auth-DB SQL migrations that are NOT registered in the
 * drizzle-kit journal (`migrations/auth/meta/_journal.json` only tracks 0000 and
 * 0001). Because `db:migrate:auth` (drizzle-kit) skips anything outside the
 * journal, migrations 0002 and 0003 would otherwise never be applied.
 *
 * Every statement in these files is idempotent (ALTER ... SET DEFAULT and
 * UPDATE ... WHERE role = ...), so re-running this script is safe.
 *
 * Target DB: the auth Neon branch (control plane), via AUTH_DATABASE_URL.
 *
 * Usage (CI): AUTH_DATABASE_URL="postgres://..." pnpm --filter @standard/schemas \
 *   tsx migrate-auth-raw.ts
 */
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Hand-written migrations beyond the drizzle journal, in apply order.
const RAW_MIGRATIONS = [
  "0002_role_simplification.sql",
  "0003_org_admin_rename.sql",
] as const;

const run = async () => {
  const connectionString = process.env.AUTH_DATABASE_URL;
  if (!connectionString) {
    console.error(
      "ERROR: AUTH_DATABASE_URL is not set. In CI add it as a GitHub Actions secret.",
    );
    process.exit(1);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const sql = postgres(connectionString, { max: 1 });

  try {
    for (const file of RAW_MIGRATIONS) {
      const path = join(here, "migrations", "auth", file);
      const text = readFileSync(path, "utf8");
      console.log(`Applying ${file} ...`);
      // simple-query protocol executes the whole (multi-statement) file
      await sql.unsafe(text);
      console.log(`  ✓ applied ${file}`);
    }
    console.log("Auth raw migrations applied successfully.");
  } finally {
    await sql.end();
  }
};

run().catch((err) => {
  console.error("Auth migration failed:", err);
  process.exit(1);
});
