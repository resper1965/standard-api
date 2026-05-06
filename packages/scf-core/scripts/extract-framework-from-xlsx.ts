/**
 * Extract framework crosswalk data from the SCF XLSX main controls tab.
 *
 * The SCF 2026.1.1 XLSX stores framework mappings as COLUMNS in the main
 * controls tab, NOT as separate crosswalk tabs. Each cell contains the
 * framework requirement code(s) that map to the SCF control on that row.
 *
 * This script extracts one or all frameworks into SQL seed files with
 * `mapping_source = 'official_scf'`.
 *
 * Usage:
 *   npx tsx extract-framework-from-xlsx.ts <xlsx-path> --framework "Brazil\nLGPD"
 *   npx tsx extract-framework-from-xlsx.ts <xlsx-path> --list
 *   npx tsx extract-framework-from-xlsx.ts <xlsx-path> --all
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import * as XLSX from "xlsx";

// ──── Types ────

type FrameworkMapping = {
  controlCode: string;
  controlTitle: string;
  domainCode: string;
  requirementCodes: string[];
};

type ExtractedFramework = {
  columnName: string;
  frameworkCode: string;
  frameworkName: string;
  publisher: string;
  jurisdiction: string;
  mappings: FrameworkMapping[];
};

// ──── Column Name Parsing ────

/**
 * Parse the multi-line column header into structured metadata.
 * Examples:
 *   "Americas\r\nBrazil\r\nLGPD" → { code: "BR-LGPD", name: "Brazil LGPD", publisher: "Brazil", jurisdiction: "Americas" }
 *   "EMEA\r\nEU\r\nGDPR"        → { code: "EU-GDPR", name: "EU GDPR", publisher: "EU", jurisdiction: "EMEA" }
 */
const parseColumnHeader = (raw: string): { code: string; name: string; publisher: string; jurisdiction: string } => {
  const parts = raw.split(/[\r\n]+/).map(s => s.trim()).filter(Boolean);

  if (parts.length >= 3) {
    const jurisdiction = parts[0]!;
    const publisher = parts[1]!;
    const frameworkShort = parts.slice(2).join(" ");
    // Build code: use ISO country codes when possible
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
    return {
      code,
      name: `${publisher} ${frameworkShort}`,
      publisher,
      jurisdiction,
    };
  }

  if (parts.length === 2) {
    return {
      code: parts.join("-").toUpperCase().replace(/\s+/g, "-"),
      name: parts.join(" "),
      publisher: parts[0]!,
      jurisdiction: "General",
    };
  }

  return {
    code: raw.replace(/[\r\n\s]+/g, "-").toUpperCase(),
    name: raw.replace(/[\r\n]+/g, " ").trim(),
    publisher: "Unknown",
    jurisdiction: "General",
  };
};

// ──── Framework Column Detection ────

/**
 * Identify which columns contain framework mapping data.
 * Framework columns start after column ~20 (after SCF metadata columns)
 * and contain article/requirement references in their cells.
 */
const METADATA_COLUMN_PREFIXES = [
  "scf", "control", "domain", "sp-cmm", "methods", "pptdf", "minimum",
  "identify", "risk", "threat", "errata", "compensating",
];

const isFrameworkColumn = (header: string): boolean => {
  if (!header || header.trim().length === 0) return false;
  const lower = header.toLowerCase().replace(/[\r\n]+/g, " ").trim();
  // Skip SCF metadata columns
  if (METADATA_COLUMN_PREFIXES.some(p => lower.startsWith(p))) return false;
  // Skip risk/threat columns
  if (lower.startsWith("risk") || lower.startsWith("threat")) return false;
  // Skip generic headers
  if (["#", "", "errata"].some(s => lower === s)) return false;
  if (lower.includes("possible solutions")) return false;
  if (lower.includes("conformity validation")) return false;
  if (lower.includes("evidence request list")) return false;
  if (lower.includes("assessment objectives")) return false;
  // Framework columns typically have region prefixes
  const regionPrefixes = ["americas", "emea", "apac", "us", "general"];
  if (regionPrefixes.some(r => lower.startsWith(r))) return true;
  // Or known framework names
  const knownFrameworks = [
    "nist", "iso", "cis", "cobit", "pci", "hipaa", "sox", "fedramp",
    "cmmc", "owasp", "mitre", "swift", "csa", "aicpa", "apec",
    "oecd", "bsi", "govramp", "enisa", "itu", "data privacy",
  ];
  return knownFrameworks.some(f => lower.includes(f));
};

// ──── Main Extraction ────

