import * as fs from "fs";
import * as path from "path";
import { read, utils } from "xlsx";
import { neon } from "@neondatabase/serverless";

// ──── Utilities from Framework Extraction ────
const METADATA_COLUMN_PREFIXES = [
  "scf", "control", "domain", "sp-cmm", "methods", "pptdf", "minimum",
  "identify", "risk", "threat", "errata", "compensating",
];

const isFrameworkColumn = (header: string): boolean => {
  if (!header || header.trim().length === 0) return false;
  const lower = header.toLowerCase().replace(/[\r\n]+/g, " ").trim();
  if (METADATA_COLUMN_PREFIXES.some(p => lower.startsWith(p))) return false;
  if (lower.startsWith("risk") || lower.startsWith("threat")) return false;
  if (["#", "", "errata"].some(s => lower === s)) return false;
  if (lower.includes("possible solutions")) return false;
  if (lower.includes("conformity validation")) return false;
  if (lower.includes("evidence request list")) return false;
  if (lower.includes("assessment objectives")) return false;
  const regionPrefixes = ["americas", "emea", "apac", "us", "general"];
  if (regionPrefixes.some(r => lower.startsWith(r))) return true;
  const knownFrameworks = [
    "nist", "iso", "cis", "cobit", "pci", "hipaa", "sox", "fedramp",
    "cmmc", "owasp", "mitre", "swift", "csa", "aicpa", "apec",
    "oecd", "bsi", "govramp", "enisa", "itu", "data privacy",
  ];
  return knownFrameworks.some(f => lower.includes(f));
};

const parseColumnHeader = (raw: string): { code: string; name: string; publisher: string; jurisdiction: string } => {
  const parts = raw.split(/[\r\n]+/).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const jurisdiction = parts[0]!;
    const publisher = parts[1]!;
    const frameworkShort = parts.slice(2).join(" ");
    const countryMap: Record<string, string> = {
      "Brazil": "BR", "EU": "EU", "UK": "UK", "Canada": "CA", "Australia": "AU",
      "China": "CN", "Japan": "JP", "India": "IN", "Qatar": "QA", "Mexico": "MX",
      "Colombia": "CO", "Chile": "CL", "Argentina": "AR", "Singapore": "SG",
      "South Korea": "KR", "Taiwan": "TW", "Malaysia": "MY", "Hong Kong": "HK",
      "New Zealand": "NZ", "Philippines": "PH", "Germany": "DE", "Spain": "ES",
      "Italy": "IT", "Norway": "NO", "Poland": "PL", "Russia": "RU",
      "Saudi Arabia": "SA", "Turkey": "TR", "Israel": "IL", "Ireland": "IE",
      "Greece": "GR", "Hungary": "HU", "Belgium": "BE", "Austria": "AT",
      "Switzerland": "CH", "Serbia": "RS", "South Africa": "ZA", "Kenya": "KE",
      "Nigeria": "NG", "Bahamas": "BS", "Bermuda": "BM", "US": "US",
    };
    const countryCode = countryMap[publisher] ?? publisher.toUpperCase().substring(0, 2);
    const code = `${countryCode}-${frameworkShort.replace(/\s+/g, "-").toUpperCase()}`;
    return { code, name: `${publisher} ${frameworkShort}`, publisher, jurisdiction };
  }
  if (parts.length === 2) {
    return { code: parts.join("-").toUpperCase().replace(/\s+/g, "-"), name: parts.join(" "), publisher: parts[0]!, jurisdiction: "General" };
  }
  return { code: raw.replace(/[\r\n\s]+/g, "-").toUpperCase(), name: raw.replace(/[\r\n]+/g, " ").trim(), publisher: "Unknown", jurisdiction: "General" };
};

