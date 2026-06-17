import type { ArtifactVersion } from "@standard/assessment-engine";
import type { ArtifactRepositoryAdapter } from "../http";

export const createArtifactRepository = (): ArtifactRepositoryAdapter => {
  const records = new Map<string, ArtifactVersion>();

  return {
    async create(input) {
      const siblings = [...records.values()].filter(
        (record) => record.assessmentId === input.assessmentId && record.artifactType === input.artifactType
      );
      const version = {
        ...input,
        versionNumber: siblings.length + 1,
        status: "draft" as const
      };
      records.set(version.id, version);
      return version;
    },
    async get(versionId) {
      return records.get(versionId) ?? null;
    },
    async save(version) {
      records.set(version.id, version);
    },
    async listByAssessment(assessmentId, artifactType) {
      return [...records.values()].filter(
        (record) => record.assessmentId === assessmentId && record.artifactType === artifactType
      );
    },
    withOrganization(organizationId: string) {
      return {
        create: async (input) => this.create(input),
        get: async (versionId) => {
          const artifact = await this.get(versionId);
          return artifact && artifact.organizationId === organizationId ? artifact : null;
        },
        save: async (version) => this.save(version),
        listByAssessment: async (assessmentId, artifactType) => {
          return [...records.values()].filter(
            (record) => record.assessmentId === assessmentId && record.artifactType === artifactType && record.organizationId === organizationId
          );
        }
      };
    }
  };
};


