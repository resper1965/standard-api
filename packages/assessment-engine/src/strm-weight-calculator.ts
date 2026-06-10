/**
 * STRM Weight Calculator — ADR-001 (NIST IR 8477)
 *
 * Implementa o algoritmo de ponderação STRM conforme especificado no Blueprint.
 * FONTE DA VERDADE para cálculo de compliance score ponderado.
 *
 * ⛔ NUNCA usar (implementedControls / totalControls) — é falso positivo jurídico.
 *    A fórmula correta é a Weights Matrix abaixo.
 *
 * Referência: docs/decisions/ADR-001-strm-weights-algorithm.md
 * Referência: docs/decisions/IMPLEMENTATION-CONSTRAINTS.md Secção 1
 * Contrato:   packages/assessment-engine/src/__tests__/strm-weight-calculator.contract.test.ts
 */

import { StrmOperatorSchema } from "@standard/schemas";
import type { StrmOperator } from "@standard/schemas";

// ── Constantes ─────────────────────────────────────────────────────────────

/** Default weight for intersects when strength_score is null (ADR-001 §3.2) */
export const INTERSECTS_DEFAULT_WEIGHT = 0.5 as const;

/** Maximum weight cap for superset operator (ADR-001 §3.4) */
export const SUPERSET_MAX_WEIGHT = 0.5 as const;

/** Maximum maturity level for SCF controls (SCR-CMM L5) */
export const MAX_MATURITY_LEVEL = 5 as const;

// ── Core Functions ─────────────────────────────────────────────────────────

/**
 * computeStrmWeight — Weights Matrix (ADR-001 / NIST IR 8477)
 *
 * Maps a STRM operator + optional strength score to a weight [0.0, 1.0].
 *
 * | Operator   | Symbol | Weight logic                          |
 * |------------|--------|---------------------------------------|
 * | equal      | =      | always 1.0                            |
 * | subset     | ⊂      | always 1.0 (SCF broader than req)     |
 * | intersects | ∩      | strength_score (default 0.5)          |
 * | superset   | ⊃      | min(0.5, strength_score) (max 0.5)    |
 * | no_relation| Ø      | always 0.0 (excluded from index)      |
 *
 * @throws {Error} if operator is not a canonical StrmOperator value
 */
export function computeStrmWeight(
  operator: StrmOperator,
  strengthScore: number | null,
): number {
  // Validate operator at runtime — rejects "direct", "related", "intersecting" etc.
  const parsed = StrmOperatorSchema.safeParse(operator);
  if (!parsed.success) {
    throw new Error(
      `[STRM] Invalid operator "${operator}". Must be one of: equal|subset|intersects|superset|no_relation. ` +
        `Legacy values "direct","related","intersecting","no_relationship","source_defined" are forbidden. ` +
        `See ADR-001.`,
    );
  }

  switch (operator) {
    case "equal":
    case "subset":
      // Full compliance coverage — always 1.0
      return 1.0;

    case "intersects": {
      // Dynamic weight: use strength_score or fallback to 0.5
      if (strengthScore === null || strengthScore === undefined) {
        return INTERSECTS_DEFAULT_WEIGHT;
      }
      // Clamp to [0.0, 1.0]
      return Math.max(0.0, Math.min(1.0, strengthScore));
    }

    case "superset": {
      // SCF narrower than requirement — cap at 0.5
      if (strengthScore === null || strengthScore === undefined) {
        return SUPERSET_MAX_WEIGHT;
      }
      // Clamp score then apply superset ceiling
      const clamped = Math.max(0.0, Math.min(1.0, strengthScore));
      return Math.min(SUPERSET_MAX_WEIGHT, clamped);
    }

    case "no_relation":
      // No coverage — 0.0; excluded from denominator in computeComplianceIndex
      return 0.0;

    default: {
      // TypeScript exhaustive check — should never happen at runtime
      const _exhaustive: never = operator;
      throw new Error(`[STRM] Unhandled operator: ${_exhaustive}`);
    }
  }
}

// ── Compliance Index ───────────────────────────────────────────────────────

