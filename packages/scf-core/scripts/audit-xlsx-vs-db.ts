import * as fs from "fs";
import * as path from "path";
import { read, utils } from "xlsx";
import { neon } from "@neondatabase/serverless";

async function main() {
  const args = process.argv.slice(2);
  const xlsxPathArg = args.find((a) => !a.startsWith("--"));
  const isXlsxOnly = args.includes("--xlsx-only");
  const isDbOnly = args.includes("--db-only");

  if (!xlsxPathArg && !isDbOnly) {
    console.error("Usage: npx tsx audit-xlsx-vs-db.ts <path-to-xlsx> [--xlsx-only | --db-only]");
    process.exit(1);
  }

  let xlsxDomains = new Set<string>();
  let controlCount = 0;
  let frameworkCols: string[] = [];
  
  if (!isDbOnly) {
    const xlsxPath = path.resolve(process.cwd(), xlsxPathArg!);
    if (!fs.existsSync(xlsxPath)) {
      console.error(`File not found: ${xlsxPath}`);
      process.exit(1);
    }

    console.log(`Reading XLSX file: ${xlsxPath}`);
    const workbook = read(fs.readFileSync(xlsxPath), { type: "buffer" });
    
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

    frameworkCols = headers.slice(fwColStartIndex).filter(h => h.trim() !== "" && h.length > 2);

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

  // --- DB Audit Section ---
  if (!isXlsxOnly) {
    if (!process.env.DATABASE_URL) {
      try {
        const envContent = fs.readFileSync(".env", "utf-8");
        const match = envContent.match(/DATABASE_URL="([^"]+)"/);
        if (match) process.env.DATABASE_URL = match[1];
      } catch (e) {
        // ignore
      }
    }
    
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL environment variable is required to query the database.");
      process.exit(1);
    }

    console.log(`\nConnecting to DB: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ":***@")}...`);
    const sql = neon(process.env.DATABASE_URL);

    console.log("Fetching versions...");
    const versions = await sql`SELECT id, version as "versionLabel" FROM scf_versions`;
    if (versions.length === 0) {
      console.error("No SCF versions found in DB.");
      process.exit(1);
    }
    const latestVersion = versions[0]!;

    console.log(`Using DB Version: ${latestVersion.versionLabel} (${latestVersion.id})`);

    const dbDomains = await sql`SELECT * FROM scf_domains WHERE scf_version_id = ${latestVersion.id}`;
    const dbControls = await sql`SELECT * FROM scf_controls WHERE scf_version_id = ${latestVersion.id}`;
    const dbFrameworks = await sql`SELECT * FROM scf_frameworks`;
    const dbMappings = await sql`SELECT * FROM scf_mappings WHERE scf_version_id = ${latestVersion.id}`;

    const isAuditDomains = args.includes("--audit") && args.includes("domains");
    
    // --- Domain Audit ---
    if (isAuditDomains || args.includes("--full-audit")) {
      console.log("\n=== DOMAIN AUDIT ===");
      let domainErrors = 0;
      
      const dbDomainCodes = new Set(dbDomains.map(d => d.domain_code));
      
      // Check Missing
      for (const code of xlsxDomains) {
        if (!dbDomainCodes.has(code)) {
          console.error(`❌ MISSING DOMAIN: ${code} is in XLSX but not in DB`);
          domainErrors++;
        }
      }
      
      // Check Phantom & Synthetic
      for (const domain of dbDomains) {
        if (!xlsxDomains.has(domain.domain_code)) {
          if (!domain.is_synthetic) {
            console.error(`❌ PHANTOM DOMAIN: ${domain.domain_code} is in DB (is_synthetic=false) but not in XLSX!`);
            domainErrors++;
          } else {
            console.log(`ℹ️ Synthetic Domain found: ${domain.domain_code}`);
          }
        } else {
          if (domain.is_synthetic) {
            console.error(`❌ INVALID SYNTHETIC: ${domain.domain_code} is in XLSX but marked is_synthetic=true in DB!`);
            domainErrors++;
          }
        }
      }
      
      if (domainErrors === 0) {
        console.log("✅ All Domains match perfectly between XLSX and Database.");
      } else {
        console.error(`⚠️ Found ${domainErrors} domain discrepancies.`);
      }
    }

    console.log("\n=== DB Summary ===");
    console.log(`Domains found:   ${dbDomains.length}`);
    console.log(`Controls found:  ${dbControls.length}`);
    console.log(`Frameworks (db): ${dbFrameworks.length}`);
    console.log(`Mappings found:  ${dbMappings.length}`);
    
    if (isDbOnly) {
      console.log("\nDone (--db-only).");
      process.exit(0);
    }
  }
}

main().catch(e => {
  console.error("Error:", e);
  process.exit(1);
});
