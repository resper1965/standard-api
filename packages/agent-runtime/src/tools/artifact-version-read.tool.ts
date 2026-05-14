/**
 * @module artifact-version-read
 * @description Read versioned assessment artifacts (SoA, Gap Analysis, Maturity, POA&M).
 * Returns either a specific version or lists all versions for an assessment.
 */

export type ArtifactVersion = {
  id: string;
  artifact_type: string;
  version_number: number;
  status: string;
  content: Record<string, unknown>;
  created_at: string;
};

export type ArtifactVersionReadDependencies = {
  getArtifactVersion: (
    artifactVersionId: string,
    tenantId: string,
    assessmentId: string
  ) => Promise<ArtifactVersion | null>;
  listArtifactVersions: (
    assessmentId: string,
    tenantId: string,
    artifactType?: string
  ) => Promise<ArtifactVersion[]>;
};

export type ArtifactVersionReadArgs = {
  tenant_id: string;
  organization_id: string;
  assessment_id: string;
  trace_id: string;
  artifact_version_id?: string;
  artifact_type?: string;
};

export type ArtifactVersionReadOutput = {
  versions: ArtifactVersion[];
  count: number;
};

export function createArtifactVersionReadTool(deps: ArtifactVersionReadDependencies) {
  return {
    execute: async (args: ArtifactVersionReadArgs): Promise<ArtifactVersionReadOutput> => {
      if (args.artifact_version_id) {
        const version = await deps.getArtifactVersion(
          args.artifact_version_id,
          args.tenant_id,
          args.assessment_id
        );
        return { versions: version ? [version] : [], count: version ? 1 : 0 };
      }
      const versions = await deps.listArtifactVersions(
        args.assessment_id,
        args.tenant_id,
        args.artifact_type
      );
      return { versions, count: versions.length };
    },
  };
}
