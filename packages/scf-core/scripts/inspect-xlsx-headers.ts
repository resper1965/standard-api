/**
 * Inspect SCF XLSX headers — shows all column names from the controls tab
 * to identify framework mapping columns (LGPD, GDPR, etc.)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as XLSX from "xlsx";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: npx tsx inspect-xlsx-headers.ts <path-to-xlsx>");
  process.exit(1);
}

const buffer = readFileSync(resolve(filePath));
const workbook = XLSX.read(buffer, { type: "buffer" });

console.log(`\n📋 Sheet names (${workbook.SheetNames.length}):`);
workbook.SheetNames.forEach((name, i) => console.log(`  ${i + 1}. "${name}"`));

// Get headers from each sheet
for (const name of workbook.SheetNames) {
  const sheet = workbook.Sheets[name]!;
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  const headers: string[] = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: col })];
    headers.push(cell?.v != null ? String(cell.v).trim() : "");
  }

  console.log(`\n📊 Sheet "${name}" — ${headers.length} columns, ${range.e.r} rows:`);
  
  // Search for LGPD, GDPR, Brazil, ISO 42001 etc
  const privacyKeywords = ["lgpd", "gdpr", "brazil", "brasil", "privacy", "42001", "iso"];
  const matched = headers.filter(h => 
    privacyKeywords.some(k => h.toLowerCase().includes(k))
  );
  
  if (matched.length > 0) {
    console.log(`  🎯 Privacy/Framework columns found:`);
    matched.forEach(h => console.log(`    → "${h}"`));
  }
  
  // Print ALL headers for the controls tab
  if (name.toLowerCase().includes("scf") || name.toLowerCase().includes("control")) {
    console.log(`  All headers:`);
    headers.forEach((h, i) => {
      if (h) console.log(`    [${i}] ${h}`);
    });
  }
}
