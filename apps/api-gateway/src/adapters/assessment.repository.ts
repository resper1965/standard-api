import { eq, and } from "drizzle-orm";
import { assessments } from "@standard/schemas";
import type { AssessmentRecord, AssessmentRepositoryAdapter } from "../http";
import type { DbClient } from "./db";
import type { AssessmentSnapshot } from "@standard/assessment-engine";

const buildDefaultSnapshot = (id: string, organizationId: string, documentCount: number): AssessmentSnapshot => ({
  id,
  organizationId,
  state: "draft",
  documentCount,
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
});

export const createAssessmentRepository = (): AssessmentRepositoryAdapter => {
  const records = new Map<string, AssessmentRecord>();

  return {
    async create(input) {
      const record: AssessmentRecord = {
        ...input,
        // organization_id aliases organization_id
        organization_id: input.organization_id ?? input.organization_id,
        snapshot: buildDefaultSnapshot(input.assessment_id, input.organization_id, input.documentCount)
      };
      records.set(record.assessment_id, record);
      return record;
    },
    async get(assessmentId, organizationId) {
      const record = records.get(assessmentId);
      // organization_id === organization_id, accept either
      return record && (record.organization_id === organizationId || record.organization_id === organizationId) ? record : null;
    },
    async listByOrganization(organizationId) {
      return [...records.values()].filter(
        (record) => record.organization_id === organizationId
      );
    },
    async listAll(organizationId) {
      return [...records.values()].filter(
        (record) => record.organization_id === organizationId || record.organization_id === organizationId
      );
    },
    async save(record) {
      records.set(record.assessment_id, record);
    },
    withOrganization(organizationId) {
      return {
        create: async (input) => this.create({ ...input, organization_id: organizationId }),
        get: async (id) => this.get(id, organizationId),
        listByOrganization: async (orgId) => this.listByOrganization(orgId),
        listAll: async () => this.listAll(organizationId),
        save: async (record) => this.save(record)
      };
    }
  };
};

export const createDrizzleAssessmentRepository = (db: DbClient): AssessmentRepositoryAdapter => {
  return {
    async create(input) {
      const record = {
        id: input.assessment_id,
        organizationId: input.organization_id,
        name: input.name,
        scfVersionId: input.scf_version_id,
        state: "draft" as const,
        traceId: input.trace_id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const [inserted] = await db.insert(assessments).values(record).returning();

      return {
        assessment_id: inserted!.id,
        organization_id: inserted!.organizationId,
        name: inserted!.name,
        scf_version_id: inserted!.scfVersionId,
        trace_id: inserted!.traceId,
        created_at: inserted!.createdAt.toISOString(),
        updated_at: inserted!.updatedAt.toISOString(),
        snapshot: buildDefaultSnapshot(inserted!.id, inserted!.organizationId, input.documentCount)
      };
    },
    async get(assessmentId, _tenantId) {
      const [found] = await db.select().from(assessments)
        .where(eq(assessments.id, assessmentId))
        .limit(1);

      if (!found) return null;

      return {
        assessment_id: found.id,
        organization_id: found.organizationId,
        name: found.name,
        scf_version_id: found.scfVersionId,
        trace_id: found.traceId,
        created_at: found.createdAt.toISOString(),
        updated_at: found.updatedAt.toISOString(),
        snapshot: buildDefaultSnapshot(found.id, found.organizationId, 0)
      };
    },
    async listByOrganization(organizationId) {
      const results = await db.select().from(assessments)
        .where(eq(assessments.organizationId, organizationId));

      return results.map(found => ({
        assessment_id: found.id,
        organization_id: found.organizationId,
        name: found.name,
        scf_version_id: found.scfVersionId,
        trace_id: found.traceId,
        created_at: found.createdAt.toISOString(),
        updated_at: found.updatedAt.toISOString(),
        snapshot: buildDefaultSnapshot(found.id, found.organizationId, 0)
      }));
    },
    async listAll(_tenantId) {
      const results = await db.select().from(assessments);

      return results.map(found => ({
        assessment_id: found.id,
        organization_id: found.organizationId,
        name: found.name,
        scf_version_id: found.scfVersionId,
        trace_id: found.traceId,
        created_at: found.createdAt.toISOString(),
        updated_at: found.updatedAt.toISOString(),
        snapshot: buildDefaultSnapshot(found.id, found.organizationId, 0)
      }));
    },
    async save(record) {
      await db.update(assessments)
        .set({
          name: record.name,
          state: record.snapshot.state,
          updatedAt: new Date()
        })
        .where(eq(assessments.id, record.assessment_id));
    },
    withOrganization(organizationId) {
      return {
        create: async (input) => this.create({ ...input, organization_id: organizationId }),
        get: async (id) => this.get(id, organizationId),
        listByOrganization: async (orgId) => this.listByOrganization(orgId),
        listAll: async () => this.listAll(organizationId),
        save: async (record) => this.save(record)
      };
    }
  };
};
