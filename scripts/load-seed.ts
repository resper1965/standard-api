
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./packages/schemas/src/db/schema";
import { StandardScfRepository } from "./packages/scf-core/src/db/repository";
import { ScfImportService } from "./packages/scf-core/src/services/import-service";

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("No DATABASE_URL");
    process.exit(1);
  }

  console.log("Connecting database...");
  const client = postgres(databaseUrl, { ssl: "require" });
  const db = drizzle(client, { schema });

  const ctx = {
    db,
    logger: {
      info: (m: string) => console.log(`INFO: ${m}`),
      error: (m: string, e?: any) => console.error(`ERR: ${m}`, e),
      warn: (m: string) => console.warn(`WARN: ${m}`),
    } as any,
    publishEvent: async () => { },
  };

  const repo = new StandardScfRepository(ctx);
  const importer = new ScfImportService(ctx, repo);

  const csvPath = resolve(process.cwd(), "evals", "fixtures", "scf-2024.4-seed.csv");
  console.log(`Reading ${csvPath}...`);
  const csv = readFileSync(csvPath, "utf-8");

  const source = {
    source_type: "csv" as const,
    content: csv,
    version_label: "SCF 2024.4",
    source_filename: "scf-2024.4-seed.csv",
  };

  console.log("Starting real SCF seed ingestion pipeline...");
  const result = await importer.importFromSource(source);

  console.log("Result:");
  console.log(JSON.stringify(result, null, 2));

  console.log("\nValidating loaded data...");
  const versions = await repo.listVersions();
  console.log("Versions in DB:", versions.map(v => v.version_label).join(", "));

  console.log("DONE");
  process.exit(0);
}

run().catch(console.error);

