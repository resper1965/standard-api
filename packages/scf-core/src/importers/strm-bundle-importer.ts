// @ts-nocheck -- Zod v4 CI type compat
/**
 * SCF STRM Bundle Importer
 *
 * Parseia os 183 XLSXs do STRM Bundle oficial da SCF (comprado em securecontrolsframework.com).
 * Cada arquivo = 1 framework, com todos os mapeamentos STRM (NIST IR 8477).
 *
 * Formato das planilhas (consistente em todos os 183 arquivos):
 *   Row 1-3: metadados (focal document, URLs)
 *   Row 4:   headers fijos
 *   Row 5+:  dados STRM
 *
 * Colunas relevantes (row 4):
 *   Col 0: "FDE #"                    â†’ requirement code no framework focal
 *   Col 1: "FDE Name"                 â†’ nome do requisito
 *   Col 2: "FDE Description"          â†’ descriÃ§Ã£o (pode ser omitida por licenÃ§a)
 *   Col 3: "STRM Rationale"           â†’ "Functional" | "Structural" | etc.
 *   Col 4: "STRM Relationship"        â†’ "Equal" | "Subset" | "Superset" | "Intersects With" | "No Relationship"
 *   Col 5: "SCF Control"              â†’ nome do controle SCF
 *   Col 6: "SCF #"                    â†’ cÃ³digo do controle SCF (chave para join)
 *   Col 7: "SCF Control Description"  â†’ descriÃ§Ã£o (ignorada)
 *   Col 8: "Strength of Relationship" â†’ 0â€“10 numÃ©rico
 *   Col 9: "Notes"                    â†’ notas opcionais
 *
 * Source gravado: "scf_official_strm_bundle_2026.1"
 * Estes registros sobrescrevem os inferidos via ON CONFLICT DO UPDATE (uniqueIndex por mapping).
 *
 * @module strm-bundle-importer
 */

/// <reference types="node" />
import * as XLSX from "xlsx";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../",
);

// â”€â”€â”€â”€ Types â”€â”€â”€â”€

// ADR-001: Only canonical STRM operators (NIST IR 8477)
// â›” NEVER add "direct", "related", "intersecting", "no_relationship", "source_defined"
export type StrmRelationshipType =
  | "equal"
  | "subset"
  | "intersects"
  | "superset"
  | "no_relation";

export type StrmRelationshipStrength = "strong" | "moderate" | "weak";

export interface StrmBundleEntry {
  /** CÃ³digo do requisito no framework focal (ex: "AC-02(11)", "1.1.1") */
  fde_code: string;
  /** Nome do requisito */
  fde_name: string;
  /** Tipo de rationale STRM: "Functional" | "Structural" */
  strm_rationale: string;
  /** Tipo de relaÃ§Ã£o STRM normalizado */
  relationship_type: StrmRelationshipType;
  /** CÃ³digo do controle SCF (ex: "IAC-15.8", "GOV-02") */
  scf_code: string;
  /** Nome do controle SCF */
  scf_control_name: string;
  /** Strength 0-10 do SCF */
  strength_raw: number;
  /** Strength normalizado para o schema */
  relationship_strength: StrmRelationshipStrength;
  /** Notas adicionais */
  notes: string;
}

export interface StrmBundleFileResult {
  /** Nome do arquivo XLSX */
  filename: string;
  /** Nome do framework (sheet name) */
  framework_name: string;
  /** URL do focal document */
  focal_document_url: string;
  /** URL do published STRM PDF */
  published_strm_url: string;
  /** Entries parseadas */
  entries: StrmBundleEntry[];
  /** Warnings durante parse */
  warnings: string[];
  /** Linhas skipped (ex: N/A, No Relationship) */
  skipped: number;
}

export interface StrmBundleImportSummary {
  total_files: number;
  total_entries: number;
  total_skipped: number;
  total_warnings: number;
  files: StrmBundleFileResult[];
}