const main = () => {
  const args = process.argv.slice(2);
  const filePath = args[0];

  if (!filePath) {
    console.error("Usage: npx tsx extract-framework-from-xlsx.ts <xlsx-path> [--list | --framework <name> | --all]");
    process.exit(1);
  }

  const doList = args.includes("--list");
  const doAll = args.includes("--all");
  const frameworkIdx = args.indexOf("--framework");
  const targetFramework = frameworkIdx >= 0 ? args[frameworkIdx + 1] : null;

  console.log(`📂 Loading: ${resolve(filePath)}`);
  const buffer = readFileSync(resolve(filePath));
  const workbook = XLSX.read(buffer, { type: "buffer" });

  // Find controls tab dynamically — search all sheets for "SCF #" column
  let controlsTabName: string | null = null;
  let sheet: XLSX.WorkSheet | null = null;
  let headers: string[] = [];
  let range: XLSX.Range = XLSX.utils.decode_range("A1");

  for (const name of workbook.SheetNames) {
    const s = workbook.Sheets[name]!;
    const r = XLSX.utils.decode_range(s["!ref"] ?? "A1");
    const hdrs: string[] = [];
    for (let col = r.s.c; col <= r.e.c; col++) {
      const cell = s[XLSX.utils.encode_cell({ r: r.s.r, c: col })];
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

  console.log(`📊 Using sheet: "${controlsTabName}" (${headers.length} columns, ${range.e.r} rows)`);

  // Find SCF Control # column — in 2026.1.1 it's called "SCF #"
  const controlCodeCol = headers.findIndex(h => {
    const norm = h.toLowerCase().replace(/[\r\n\s]+/g, " ").trim();
    return norm === "scf #" || norm === "scf control #" || norm.includes("scf #");
  });
  if (controlCodeCol < 0) {
    console.error("❌ Cannot find SCF Control # column");
    process.exit(1);
  }

  // Find SCF Control name column  
  const controlNameCol = headers.findIndex(h => {
    const norm = h.toLowerCase().replace(/[\r\n\s]+/g, " ").trim();
    return norm === "scf control" || norm === "control name" || norm === "scf control name" || norm === "control";
  });

  // Find framework columns
  const frameworkCols: { col: number; header: string }[] = [];
  for (let col = 0; col < headers.length; col++) {
    if (isFrameworkColumn(headers[col]!)) {
      frameworkCols.push({ col, header: headers[col]! });
    }
  }

  console.log(`📊 Found ${frameworkCols.length} framework columns in "${controlsTabName}"`);

  if (doList) {
    console.log("\n📋 Available frameworks:");
    frameworkCols.forEach(({ col, header }) => {
      const parsed = parseColumnHeader(header);
      const displayName = header.replace(/[\r\n]+/g, " / ").trim();
      console.log(`  [${col}] ${parsed.code.padEnd(30)} ${displayName}`);
    });
    return;
  }

  // Read all rows
  const rows: Record<string, string>[] = [];
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const rowData: Record<string, string> = {};
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
      rowData[String(col)] = cell?.v != null ? String(cell.v).trim() : "";
    }
    rows.push(rowData);
  }

  console.log(`📊 Read ${rows.length} control rows`);

  // Filter framework columns to extract
  let targetCols = frameworkCols;
  if (targetFramework) {
    const search = targetFramework.toLowerCase();
    targetCols = frameworkCols.filter(({ header }) =>
      header.toLowerCase().replace(/[\r\n]+/g, " ").includes(search)
    );
    if (targetCols.length === 0) {
      console.error(`❌ No framework matching "${targetFramework}" found.`);
      console.log("Use --list to see available frameworks.");
      process.exit(1);
    }
  }

  if (!doAll && !targetFramework) {
    console.log("\nSpecify --list, --all, or --framework <name>. Example:");
    console.log('  npx tsx extract-framework-from-xlsx.ts <xlsx> --framework "lgpd"');
    return;
  }

  console.log(`\n🔄 Extracting ${targetCols.length} framework(s)...`);

  const extractedFrameworks: ExtractedFramework[] = [];

  for (const { col, header } of targetCols) {
    const parsed = parseColumnHeader(header);
    const mappings: FrameworkMapping[] = [];

    for (const row of rows) {
      const controlCode = row[String(controlCodeCol)]?.trim() ?? "";
      const controlTitle = controlNameCol >= 0 ? (row[String(controlNameCol)]?.trim() ?? "") : "";
      const cellValue = row[String(col)]?.trim() ?? "";

      if (!controlCode || !cellValue) continue;

      // Extract domain code
      const domainMatch = controlCode.match(/^([A-Z]{2,4})-\d+/);
      if (!domainMatch) continue;

      // Split multi-value cells (some contain multiple article references)
      const reqCodes = cellValue
        .split(/[\n\r;]+/)
        .map(s => s.trim())
        .filter(Boolean);

      if (reqCodes.length > 0) {
        mappings.push({
          controlCode,
          controlTitle,
          domainCode: domainMatch[1]!,
          requirementCodes: reqCodes,
        });
      }
    }

    if (mappings.length > 0) {
      extractedFrameworks.push({
        columnName: header,
        frameworkCode: parsed.code,
        frameworkName: parsed.name,
        publisher: parsed.publisher,
        jurisdiction: parsed.jurisdiction,
        mappings,
      });
    }
  }

  // Output summary
  console.log(`\n📈 Extraction Results:`);
  let totalMappings = 0;
  let totalReqs = 0;
  for (const fw of extractedFrameworks) {
    const uniqueReqs = new Set(fw.mappings.flatMap(m => m.requirementCodes));
    totalMappings += fw.mappings.length;
    totalReqs += uniqueReqs.size;
    console.log(`  ${fw.frameworkCode.padEnd(30)} ${fw.mappings.length} mappings, ${uniqueReqs.size} unique requirements`);
  }
  console.log(`\n  TOTAL: ${extractedFrameworks.length} frameworks, ${totalMappings} mappings, ${totalReqs} unique requirements`);

  // Generate SQL seeds
  const seedsDir = resolve(filePath, "../../infra/docker/postgres/seeds");
  const doConsolidated = args.includes("--consolidated");

  if (doConsolidated || (doAll && extractedFrameworks.length > 1)) {
    // Consolidated mode: one file with all frameworks
    const seedFile = join(seedsDir, `0010_scf_official_frameworks_seed.sql`);
    let sql = `-- ============================================================
-- Standard SCF Official Seed: ALL Frameworks (Consolidated)
-- Source: Secure Controls Framework (SCF) XLSX 2026.1.1
-- Mapping source: official_scf
-- Generated: ${new Date().toISOString()}
-- ============================================================
-- Frameworks: ${extractedFrameworks.length}
-- Total mappings: ${totalMappings}
-- Total requirements: ${totalReqs}
-- ============================================================

BEGIN;

-- Record import run
INSERT INTO scf_import_runs (scf_version_id, source_type, source_filename, source_hash, status, started_at, completed_at, import_statistics, trace_id)
SELECT
  v.id,
  'xlsx',
  'Secure Controls Framework (SCF) - 2026.1.1.xlsx',
  'sha256:official-scf-2026.1.1-all-frameworks',
  'succeeded',
  NOW(),
  NOW(),
  '${JSON.stringify({ frameworks: extractedFrameworks.length, requirements: totalReqs, mappings: totalMappings })}'::jsonb,
  'official-xlsx-extract-all-${Date.now()}'
FROM scf_versions v
ORDER BY v.created_at DESC
LIMIT 1;

`;

    for (const fw of extractedFrameworks) {
      const uniqueReqs = [...new Set(fw.mappings.flatMap(m => m.requirementCodes))].sort();
      sql += generateFrameworkSQL(fw, uniqueReqs);
    }

    sql += `\nCOMMIT;\n`;
    writeFileSync(seedFile, sql, "utf-8");
    console.log(`\n💾 Written consolidated seed: ${seedFile}`);
    console.log(`   Frameworks: ${extractedFrameworks.length}`);
    console.log(`   Total Requirements: ${totalReqs}`);
    console.log(`   Total Mappings: ${totalMappings}`);
  } else {
    // Individual mode: one file per framework
    for (const fw of extractedFrameworks) {
      const uniqueReqs = [...new Set(fw.mappings.flatMap(m => m.requirementCodes))].sort();
      const safeCode = fw.frameworkCode.toLowerCase().replace(/[^a-z0-9-]/g, "_");
      const seedFile = join(seedsDir, `0010_${safeCode}_official_seed.sql`);

      const sql = generateSeedSQL(fw, uniqueReqs);
      writeFileSync(seedFile, sql, "utf-8");
      console.log(`\n💾 Written: ${seedFile}`);
      console.log(`   Framework: ${fw.frameworkCode} (${fw.frameworkName})`);
      console.log(`   Requirements: ${uniqueReqs.length}`);
      console.log(`   Mappings: ${fw.mappings.length}`);
    }
  }
};

