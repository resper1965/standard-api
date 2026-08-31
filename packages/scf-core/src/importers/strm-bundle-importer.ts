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
import ExcelJS from "exceljs";
import * as path from "node:path";
import * as fs from "node:fs";
import { Readable } from "node:stream";
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
  /** Operador STRM normalizado; null = a origem nao declara um que saibamos ler */
  relationship_type: StrmRelationshipType | null;
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
  /** Nome do focal document (row 0 col 6); falls back to sheet name, then filename */
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
  /** Rows kept with no operator because the source cell was unreadable */
  unknown_operator: number;
}

export interface StrmBundleImportSummary {
  total_files: number;
  total_entries: number;
  total_skipped: number;
  /** Rows kept with no operator because the source cell was unreadable */
  total_unknown_operator: number;
  total_warnings: number;
  files: StrmBundleFileResult[];
}

// â”€â”€â”€â”€ Helpers â”€â”€â”€â”€

/**
 * Reads the XLSX "STRM Relationship" cell.
 *
 * Three outcomes, deliberately distinguished:
 *   operator - the cell states one of the five canonical STRM operators
 *   skip     - a leaked header row; not data, drop the row entirely
 *   unknown  - a real row whose operator we cannot read; keep the row, and
 *              record no operator for it
 *
 * Valores reais nos 183 arquivos do bundle (raw scan):
 *   "Intersects With"    39,373  -> intersects
 *   "Subset Of"           8,856  -> subset
 *   "Equal"               4,850  -> equal
 *   "Functional"            567  -> skip (leaked header row)
 *   "Instersects With"      295  -> intersects (typo no bundle)
 *   "STRM\nRelationship"    179  -> skip (leaked header row)
 *   "intersects"            120  -> intersects
 *   "Subset of"             116  -> subset
 *   "Superset Of"            42  -> superset
 *   "superset of"             1  -> superset
 *
 * `unknown` used to return "intersects" under a comment calling it a
 * conservative fallback. It is not conservative: `intersects` asserts that two
 * scopes overlap, which is a claim the unreadable cell does not support. That
 * fallback is upstream of every other guard in this codebase, so it silently
 * defeated them.
 *
 * Deliberately absent from the mapping below: "direct", "related",
 * "source_defined" and "no_relationship". None appears in the recorded scan
 * of the 183 files, and the header above already forbade emitting the middle
 * two. They now read as unknown.
 * â›” See docs/decisions/ADR-001-strm-weights-algorithm.md
 */
export type StrmOperatorCell =
  | { kind: "operator"; value: StrmRelationshipType }
  | { kind: "skip" }
  | { kind: "unknown"; raw: string };