// â”€â”€â”€â”€ Helpers â”€â”€â”€â”€

/**
 * Normaliza o campo "STRM Relationship" do XLSX para operadores canÃ³nicos (ADR-001).
 *
 * Valores reais nos 183 arquivos do bundle (raw scan):
 *   "Intersects With"    39,373  â†’ intersects
 *   "Subset Of"           8,856  â†’ subset
 *   "Equal"               4,850  â†’ equal
 *   "Functional"            567  â†’ null (leaked header row, skip)
 *   "Instersects With"      295  â†’ intersects (typo no bundle)
 *   "STRM\nRelationship"    179  â†’ null (leaked header row, skip)
 *   "intersects"            120  â†’ intersects
 *   "Subset of"             116  â†’ subset
 *   "Superset Of"            42  â†’ superset
 *   "superset of"             1  â†’ superset
 *
 * â›” NEVER return "intersecting", "no_relationship", "related", or "source_defined".
 *    See docs/decisions/ADR-001-strm-weights-algorithm.md
 */
function normalizeRelationshipType(raw: string): StrmRelationshipType | null {
  const v = raw.trim().toLowerCase();
  if (v === "") return null;
  if (v === "equal" || v === "direct") return "equal";
  if (v === "subset" || v === "subset of") return "subset";
  if (v === "superset" || v === "superset of") return "superset";
  if (v.startsWith("intersect") || v === "related" || v === "source_defined")
    return "intersects";
  if (v === "no relationship" || v === "no_relationship" || v === "no relation")
    return "no_relation";
  // Leaked header rows â€” not data, skip
  if (v === "functional" || v.startsWith("strm")) return null;
  // Unknown â€” conservative fallback to intersects (partial overlap)
  return "intersects";
}

/**
 * Converte strength 0â€“10 para enum strong/moderate/weak.
 *   8â€“10 â†’ strong
 *   4â€“7  â†’ moderate
 *   0â€“3  â†’ weak
 */
function normalizeStrength(raw: number | string): StrmRelationshipStrength {
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  if (isNaN(n)) return "weak";
  if (n >= 8) return "strong";
  if (n >= 4) return "moderate";
  return "weak";
}

// â”€â”€â”€â”€ Core Parser â”€â”€â”€â”€

/**
 * Parseia um Ãºnico arquivo XLSX do STRM bundle.
 * Pula rows com SCF # = "N/A" ou vazio.
 * Pula rows com relationship_type = "no_relation" (sem controle SCF aplicÃ¡vel).
 */
