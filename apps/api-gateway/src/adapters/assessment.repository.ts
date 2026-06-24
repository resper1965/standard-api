import { eq, and } from "drizzle-orm";
import { assessments } from "@standard/schemas";
import type { AssessmentRecord, AssessmentRepositoryAdapter } from "../http";
import type { DbClient } from "./db";
import type { AssessmentSnapshot } from "@standard/assessment-engine";

const buildDefaultSnapshot = (
  id: string,
  organizationId: string,
  documentCount: number,
): AssessmentSnapshot => ({
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
  reportApproved: false,
});

type AssessmentSelect = typeof assessments.$inferSelect;
const mapAssessmentRow = (
  found: AssessmentSelect,
  documentCount = 0,
): AssessmentRecord => ({
  assessment_id: found.id,
  organization_id: found.organizationId,
  name: found.name,
  scf_version_id: found.scfVersionId,
  trace_id: found.traceId,
  observation_start_date: found.observationStartDate ?? undefined,
  observation_end_date: found.observationEndDate ?? undefined,
  created_at: found.createdAt.toISOString(),
  updated_at: found.updatedAt.toISOString(),
  snapshot: buildDefaultSnapshot(found.id, found.organizationId, documentCount),
});

export const createAssessmentRepository = (): AssessmentRepositoryAdapter => {
  const records = new Map<string, AssessmentRecord>();

  const create = async (input: any) => {
    const record: AssessmentRecord = {
      ...input,
      // organization_id aliases organization_id
      organization_id: input.organization_id ?? input.organization_id,
      snapshot: buildDefaultSnapshot(
        input.assessment_id,
        input.organization_id,
        input.documentCount,
      ),
    };
    records.set(record.assessment_id, record);
    return record;
  };

  const get = async (assessmentId: string, organizationId?: string) => {
    const record = records.get(assessmentId);
    return record && record.organization_id === organizationId ? record : null;
  };

  const listByOrganization = async (organizationId: string) => {
    return [...records.values()].filter(
      (record) => record.organization_id === organizationId,
    );
  };

  const listAll = async (organizationId?: string) => {
    return [...records.values()].filter(
      (record) => record.organization_id === organizationId,
    );
  };

  const save = async (record: AssessmentRecord) => {
    records.set(record.assessment_id, record);
  };

  return {
    create,
    get,
    listByOrganization,
    listAll,
    save,
    withOrganization(organizationId) {
      return {
        create: async (input) =>
          create({ ...input, organization_id: organizationId }),
        get: async (id) => get(id, organizationId),
        listByOrganization: async (orgId) => listByOrganization(orgId),
        listAll: async () => listAll(organizationId),
        save: async (record) => save(record),
      };
    },
  };
};

export const createDrizzleAssessmentRepository = (
  db: DbClient,
): AssessmentRepositoryAdapter => {
  const create = async (input: any) => {
    const record = {
      id: input.assessment_id,
      organizationId: input.organization_id,
      name: input.name,
      scfVersionId: input.scf_version_id,
      state: "draft" as const,
      traceId: input.trace_id,
      observationStartDate: input.observation_start_date ?? null,
      observationEndDate: input.observation_end_date ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [inserted] = await db.insert(assessments).values(record).returning();

    return mapAssessmentRow(inserted!, input.documentCount);
  };

  const get = async (assessmentId: string, tenantId?: string) => {
    const [found] = await db
      .select()
      .from(assessments)
      .where(
        and(
          eq(assessments.id, assessmentId),
          eq(assessments.organizationId, tenantId!),
        ),
      )
      .limit(1);

    if (!found) return null;

    return mapAssessmentRow(found);
  };

  const listByOrganization = async (organizationId: string) => {
    const results = await db
      .select()
      .from(assessments)
      .where(eq(assessments.organizationId, organizationId));

    return results.map((found) => mapAssessmentRow(found));
  };

  const listAll = async (tenantId?: string) => {
    const results = await db
      .select()
      .from(assessments)
      .where(eq(assessments.organizationId, tenantId!));

    return results.map((found) => mapAssessmentRow(found));
  };

  const save = async (record: AssessmentRecord) => {
    await db
      .update(assessments)
      .set({
        name: record.name,
        state: record.snapshot.state,
        observationStartDate: record.observation_start_date ?? null,
        observationEndDate: record.observation_end_date ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(assessments.id, record.assessment_id),
          eq(assessments.organizationId, record.organization_id),
        ),
      );
  };

  return {
    create,
    get,
    listByOrganization,
    listAll,
    save,
    withOrganization(organizationId) {
      return {
        create: async (input) =>
          create({ ...input, organization_id: organizationId }),
        get: async (id) => get(id, organizationId),
        listByOrganization: async (orgId) => listByOrganization(orgId),
        listAll: async () => listAll(organizationId),
        save: async (record) => save(record),
      };
    },
  };
};
