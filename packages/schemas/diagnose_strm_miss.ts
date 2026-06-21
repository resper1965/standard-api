/**
 * Diagnostica por que 47% das entradas do bundle STRM não fizeram join.
 * Compara amostras de FDE codes e SCF codes do bundle com o que está no banco.
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./src/db/schema.js";
import * as path from "node:path";
import * as fs from "node:fs";
import { parseStrmBundleDirectory } from "../scf-core/src/importers/strm-bundle-importer.js";

const client = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
const db = drizzle(client, { schema });

async function main() {
  const STRM_DIR = path.resolve("../../assets/strm");

  // ── Load DB lookup maps ──
  const controlRows = await db
    .select({ id: schema.scfControls.id, code: schema.scfControls.controlCode })
    .from(schema.scfControls);
  const reqRows = await db
    .select({
      id: schema.scfFrameworkRequirements.id,
      code: schema.scfFrameworkRequirements.requirementCode,
    })
    .from(schema.scfFrameworkRequirements);

  const controlCodeToId = new Map(
    controlRows.map((r) => [r.code.trim().toLowerCase(), r.id]),
  );
  const reqCodeToId = new Map(
    reqRows.map((r) => [r.code.trim().toLowerCase(), r.id]),
  );

  console.log(`DB controls:      ${controlCodeToId.size}`);
  console.log(`DB requirements:  ${reqCodeToId.size}`);

  // ── Parse bundle ──
  console.log("\nParsing bundle (first 5 files only for speed)...");
  const summary = await parseStrmBundleDirectory(STRM_DIR, {
    fileFilter: (_: string, idx: number) => idx < 5,
  } as any);

  let totalEntries = 0;
  let noControl = 0;
  let noReq = 0;
  const noMapping = 0;
  let matched = 0;

  const missingControls = new Map<string, number>();
  const missingReqs = new Map<string, number>();

  for (const file of summary.files) {
    for (const entry of file.entries) {
      totalEntries++;
      const ctrl = controlCodeToId.get(entry.scf_code.trim().toLowerCase());
      const req = reqCodeToId.get(entry.fde_code.trim().toLowerCase());
      if (!ctrl) {
        noControl++;
        missingControls.set(
          entry.scf_code,
          (missingControls.get(entry.scf_code) ?? 0) + 1,
        );
      }
      if (!req) {
        noReq++;
        missingReqs.set(
          entry.fde_code,
          (missingReqs.get(entry.fde_code) ?? 0) + 1,
        );
      }
      if (ctrl && req) matched++;
      else if (ctrl && !req) noReq++;
    }
  }

  console.log(
    `\n── Results (${summary.files.length} files, ${totalEntries} entries) ──`,
  );
  console.log(
    `Matched:          ${matched}  (${((matched / totalEntries) * 100).toFixed(1)}%)`,
  );
  console.log(`No control match: ${noControl}`);
  console.log(`No req match:     ${noReq}`);

  // Sample missing SCF codes
  console.log("\n── Sample missing SCF control codes (bundle vs DB) ──");
  const topMissingControls = [...missingControls.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [code, n] of topMissingControls) {
    console.log(
      `  "${code}" (×${n}) → in DB? ${controlCodeToId.has(code.trim().toLowerCase()) ? "YES" : "NO"}`,
    );
  }

  // Sample of what IS in DB to compare format
  console.log("\n── Sample DB control codes (first 10) ──");
  for (const code of [...controlCodeToId.keys()].slice(0, 10)) {
    console.log(`  "${code}"`);
  }

  // Sample missing FDE codes
  console.log("\n── Sample missing FDE (requirement) codes (bundle vs DB) ──");
  const topMissingReqs = [...missingReqs.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [code, n] of topMissingReqs) {
    console.log(`  "${code}" (×${n})`);
  }

  // Sample of what IS in DB to compare format
  console.log("\n── Sample DB requirement codes (first 10) ──");
  for (const code of [...reqCodeToId.keys()].slice(0, 10)) {
    console.log(`  "${code}"`);
  }

  // Check if missing codes exist with different casing/whitespace
  console.log(
    "\n── Fuzzy check: top missing req codes vs DB (contains match) ──",
  );
  const dbReqCodes = [...reqCodeToId.keys()];
  for (const [code] of topMissingReqs.slice(0, 5)) {
    const normalized = code
      .trim()
      .toLowerCase()
      .replace(/[\s\-_.]/g, "");
    const fuzzy = dbReqCodes.find(
      (c) => c.replace(/[\s\-_.]/g, "") === normalized,
    );
    console.log(`  "${code}" → fuzzy match: ${fuzzy ? `"${fuzzy}"` : "NONE"}`);
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