// ──── Main Script ────
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
  let frameworkCols: { col: number; header: string; parsed: ReturnType<typeof parseColumnHeader> }[] = [];
  const xlsxControls = new Map<string, any>(); // control_code -> row data
  let headers: string[] = [];
  let controlNameCol = -1;
  let controlsTabName: string | null = null;
  
  if (!isDbOnly) {
    const xlsxPath = path.resolve(process.cwd(), xlsxPathArg!);
    if (!fs.existsSync(xlsxPath)) {
      console.error(`File not found: ${xlsxPath}`);
      process.exit(1);
    }

    console.log(`Reading XLSX file: ${xlsxPath}`);
    const workbook = read(fs.readFileSync(xlsxPath), { type: "buffer" });
    
    let sheet: import("xlsx").WorkSheet | null = null;
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
    
    controlNameCol = headers.findIndex(h => {
      const norm = h.toLowerCase().replace(/[\r\n\s]+/g, " ").trim();
      return norm === "scf control" || norm === "control name" || norm === "scf control name" || norm === "control";
    });

    for (let col = 0; col < headers.length; col++) {
      if (isFrameworkColumn(headers[col]!)) {
        frameworkCols.push({ col, header: headers[col]!, parsed: parseColumnHeader(headers[col]!) });
      }
    }

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
        xlsxControls.set(scfNum, row);
        const domainCode = scfNum.split("-")[0];
        if (domainCode) {
          xlsxDomains.add(domainCode);
        }
      }
    }

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

    console.log("Fetching DB tables...");
    const versions = await sql`SELECT id, version as "versionLabel" FROM scf_versions`;
    if (versions.length === 0) { console.error("No SCF versions found in DB."); process.exit(1); }
    const latestVersion = versions[0]!;

    const dbDomains = await sql`SELECT * FROM scf_domains WHERE scf_version_id = ${latestVersion.id}`;
    const dbControls = await sql`SELECT * FROM scf_controls WHERE scf_version_id = ${latestVersion.id}`;
    const dbFrameworks = await sql`SELECT * FROM scf_frameworks`;
    const dbMappings = await sql`SELECT * FROM scf_mappings WHERE scf_version_id = ${latestVersion.id}`;
    const dbRequirements = await sql`SELECT * FROM scf_framework_requirements`;

    const isAuditDomains = args.includes("--audit") && args.includes("domains");
    const isAuditControls = args.includes("--audit") && args.includes("controls");
    const isAuditFrameworks = args.includes("--audit") && args.includes("frameworks");
    const isAuditMappings = args.includes("--audit") && args.includes("mappings");
    const isFullAudit = args.includes("--full-audit");

    // --- Domain Audit ---
    if (isAuditDomains || isFullAudit) {
      console.log("\n=== DOMAIN AUDIT ===");
      let errors = 0;
      const dbDomainCodes = new Set(dbDomains.map(d => d.domain_code));
      for (const code of xlsxDomains) {
        if (!dbDomainCodes.has(code)) { console.error(`❌ MISSING: ${code}`); errors++; }
      }
      for (const d of dbDomains) {
        if (!xlsxDomains.has(d.domain_code) && !d.is_synthetic) {
           console.error(`❌ PHANTOM: ${d.domain_code} exists in DB (is_synthetic=false) but not in XLSX`);
           errors++;
        }
      }
      errors === 0 ? console.log("✅ Match perfect") : console.error(`⚠️ ${errors} discrepancies`);
    }

    // --- Control Audit (Deep) ---
    if (isAuditControls || isFullAudit) {
      console.log("\n=== CONTROL AUDIT (DEEP) ===");
      let errors = 0;
      let missing = 0;
      let phantom = 0;
      
      const dbControlMap = new Map(dbControls.map(c => [c.control_code, c]));

      for (const [code, item] of xlsxControls.entries()) {
        const dbControl = dbControlMap.get(code);
        if (!dbControl) { missing++; errors++; console.error(`❌ MISSING CONTROL: ${code}`); continue; }

        // Payload Match
        const expectedTitle = item[String(controlNameCol)];
        if (expectedTitle && dbControl.title && expectedTitle.trim() !== dbControl.title.trim()) {
           console.error(`❌ TITLE MISMATCH [${code}]: XLSX="${expectedTitle.trim()}"  DB="${dbControl.title.trim()}"`);
           errors++;
        }
      }

      for (const c of dbControls) {
        if (!xlsxControls.has(c.control_code) && !c.is_synthetic) {
           phantom++; errors++;
           console.error(`❌ PHANTOM CONTROL: ${c.control_code}`);
        }
      }

      errors === 0 ? console.log("✅ All Controls match perfectly including titles.") : console.error(`⚠️ ${errors} discrepancies (Missing: ${missing}, Phantom: ${phantom}).`);
    }

    // --- Framework Audit (Deep) ---
    if (isAuditFrameworks || isFullAudit) {
      console.log("\n=== FRAMEWORK AUDIT ===");
      let errors = 0;
      const dbFwMap = new Map(dbFrameworks.map(f => [f.framework_id, f]));
      let missing = 0;

      for (const xlsxFw of frameworkCols) {
        const dbFw = dbFwMap.get(xlsxFw.parsed.code);
        if (!dbFw) {
          missing++;
        }
      }

      console.log(`DB has ${dbFwMap.size} frameworks. XLSX has ${frameworkCols.length} columns. Not loaded: ${missing}`);
      console.log("✅ Framework validation complete.");
    }

    // --- Mapping Audit (Deep Cell Verification) ---
    if (isAuditMappings || isFullAudit) {
      console.log("\n=== MAPPING AUDIT (CELL BY CELL) ===");
      
      let mappingErrors = 0;
      const reqMap = new Map(dbRequirements.map(r => [r.id, r]));
      
      // We will index mappings by: frameworkCode -> controlCode -> set(requirementCode)
      console.log("Building in-memory mapping index from DB...");
      const dbMappingIndex = new Map<string, Map<string, Set<string>>>();
      
      for (const mapping of dbMappings) {
        if (mapping.is_synthetic) continue;
        const req = reqMap.get(mapping.scf_framework_requirement_id);
        const fw = dbFrameworks.find(f => f.id === req?.scf_framework_id);
        const control = dbControls.find(c => c.id === mapping.scf_control_id);

        if (fw && control && req) {
           let fwBucket = dbMappingIndex.get(fw.framework_id);
           if (!fwBucket) { fwBucket = new Map(); dbMappingIndex.set(fw.framework_id, fwBucket); }
           let ctrlBucket = fwBucket.get(control.control_code);
           if (!ctrlBucket) { ctrlBucket = new Set(); fwBucket.set(control.control_code, ctrlBucket); }
           ctrlBucket.add(req.requirement_code);
        }
      }

      console.log("Performing bi-directional cell checking against XLSX...");
      // Check every cell in the XLSX against DB
      let cellsAnalyzed = 0;
      let matchedCells = 0;

      for (const [controlCode, xlsxRow] of xlsxControls.entries()) {
         for (const fwCol of frameworkCols) {
            const fwCode = fwCol.parsed.code;
            const cellValue = xlsxRow[String(fwCol.col)];
            
            // Skip frameworks that the DB hasn't been configured to import
            if (!dbMappingIndex.has(fwCode)) continue;
            
            cellsAnalyzed++;
            const dbCtrlBucket = dbMappingIndex.get(fwCode)?.get(controlCode) || new Set();

            if (cellValue && cellValue.trim().length > 0 && cellValue !== "NA" && cellValue !== "-") {
               // The DB *must* have mappings
               if (dbCtrlBucket.size === 0) {
                  mappingErrors++;
                  if (mappingErrors < 20) console.error(`❌ MAPPING DROP: XLSX cell for ${fwCode}/${controlCode} has content ('${cellValue}') but DB has NO records.`);
               } else {
                  matchedCells++;
               }
            } else {
               // The DB *must not* have mapped mappings (except synthetic ones, which we ignored above)
               if (dbCtrlBucket.size > 0) {
                  mappingErrors++;
                  if (mappingErrors < 20) console.error(`❌ PHANTOM MAPPING: XLSX cell for ${fwCode}/${controlCode} is EMPTY, but DB claims mappings exist!`);
               }
            }
         }
      }

      if (mappingErrors === 0) {
         console.log(`✅ Mapping validation perfect! (Assessed ${cellsAnalyzed} distinct cells/relationships).`);
      } else {
         console.error(`⚠️ Found ${mappingErrors} actual mapping drift errors (XLSX data vs DB data).`);
      }
    }

    console.log("\n=== DB Summary ===");
    console.log(`Domains found:   ${dbDomains.length}`);
    console.log(`Controls found:  ${dbControls.length}`);
    console.log(`Frameworks (db): ${dbFrameworks.length}`);
    console.log(`Mappings found:  ${dbMappings.length}`);
    if (isDbOnly) { process.exit(0); }
  }
}

main().catch(e => {
  console.error("Error:", e);
  process.exit(1);
});
