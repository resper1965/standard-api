/**
 * Authoritative Sources Parser
 *
 * Edition 2026.1.1 of the SCF catalogue has no crosswalk tabs. Instead, the
 * `Authoritative Sources` sheet is an index: 250 rows, one per framework,
 * naming which column of the `SCF 2026.1` sheet holds that framework's
 * mappings. This module parses that index into descriptors that
 * `wide-crosswalk.ts` uses to find and read those columns.
 *
 * Columns locate by normalised header text, not by fixed position, so a
 * column insertion upstream does not silently shift the data. A missing
 * required header is a warning plus an empty result — never a guess at
 * position.
 *
 * @module authoritative-sources
 */

export type AuthoritativeSource = {
  /** Focal Document Identifier — becomes scf_frameworks.framework_code. */
  fdi: string;
  /** Joins to a column header in the `SCF 2026.1` sheet. */
  columnHeader: string;
  /** Focal Document Name — becomes scf_frameworks.framework_name. */
  name: string;
  geography: string;
  source: string;
  sourceUrl: string;
};

export type ParseAuthoritativeSourcesResult = {
  sources: AuthoritativeSource[];
  warnings: string[];
};

/**
 * Collapse whitespace runs (including literal newlines) and lowercase, so
 * a header split across lines in the workbook still matches the same
 * header written on one line elsewhere.
 */
export const normalizeHeaderText = (s: string): string =>
  s.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Required columns of the `Authoritative Sources` sheet, by normalised
 * header text. "Focal Document Title (FDT)" and the STRM URL column are
 * deliberately excluded — the plan marks both ignored.
 */
const REQUIRED_HEADERS = [
  "geography",
  "scf column header",
  "focal document identifier (fdi)",
  "source",
  "focal document name (fdn)",
  "focal document source (fds)",
] as const;

export const parseAuthoritativeSources = (
  rows: string[][],
): ParseAuthoritativeSourcesResult => {
  const warnings: string[] = [];
  const [headerRow, ...dataRows] = rows;

  if (!headerRow) {
    warnings.push("Authoritative Sources: no header row found.");
    return { sources: [], warnings };
  }

  const normalizedHeader = headerRow.map((h) => normalizeHeaderText(h ?? ""));
  const colIndex = new Map<string, number>();
  for (const required of REQUIRED_HEADERS) {
    const idx = normalizedHeader.indexOf(required);
    if (idx === -1) {
      warnings.push(
        `Authoritative Sources: missing required column "${required}".`,
      );
    } else {
      colIndex.set(required, idx);
    }
  }

  // A missing required header is a warning plus an empty result, never a
  // guess at position.
  if (colIndex.size !== REQUIRED_HEADERS.length) {
    return { sources: [], warnings };
  }

  const geographyIdx = colIndex.get("geography")!;
  const columnHeaderIdx = colIndex.get("scf column header")!;
  const fdiIdx = colIndex.get("focal document identifier (fdi)")!;
  const sourceIdx = colIndex.get("source")!;
  const nameIdx = colIndex.get("focal document name (fdn)")!;
  const sourceUrlIdx = colIndex.get("focal document source (fds)")!;

  const sources: AuthoritativeSource[] = [];
  dataRows.forEach((row, i) => {
    const fdi = (row[fdiIdx] ?? "").trim();
    if (!fdi) {
      // Row number: header is row 1, dataRows[0] is row 2.
      warnings.push(
        `Authoritative Sources: row ${i + 2} has a blank Focal Document Identifier (FDI), skipped.`,
      );
      return;
    }
    sources.push({
      fdi,
      columnHeader: (row[columnHeaderIdx] ?? "").trim(),
      name: (row[nameIdx] ?? "").trim(),
      geography: (row[geographyIdx] ?? "").trim(),
      source: (row[sourceIdx] ?? "").trim(),
      sourceUrl: (row[sourceUrlIdx] ?? "").trim(),
    });
  });

  return { sources, warnings };
};
