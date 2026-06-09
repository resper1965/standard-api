/**
 * XLSX Tab Parser Helpers
 *
 * Detects tab types in the official SCF XLSX workbook and normalizes
 * row data for consumption by the XLSX importer.
 *
 * The SCF XLSX structure convention:
 * - Tab 1 (usually "SCF" / "Controls"): The main control catalog
 * - All other tabs: Crosswalk mappings to specific frameworks/laws
 */

import * as XLSX from "xlsx";

// ──── Types ────

export type ParsedRow = Record<string, string>;

export type TabClassification =
  | { type: "controls"; sheetName: string }
  | { type: "crosswalk"; sheetName: string; frameworkHint: string }
  | { type: "metadata"; sheetName: string }
  | { type: "authoritative_sources"; sheetName: string }
  | { type: "assessment_objectives"; sheetName: string }
  | { type: "evidence_requests"; sheetName: string }
  | { type: "risk_catalog"; sheetName: string }
  | { type: "threat_catalog"; sheetName: string }
  | { type: "dpmp"; sheetName: string }
  | { type: "cdpas"; sheetName: string }
  | { type: "unknown"; sheetName: string };

// ──── Header Normalization ────

/**
 * Normalize column headers to lowercase, trimmed, underscored keys.
 * e.g. "SCF Control #" → "scf_control_#"
 */
export const normalizeHeader = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_#&-]/g, "");

/**
 * Parse a sheet into rows with normalized headers.
 */
export const parseSheetToRows = (sheet: XLSX.WorkSheet): ParsedRow[] => {
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  return rawRows.map((raw) => {
    const normalized: ParsedRow = {};
    for (const [key, value] of Object.entries(raw)) {
      const nKey = normalizeHeader(key);
      normalized[nKey] = String(value ?? "").trim();
    }
    return normalized;
  });
};

// ──── Tab Classification ────

/** Known column patterns for control catalog tabs */
const CONTROLS_TAB_INDICATORS = [
  "scf_control_#",
  "scf_#",
  "control_#",
  "scf_control_identifier",
  "scf_identifier",
  "control_code",
  "control_id",
];

/** Known sheet name patterns for control catalog */
const CONTROLS_TAB_NAMES = [
  "scf",
  "controls",
  "control catalog",
  "scf controls",
  "secure controls framework",
];

/** Sheet names that are metadata/info tabs, not data */
const METADATA_TAB_NAMES = [
  "readme",
  "info",
  "about",
  "changelog",
  "instructions",
  "version",
  "cover",
  "table of contents",
  "toc",
  "terms",
  "copyright",
  "license",
  "legend",
  // SCF 2026.1 specific non-control tabs
  "scf domains",
  "compensating controls",
  "data privacy",
  "lists",
];

/** Column patterns that indicate a control BODY tab (title, description, domain) */
const CONTROLS_BODY_INDICATORS = [
  "scf_control",
  "control_name",
  "control_title",
  "scf_control_name",
  "scf_control_description",
  "control_description",
  "scf_domain",
  "domain",
  "domain_name",
];

/**
 * Check if a normalized header matches an indicator pattern.
 * Uses word-boundary-aware matching to avoid "scf_control_#" matching "scf_control".
 */
const headerMatchesExact = (header: string, indicator: string): boolean => {
  if (header === indicator) return true;
  // "scf_control_description" should match "scf_control_description" or partial match
  // but "scf_control_#" should NOT match "scf_control"
  // Rule: indicator must match as a complete segment (followed by _ or end)
  if (header.startsWith(indicator)) {
    const next = header[indicator.length];
    // Only match if followed by underscore where indicator is the full word
    // e.g. "scf_control_description" starts with "scf_control" + "_" → true
    // e.g. "scf_control_#" starts with "scf_control" + "_" → that's ambiguous
    // Better: require exact match for body indicators
    return false;
  }
  return false;
};

/**
 * Classify a sheet based on its name and column headers.
 *
 * Controls tab: must have BOTH a control identifier column AND a body column
 * (title, description, or domain). Crosswalk tabs only have SCF Control # + framework refs.
 */
