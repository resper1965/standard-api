import type { AssessmentRecord, AssessmentRepositoryAdapter } from "../http";

export const createAssessmentRepository = (): AssessmentRepositoryAdapter => {
  const records = new Map<string, AssessmentRecord>();

  return {
    async create(input) {
      const record: AssessmentRecord = {
        ...input,
        snapshot: {
          id: input.assessment_id,
          tenantId: input.tenant_id,
          organizationId: input.organization_id,
          state: "draft",
          documentCount: input.documentCount,
          requiredDocumentJobsComplete: false,
          scfPreAnalysisRegistered: false,
          frameworkSelected: false,
          scopeDrafted: false,
          soaDraftVersionComplete: false,
          soaApproved: false,
          soaIngested: false,
          evidenceAnalysisReady: false,
          gapAnalysisDrafted: false,
          gapAnalysisApproved: false,
          maturityAssessed: false,
          maturityApproved: false,
          poamDrafted: false,
          poamApproved: false,
          reportGenerated: false,
          reportApproved: false
        }
      };
      records.set(record.assessment_id, record);
      return record;
    },
    async get(assessmentId, tenantId) {
      const record = records.get(assessmentId);
      return record?.tenant_id === tenantId ? record : null;
    },
    async listByOrganization(organizationId, tenantId) {
      return [...records.values()].filter(
        (record) => record.organization_id === organizationId && record.tenant_id === tenantId
      );
    },
    async save(record) {
      records.set(record.assessment_id, record);
    }
  };
};
