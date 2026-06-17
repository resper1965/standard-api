/**
 * populate-fde-codes.ts
 *
 * LÃª o SCF XLSX principal (assets/Secure Controls Framework (SCF) - 2026.1.1.xlsx),
 * extrai os crosswalk tabs e popula scf_framework_requirements.fde_code
 * com o identificador oficial do FDE (ex: "A.5.1", "AC-1", "7.1").
 *
 * EstratÃ©gia:
 * 1. Para cada crosswalk tab do XLSX, detecta a coluna SCF # e a coluna FDE
 * 2. Cria um mapa: SCF control code â†’ FDE code(s) para esse framework
 * 3. JOIN com scf_mappings â†’ scf_framework_requirements para localizar o requirement
 * 4. UPDATE requirement.fde_code = FDE code oficial
 *
 * Seguro para re-executar (idempotente via ON CONFLICT / WHERE fde_code IS NULL).
 */
import postgres from "postgres";
import * as XLSX from "xlsx";
import * as path from "node:path";
import * as fs from "node:fs";

const DRY_RUN = process.argv.includes("--dry-run");

import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const XLSX_PATH = path.resolve(
  __dirname,
  "../../../assets/Secure Controls Framework (SCF) - 2026.1.1.xlsx",
);

// Normalize header: lowercase, trim, spacesâ†’underscore, remove specials
const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_#&-]/g, "");

// SCF control code column patterns
const SCF_COL_PATTERNS = [
  "scf_control_#",
  "scf_#",
  "control_#",
  "scf_control_identifier",
  "scf_identifier",
  "control_code",
  "control_id",
];

// Columns that are NOT framework requirement references
const SKIP_COL_PATTERNS = [
  "scf_control",
  "control_name",
  "control_title",
  "scf_control_name",
  "scf_control_description",
  "control_description",
  "scf_domain",
  "domain",
  "scf_control_question",
  "control_question",
  "scf_control_weighting",
  "control_weight",
  "weight",
  "compensating",
  "guidance",
  "description",
  "authoritative_source",
  "reference",
  "nist_csf",
  "cobit",
  "iso_31000",
  "maturity",
  "threat",
  "risk",
];

function isSkipColumn(header: string): boolean {
  const h = norm(header);
  return (
    SCF_COL_PATTERNS.some((p) => h === p || h.includes(p)) ||
    SKIP_COL_PATTERNS.some((p) => h.includes(p)) ||
    h.length === 0
  );
}

// Looks like an official requirement code (short, not a question)
function looksLikeFdeCode(value: string): boolean {
  if (!value || value.length === 0) return false;
  if (value.length > 80) return false; // too long = probably a question
  if (value.toLowerCase().startsWith("does ")) return false;
  if (value.toLowerCase().startsWith("is the ")) return false;
  return true;
}

// Detect domain code pattern like "GOV-001", "IAC-05"
const SCF_DOMAIN_RE = /^[A-Z]{2,4}-\d+/;

type FdeEntry = {
  scfCode: string; // e.g. "GOV-001"
  fdeCode: string; // e.g. "A.5.1"
  frameworkHint: string; // sheet name
};