export const classifyTab = (
  sheetName: string,
  headers: string[],
): TabClassification => {
  const nameLower = sheetName.toLowerCase().trim();
  const normalizedHeaders = headers.map(normalizeHeader);

  // Check specific SCF 2026.1 tabs
  if (
    nameLower.startsWith("assessment objectives") ||
    nameLower.startsWith("assessment_objectives")
  ) {
    return { type: "assessment_objectives", sheetName };
  }
  if (
    nameLower.startsWith("evidence request") ||
    nameLower.startsWith("evidence_request")
  ) {
    return { type: "evidence_requests", sheetName };
  }
  if (
    nameLower.startsWith("risk catalog") ||
    nameLower.startsWith("risk_catalog")
  ) {
    return { type: "risk_catalog", sheetName };
  }
  if (
    nameLower.startsWith("threat catalog") ||
    nameLower.startsWith("threat_catalog")
  ) {
    return { type: "threat_catalog", sheetName };
  }

  // Check if it's the authoritative sources tab (SCF 2026.1 structure)
  if (
    nameLower === "authoritative sources" ||
    normalizedHeaders.includes(
      normalizeHeader("Focal Document Identifier (FDI)"),
    )
  ) {
    return { type: "authoritative_sources", sheetName };
  }

  // Check metadata tabs first
  if (
    METADATA_TAB_NAMES.some((m) => nameLower === m || nameLower.startsWith(m))
  ) {
    return { type: "metadata", sheetName };
  }

  // Check for a control identifier column (uses includes for flexibility)
  const hasControlIdColumn = CONTROLS_TAB_INDICATORS.some((indicator) =>
    normalizedHeaders.some((h) => h === indicator || h.includes(indicator)),
  );

  // Check for a control body column — EXACT match only to prevent false positives
  // "scf_control_#" should NOT match "scf_control" body indicator
  const hasControlBodyColumn = CONTROLS_BODY_INDICATORS.some((indicator) =>
    normalizedHeaders.some((h) => h === indicator),
  );

  // A controls tab must have BOTH identifier AND body columns
  if (hasControlIdColumn && hasControlBodyColumn) {
    return { type: "controls", sheetName };
  }

  // Check if this is the controls tab by sheet name (only if it also has control IDs)
  if (
    hasControlIdColumn &&
    CONTROLS_TAB_NAMES.some((n) => nameLower === n || nameLower.includes(n))
  ) {
    return { type: "controls", sheetName };
  }

  // Detect CDPAS tab before generic crosswalk fallback
  if (
    nameLower === "cdpas" ||
    (nameLower.startsWith("cybersecurity") && nameLower.includes("assessment"))
  ) {
    return { type: "cdpas" as const, sheetName };
  }

  // If it has control IDs but no body columns → it's a crosswalk
  if (hasControlIdColumn) {
    return { type: "crosswalk", sheetName, frameworkHint: sheetName.trim() };
  }

  // Check for DPMP (Data Privacy Management Principles) tab
  if (nameLower === "dpmp" || nameLower.startsWith("data privacy management")) {
    return { type: "dpmp" as const, sheetName };
  }

  // Everything else is treated as a crosswalk tab
  return { type: "crosswalk", sheetName, frameworkHint: sheetName.trim() };
};

/**
 * Get raw headers from a sheet by reading the first row.
 */
export const getSheetHeaders = (sheet: XLSX.WorkSheet): string[] => {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  const headers: string[] = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: col })];
    headers.push(cell?.v != null ? String(cell.v).trim() : "");
  }
  return headers;
};

// ──── Control Code Parsing ────

/**
 * Extract domain code from an SCF control code.
 * e.g. "GOV-01" → "GOV", "IAC-05.3" → "IAC"
 */
export const extractDomainCode = (controlCode: string): string | null => {
  // Must match Domain-Number (e.g. GOV-01, GOV-01.1) to avoid confusing spacer rows like "GOV"
  const match = controlCode.match(/^([A-Z]{2,4})-\d+/);
  return match?.[1] ?? null;
};

