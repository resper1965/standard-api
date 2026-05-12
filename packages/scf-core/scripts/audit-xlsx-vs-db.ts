import * as fs from "fs";
import * as path from "path";
import { read, utils } from "xlsx";

function main() {
  const args = process.argv.slice(2);
  const xlsxPathArg = args.find((a) => !a.startsWith("--"));
  const isXlsxOnly = args.includes("--xlsx-only");

  if (!xlsxPathArg) {
    console.error("Usage: npx tsx audit-xlsx-vs-db.ts <path-to-xlsx> [--xlsx-only]");
    process.exit(1);
  }

  const xlsxPath = path.resolve(process.cwd(), xlsxPathArg);
  if (!fs.existsSync(xlsxPath)) {
    console.error(`File not found: ${xlsxPath}`);
    process.exit(1);
  }

  console.log(`Reading XLSX file: ${xlsxPath}`);
  const workbook = read(fs.readFileSync(xlsxPath), { type: "buffer" });
  
// Parse Domains & Controls
  const xlsxDomains = new Set<string>();
  let controlCount = 0;
  
  let controlsTabName: string | null = null;
  let sheet: import("xlsx").WorkSheet | null = null;
  let headers: string[] = [];
  let range: import("xlsx").Range = utils.decode_range("A1");

  for (const name of workbook.SheetNames) {
    const s = workbook.Sheets[name]!;
    const r = utils.decode_range(s["!ref"] ?? "A1");
    const hdrs: string[] = [];
    for (let col = r.s.c; col <= r.e.c; col++) {
      const cell = s[utils.encode_cell({ r: r.s.r, c: col })];
      hdrs.push(cell?.v != null ? String(cell.v) : "");
    }
    const hasScfCol = hdrs.some(h => {
      const norm = h.toLowerCase().replace(/[\r\n\s]+/g, " ").trim();
      return norm === "scf #" || norm === "scf control #";
    });
    if (hasScfCol) {
      controlsTabName = name;
      sheet = s;
      headers = hdrs;
      range = r;
      break;
    }
  }

  if (!controlsTabName || !sheet) {
    console.error("❌ Cannot find any sheet with SCF # column");
    process.exit(1);
  }

  const controlCodeCol = headers.findIndex(h => {
    const norm = h.toLowerCase().replace(/[\r\n\s]+/g, " ").trim();
    return norm === "scf #" || norm === "scf control #" || norm.includes("scf #");
  });

  const fwColStartIndex = headers.findIndex((h) => h.includes("CMMC") || h.includes("ISO") || h.includes("NIST") || h.includes("GDPR"));
  // Rough counting for now, we'll refine this.

  const rows: Record<string, string>[] = [];
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const rowData: Record<string, string> = {};
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = sheet[utils.encode_cell({ r: row, c: col })];
      rowData[String(col)] = cell?.v != null ? String(cell.v).trim() : "";
    }
    rows.push(rowData);
  }

  for (const row of rows) {
    const scfNum = row[String(controlCodeCol)];
    if (scfNum && typeof scfNum === 'string' && scfNum.includes("-")) {
      controlCount++;
      const domainCode = scfNum.split("-")[0];
      if (domainCode) {
        xlsxDomains.add(domainCode);
      }
    }
  }

  const frameworkCols = headers.slice(fwColStartIndex).filter(h => h.trim() !== "" && h.length > 2);

  console.log("\n=== XLSX Summary ===");
  console.log(`Sheet name:      ${controlsTabName}`);
  console.log(`Domains found:   ${xlsxDomains.size}`);
  console.log(`Controls found:  ${controlCount}`);
  console.log(`Frameworks (cols): ${frameworkCols.length}`);

  if (isXlsxOnly) {
    console.log("\nDone (--xlsx-only).");
    process.exit(0);
  }
}

main();
