/**
 * @module maturity.repository
 * @description Drizzle PostgreSQL repositories for Maturity Assessment versions and scores.
 */
import { eq, and } from "drizzle-orm";
import {
  maturityAssessmentVersions,
  maturityScores,
} from "@standard/schemas";
import type { DbClient } from "./db";

// ---------- Types ----------

export type MaturityVersionRecord = {
  id: string;
  tenant_id: string;
  organization_id: string;
  assessment_id: string;
  version_number: number;
  status: string;
  approval_event_id?: string;
  created_by_agent_run_id?: string;
  created_at: string;
  updated_at: string;
};

export type MaturityScoreRecord = {
  id: string;
  tenant_id: string;
  organization_id: string;
  assessment_id: string;
  maturity_assessment_version_id: string;
  scf_control_id: string;
  score: number;
  confidence_score: string;
  rationale: string;
  evidence_coverage: string;
  created_at: string;
  updated_at: string;
};

export type MaturityVersionRepository = {
  create(record: MaturityVersionRecord): Promise<void>;
  get(id: string, tenantId: string): Promise<MaturityVersionRecord | null>;
  listByAssessment(assessmentId: string, tenantId: string): Promise<MaturityVersionRecord[]>;
  update(record: MaturityVersionRecord): Promise<void>;
};

export type MaturityScoreRepository = {
  saveBatch(records: MaturityScoreRecord[]): Promise<void>;
  listByVersion(versionId: string, tenantId: string): Promise<MaturityScoreRecord[]>;
};

export type MaturityRepositories = {
  versions: MaturityVersionRepository;
  scores: MaturityScoreRepository;
};

// ---------- Implementations ----------

export const createDrizzleMaturityVersionRepository = (db: DbClient): MaturityVersionRepository => ({
  async create(record) {
    await db.insert(maturityAssessmentVersions).values({
      id: record.id,
      organizationId: record.organization_id,
      assessmentId: record.assessment_id,
      versionNumber: record.version_number,
      status: record.status as "draft" | "under_review" | "approved" | "superseded" | "archived",
      approvalEventId: record.approval_event_id,
      createdByAgentRunId: record.created_by_agent_run_id,
    }).onConflictDoNothing();
  },

  async get(id, tenantId) {
    const [row] = await db.select().from(maturityAssessmentVersions)
      .where(eq(maturityAssessmentVersions.id, id))
      .limit(1);
    return row ? mapVersionRow(row) : null;
  },

  async listByAssessment(assessmentId, tenantId) {
    const rows = await db.select().from(maturityAssessmentVersions)
      .where(eq(maturityAssessmentVersions.assessmentId, assessmentId));
    return rows.map(mapVersionRow);
  },

  async update(record) {
    await db.update(maturityAssessmentVersions).set({
      status: record.status as "draft" | "under_review" | "approved" | "superseded" | "archived",
      approvalEventId: record.approval_event_id,
      updatedAt: new Date(),
    }).where(eq(maturityAssessmentVersions.id, record.id));
  },
});

type VersionRow = typeof maturityAssessmentVersions.$inferSelect;
const mapVersionRow = (row: VersionRow): MaturityVersionRecord => ({
  id: row.id,
  tenant_id: row.organizationId,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  version_number: row.versionNumber,
  status: row.status,
  ...(row.approvalEventId ? { approval_event_id: row.approvalEventId } : {}),
  ...(row.createdByAgentRunId ? { created_by_agent_run_id: row.createdByAgentRunId } : {}),
  created_at: row.createdAt.toISOString(),
  updated_at: row.updatedAt.toISOString(),
});

export const createDrizzleMaturityScoreRepository = (db: DbClient): MaturityScoreRepository => ({
  async saveBatch(records) {
    if (records.length === 0) return;
    await db.insert(maturityScores).values(
      records.map((r) => ({
        id: r.id,
        organizationId: r.organization_id,
        assessmentId: r.assessment_id,
        maturityAssessmentVersionId: r.maturity_assessment_version_id,
        scfControlId: r.scf_control_id,
        score: r.score,
        confidenceScore: r.confidence_score,
        rationale: r.rationale,
        evidenceCoverage: r.evidence_coverage,
      }))
    ).onConflictDoNothing();
  },

  async listByVersion(versionId, tenantId) {
    const rows = await db.select().from(maturityScores)
      .where(eq(maturityScores.maturityAssessmentVersionId, versionId));
    return rows.map(mapScoreRow);
  },
});

type ScoreRow = typeof maturityScores.$inferSelect;
const mapScoreRow = (row: ScoreRow): MaturityScoreRecord => ({
  id: row.id,
  tenant_id: row.organizationId,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  maturity_assessment_version_id: row.maturityAssessmentVersionId,
  scf_control_id: row.scfControlId,
  score: row.score,
  confidence_score: row.confidenceScore,
  rationale: row.rationale,
  evidence_coverage: row.evidenceCoverage,
  created_at: row.createdAt.toISOString(),
  updated_at: row.updatedAt.toISOString(),
});

// ---------- Factory ----------

export const createDrizzleMaturityRepositories = (db: DbClient): MaturityRepositories => ({
  versions: createDrizzleMaturityVersionRepository(db),
  scores: createDrizzleMaturityScoreRepository(db),
});

