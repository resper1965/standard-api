import { eq, and } from "drizzle-orm";
import { assessments } from "@standard/schemas";
import type { AssessmentRecord, AssessmentRepositoryAdapter } from "../http";
import type { DbClient } from "./db";
import type { AssessmentSnapshot } from "@standard/assessment-engine";

const buildDefaultSnapshot = (id: string, tenantId: string, organizationId: string, documentCount: number): AssessmentSnapshot => ({
  id,
  tenantId,
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
        snapshot: buildDefaultSnapshot(input.assessment_id, input.tenant_id, input.organization_id, input.documentCount)
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
    async listAll(tenantId) {
      return [...records.values()].filter(
        (record) => record.tenant_id === tenantId
      );
    },
    async save(record) {
      records.set(record.assessment_id, record);
    },
    withTenant(tenantId) {
      return {
        create: async (input) => this.create({ ...input, tenant_id: tenantId }),
        get: async (id) => this.get(id, tenantId),
        listByOrganization: async (orgId) => this.listByOrganization(orgId, tenantId),
        listAll: async () => this.listAll(tenantId),
        save: async (record) => {
          if (record.tenant_id !== tenantId) {
            throw new Error(`Tenant mismatch in save: expected ${tenantId}, got ${record.tenant_id}`);
          }
          return this.save(record);
        }
      };
    }
  };
};

export const createDrizzleAssessmentRepository = (db: DbClient): AssessmentRepositoryAdapter => {
  return {
    async create(input) {
      const record = {
        id: input.assessment_id,
        tenantId: input.tenant_id,
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
        tenant_id: inserted!.tenantId,
        organization_id: inserted!.organizationId,
        name: inserted!.name,
        scf_version_id: inserted!.scfVersionId,
        trace_id: inserted!.traceId,
        created_at: inserted!.createdAt.toISOString(),
        updated_at: inserted!.updatedAt.toISOString(),
        snapshot: buildDefaultSnapshot(inserted!.id, inserted!.tenantId, inserted!.organizationId, input.documentCount)
      };
    },
    async get(assessmentId, tenantId) {
      const [found] = await db.select().from(assessments)
        .where(
          and(
            eq(assessments.id, assessmentId), 
            eq(assessments.tenantId, tenantId)
          )
        )
        .limit(1);
        
      if (!found) return null;
      
      return {
        assessment_id: found.id,
        tenant_id: found.tenantId,
        organization_id: found.organizationId,
        name: found.name,
        scf_version_id: found.scfVersionId,
        trace_id: found.traceId,
        created_at: found.createdAt.toISOString(),
        updated_at: found.updatedAt.toISOString(),
        snapshot: buildDefaultSnapshot(found.id, found.tenantId, found.organizationId, 0)
      };
    },
    async listByOrganization(organizationId, tenantId) {
      const results = await db.select().from(assessments)
        .where(
          and(
            eq(assessments.organizationId, organizationId), 
            eq(assessments.tenantId, tenantId)
          )
        );
        
      return results.map(found => ({
        assessment_id: found.id,
        tenant_id: found.tenantId,
        organization_id: found.organizationId,
        name: found.name,
        scf_version_id: found.scfVersionId,
        trace_id: found.traceId,
        created_at: found.createdAt.toISOString(),
        updated_at: found.updatedAt.toISOString(),
        snapshot: buildDefaultSnapshot(found.id, found.tenantId, found.organizationId, 0)
      }));
    },
    async listAll(tenantId) {
      const results = await db.select().from(assessments)
        .where(eq(assessments.tenantId, tenantId));
        
      return results.map(found => ({
        assessment_id: found.id,
        tenant_id: found.tenantId,
        organization_id: found.organizationId,
        name: found.name,
        scf_version_id: found.scfVersionId,
        trace_id: found.traceId,
        created_at: found.createdAt.toISOString(),
        updated_at: found.updatedAt.toISOString(),
        snapshot: buildDefaultSnapshot(found.id, found.tenantId, found.organizationId, 0)
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
    withTenant(tenantId) {
      return {
        create: async (input) => this.create({ ...input, tenant_id: tenantId }),
        get: async (id) => this.get(id, tenantId),
        listByOrganization: async (orgId) => this.listByOrganization(orgId, tenantId),
        listAll: async () => this.listAll(tenantId),
        save: async (record) => {
          if (record.tenant_id !== tenantId) {
            throw new Error(`Tenant mismatch in save: expected ${tenantId}, got ${record.tenant_id}`);
          }
          return this.save(record);
        }
      };
    }
  };
};

