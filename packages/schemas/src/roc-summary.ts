// @ts-nocheck -- Zod v4 CI type compat
/**
 * SCR-RMM Report on Conformity (ROC) Summary Schema
 *
 * Aggregated conformity report for an assessment.
 * Worst-wins rule: material_weakness > significant_deficiency > conforms > strictly_conforms
 *
 * Architecture: live query (not versioned artifact) â€” ADR-014 Decision 4.
 * MCR blocker: any finding with is_mcr_gap=true AND roc_determination=material_weakness
 *
 * References: AGENTS.md Â§11, ADR-014
 */
import { z } from "zod";
import { UuidSchema } from "./common";

// â”€â”€ ROC Determination â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const RocDeterminationSchema = z.enum([
  "strictly_conforms",
  "conforms",
  "significant_deficiency",
  "material_weakness",
]);
export type RocDetermination = z.infer<typeof RocDeterminationSchema>;

/** Severity ordering for worst-wins logic (higher = worse). */
export const ROC_SEVERITY_ORDER: Record<RocDetermination, number> = {
  strictly_conforms: 0,
  conforms: 1,
  significant_deficiency: 2,
  material_weakness: 3,
};

export const AssuranceLevelSchema = z.enum([
  "l1_standard",
  "l2_enhanced",
  "l3_comprehensive",
]);
export type AssuranceLevel = z.infer<typeof AssuranceLevelSchema>;

// â”€â”€ ROC Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const RocFindingBreakdownSchema = z.object({
  strictly_conforms: z.number().int().nonnegative().default(0),
  conforms: z.number().int().nonnegative().default(0),
  significant_deficiency: z.number().int().nonnegative().default(0),
  material_weakness: z.number().int().nonnegative().default(0),
  unclassified: z.number().int().nonnegative().default(0),
});

export const RocSummarySchema = z.object({
  assessment_id: UuidSchema,
  /** Gap analysis version used â€” approved version preferred; draft as fallback. */
  gap_analysis_version_id: UuidSchema.optional(),
  gap_analysis_version_status: z
    .enum(["approved", "draft", "under_review", "superseded", "archived"])
    .optional(),
  /**
   * Overall conformity = worst single roc_determination across all findings.
   * Worst-wins: material_weakness > significant_deficiency > conforms > strictly_conforms.
   * 'strictly_conforms' when no findings exist.
   */
  overall_conformity: RocDeterminationSchema,
  /**
   * True when any finding has is_mcr_gap=true AND roc_determination=material_weakness.
   * MCR blockers are hard compliance failures regardless of risk score.
   */
  has_mcr_blocker: z.boolean(),
  /** Assessment rigor level (l1/l2/l3) â€” affects auditor interpretation. */
  assurance_level: AssuranceLevelSchema.default("l1_standard"),
  /** Count of findings per ROC determination. */
  findings_by_determination: RocFindingBreakdownSchema,
  /** Total findings analyzed. */
  total_findings: z.number().int().nonnegative(),
  /** Number of findings where is_mcr_gap=true. */
  mcr_findings: z.number().int().nonnegative(),
  /** Number of MCR findings with material_weakness determination. */
  mcr_material_weaknesses: z.number().int().nonnegative(),
  /**
   * Human-readable guidance lines derived from overall_conformity + has_mcr_blocker.
   * E.g. "This assessment has material weaknesses. Immediate remediation required."
   */
  roc_guidance: z.array(z.string()),
  generated_at: z.string(),
  trace_id: z.string(),
});
export type RocSummary = z.infer<typeof RocSummarySchema>;

// â”€â”€ Guidance Generator (pure function) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function generateRocGuidance(
  overall: RocDetermination,
  hasMcrBlocker: boolean,
): string[] {
  const lines: string[] = [];

  if (hasMcrBlocker) {
    lines.push(
      "CRITICAL: One or more Minimum Compliance Requirements (MCR) have material weaknesses. These are legal/regulatory blockers that must be remediated before the assessment can be closed.",
    );
  }

  switch (overall) {
    case "material_weakness":
      lines.push(
        "This assessment contains material weaknesses. Immediate corrective action is required. These findings must appear in the POA&M.",
      );
      break;
    case "significant_deficiency":
      lines.push(
        "This assessment has significant deficiencies. A remediation plan should be developed and tracked in the POA&M.",
      );
      break;
    case "conforms":
      lines.push(
        "This assessment conforms with minor gaps. Continue monitoring and address outstanding items in the next cycle.",
      );
      break;
    case "strictly_conforms":
      lines.push(
        "This assessment strictly conforms. All applicable controls have strong evidence. Continue monitoring for the next cycle.",
      );
      break;
  }

  return lines;
}

export type RocSummaryResponse = RocSummary;