export function parseStrmOperatorCell(raw: string): StrmOperatorCell {
  const v = raw.trim().toLowerCase();

  if (v === "") return { kind: "skip" };
  // Leaked header rows â€” the sheet's own headings, not data.
  if (v === "functional" || v.startsWith("strm")) return { kind: "skip" };

  if (v === "equal") return { kind: "operator", value: "equal" };
  if (v === "subset" || v === "subset of")
    return { kind: "operator", value: "subset" };
  if (v === "superset" || v === "superset of")
    return { kind: "operator", value: "superset" };
  if (v === "no relationship" || v === "no relation")
    return { kind: "operator", value: "no_relation" };
  // "instersect" is a misspelling present on 295 rows of the bundle.
  if (v.startsWith("intersect") || v.startsWith("instersect"))
    return { kind: "operator", value: "intersects" };

  return { kind: "unknown", raw };
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
export async function parseStrmBundleFile(
  filePath: string,
  filename: string,
  options: { includeNoRelationship?: boolean } = {},
): Promise<StrmBundleFileResult> {
  const resolvedPath = path.resolve(filePath);
  const relativePath = path.relative(projectRoot, resolvedPath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }

  const warnings: string[] = [];
  let skipped = 0;
  let unknownOperator = 0;

  // Read via the streaming reader, fed from a Buffer (avoid ExcelJS Unicode
  // path bug on Windows). `Workbook().xlsx.load()` throws
  // "Cannot read properties of undefined (reading 'comments')" on 175/183
  // real bundle files; the streaming reader parses all of them.
  const buf = fs.readFileSync(resolvedPath);
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(Readable.from(buf), {
    worksheets: "emit",
    sharedStrings: "cache",
    styles: "ignore",
    hyperlinks: "ignore",
  });

  // Collect all rows as arrays of cell values (matching SheetJS header:1 format)
  let sheetName: string | undefined;
  const allRows: (string | number)[][] = [];
  let sheetIndex = 0;
  for await (const worksheet of reader) {
    const isFirstSheet = sheetIndex === 0;
    sheetIndex++;
    for await (const row of worksheet) {
      if (!isFirstSheet) continue; // only the first worksheet is used, exactly as today
      const values = row.values as (string | number | undefined)[];
      // ExcelJS row.values is 1-indexed (index 0 is undefined), so slice from 1
      const cells = values.slice(1).map((v) => v ?? "");
      // The streaming reader (unlike `eachRow({ includeEmpty: false })`)
      // yields blank rows too; drop them so every fixed offset below holds.
      if (cells.every((v) => String(v).trim() === "")) continue;
      allRows.push(cells);
    }
    // `.name` is set at runtime (workbook-reader.js) but missing from
    // ExcelJS's WorksheetReader type declarations.
    if (isFirstSheet)
      sheetName = (worksheet as unknown as { name?: string }).name;
  }

  if (!sheetName) {
    return {
      filename,
      framework_name: filename,
      focal_document_url: "",
      published_strm_url: "",
      entries: [],
      warnings: ["No sheets found in workbook"],
      skipped: 0,
      unknown_operator: 0,
    };
  }

  // Rows 0-2: metadata
  // Row 0: ["NIST IR 8477...", "", ..., "Focal Document: ", "<framework name>"]
  // Row 1: ["Reference document:", "SCF 2026.1", ..., "Focal Document URL: ", "<url>"]
  // Row 2: ["STRM Guidance: ", "<url>", ..., "Published STRM URL:", "<url>"]
  //
  // Row 0 col 6 holds the actual focal document name (the sheet itself is
  // named "Sheet1" in almost every one of the 183 files); fall back to the
  // sheet name, then the filename, if it is blank.

  const frameworkNameFromCell = String(allRows[0]?.[6] ?? "").trim();
  const frameworkName = frameworkNameFromCell || sheetName || filename;
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

    const cell = parseStrmOperatorCell(strm_relationship_raw);

    if (cell.kind === "skip") {
      skipped++;
      continue;
    }

    const relationship_type = cell.kind === "operator" ? cell.value : null;

    if (cell.kind === "unknown") {
      unknownOperator++;
      warnings.push(
        `Row ${i + 5}: unreadable STRM operator "${cell.raw}" (SCF: ${scf_code}) - kept with no operator`,
      );
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
      relationship_type, // null when the source operator was unreadable
      scf_code,
      scf_control_name,
      strength_raw,
      relationship_strength,
      notes,
    });
  }

  return {
    filename,
    framework_name: frameworkName,
    focal_document_url: focalDocumentUrl,
    published_strm_url: publishedStrmUrl,
    entries,
    warnings,
    skipped,
    unknown_operator: unknownOperator,
  };
}

/**
 * Parseia todos os arquivos XLSX de um diretÃ³rio STRM bundle.
 * Retorna sumÃ¡rio completo com todas as entries.
 */
export async function parseStrmBundleDirectory(
  dirPath: string,
  options: {
    includeNoRelationship?: boolean;
    fileFilter?: (filename: string) => boolean;
  } = {},
): Promise<StrmBundleImportSummary> {
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
    try {
      const result = await parseStrmBundleFile(
        filePath,
        filename,
        options.includeNoRelationship !== undefined
          ? { includeNoRelationship: options.includeNoRelationship }
          : {},
      );
      results.push(result);
    } catch (error) {
      // One bad file must not abort the other 182 — but it must stay
      // visible, since a silently skipped framework is indistinguishable
      // from one the bundle does not cover.
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        filename,
        framework_name: filename,
        focal_document_url: "",
        published_strm_url: "",
        entries: [],
        warnings: [`Failed to parse ${filename}: ${message}`],
        skipped: 0,
        unknown_operator: 0,
      });
    }
  }

  return {
    total_files: results.length,
    total_entries: results.reduce((sum, r) => sum + r.entries.length, 0),
    total_skipped: results.reduce((sum, r) => sum + r.skipped, 0),
    total_unknown_operator: results.reduce(
      (sum, r) => sum + r.unknown_operator,
      0,
    ),
    total_warnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
    files: results,
  };
}
