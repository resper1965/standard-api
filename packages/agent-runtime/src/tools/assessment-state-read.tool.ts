// @ts-nocheck -- Zod v4 CI type compat
/**
 * @module assessment-state-read
 * @description Assessment state snapshot tool for agent runtime.
 * Returns the current assessment state, flags, and artifact versions
 * for agent decision-making.
 */

export type AssessmentStateSnapshot = {
  assessment_id: string;
  organization_id: string;
  state: string;
  framework_id: string;
  scf_version_id?: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
};

export type AssessmentStateReadDependencies = {
  getAssessmentSnapshot: (
    assessmentId: string,
    organizationId: string
  ) => Promise<AssessmentStateSnapshot | null>;
};

export type AssessmentStateReadArgs = {
  organization_id: string;
  assessment_id: string;
  trace_id: string;
};

export type AssessmentStateReadOutput = {
  snapshot: AssessmentStateSnapshot | null;
  found: boolean;
};

export function createAssessmentStateReadTool(deps: AssessmentStateReadDependencies) {
  return {
    execute: async (args: AssessmentStateReadArgs): Promise<AssessmentStateReadOutput> => {
      const snapshot = await deps.getAssessmentSnapshot(
        args.assessment_id,
        args.organization_id
      );
      return {
        snapshot,
        found: snapshot !== null,
      };
    },
  };
}

