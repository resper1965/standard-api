/**
 * @module adapters/risk-register.repository
 * @description Drizzle repository for Assessment Risk Register.
 *
 * Multi-tenancy enforced via organization_id + assessment_id on every query.
 * Extracted from risk-register.routes.ts to enforce the rule:
 * "no Drizzle queries inside route handlers" (AGENTS.md §5).
 *
 * ADR-014: within_tolerance = residual_risk_score <= risk_tolerance_input
 */
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { assessmentRiskRegister, gapFindings } from "@standard/schemas";

type DrizzleDbClient = {
  select(): any;
  insert(table: any): any;
  update(table: any): any;
  delete(table: any): any;
};

type RiskRegisterRow = typeof assessmentRiskRegister.$inferSelect;
type GapFindingRow = typeof gapFindings.$inferSelect;

// --- Risk category derivation (ADR-014 §SCR-RMM Step 12) ---

export const deriveRiskCategory = (
  score: number,
): "low" | "moderate" | "high" | "severe" | "extreme" => {
  if (score < 0.2) return "low";
  if (score < 0.4) return "moderate";
  if (score < 0.6) return "high";
  if (score < 0.8) return "severe";
  return "extreme";
};

// --- Repository contract ---

export type CreateRiskRegisterInput = {
  organization_id: string;
  assessment_id: string;
  scf_version_id: string;
  gap_finding_id: string;
  scf_risk_id?: string | null;
  risk_title: string;
  risk_description?: string | null;
  treatment: string;
  treatment_rationale?: string | null;
  owner_id?: string | null;
  review_date?: string | null;
  risk_appetite?: number;
  risk_tolerance?: number;
  risk_threshold?: number;
  trace_id: string;
};

export type CreateRiskRegisterWithScoresInput = CreateRiskRegisterInput & {
  inherent_risk_score: number | null;
  residual_risk_score: number | null;
  risk_category: "low" | "moderate" | "high" | "severe" | "extreme" | null;
  roc_determination: string | null;
  within_tolerance: boolean | null;
};

export type UpdateRiskRegisterInput = {
  risk_title?: string;
  risk_description?: string | null;
  treatment?: string;
  treatment_rationale?: string | null;
  owner_id?: string | null;
  review_date?: string | null;
  scf_risk_id?: string | null;
  risk_appetite?: number;
  risk_tolerance?: number;
  risk_threshold?: number;
};

export type RiskRegisterRepository = {
  findGapFinding(
    gapFindingId: string,
    organizationId: string,
  ): Promise<GapFindingRow | null>;
  create(input: CreateRiskRegisterInput): Promise<RiskRegisterRow>;
  createWithScores(
    input: CreateRiskRegisterWithScoresInput,
  ): Promise<RiskRegisterRow>;
  list(
    assessmentId: string,
    organizationId: string,
  ): Promise<RiskRegisterRow[]>;
  get(
    entryId: string,
    assessmentId: string,
    organizationId: string,
  ): Promise<RiskRegisterRow | null>;
  update(
    entryId: string,
    organizationId: string,
    patch: UpdateRiskRegisterInput,
  ): Promise<RiskRegisterRow | null>;
  delete(
    entryId: string,
    assessmentId: string,
    organizationId: string,
  ): Promise<boolean>;
};

// --- Factory ---