export interface StrmControlInput {
  /** SCF control maturity level 0–5 (SCR-CMM). 0 = not assessed/not implemented. */
  maturity_level: number;
  /** Canonical STRM operator — MUST be one of the 5 canonical values */
  strm_operator: StrmOperator;
  /** Numeric strength score 0.0–1.0. Used only for intersects/superset. */
  strength_score: number | null;
}

export interface ComplianceIndexResult {
  /** Weighted compliance score [0.0, 1.0] */
  index: number;
  /** As a percentage [0, 100], rounded to 2 decimal places */
  percentage: number;
  /** Sum of (maturity_ratio × weight) across all non-no_relation controls */
  weighted_score: number;
  /** Sum of weights across all non-no_relation controls (denominator) */
  total_weight: number;
  /** Number of controls excluded from index (no_relation operator) */
  excluded_count: number;
  /** Number of controls included in denominator */
  included_count: number;
}

/**
 * computeComplianceIndex — STRM Weighted Compliance Formula (ADR-001)
 *
 * Formula:
 *   index = Σ(maturity_ratio_i × weight_i) / Σ(weight_i)
 *
 * Where:
 *   maturity_ratio_i = maturity_level_i / 5  (normalised 0–1)
 *   weight_i = computeStrmWeight(strm_operator_i, strength_score_i)
 *   no_relation controls are excluded from BOTH numerator AND denominator
 *
 * ⛔ NOT implementedControls / totalControls — that is a FORBIDDEN anti-pattern.
 *
 * @throws {Error} if any control has an invalid strm_operator
 */
export function computeComplianceIndex(
  controls: StrmControlInput[],
): ComplianceIndexResult {
  if (controls.length === 0) {
    return {
      index: 0,
      percentage: 0,
      weighted_score: 0,
      total_weight: 0,
      excluded_count: 0,
      included_count: 0,
    };
  }

  let weightedScore = 0;
  let totalWeight = 0;
  let excludedCount = 0;

  for (const control of controls) {
    const weight = computeStrmWeight(
      control.strm_operator,
      control.strength_score,
    );

    // no_relation: excluded from both numerator and denominator
    if (weight === 0.0 && control.strm_operator === "no_relation") {
      excludedCount++;
      continue;
    }

    // Clamp maturity_level to [0, 5]
    const clampedMaturity = Math.max(
      0,
      Math.min(MAX_MATURITY_LEVEL, control.maturity_level),
    );
    const maturityRatio = clampedMaturity / MAX_MATURITY_LEVEL;

    weightedScore += maturityRatio * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    // All controls are no_relation — no meaningful index
    return {
      index: 0,
      percentage: 0,
      weighted_score: 0,
      total_weight: 0,
      excluded_count: excludedCount,
      included_count: 0,
    };
  }

  const index = weightedScore / totalWeight;
  const clampedIndex = Math.max(0.0, Math.min(1.0, index));

  return {
    index: clampedIndex,
    percentage: Math.round(clampedIndex * 10000) / 100, // 2 decimal places
    weighted_score: weightedScore,
    total_weight: totalWeight,
    excluded_count: excludedCount,
    included_count: controls.length - excludedCount,
  };
}

/**
 * computeStrmWeightFromString — safe entry point for data coming from DB/API
 * where relationship_type may still be a raw string (e.g. from joins).
 *
 * Normalises any legacy value before computing weight.
 * Returns null if the value cannot be normalised.
 */
export function computeStrmWeightFromString(
  rawOperator: string,
  strengthScore: number | null,
): number | null {
  // Normalise legacy values
  const normalised =
    rawOperator === "direct"
      ? "equal"
      : rawOperator === "related" ||
          rawOperator === "intersecting" ||
          rawOperator === "source_defined"
        ? "intersects"
        : rawOperator === "no_relationship"
          ? "no_relation"
          : rawOperator;

  const parsed = StrmOperatorSchema.safeParse(normalised);
  if (!parsed.success) return null;

  return computeStrmWeight(parsed.data, strengthScore);
}
