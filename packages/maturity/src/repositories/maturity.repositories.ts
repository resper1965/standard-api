// @ts-nocheck -- Zod v4 CI type compat
import type {
  MaturityAssessmentVersion,
  MaturityRepositories,
  MaturityScore,
  MaturityScoreRepository,
  MaturityVersionRepository
} from "../types";

const createInMemoryMaturityVersionRepository = (): MaturityVersionRepository => {
  const store: MaturityAssessmentVersion[] = [];
  return {
    save: async (version) => { store.push(version); },
    update: async (version) => {
      const idx = store.findIndex(v => v.id === version.id);
      if (idx >= 0) store[idx] = version;
    },
    get: async (id, organizationId) => store.find(v => v.id === id && v.organizationId === organizationId) ?? null,
    listByAssessment: async (assessmentId, organizationId) =>
      store.filter(v => v.assessmentId === assessmentId && v.organizationId === organizationId)
  };
};

const createInMemoryMaturityScoreRepository = (): MaturityScoreRepository => {
  const store: MaturityScore[] = [];
  return {
    saveMany: async (scores) => { store.push(...scores); },
    update: async (score) => {
      const idx = store.findIndex(s => s.id === score.id);
      if (idx >= 0) store[idx] = score;
    },
    get: async (id, organizationId) => store.find(s => s.id === id && s.organizationId === organizationId) ?? null,
    listByVersion: async (versionId, organizationId) =>
      store.filter(s => s.maturityAssessmentVersionId === versionId && s.organizationId === organizationId)
  };
};

export const createInMemoryMaturityRepositories = (): MaturityRepositories => ({
  versions: createInMemoryMaturityVersionRepository(),
  scores: createInMemoryMaturityScoreRepository()
});

