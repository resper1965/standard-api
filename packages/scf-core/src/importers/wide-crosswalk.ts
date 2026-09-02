/**
 * Wide Crosswalk Parser
 *
 * Edition 2026.1.1 of the SCF catalogue holds its 250-framework crosswalk
 * as columns inside the `SCF 2026.1` sheet rather than as separate tabs.
 * This module turns those columns — located via `authoritative-sources.ts`
 * descriptors — into frameworks, requirements, and mappings.
 *
 * ADR-001: the crosswalk states no STRM operator. Every mapping produced
 * here gets `relationship_type: null`. Do not add a default, a fallback,
 * or a "conservative" guess anywhere in this module — that is precisely
 * the defect this codebase removed.
 *
 * A source whose `columnHeader` matches no column in the header row
 * produces a warning and no framework. This is an exact match after
 * whitespace normalisation only — never a partial, prefix, or fuzzy
 * match, since that would silently attach one framework's requirements
 * to another framework's column.
 *
 * @module wide-crosswalk
 */
import type { ScfFramework, ScfFrameworkRequirement, ScfMapping } from "../types";
import { type AuthoritativeSource, normalizeHeaderText } from "./authoritative-sources";

const newId = (): string => crypto.randomUUID();

export type ParseWideCrosswalkArgs = {
  headerRow: string[];
  dataRows: string[][];
  sources: AuthoritativeSource[];
  versionId: string;
  controlByCode: Map<string, string>;
  /** Index into each row of `dataRows` (and `headerRow`) holding the SCF control code. */
  controlCodeColumn: number;
};

export type ParseWideCrosswalkResult = {
  frameworks: ScfFramework[];
  requirements: ScfFrameworkRequirement[];
  mappings: ScfMapping[];
  warnings: string[];
};

/** The value the codebase already uses for official catalogue data (see packages/schemas/src/seed.ts). */
const MAPPING_SOURCE_OFFICIAL = "official_scf";

export const parseWideCrosswalk = (
  args: ParseWideCrosswalkArgs,
): ParseWideCrosswalkResult => {
  const {
    headerRow,
    dataRows,
    sources,
    versionId,
    controlByCode,
    controlCodeColumn,
  } = args;

  const warnings: string[] = [];
  const frameworks: ScfFramework[] = [];
  const requirements: ScfFrameworkRequirement[] = [];
  const mappings: ScfMapping[] = [];

  const normalizedHeader = headerRow.map((h) => normalizeHeaderText(h ?? ""));

  // Build the map once, outside the row loop — a naive nested scan over
  // 1468 x 250 with per-cell lookups is fine, but re-deriving the column
  // index per row is not.
  type MatchedSource = {
    colIndex: number;
    frameworkId: string;
  };
  const matchedSources: MatchedSource[] = [];

  for (const source of sources) {
    const idx = normalizedHeader.indexOf(normalizeHeaderText(source.columnHeader));
    if (idx === -1) {
      warnings.push(
        `Wide crosswalk: column header "${source.columnHeader}" (FDI ${source.fdi}) matches no column in the crosswalk sheet — skipped, not partially matched.`,
      );
      continue;
    }

    const frameworkId = newId();
    frameworks.push({
      id: frameworkId,
      framework_code: source.fdi,
      framework_name: source.name || source.fdi,
      status: "active",
      is_synthetic: false,
      ...(source.geography ? { jurisdiction: source.geography } : {}),
      ...(source.source ? { publisher: source.source } : {}),
      ...(source.sourceUrl ? { source_reference: source.sourceUrl } : {}),
    });
    matchedSources.push({ colIndex: idx, frameworkId });
  }

  // Requirements are deduped per framework + code, so the same code cited
  // by two different controls becomes one requirement and two mappings.
  const requirementIdByKey = new Map<string, string>();
  const sortOrderByFramework = new Map<string, number>();

  dataRows.forEach((row, rowIdx) => {
    const controlCode = (row[controlCodeColumn] ?? "").trim();
    if (!controlCode) return;

    const controlId = controlByCode.get(controlCode);
    if (!controlId) {
      // Row number: header is row 1, dataRows[0] is row 2.
      warnings.push(
        `Wide crosswalk: row ${rowIdx + 2} references control code "${controlCode}" not found in the catalogue — skipped.`,
      );
      return;
    }

    for (const { colIndex, frameworkId } of matchedSources) {
      const cellRaw = row[colIndex];
      if (cellRaw == null) continue;

      const codes = String(cellRaw)
        .split(/[\n;]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      for (const code of codes) {
        const key = `${frameworkId}::${code}`;
        let requirementId = requirementIdByKey.get(key);
        if (!requirementId) {
          requirementId = newId();
          requirementIdByKey.set(key, requirementId);
          const nextSortOrder = (sortOrderByFramework.get(frameworkId) ?? 0) + 1;
          sortOrderByFramework.set(frameworkId, nextSortOrder);
          requirements.push({
            id: requirementId,
            scf_framework_id: frameworkId,
            requirement_code: code,
            // fde_code is what the STRM backfill joins on.
            fde_code: code,
            requirement_title: code,
            sort_order: nextSortOrder,
            status: "active",
            is_synthetic: false,
            is_mcr: false,
          });
        }

        mappings.push({
          id: newId(),
          scf_version_id: versionId,
          scf_framework_id: frameworkId,
          scf_framework_requirement_id: requirementId,
          scf_control_id: controlId,
          // ADR-001: the crosswalk states no STRM operator. Never default
          // or infer one here.
          relationship_type: null,
          mapping_source: MAPPING_SOURCE_OFFICIAL,
          is_official: true,
          status: "active",
          is_synthetic: false,
        });
      }
    }
  });

  return { frameworks, requirements, mappings, warnings };
};