/**
 * Find the control code column from a row, trying multiple known column names.
 */
export const findControlCode = (row: ParsedRow): string | null => {
  const candidates = [
    "scf_control_#",
    "scf_#",
    "control_#",
    "scf_control_identifier",
    "scf_identifier",
    "control_code",
    "control_id",
    "scf_control_number",
  ];

  for (const key of candidates) {
    if (row[key] && row[key].trim().length > 0) {
      return row[key].trim();
    }
  }
  return null;
};

/**
 * Find the control title from a row.
 */
export const findControlTitle = (row: ParsedRow): string | null => {
  const candidates = [
    "scf_control",
    "control_name",
    "control_title",
    "scf_control_name",
    "control",
    "title",
  ];

  for (const key of candidates) {
    if (row[key] && row[key].trim().length > 0) {
      return row[key].trim();
    }
  }
  return null;
};

/**
 * Find the control description from a row.
 */
export const findControlDescription = (row: ParsedRow): string | null => {
  const candidates = [
    "scf_control_description",
    "control_description",
    "description",
    "secure_controls_framework_(scf)_control_description",
    "secure_controls_framework_scf_control_description",
  ];

  for (const key of candidates) {
    if (row[key] && row[key].trim().length > 0) {
      return row[key].trim();
    }
  }
  // Fallback: search all keys for a key containing "description" that isn't a framework mapping
  for (const [key, value] of Object.entries(row)) {
    if (
      key.includes("control_description") &&
      value &&
      value.trim().length > 20
    ) {
      return value.trim();
    }
  }
  return null;
};

/**
 * Find the control question from a row.
 */
export const findControlQuestion = (row: ParsedRow): string | null => {
  const candidates = ["scf_control_question", "control_question", "question"];

  for (const key of candidates) {
    if (row[key] && row[key].trim().length > 0) {
      return row[key].trim();
    }
  }
  // Fallback: search all keys for a key containing "control_question"
  for (const [key, value] of Object.entries(row)) {
    if (key.includes("control_question") && value && value.trim().length > 5) {
      return value.trim();
    }
  }
  return null;
};

/**
 * Find the SCF domain from a row (explicit column).
 */
export const findDomainName = (row: ParsedRow): string | null => {
  const candidates = ["scf_domain", "domain", "domain_name", "scf_domain_name"];

  for (const key of candidates) {
    if (row[key] && row[key].trim().length > 0) {
      return row[key].trim();
    }
  }
  return null;
};

/**
 * Find control weight from a row.
 */
export const findControlWeight = (row: ParsedRow): number | undefined => {
  const candidates = [
    "scf_control_weighting",
    "control_weight",
    "weight",
    "scf_weighting",
    "relative_control_weighting",
  ];
  for (const key of candidates) {
    if (row[key]) {
      const parsed = Number.parseFloat(row[key]);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  // Fallback: search keys containing "weighting" or "weight"
  for (const [key, value] of Object.entries(row)) {
    if ((key.includes("weighting") || key.includes("weight")) && value) {
      const parsed = Number.parseFloat(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return undefined;
};

// ──── Crosswalk Tab Parsing ────

/**
 * Detect which columns in a crosswalk tab contain framework requirement references.
 * In SCF XLSX, crosswalk tabs usually have the SCF control # in one column,
 * and the mapped framework requirement in other columns.
 */
const findCrosswalkReferenceColumn = (
  headers: string[],
  _sheetName: string,
): string | null => {
  const normalizedHeaders = headers.map(normalizeHeader);

  // Look for columns that are NOT the SCF control identifier
  const scfColumns = new Set(CONTROLS_TAB_INDICATORS);
  const nonScfColumns = normalizedHeaders.filter(
    (h) => !scfColumns.has(h) && h.length > 0,
  );

  // The first non-SCF column with data is typically the reference column
  return nonScfColumns[0] ?? null;
};