export const createDrizzleRiskRegisterRepository = (
  db: DrizzleDbClient,
): RiskRegisterRepository => ({
  async findGapFinding(gapFindingId, organizationId) {
    const [finding] = await db
      .select()
      .from(gapFindings)
      .where(
        and(
          eq(gapFindings.id, gapFindingId),
          eq(gapFindings.organizationId, organizationId),
        ),
      )
      .limit(1);
    return finding ?? null;
  },

  async create(input) {
    const entryId = randomUUID();
    const now = new Date();

    await db.insert(assessmentRiskRegister).values({
      id: entryId,
      organizationId: input.organization_id,
      assessmentId: input.assessment_id,
      scfVersionId: input.scf_version_id,
      gapFindingId: input.gap_finding_id,
      scfRiskId: input.scf_risk_id ?? null,
      riskTitle: input.risk_title,
      riskDescription: input.risk_description ?? null,
      inherentRiskScore: null,
      residualRiskScore: null,
      riskCategory: null,
      treatment: input.treatment,
      treatmentRationale: input.treatment_rationale ?? null,
      ownerId: input.owner_id ?? null,
      reviewDate: input.review_date ?? null,
      rocDetermination: null,
      riskAppetiteInput:
        input.risk_appetite !== undefined ? String(input.risk_appetite) : null,
      riskToleranceInput:
        input.risk_tolerance !== undefined
          ? String(input.risk_tolerance)
          : null,
      riskThresholdInput:
        input.risk_threshold !== undefined
          ? String(input.risk_threshold)
          : null,
      withinTolerance: null,
      traceId: input.trace_id,
      createdAt: now,
      updatedAt: now,
    } as any);

    const [entry] = await db
      .select()
      .from(assessmentRiskRegister)
      .where(eq(assessmentRiskRegister.id, entryId))
      .limit(1);

    return entry!;
  },

  async createWithScores(input) {
    const entryId = randomUUID();
    const now = new Date();

    await db.insert(assessmentRiskRegister).values({
      id: entryId,
      organizationId: input.organization_id,
      assessmentId: input.assessment_id,
      scfVersionId: input.scf_version_id,
      gapFindingId: input.gap_finding_id,
      scfRiskId: input.scf_risk_id ?? null,
      riskTitle: input.risk_title,
      riskDescription: input.risk_description ?? null,
      inherentRiskScore:
        input.inherent_risk_score !== null
          ? String(input.inherent_risk_score)
          : null,
      residualRiskScore:
        input.residual_risk_score !== null
          ? String(input.residual_risk_score)
          : null,
      riskCategory: input.risk_category,
      treatment: input.treatment,
      treatmentRationale: input.treatment_rationale ?? null,
      ownerId: input.owner_id ?? null,
      reviewDate: input.review_date ?? null,
      rocDetermination: input.roc_determination,
      riskAppetiteInput:
        input.risk_appetite !== undefined ? String(input.risk_appetite) : null,
      riskToleranceInput:
        input.risk_tolerance !== undefined
          ? String(input.risk_tolerance)
          : null,
      riskThresholdInput:
        input.risk_threshold !== undefined
          ? String(input.risk_threshold)
          : null,
      withinTolerance: input.within_tolerance,
      traceId: input.trace_id,
      createdAt: now,
      updatedAt: now,
    } as any);

    const [entry] = await db
      .select()
      .from(assessmentRiskRegister)
      .where(eq(assessmentRiskRegister.id, entryId))
      .limit(1);

    return entry!;
  },

  async list(assessmentId, organizationId) {
    return db
      .select()
      .from(assessmentRiskRegister)
      .where(
        and(
          eq(assessmentRiskRegister.organizationId, organizationId),
          eq(assessmentRiskRegister.assessmentId, assessmentId),
        ),
      );
  },

  async get(entryId, assessmentId, organizationId) {
    const [entry] = await db
      .select()
      .from(assessmentRiskRegister)
      .where(
        and(
          eq(assessmentRiskRegister.id, entryId),
          eq(assessmentRiskRegister.organizationId, organizationId),
          eq(assessmentRiskRegister.assessmentId, assessmentId),
        ),
      )
      .limit(1);
    return entry ?? null;
  },

  async update(entryId, organizationId, patch) {
    const [existing] = await db
      .select()
      .from(assessmentRiskRegister)
      .where(
        and(
          eq(assessmentRiskRegister.id, entryId),
          eq(assessmentRiskRegister.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!existing) return null;

    const residualScore = existing.residualRiskScore
      ? Number(existing.residualRiskScore)
      : null;
    const newTolerance =
      patch.risk_tolerance !== undefined
        ? patch.risk_tolerance
        : existing.riskToleranceInput !== null
          ? Number(existing.riskToleranceInput)
          : null;
    const withinTolerance =
      residualScore !== null && newTolerance !== null
        ? residualScore <= newTolerance
        : existing.withinTolerance;

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
      withinTolerance,
      ...(patch.risk_title !== undefined && { riskTitle: patch.risk_title }),
      ...(patch.risk_description !== undefined && {
        riskDescription: patch.risk_description,
      }),
      ...(patch.treatment !== undefined && { treatment: patch.treatment }),
      ...(patch.treatment_rationale !== undefined && {
        treatmentRationale: patch.treatment_rationale,
      }),
      ...(patch.owner_id !== undefined && { ownerId: patch.owner_id }),
      ...(patch.review_date !== undefined && { reviewDate: patch.review_date }),
      ...(patch.scf_risk_id !== undefined && { scfRiskId: patch.scf_risk_id }),
      ...(patch.risk_appetite !== undefined && {
        riskAppetiteInput: String(patch.risk_appetite),
      }),
      ...(patch.risk_tolerance !== undefined && {
        riskToleranceInput: String(patch.risk_tolerance),
      }),
      ...(patch.risk_threshold !== undefined && {
        riskThresholdInput: String(patch.risk_threshold),
      }),
    };

    await db
      .update(assessmentRiskRegister)
      .set(updates)
      .where(
        and(
          eq(assessmentRiskRegister.id, entryId),
          eq(assessmentRiskRegister.organizationId, organizationId),
        ),
      );

    const [updated] = await db
      .select()
      .from(assessmentRiskRegister)
      .where(eq(assessmentRiskRegister.id, entryId))
      .limit(1);

    return updated ?? null;
  },

  async delete(entryId, assessmentId, organizationId) {
    const [existing] = await db
      .select()
      .from(assessmentRiskRegister)
      .where(
        and(
          eq(assessmentRiskRegister.id, entryId),
          eq(assessmentRiskRegister.organizationId, organizationId),
          eq(assessmentRiskRegister.assessmentId, assessmentId),
        ),
      )
      .limit(1);

    if (!existing) return false;

    await db
      .delete(assessmentRiskRegister)
      .where(
        and(
          eq(assessmentRiskRegister.id, entryId),
          eq(assessmentRiskRegister.organizationId, organizationId),
        ),
      );

    return true;
  },
});