export function parseStrmBundleFile(
  filePath: string,
  filename: string,
  options: { includeNoRelationship?: boolean } = {},
): StrmBundleFileResult {
  const resolvedPath = path.resolve(filePath);
  const relativePath = path.relative(projectRoot, resolvedPath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }

  const warnings: string[] = [];
  let skipped = 0;

  // Read via buffer (avoid SheetJS Unicode path bug on Windows)
  const buf = fs.readFileSync(resolvedPath);
  const wb = XLSX.read(buf, { cellDates: true });

  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return {
      filename,
      framework_name: filename,
      focal_document_url: "",
      published_strm_url: "",
      entries: [],
      warnings: ["No sheets found in workbook"],
      skipped: 0,
    };
  }

  const ws = wb.Sheets[sheetName];
  if (!ws) {
    return {
      filename,
      framework_name: sheetName,
      focal_document_url: "",
      published_strm_url: "",
      entries: [],
      warnings: ["Sheet not accessible"],
      skipped: 0,
    };
  }

  // Parse all rows as arrays (raw)
  const allRows = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
    blankrows: false,
  }) as (string | number)[][];

  // Rows 0-2: metadata
  // Row 0: ["NIST IR 8477...", "", ..., "Focal Document: ", "<framework name>"]
  // Row 1: ["Reference document:", "SCF 2026.1", ..., "Focal Document URL: ", "<url>"]
  // Row 2: ["STRM Guidance: ", "<url>", ..., "Published STRM URL:", "<url>"]

  const focalDocumentUrl = String(allRows[1]?.[6] ?? "");
  const publishedStrmUrl = String(allRows[2]?.[6] ?? "");

  // Row 3: headers â€” skip
  // Row 4+: data
  const dataRows = allRows.slice(4); // skip rows 0-3 (meta + headers)

  const entries: StrmBundleEntry[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.length === 0) continue;

    const fde_code = String(row[0] ?? "").trim();
    const fde_name = String(row[1] ?? "").trim();
    const strm_rationale = String(row[3] ?? "").trim();
    const strm_relationship_raw = String(row[4] ?? "").trim();
    const scf_control_name = String(row[5] ?? "").trim();
    const scf_code = String(row[6] ?? "").trim();
    const strength_raw_str = row[8];
    const notes = String(row[9] ?? "").trim();

    // Skip empty rows
    if (!fde_code && !scf_code) continue;

    // Skip N/A SCF entries
    if (
      scf_code === "N/A" ||
      scf_code === "" ||
      scf_code.toLowerCase() === "n/a"
    ) {
      skipped++;
      continue;
    }

    const relationship_type = normalizeRelationshipType(strm_relationship_raw);

    // Skip leaked header rows (normalizer returns null)
    if (relationship_type === null) {
      skipped++;
      continue;
    }

    // Skip no_relation unless explicitly included
    if (relationship_type === "no_relation" && !options.includeNoRelationship) {
      skipped++;
      continue;
    }

    const strength_raw =
      typeof strength_raw_str === "number"
        ? strength_raw_str
        : parseFloat(String(strength_raw_str ?? "0")) || 0;

    const relationship_strength = normalizeStrength(strength_raw);

    if (!fde_code) {
      warnings.push(`Row ${i + 5}: missing FDE code (SCF: ${scf_code})`);
      continue;
    }

    entries.push({
      fde_code,
      fde_name,
      strm_rationale,
      relationship_type, // guaranteed non-null here
      scf_code,
      scf_control_name,
      strength_raw,
      relationship_strength,
      notes,
    });
  }

  return {
    filename,
    framework_name: sheetName,
    focal_document_url: focalDocumentUrl,
    published_strm_url: publishedStrmUrl,
    entries,
    warnings,
    skipped,
  };
}

/**
 * Parseia todos os arquivos XLSX de um diretÃ³rio STRM bundle.
 * Retorna sumÃ¡rio completo com todas as entries.
 */
export function parseStrmBundleDirectory(
  dirPath: string,
  options: {
    includeNoRelationship?: boolean;
    fileFilter?: (filename: string) => boolean;
  } = {},
): StrmBundleImportSummary {
  const resolvedDir = path.resolve(dirPath);
  const relativeDir = path.relative(projectRoot, resolvedDir);
  if (relativeDir.startsWith("..") || path.isAbsolute(relativeDir)) {
    throw new Error(`Path traversal detected: ${dirPath}`);
  }

  const files = fs
    .readdirSync(resolvedDir)
    .filter((f: string) => f.endsWith(".xlsx"))
    .filter(options.fileFilter ?? (() => true))
    .sort();

  const results: StrmBundleFileResult[] = [];

  for (const filename of files) {
    const filePath = path.join(dirPath, filename);
    const result = parseStrmBundleFile(
      filePath,
      filename,
      options.includeNoRelationship !== undefined
        ? { includeNoRelationship: options.includeNoRelationship }
        : {},
    );
    results.push(result);
  }

  return {
    total_files: results.length,
    total_entries: results.reduce((sum, r) => sum + r.entries.length, 0),
    total_skipped: results.reduce((sum, r) => sum + r.skipped, 0),
    total_warnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
    files: results,
  };
}