// ──── SQL Generator ────

const escapeSql = (s: string) => s.replace(/'/g, "''");

/**
 * Generate SQL for a single framework (no transaction wrapper).
 * Used in consolidated mode where BEGIN/COMMIT wraps all frameworks.
 *
 * Schema alignment (Drizzle → SQL):
 *   scf_frameworks: framework_id, name, version_label, publisher, jurisdiction, category, source_reference, status, is_synthetic
 *   scf_framework_requirements: scf_version_id, scf_framework_id, requirement_code, title, description, requirement_text, sort_order, status, is_synthetic
 *   scf_mappings: scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, mapping_source, is_official, status, is_synthetic
 *   Unique constraints: scf_frameworks(scf_version_id, framework_id), scf_framework_requirements(scf_framework_id, requirement_code), scf_mappings(scf_framework_requirement_id, scf_control_id)
 */
const generateFrameworkSQL = (fw: ExtractedFramework, uniqueReqs: string[]): string => {
  const reqMap = new Map<string, number>();
  uniqueReqs.forEach((r, i) => reqMap.set(r, i + 1));

  let sql = `
-- ────────────────────────────────────────────────────────────
-- Framework: ${fw.frameworkCode} (${fw.frameworkName})
-- Publisher: ${fw.publisher} | Jurisdiction: ${fw.jurisdiction}
-- Requirements: ${uniqueReqs.length} | Mappings: ${fw.mappings.length}
-- ────────────────────────────────────────────────────────────

INSERT INTO scf_frameworks (scf_version_id, framework_id, name, publisher, jurisdiction, status, is_synthetic)
SELECT
  v.id,
  '${escapeSql(fw.frameworkCode)}',
  '${escapeSql(fw.frameworkName)}',
  '${escapeSql(fw.publisher)}',
  '${escapeSql(fw.jurisdiction)}',
  'active',
  false
FROM scf_versions v
ORDER BY v.created_at DESC
LIMIT 1
ON CONFLICT (scf_version_id, framework_id) DO UPDATE SET
  name = EXCLUDED.name,
  publisher = EXCLUDED.publisher,
  jurisdiction = EXCLUDED.jurisdiction;

`;

  for (const req of uniqueReqs) {
    sql += `INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  '${escapeSql(req)}',
  '${escapeSql(req)}',
  ${reqMap.get(req)!},
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = '${escapeSql(fw.frameworkCode)}'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
`;
  }

  sql += `\n`;

  for (const mapping of fw.mappings) {
    for (const reqCode of mapping.requirementCodes) {
      sql += `INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = '${escapeSql(fw.frameworkCode)}'
JOIN scf_controls c ON c.control_code = '${escapeSql(mapping.controlCode)}' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = '${escapeSql(reqCode)}'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
`;
    }
  }

  return sql;
};

/**
 * Generate a standalone SQL seed for a single framework (with transaction).
 * Used in individual mode.
 */
const generateSeedSQL = (fw: ExtractedFramework, uniqueReqs: string[]): string => {
  let sql = `-- ============================================================
-- Standard SCF Official Seed: ${fw.frameworkName}
-- Source: Secure Controls Framework (SCF) XLSX 2026.1.1
-- Mapping source: official_scf
-- Generated: ${new Date().toISOString()}
-- ============================================================
-- Framework: ${fw.frameworkCode}
-- Publisher: ${fw.publisher}
-- Jurisdiction: ${fw.jurisdiction}
-- Requirements: ${uniqueReqs.length}
-- Mappings: ${fw.mappings.length}
-- ============================================================

BEGIN;

-- Record import run
INSERT INTO scf_import_runs (scf_version_id, source_type, source_filename, source_hash, status, started_at, completed_at, import_statistics, trace_id)
SELECT
  v.id,
  'xlsx',
  'Secure Controls Framework (SCF) - 2026.1.1.xlsx',
  'sha256:official-scf-2026.1.1-${fw.frameworkCode.toLowerCase()}',
  'succeeded',
  NOW(),
  NOW(),
  '${JSON.stringify({
    frameworks: 1,
    requirements: uniqueReqs.length,
    mappings: fw.mappings.length,
  })}'::jsonb,
  'official-xlsx-extract-${fw.frameworkCode.toLowerCase()}-${Date.now()}'
FROM scf_versions v
ORDER BY v.created_at DESC
LIMIT 1;

`;

  sql += generateFrameworkSQL(fw, uniqueReqs);
  sql += `\nCOMMIT;\n`;
  return sql;
};

main();


