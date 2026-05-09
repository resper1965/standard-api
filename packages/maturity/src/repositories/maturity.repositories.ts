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
    get: async (id, tenantId) => store.find(v => v.id === id && v.tenantId === tenantId) ?? null,
    listByAssessment: async (assessmentId, tenantId) =>
      store.filter(v => v.assessmentId === assessmentId && v.tenantId === tenantId)
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
    get: async (id, tenantId) => store.find(s => s.id === id && s.tenantId === tenantId) ?? null,
    listByVersion: async (versionId, tenantId) =>
      store.filter(s => s.maturityAssessmentVersionId === versionId && s.tenantId === tenantId)
  };
};

export const createInMemoryMaturityRepositories = (): MaturityRepositories => ({
  versions: createInMemoryMaturityVersionRepository(),
  scores: createInMemoryMaturityScoreRepository()
});