async function main() {
  console.log(`\nðŸ” Reading SCF XLSX: ${XLSX_PATH}`);
  if (!fs.existsSync(XLSX_PATH)) {
    console.error("âŒ SCF XLSX not found at", XLSX_PATH);
    process.exit(1);
  }

  const buffer = fs.readFileSync(XLSX_PATH);
  const wb = XLSX.read(buffer, { type: "buffer" });
  console.log(`ðŸ“‹ Total sheets: ${wb.SheetNames.length}`);

  const allEntries: FdeEntry[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
      defval: "",
      raw: false,
    });

    if (rows.length < 2) continue;

    const firstRow = rows[0]!;
    const headers = Object.keys(firstRow);
    const normalizedHeaders = headers.map(norm);

    // Find SCF control code column
    const scfColIdx = normalizedHeaders.findIndex((h) =>
      SCF_COL_PATTERNS.some((p) => h === p || h.includes(p)),
    );
    if (scfColIdx === -1) continue;
    const scfColRaw = headers[scfColIdx]!;

    // Validate this tab has actual SCF codes
    const hasSCFCodes = rows
      .slice(0, 10)
      .some((r) => SCF_DOMAIN_RE.test(String(r[scfColRaw] ?? "").trim()));
    if (!hasSCFCodes) continue;

    // Find FDE reference columns (non-SCF, non-skip, has data)
    const fdeColumns = headers.filter((h) => {
      if (isSkipColumn(h)) return false;
      // Check if this column has FDE-like values
      const sample = rows
        .slice(0, 20)
        .map((r) => String(r[h] ?? "").trim())
        .filter(Boolean);
      return sample.length > 0 && sample.some((v) => looksLikeFdeCode(v));
    });

    if (fdeColumns.length === 0) continue;

    // Use first FDE column as primary
    const primaryFdeCol = fdeColumns[0]!;
    let entries = 0;

    for (const row of rows) {
      const scfCode = String(row[scfColRaw] ?? "").trim();
      if (!SCF_DOMAIN_RE.test(scfCode)) continue;

      const fdeRaw = String(row[primaryFdeCol] ?? "").trim();
      if (!fdeRaw || !looksLikeFdeCode(fdeRaw)) continue;

      // Handle multiple codes in a cell (semicolon/newline separated)
      const fdeCodes = fdeRaw
        .split(/[;\n\r]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const fdeCode of fdeCodes) {
        if (!looksLikeFdeCode(fdeCode)) continue;
        allEntries.push({ scfCode, fdeCode, frameworkHint: sheetName });
        entries++;
      }
    }

    if (entries > 0) {
      console.log(
        `  âœ“ ${sheetName.padEnd(50)} | FDE col: "${primaryFdeCol.slice(0, 30)}" | ${entries} entries`,
      );
    }
  }

  console.log(`\nðŸ“Š Total FDE entries extracted: ${allEntries.length}`);

  if (DRY_RUN) {
    console.log("\nðŸ” DRY RUN â€” showing first 20 entries:");
    for (const e of allEntries.slice(0, 20)) {
      console.log(
        `  ${e.scfCode.padEnd(15)} â†’ "${e.fdeCode}" (${e.frameworkHint})`,
      );
    }
    console.log("\nâœ… Dry run complete. Run without --dry-run to apply.");
    process.exit(0);
  }

  // Apply to database
  const client = postgres(process.env.DATABASE_URL!, {
    ssl: "require",
    max: 3,
  });

  console.log("\nðŸ’¾ Applying fde_code updates to DB...");

  let updated = 0;
  const skipped = 0;
  let notFound = 0;

  // Build batches by scfCode
  const byScfCode = new Map<string, string[]>();
  for (const e of allEntries) {
    const key = e.scfCode.toUpperCase();
    byScfCode.set(key, [...(byScfCode.get(key) ?? []), e.fdeCode]);
  }

  // For each (scfCode, fdeCode) pair, find matching requirements via scf_mappings join
  // and update fde_code where it's null
  for (const entry of allEntries) {
    const result = await client`
      UPDATE scf_framework_requirements req
      SET fde_code = ${entry.fdeCode}
      FROM scf_mappings m
      WHERE m.scf_framework_requirement_id = req.id
        AND m.scf_control_id = (
          SELECT id FROM scf_controls WHERE control_code ILIKE ${entry.scfCode} LIMIT 1
        )
        AND req.fde_code IS NULL
        AND (
          req.requirement_code ILIKE ${entry.fdeCode}
          OR req.title ILIKE ${entry.fdeCode}
          OR req.requirement_code ILIKE ${"%" + entry.fdeCode + "%"}
        )
      RETURNING req.id
    `;

    if (result.length > 0) {
      updated += result.length;
    } else {
      // Try broader match: any requirement for this framework whose requirement_code
      // or title contains or is similar to the FDE code
      notFound++;
    }
  }

  console.log(`\nâœ… Results:`);
  console.log(`   Updated:  ${updated}`);
  console.log(`   Skipped:  ${skipped}`);
  console.log(`   Not found: ${notFound}`);

  // Summary: how many requirements now have fde_code
  const coverage = await client`
    SELECT
      COUNT(*) FILTER (WHERE fde_code IS NOT NULL) AS with_fde,
      COUNT(*) AS total
    FROM scf_framework_requirements
  `;
  const { with_fde, total } = coverage[0] as any;
  console.log(
    `\nðŸ“ˆ FDE coverage: ${with_fde}/${total} (${((Number(with_fde) / Number(total)) * 100).toFixed(1)}%)`,
  );

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

