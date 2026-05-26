/**
 * apply-seed-sql.ts — Neon-compatible chunked seed executor
 *
 * Executes one statement at a time with configurable concurrency.
 * The Neon HTTP endpoint does not support multi-statement strings.
 *
 * Usage:
 *   DATABASE_URL=<neon-url> npx tsx apply-seed-sql.ts <sql-file> [--concurrency 20] [--dry-run]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

const DEFAULT_CONCURRENCY = 20;

function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inString = false;
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i]!;
    if (ch === "'" && sql[i - 1] !== "\\") {
      inString = !inString;
      current += ch;
    } else if (ch === ";" && !inString) {
      const stmt = current.trim();
      if (stmt.length > 0 && !stmt.startsWith("--")) statements.push(stmt);
      current = "";
    } else {
      current += ch;
    }
    i++;
  }
  const last = current.trim();
  if (last.length > 0 && !last.startsWith("--")) statements.push(last);
  return statements;
}

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
  onProgress: (done: number, total: number) => void
): Promise<{ results: (T | Error)[] }> {
  const results: (T | Error)[] = new Array(tasks.length);
  let idx = 0;

  const worker = async () => {
    while (idx < tasks.length) {
      const taskIdx = idx++;
      try {
        results[taskIdx] = await tasks[taskIdx]!();
      } catch (err) {
        results[taskIdx] = err instanceof Error ? err : new Error(String(err));
      }
      onProgress(taskIdx + 1, tasks.length);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { results };
}

async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0];
  const dryRun = args.includes("--dry-run");
  const concurrencyIdx = args.indexOf("--concurrency");
  const concurrency = concurrencyIdx >= 0
    ? parseInt(args[concurrencyIdx + 1]!, 10)
    : DEFAULT_CONCURRENCY;

  if (!filePath) {
    console.error("Usage: DATABASE_URL=<url> npx tsx apply-seed-sql.ts <sql-file> [--dry-run] [--concurrency N]");
    process.exit(1);
  }

  const DATABASE_URL = process.env["DATABASE_URL"];
  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is required.");
    process.exit(1);
  }

  const absPath = resolve(filePath);
  console.log(`📂 Loading: ${absPath}`);
  const sql = readFileSync(absPath, "utf-8");

  // Strip transaction wrappers and comments
  const stripped = sql
    .replace(/^BEGIN\s*;?\s*$/gim, "")
    .replace(/^COMMIT\s*;?\s*$/gim, "")
    .replace(/^--.*$/gm, "");

  const statements = splitStatements(stripped).filter(s => s.trim().length > 2);

  console.log(`📊 Total statements: ${statements.length}`);
  console.log(`⚡ Concurrency: ${concurrency}`);

  if (dryRun) {
    console.log("🔍 DRY RUN — not executing");
    statements.slice(0, 3).forEach((s, i) =>
      console.log(`[${i + 1}] ${s.substring(0, 100)}...`)
    );
    console.log("✅ Dry run complete.");
    return;
  }

  const db = neon(DATABASE_URL);
  let lastReport = 0;

  const tasks = statements.map(stmt => async () => {
    return db(stmt);
  });

  const onProgress = (done: number, total: number) => {
    if (done - lastReport >= 500 || done === total) {
      lastReport = done;
      const pct = Math.round((done / total) * 100);
      process.stdout.write(`\r  ✅ ${done}/${total} (${pct}%)`);
    }
  };

  const start = Date.now();
  const { results } = await runWithConcurrency(tasks, concurrency, onProgress);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  const errors = results.filter(r => r instanceof Error) as Error[];
  const dupes = errors.filter(e => e.message.includes("duplicate key") || e.message.includes("already exists"));
  const realErrors = errors.filter(e => !e.message.includes("duplicate key") && !e.message.includes("already exists"));

  console.log(`\n\n🎉 Done in ${elapsed}s`);
  console.log(`   Statements:  ${statements.length}`);
  console.log(`   Duplicates:  ${dupes.length} (idempotent — expected on re-run)`);
  console.log(`   Real errors: ${realErrors.length}`);

  if (realErrors.length > 0) {
    console.error("\n❌ Errors:");
    realErrors.slice(0, 5).forEach(e => console.error(`   ${e.message.substring(0, 200)}`));
    if (realErrors.length > 5) console.error(`   ... and ${realErrors.length - 5} more`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
