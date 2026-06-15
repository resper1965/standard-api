// @ts-nocheck -- Zod v4 CI type compat
import { and, eq, inArray } from "drizzle-orm";
import {
  scfMappings,
  scfFrameworkRequirements,
  scfControls,
  scfEvidenceRequests,
} from "@standard/schemas";

export interface OptimizeComplianceOptions {
  frameworkIds: string[];
  scfVersionId: string;
}

export interface ComplianceOptimizerStep {
  control_id: string;
  control_code: string;
  control_title: string;
  control_weight: number;
  evidence_requirements_count: number;
  mapped_requirements_count: number;
  overlap_score: number;
  value_to_effort_ratio: number;
  covers_requirements: { framework_id: string; requirement_id: string }[];
  cumulative_coverage_count: number;
  cumulative_coverage_percentage: number;
}

export interface OptimizationResult {
  target_frameworks_count: number;
  total_target_requirements: number;
  optimized_path: ComplianceOptimizerStep[];
}

export class ComplianceOptimizerService {
  constructor(private readonly db: any) {}

  async optimizePath(
    options: OptimizeComplianceOptions,
  ): Promise<OptimizationResult> {
    const { frameworkIds, scfVersionId } = options;
    if (frameworkIds.length === 0) {
      return {
        target_frameworks_count: 0,
        total_target_requirements: 0,
        optimized_path: [],
      };
    }

    // 1. Fetch all requirements and control mappings for target frameworks
    const mappings = await this.db
      .select({
        controlId: scfMappings.scfControlId,
        controlCode: scfControls.controlCode,
        controlTitle: scfControls.title,
        controlWeight: scfControls.controlWeight,
        frameworkId: scfFrameworkRequirements.scfFrameworkId,
        requirementId: scfMappings.scfFrameworkRequirementId,
      })
      .from(scfMappings)
      .innerJoin(scfControls, eq(scfMappings.scfControlId, scfControls.id))
      .innerJoin(
        scfFrameworkRequirements,
        eq(scfMappings.scfFrameworkRequirementId, scfFrameworkRequirements.id),
      )
      .where(
        and(
          eq(scfMappings.scfVersionId, scfVersionId),
          inArray(scfFrameworkRequirements.scfFrameworkId, frameworkIds),
        ),
      );

    // 2. Fetch evidence request counts per control
    const evidenceList = await this.db
      .select({
        controlId: scfEvidenceRequests.scfControlId,
      })
      .from(scfEvidenceRequests)
      .where(eq(scfEvidenceRequests.scfVersionId, scfVersionId));

    // Map evidence counts
    const evidenceCountMap = new Map<string, number>();
    for (const ev of evidenceList) {
      if (ev.controlId) {
        evidenceCountMap.set(
          ev.controlId,
          (evidenceCountMap.get(ev.controlId) || 0) + 1,
        );
      }
    }

    // Group mappings by control
    const controlMap = new Map<
      string,
      {
        id: string;
        code: string;
        title: string;
        weight: number;
        requirements: Set<string>;
        requirementList: { framework_id: string; requirement_id: string }[];
      }
    >();

    const allTargetReqs = new Set<string>();

    for (const m of mappings) {
      const reqKey = `${m.frameworkId}:${m.requirementId}`;
      allTargetReqs.add(reqKey);

      if (!controlMap.has(m.controlId)) {
        controlMap.set(m.controlId, {
          id: m.controlId,
          code: m.controlCode,
          title: m.controlTitle,
          weight: m.controlWeight ? Number(m.controlWeight) : 1.0,
          requirements: new Set<string>(),
          requirementList: [],
        });
      }

      const ctrl = controlMap.get(m.controlId)!;
      if (!ctrl.requirements.has(reqKey)) {
        ctrl.requirements.add(reqKey);
        ctrl.requirementList.push({
          framework_id: m.frameworkId,
          requirement_id: m.requirementId,
        });
      }
    }

    const totalTargetRequirements = allTargetReqs.size;
    if (totalTargetRequirements === 0) {
      return {
        target_frameworks_count: frameworkIds.length,
        total_target_requirements: 0,
        optimized_path: [],
      };
    }

    // Build raw candidate steps
    const candidates = Array.from(controlMap.values()).map((ctrl) => {
      const evidenceCount = evidenceCountMap.get(ctrl.id) || 0;
      // Effort is proportional to ERL count (min 1 to prevent division by zero)
      const effort = Math.max(evidenceCount, 1);
      const overlapScore = ctrl.weight * ctrl.requirements.size;
      const ratio = overlapScore / effort;

      return {
        control_id: ctrl.id,
        control_code: ctrl.code,
        control_title: ctrl.title,
        control_weight: ctrl.weight,
        evidence_requirements_count: evidenceCount,
        mapped_requirements_count: ctrl.requirements.size,
        overlap_score: Number(overlapScore.toFixed(2)),
        value_to_effort_ratio: Number(ratio.toFixed(3)),
        covers_requirements: ctrl.requirementList,
        reqKeys: ctrl.requirements,
      };
    });

    // Greedy sorting by ratio descending
    candidates.sort(
      (a, b) => b.value_to_effort_ratio - a.value_to_effort_ratio,
    );

    // Build cumulative linear coverage path
    const optimizedPath: ComplianceOptimizerStep[] = [];
    const coveredReqs = new Set<string>();

    for (const cand of candidates) {
      // Find which of cand's requirements are new (not yet covered by prior controls)
      const newCovered: { framework_id: string; requirement_id: string }[] = [];
      for (const req of cand.covers_requirements) {
        const key = `${req.framework_id}:${req.requirement_id}`;
        if (!coveredReqs.has(key)) {
          coveredReqs.add(key);
          newCovered.push(req);
        }
      }

      optimizedPath.push({
        control_id: cand.control_id,
        control_code: cand.control_code,
        control_title: cand.control_title,
        control_weight: cand.control_weight,
        evidence_requirements_count: cand.evidence_requirements_count,
        mapped_requirements_count: cand.mapped_requirements_count,
        overlap_score: cand.overlap_score,
        value_to_effort_ratio: cand.value_to_effort_ratio,
        covers_requirements: newCovered,
        cumulative_coverage_count: coveredReqs.size,
        cumulative_coverage_percentage: Number(
          ((coveredReqs.size / totalTargetRequirements) * 100).toFixed(1),
        ),
      });
    }

    return {
      target_frameworks_count: frameworkIds.length,
      total_target_requirements: totalTargetRequirements,
      optimized_path: optimizedPath,
    };
  }
}

