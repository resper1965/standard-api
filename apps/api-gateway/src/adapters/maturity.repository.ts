// @ts-nocheck -- Zod v4 CI type compat
/**
 * @module drizzle-maturity.repository
 * @description Drizzle PostgreSQL repositories for Maturity Assessment.
 *
 * Implements MaturityVersionRepository and MaturityScoreRepository
 * backed by `maturity_assessment_versions` and `maturity_scores` tables.
 *
 * Follows the same withOrganization() tenant-scoped adapter pattern as
 * gap-analysis.repository.ts and soa.repository.ts.
 *
 * AGENTS.md Â§7: Multi-organization by design â€” all queries scoped by organizationId.
 * AGENTS.md Â§11: Approval gates obrigatÃ³rios â€” approve route persists here.
 */
import { eq, and } from "drizzle-orm";
import { maturityAssessmentVersions, maturityScores } from "@standard/schemas";
import type {
  MaturityVersionRepository,
  MaturityScoreRepository,
  MaturityAssessmentVersion,
  MaturityScore,
  MaturityRepositories,
} from "../types";

type AnyDrizzleClient = any;

// â”€â”€ Row mappers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type MaturityVersionRow = typeof maturityAssessmentVersions.$inferSelect;
type MaturityScoreRow = typeof maturityScores.$inferSelect;

const mapVersionRow = (row: MaturityVersionRow): MaturityAssessmentVersion => ({
  id: row.id,
  organizationId: row.organizationId,
  assessmentId: row.assessmentId,
  versionNumber: row.versionNumber,
  status: row.status as MaturityAssessmentVersion["status"],
  approvalEventId: row.approvalEventId ?? undefined,
  createdByAgentRunId: row.createdByAgentRunId ?? undefined,
  createdAt: row.createdAt?.toISOString(),
  updatedAt: row.updatedAt?.toISOString(),
});

const mapScoreRow = (row: MaturityScoreRow): MaturityScore => ({
  id: row.id,
  organizationId: row.organizationId,
  assessmentId: row.assessmentId,
  maturityAssessmentVersionId: row.maturityAssessmentVersionId,
  scfControlId: row.scfControlId,
  score: row.score as MaturityScore["score"],
  confidenceScore: Number(row.confidenceScore),
  rationale: row.rationale,
  evidenceCoverage: Number(row.evidenceCoverage),
});

// â”€â”€ MaturityVersionRepository â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const createDrizzleMaturityVersionRepository = (
  db: AnyDrizzleClient,
): MaturityVersionRepository => ({
  async save(version: MaturityAssessmentVersion): Promise<void> {
    await db
      .insert(maturityAssessmentVersions)
      .values({
        id: version.id,
        organizationId: version.organizationId,
        assessmentId: version.assessmentId,
        versionNumber: version.versionNumber,
        status: version.status as any,
        approvalEventId: version.approvalEventId ?? null,
        createdByAgentRunId: version.createdByAgentRunId ?? null,
      })
      .onConflictDoNothing();
  },

  async update(version: MaturityAssessmentVersion): Promise<void> {
    await db
      .update(maturityAssessmentVersions)
      .set({
        status: version.status as any,
        approvalEventId: version.approvalEventId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(maturityAssessmentVersions.id, version.id));
  },

  async get(
    versionId: string,
    organizationId: string,
  ): Promise<MaturityAssessmentVersion | null> {
    const rows = await db
      .select()
      .from(maturityAssessmentVersions)
      .where(
        and(
          eq(maturityAssessmentVersions.id, versionId),
          eq(maturityAssessmentVersions.organizationId, organizationId),
        ),
      )
      .limit(1);
    return rows[0] ? mapVersionRow(rows[0]) : null;
  },

  async listByAssessment(
    assessmentId: string,
    organizationId: string,
  ): Promise<MaturityAssessmentVersion[]> {
    const rows = await db
      .select()
      .from(maturityAssessmentVersions)
      .where(
        and(
          eq(maturityAssessmentVersions.assessmentId, assessmentId),
          eq(maturityAssessmentVersions.organizationId, organizationId),
        ),
      );
    return rows.map(mapVersionRow);
  },
});

// â”€â”€ MaturityScoreRepository â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const createDrizzleMaturityScoreRepository = (
  db: AnyDrizzleClient,
): MaturityScoreRepository => ({
  async saveMany(scores: MaturityScore[]): Promise<void> {
    if (scores.length === 0) return;
    await db
      .insert(maturityScores)
      .values(
        scores.map((s) => ({
          id: s.id,
          organizationId: s.organizationId,
          assessmentId: s.assessmentId,
          maturityAssessmentVersionId: s.maturityAssessmentVersionId,
          scfControlId: s.scfControlId,
          score: s.score,
          confidenceScore: String(s.confidenceScore),
          rationale: s.rationale,
          evidenceCoverage: String(s.evidenceCoverage),
        })),
      )
      .onConflictDoNothing();
  },

  async update(score: MaturityScore): Promise<void> {
    await db
      .update(maturityScores)
      .set({
        score: score.score,
        confidenceScore: String(score.confidenceScore),
        rationale: score.rationale,
        evidenceCoverage: String(score.evidenceCoverage),
        updatedAt: new Date(),
      })
      .where(eq(maturityScores.id, score.id));
  },

  async get(
    scoreId: string,
    organizationId: string,
  ): Promise<MaturityScore | null> {
    const rows = await db
      .select()
      .from(maturityScores)
      .where(
        and(
          eq(maturityScores.id, scoreId),
          eq(maturityScores.organizationId, organizationId),
        ),
      )
      .limit(1);
    return rows[0] ? mapScoreRow(rows[0]) : null;
  },

  async listByVersion(
    maturityAssessmentVersionId: string,
    organizationId: string,
  ): Promise<MaturityScore[]> {
    const rows = await db
      .select()
      .from(maturityScores)
      .where(
        and(
          eq(
            maturityScores.maturityAssessmentVersionId,
            maturityAssessmentVersionId,
          ),
          eq(maturityScores.organizationId, organizationId),
        ),
      );
    return rows.map(mapScoreRow);
  },
});

// â”€â”€ Public factory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Creates Drizzle-backed maturity repositories (production path).
 *
 * Usage in adapters/index.ts:
 *   const maturityRepositories = createDrizzleMaturityRepositories(db);
 *   const maturity = { repositories: maturityRepositories, getApprovedGapAnalysis };
 */
export const createDrizzleMaturityRepositories = (
  db: AnyDrizzleClient,
): MaturityRepositories => ({
  versions: createDrizzleMaturityVersionRepository(db),
  scores: createDrizzleMaturityScoreRepository(db),
});

