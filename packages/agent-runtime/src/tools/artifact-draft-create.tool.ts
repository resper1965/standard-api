/**
 * @module artifact-draft-create
 * @description Create draft artifacts that require schema validation and human review.
 * Agents can propose drafts (SoA, Gap Analysis, Maturity, POA&M) but cannot finalize.
 */

export type ArtifactDraftCreateDependencies = {
  createDraft: (input: {
    assessmentId: string;
    tenantId: string;
    organizationId: string;
    artifactType: string;
    content: Record<string, unknown>;
    agentRunId?: string;
  }) => Promise<{ artifact_version_id: string; version_number: number }>;
};

export type ArtifactDraftCreateArgs = {
  tenant_id: string;
  organization_id: string;
  assessment_id: string;
  trace_id: string;
  artifact_type?: string;
  [key: string]: unknown;
};

export type ArtifactDraftCreateOutput = {
  artifact_version_id: string;
  version_number: number;
  status: string;
  disclaimer: string;
};

export function createArtifactDraftCreateTool(deps: ArtifactDraftCreateDependencies) {
  return {
    execute: async (args: ArtifactDraftCreateArgs): Promise<ArtifactDraftCreateOutput> => {
      const { tenant_id, organization_id, assessment_id, artifact_type, trace_id, ...content } = args;
      const result = await deps.createDraft({
        assessmentId: assessment_id,
        tenantId: tenant_id,
        organizationId: organization_id,
        artifactType: artifact_type ?? "unknown",
        content: content as Record<string, unknown>,
      });
      return {
        ...result,
        status: "draft",
        disclaimer:
          "Draft created. Requires schema validation and human approval before finalization.",
      };
    },
  };
}
