/**
 * @module strm-compliance-query
 * @description ConstrÃ³i StrmControlInput[] a partir de dados reais de scf_mappings.
 *
 * Substitui strmProxyFromSoaItems() que usava operator="intersects" e
 * strength_score=0.5 hardcoded para todos os controlos.
 *
 * Agora lÃª relationship_type e strength_score reais da DB para cada controlo
 * do SoA, produzindo inputs correctos para computeComplianceIndex() (ADR-001).
 *
 * @see docs/decisions/ADR-001-strm-weights-algorithm.md
 * @see packages/assessment-engine/src/strm-weight-calculator.ts
 */

import { computeStrmWeightFromString } from "@standard/assessment-engine";
import type { StrmControlInput } from "@standard/assessment-engine";

export interface SoaItemWithMapping {
  control_id: string;
  /** Maturity level 0â€“5 from SoA item or maturity assessment. null â†’ treat as 0. */
  maturity_level: number | null;
  /** STRM relationship_type from scf_mappings. null = no SCF mapping found. */
  relationship_type: string | null;
  /** strength_score from scf_mappings [0.0, 1.0]. null â†’ use operator default. */
  strength_score: number | null;
}

/**
 * Legacy operator normalisation map.
 * Mirrors computeStrmWeightFromString() in strm-weight-calculator.ts.
 * Values that existed in the DB before migration 0047.
 */
const LEGACY_OPERATOR_MAP: Record<string, string> = {
  direct: "equal",
  related: "intersects",
  intersecting: "intersects",
  source_defined: "intersects",
  no_relationship: "no_relation",
};

/**
 * buildStrmControlInputs â€” converts SoA items with real DB mappings into
 * StrmControlInput[] for computeComplianceIndex() (ADR-001).
 *
 * Rules:
 * - Items without a mapping (relationship_type = null) â†’ EXCLUDED from calculation.
 * - Legacy operators are normalised before validation.
 * - Unknown operators after normalisation â†’ EXCLUDED with console.warn.
 * - null maturity_level â†’ treated as 0 (not assessed / not implemented).
 */
export function buildStrmControlInputs(
  items: SoaItemWithMapping[],
): StrmControlInput[] {
  const result: StrmControlInput[] = [];

  for (const item of items) {
    // Exclude items with no SCF mapping
    if (item.relationship_type === null || item.relationship_type === undefined) {
      continue;
    }

    // Normalise legacy operators from pre-migration data
    const rawOp = item.relationship_type;
    const normalisedOp = LEGACY_OPERATOR_MAP[rawOp] ?? rawOp;

    // Validate operator is canonical by attempting to compute weight
    const weight = computeStrmWeightFromString(normalisedOp, item.strength_score);
    if (weight === null) {
      console.warn(
        JSON.stringify({
          level: "warn",
          message: "strm_invalid_operator_excluded",
          module: "strm-compliance-query",
          metadata: {
            control_id: item.control_id,
            raw_operator: rawOp,
            normalised: normalisedOp,
          },
        }),
      );
      continue;
    }

    result.push({
      maturity_level: item.maturity_level ?? 0,
      strm_operator: normalisedOp as StrmControlInput["strm_operator"],
      strength_score: item.strength_score,
    });
  }

  return result;
}

