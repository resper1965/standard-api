/**
 * Diagnóstico: compara FDE codes do bundle STRM com requirement_codes no banco.
 * Usa SQL raw para evitar problemas de schema Drizzle.
 */
import postgres from "postgres";
import * as path from "node:path";
import * as fs from "node:fs";
import * as XLSX from "xlsx";
import { sslForDatabaseUrl } from "./src/db-ssl.js";

const client = postgres(process.env.DATABASE_URL!, { ssl: sslForDatabaseUrl(process.env.DATABASE_URL!), max: 1 });

async function main() {
  const STRM_DIR = path.resolve("../../assets/strm");

  // Load all requirement codes from DB via raw SQL
  console.log("Loading requirement codes from DB...");
  const reqResult =
    await client`SELECT requirement_code FROM scf_framework_requirements`;
  const reqCodeSet = new Set(
    reqResult.map((r: any) => String(r.requirement_code).trim().toLowerCase()),
  );
  console.log(`Loaded ${reqCodeSet.size} requirement codes from DB.\n`);

  // Sample a few DB codes to understand format
  const sampleDbCodes = reqResult
    .slice(0, 5)
    .map((r: any) => String(r.requirement_code).trim());
  console.log("Sample DB requirement_code values:");
  for (const c of sampleDbCodes) console.log(`  "${c.slice(0, 80)}..."`);

  const files = fs
    .readdirSync(STRM_DIR)
    .filter((f: string) => f.endsWith(".xlsx"))
    .sort();
  console.log(`\nScanning ${files.length} STRM files...\n`);

  let totalFiles = 0,
    fullMatch = 0,
    partialMatch = 0,
    noMatch = 0;

  // Detailed sample for 10 files
  const sampleIndices = [0, 20, 40, 60, 80, 100, 120, 140, 160, 182];

  for (let i = 0; i < files.length; i++) {
    const filename = files[i]!;
    const filePath = path.join(STRM_DIR, filename);
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
    }) as string[][];
    const headers = (rows[3] ?? []) as string[];
    const fdeColIdx = headers.findIndex((h: string) =>
      String(h).trim().toLowerCase().includes("fde #"),
    );
    if (fdeColIdx === -1) continue;

    const fdeCodes = rows
      .slice(4)
      .map((r: string[]) => String(r[fdeColIdx] ?? "").trim())
      .filter(Boolean);
    const unique = [...new Set(fdeCodes)];
    const matched = unique.filter((c: string) =>
      reqCodeSet.has(c.toLowerCase()),
    ).length;
    const pct = unique.length > 0 ? matched / unique.length : 0;

    totalFiles++;
    if (pct >= 0.9) fullMatch++;
    else if (pct > 0.05) partialMatch++;
    else noMatch++;

    if (sampleIndices.includes(i)) {
      console.log(`\n[File ${i}] ${filename}`);
      console.log(
        `  FDE unique: ${unique.length}  matched: ${matched}  (${(pct * 100).toFixed(0)}%)`,
      );
      console.log(
        `  Sample FDE codes: ${unique
          .slice(0, 3)
          .map((c: string) => `"${c}"`)
          .join(", ")}`,
      );
    }
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("SUMMARY:");
  console.log(`  Total files scanned:  ${totalFiles}`);
  console.log(`  ✅ Full match (≥90%): ${fullMatch}`);
  console.log(`  ⚠️  Partial (5-90%):  ${partialMatch}`);
  console.log(`  ❌ No match (<5%):    ${noMatch}`);

  // Which specific major frameworks have no match?
  console.log(`\n${"═".repeat(80)}`);
  console.log("FILES WITH 0% MATCH:");
  for (let i = 0; i < files.length; i++) {
    const filename = files[i]!;
    const filePath = path.join(STRM_DIR, filename);
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
    }) as string[][];
    const headers = (rows[3] ?? []) as string[];
    const fdeColIdx = headers.findIndex((h: string) =>
      String(h).trim().toLowerCase().includes("fde #"),
    );
    if (fdeColIdx === -1) continue;
    const fdeCodes = rows
      .slice(4)
      .map((r: string[]) => String(r[fdeColIdx] ?? "").trim())
      .filter(Boolean);
    const unique = [...new Set(fdeCodes)];
    const matched = unique.filter((c: string) =>
      reqCodeSet.has(c.toLowerCase()),
    ).length;
    if (unique.length > 0 && matched === 0) {
      console.log(
        `  ❌ ${filename} — FDE sample: "${unique[0]}", "${unique[1] ?? ""}"`,
      );
    }
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
