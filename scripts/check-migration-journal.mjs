#!/usr/bin/env node
/**
 * Guards the domain migration journal against drift.
 *
 * `packages/schemas/migrate.ts` — the same runner the production deploy invokes —
 * applies only what is listed in `meta/_journal.json`. A `.sql` file dropped into
 * the migrations directory without a journal entry is therefore never applied,
 * silently, in every environment.
 *
 * That is exactly how migrations 0049–0057 went missing: among them
 * `0053_rls_complete` (53 RLS policies) and `0054_ledger_immutability_triggers`
 * (the ADR-002 append-only guarantee). See the 2026-08-26 platform audit.
 *
 * Known-unapplied migrations are listed in `meta/_journal-exceptions.json` with a
 * reason each. Anything outside that list fails the build.
 *
 * Usage:  node scripts/check-migration-journal.mjs
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "infra/docker/postgres/migrations");
const journalPath = join(migrationsDir, "meta/_journal.json");
const exceptionsPath = join(migrationsDir, "meta/_journal-exceptions.json");

const fail = (message) => {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
};

if (!existsSync(journalPath)) fail(`Journal not found at ${journalPath}`);

const journal = JSON.parse(readFileSync(journalPath, "utf8"));
const journalTags = new Set((journal.entries ?? []).map((e) => e.tag));

const exceptions = existsSync(exceptionsPath)
  ? JSON.parse(readFileSync(exceptionsPath, "utf8"))
  : { unapplied: [] };
const excused = new Map(
  (exceptions.unapplied ?? []).map((e) => [e.tag, e.reason]),
);

// `.down.sql` files are rollback scripts and never belong in the journal.
const onDisk = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql") && !f.endsWith(".down.sql"))
  .map((f) => f.slice(0, -4))
  .sort();

const missing = onDisk.filter(
  (tag) => !journalTags.has(tag) && !excused.has(tag),
);
const orphanEntries = [...journalTags].filter(
  (tag) => !existsSync(join(migrationsDir, `${tag}.sql`)),
);
const staleExceptions = [...excused.keys()].filter((tag) =>
  journalTags.has(tag),
);

let failed = false;

if (missing.length > 0) {
  console.error(
    "\n✖ Migrations on disk with no journal entry — these will NEVER be applied:",
  );
  for (const tag of missing) console.error(`    ${tag}.sql`);
  console.error(
    "\n  Add them to meta/_journal.json (with drizzle-kit, not by hand where avoidable),",
  );
  console.error(
    "  or record them in meta/_journal-exceptions.json with an explicit reason.",
  );
  failed = true;
}

if (orphanEntries.length > 0) {
  console.error("\n✖ Journal entries with no matching .sql file:");
  for (const tag of orphanEntries) console.error(`    ${tag}`);
  failed = true;
}

if (staleExceptions.length > 0) {
  console.error(
    "\n✖ Stale entries in meta/_journal-exceptions.json — now present in the journal:",
  );
  for (const tag of staleExceptions) console.error(`    ${tag}`);
  console.error("\n  Remove them from the exceptions file.");
  failed = true;
}

if (failed) process.exit(1);

const excusedOnDisk = onDisk.filter((tag) => excused.has(tag));
if (excusedOnDisk.length > 0) {
  console.warn(
    `⚠ ${excusedOnDisk.length} migration(s) knowingly outside the journal (not applied by deploy):`,
  );
  for (const tag of excusedOnDisk) {
    console.warn(`    ${tag} — ${excused.get(tag)}`);
  }
}

console.log(
  `✓ Migration journal consistent: ${journalTags.size} applied, ${excusedOnDisk.length} excused, ${onDisk.length} on disk.`,
);
