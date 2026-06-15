// @ts-nocheck -- Zod v4 CI type compat
/**
 * TPRA Repository â€” Third-Party Risk Assessment persistence
 *
 * Persiste vendors, assessments e risk scores nas tabelas criadas na Surgery 1.
 * Segue o padrÃ£o de repositÃ³rio Drizzle + in-memory fallback do projecto.
 *
 * Tabelas: tpra_vendors, tpra_assessments, tpra_risk_scores
 * Multi-tenancy: todo acesso escopo por organizationId.
 */

import { eq, and, desc } from "drizzle-orm";
import {
  tpraVendors,
  tpraAssessments,
  tpraRiskScores,
} from "@standard/schemas";
import type { DbClient } from "./db";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type TpraVendorRecord = {
  id: string;
  organization_id: string;
  vendor_name: string;
  vendor_type: string | null;
  contact_email: string | null;
  metadata: Record<string, unknown>;
  trace_id: string;
  created_at: Date;
  updated_at: Date;
};

export type TpraVendorCreateInput = {
  organization_id: string;
  vendor_name: string;
  vendor_type?: string | null;
  contact_email?: string | null;
  metadata?: Record<string, unknown>;
  trace_id: string;
};

export type TpraAssessmentRecord = {
  id: string;
  organization_id: string;
  vendor_id: string;
  assessment_id: string | null;
  status: "draft" | "in_review" | "submitted" | "completed" | "cancelled";
  submitted_at: Date | null;
  responses: Record<string, unknown>;
  scf_version_id: string;
  trace_id: string;
  created_at: Date;
  updated_at: Date;
};

export type TpraAssessmentCreateInput = {
  organization_id: string;
  vendor_id: string;
  assessment_id?: string | null;
  scf_version_id: string;
  responses?: Record<string, unknown>;
  trace_id: string;
};

export type TpraRiskScoreRecord = {
  id: string;
  organization_id: string;
  tpra_assessment_id: string;
  vendor_id: string;
  raw_score: string; // NUMERIC from DB â†’ string
  risk_category: "low" | "medium" | "high" | "critical";
  scf_domain_failures: string[];
  scf_version_id: string;
  trace_id: string;
  computed_at: Date;
};

export type TpraRiskScoreCreateInput = {
  organization_id: string;
  tpra_assessment_id: string;
  vendor_id: string;
  raw_score: string; // NUMERIC precision 5,2 â€” must be string
  risk_category: TpraRiskScoreRecord["risk_category"];
  scf_domain_failures: string[];
  scf_version_id: string;
  trace_id: string;
};

// â”€â”€ Adapter Interface â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface TpraRepositoryAdapter {
  vendors: {
    create(input: TpraVendorCreateInput): Promise<TpraVendorRecord>;
    get(
      vendorId: string,
      organizationId: string,
    ): Promise<TpraVendorRecord | null>;
    list(organizationId: string): Promise<TpraVendorRecord[]>;
    update(
      vendorId: string,
      organizationId: string,
      patch: Partial<
        Pick<
          TpraVendorRecord,
          "vendor_name" | "vendor_type" | "contact_email" | "metadata"
        >
      >,
    ): Promise<TpraVendorRecord | null>;
  };
  assessments: {
    create(input: TpraAssessmentCreateInput): Promise<TpraAssessmentRecord>;
    get(
      id: string,
      organizationId: string,
    ): Promise<TpraAssessmentRecord | null>;
    listByVendor(
      vendorId: string,
      organizationId: string,
    ): Promise<TpraAssessmentRecord[]>;
    submit(
      id: string,
      organizationId: string,
      responses: Record<string, unknown>,
    ): Promise<TpraAssessmentRecord | null>;
  };
  riskScores: {
    /** Append-only â€” no update/delete */
    append(input: TpraRiskScoreCreateInput): Promise<TpraRiskScoreRecord>;
    /** Latest score for a tpra assessment */
    latest(
      tpraAssessmentId: string,
      organizationId: string,
    ): Promise<TpraRiskScoreRecord | null>;
    listByVendor(
      vendorId: string,
      organizationId: string,
    ): Promise<TpraRiskScoreRecord[]>;
  };
}

// â”€â”€ Row Mappers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type VendorRow = typeof tpraVendors.$inferSelect;
type AssessmentRow = typeof tpraAssessments.$inferSelect;
type RiskScoreRow = typeof tpraRiskScores.$inferSelect;

const mapVendor = (row: VendorRow): TpraVendorRecord => ({
  id: row.id,
  organization_id: row.organizationId,
  vendor_name: row.vendorName,
  vendor_type: row.vendorType ?? null,
  contact_email: row.contactEmail ?? null,
  metadata: row.metadata as Record<string, unknown>,
  trace_id: row.traceId,
  created_at: row.createdAt!,
  updated_at: row.updatedAt!,
});

const mapAssessment = (row: AssessmentRow): TpraAssessmentRecord => ({
  id: row.id,
  organization_id: row.organizationId,
  vendor_id: row.vendorId,
  assessment_id: row.assessmentId ?? null,
  status: row.status as TpraAssessmentRecord["status"],
  submitted_at: row.submittedAt ?? null,
  responses: row.responses as Record<string, unknown>,
  scf_version_id: row.scfVersionId,
  trace_id: row.traceId,
  created_at: row.createdAt!,
  updated_at: row.updatedAt!,
});

const mapRiskScore = (row: RiskScoreRow): TpraRiskScoreRecord => ({
  id: row.id,
  organization_id: row.organizationId,
  tpra_assessment_id: row.tpraAssessmentId,
  vendor_id: row.vendorId,
  raw_score: String(row.rawScore),
  risk_category: row.riskCategory as TpraRiskScoreRecord["risk_category"],
  scf_domain_failures: row.scfDomainFailures as string[],
  scf_version_id: row.scfVersionId,
  trace_id: row.traceId,
  computed_at: row.computedAt,
});

// â”€â”€ In-Memory (dev/test fallback) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const createTpraRepository = (): TpraRepositoryAdapter => {
  const vendors: TpraVendorRecord[] = [];
  const assessments: TpraAssessmentRecord[] = [];
  const riskScores: TpraRiskScoreRecord[] = [];
  const now = () => new Date();

  return {
    vendors: {
      async create(input) {
        const record: TpraVendorRecord = {
          id: crypto.randomUUID(),
          organization_id: input.organization_id,
          vendor_name: input.vendor_name,
          vendor_type: input.vendor_type ?? null,
          contact_email: input.contact_email ?? null,
          metadata: input.metadata ?? {},
          trace_id: input.trace_id,
          created_at: now(),
          updated_at: now(),
        };
        vendors.push(record);
        return record;
      },
      async get(vendorId, organizationId) {
        return (
          vendors.find(
            (v) => v.id === vendorId && v.organization_id === organizationId,
          ) ?? null
        );
      },
      async list(organizationId) {
        return vendors.filter((v) => v.organization_id === organizationId);
      },
      async update(vendorId, organizationId, patch) {
        const idx = vendors.findIndex(
          (v) => v.id === vendorId && v.organization_id === organizationId,
        );
        if (idx === -1) return null;
        vendors[idx] = { ...vendors[idx]!, ...patch, updated_at: now() };
        return vendors[idx]!;
      },
    },
    assessments: {
      async create(input) {
        const record: TpraAssessmentRecord = {
          id: crypto.randomUUID(),
          organization_id: input.organization_id,
          vendor_id: input.vendor_id,
          assessment_id: input.assessment_id ?? null,
          status: "draft",
          submitted_at: null,
          responses: input.responses ?? {},
          scf_version_id: input.scf_version_id,
          trace_id: input.trace_id,
          created_at: now(),
          updated_at: now(),
        };
        assessments.push(record);
        return record;
      },
      async get(id, organizationId) {
        return (
          assessments.find(
            (a) => a.id === id && a.organization_id === organizationId,
          ) ?? null
        );
      },
      async listByVendor(vendorId, organizationId) {
        return assessments.filter(
          (a) =>
            a.vendor_id === vendorId && a.organization_id === organizationId,
        );
      },
      async submit(id, organizationId, responses) {
        const idx = assessments.findIndex(
          (a) => a.id === id && a.organization_id === organizationId,
        );
        if (idx === -1) return null;
        assessments[idx] = {
          ...assessments[idx]!,
          status: "submitted",
          submitted_at: now(),
          responses,
          updated_at: now(),
        };
        return assessments[idx]!;
      },
    },
    riskScores: {
      async append(input) {
        const record: TpraRiskScoreRecord = {
          id: crypto.randomUUID(),
          ...input,
          computed_at: now(),
        };
        riskScores.push(record);
        return record;
      },
      async latest(tpraAssessmentId, organizationId) {
        return (
          riskScores
            .filter(
              (r) =>
                r.tpra_assessment_id === tpraAssessmentId &&
                r.organization_id === organizationId,
            )
            .sort(
              (a, b) => b.computed_at.getTime() - a.computed_at.getTime(),
            )[0] ?? null
        );
      },
      async listByVendor(vendorId, organizationId) {
        return riskScores
          .filter(
            (r) =>
              r.vendor_id === vendorId && r.organization_id === organizationId,
          )
          .sort((a, b) => b.computed_at.getTime() - a.computed_at.getTime());
      },
    },
  };
};

// â”€â”€ Drizzle (production) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const createDrizzleTpraRepository = (
  db: DbClient,
): TpraRepositoryAdapter => ({
  vendors: {
    async create(input) {
      const [row] = await db
        .insert(tpraVendors)
        .values({
          organizationId: input.organization_id,
          vendorName: input.vendor_name,
          vendorType: (input.vendor_type ?? null) as VendorRow["vendorType"],
          contactEmail: input.contact_email ?? null,
          metadata: input.metadata ?? {},
          traceId: input.trace_id,
        })
        .returning();
      if (!row) throw new Error("[TPRA] Failed to insert vendor.");
      return mapVendor(row);
    },
    async get(vendorId, organizationId) {
      const [row] = await db
        .select()
        .from(tpraVendors)
        .where(
          and(
            eq(tpraVendors.id, vendorId),
            eq(tpraVendors.organizationId, organizationId),
          ),
        )
        .limit(1);
      return row ? mapVendor(row) : null;
    },
    async list(organizationId) {
      const rows = await db
        .select()
        .from(tpraVendors)
        .where(eq(tpraVendors.organizationId, organizationId));
      return rows.map(mapVendor);
    },
    async update(vendorId, organizationId, patch) {
      const [row] = await db
        .update(tpraVendors)
        .set({
          ...(patch.vendor_name !== undefined && {
            vendorName: patch.vendor_name,
          }),
          ...(patch.vendor_type !== undefined && {
            vendorType: patch.vendor_type as VendorRow["vendorType"],
          }),
          ...(patch.contact_email !== undefined && {
            contactEmail: patch.contact_email,
          }),
          ...(patch.metadata !== undefined && { metadata: patch.metadata }),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(tpraVendors.id, vendorId),
            eq(tpraVendors.organizationId, organizationId),
          ),
        )
        .returning();
      return row ? mapVendor(row) : null;
    },
  },

  assessments: {
    async create(input) {
      const [row] = await db
        .insert(tpraAssessments)
        .values({
          organizationId: input.organization_id,
          vendorId: input.vendor_id,
          assessmentId: input.assessment_id ?? null,
          status: "draft",
          responses: input.responses ?? {},
          scfVersionId: input.scf_version_id,
          traceId: input.trace_id,
        })
        .returning();
      if (!row) throw new Error("[TPRA] Failed to insert assessment.");
      return mapAssessment(row);
    },
    async get(id, organizationId) {
      const [row] = await db
        .select()
        .from(tpraAssessments)
        .where(
          and(
            eq(tpraAssessments.id, id),
            eq(tpraAssessments.organizationId, organizationId),
          ),
        )
        .limit(1);
      return row ? mapAssessment(row) : null;
    },
    async listByVendor(vendorId, organizationId) {
      const rows = await db
        .select()
        .from(tpraAssessments)
        .where(
          and(
            eq(tpraAssessments.vendorId, vendorId),
            eq(tpraAssessments.organizationId, organizationId),
          ),
        )
        .orderBy(desc(tpraAssessments.createdAt));
      return rows.map(mapAssessment);
    },
    async submit(id, organizationId, responses) {
      const [row] = await db
        .update(tpraAssessments)
        .set({
          status: "submitted",
          submittedAt: new Date(),
          responses,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(tpraAssessments.id, id),
            eq(tpraAssessments.organizationId, organizationId),
          ),
        )
        .returning();
      return row ? mapAssessment(row) : null;
    },
  },

  riskScores: {
    async append(input) {
      // â›” INSERT only â€” append-only (aligns with ADR-002 spirit)
      const [row] = await db
        .insert(tpraRiskScores)
        .values({
          organizationId: input.organization_id,
          tpraAssessmentId: input.tpra_assessment_id,
          vendorId: input.vendor_id,
          rawScore: input.raw_score,
          riskCategory: input.risk_category as RiskScoreRow["riskCategory"],
          scfDomainFailures: input.scf_domain_failures,
          scfVersionId: input.scf_version_id,
          traceId: input.trace_id,
        })
        .returning();
      if (!row) throw new Error("[TPRA] Failed to insert risk score.");
      return mapRiskScore(row);
    },
    async latest(tpraAssessmentId, organizationId) {
      const [row] = await db
        .select()
        .from(tpraRiskScores)
        .where(
          and(
            eq(tpraRiskScores.tpraAssessmentId, tpraAssessmentId),
            eq(tpraRiskScores.organizationId, organizationId),
          ),
        )
        .orderBy(desc(tpraRiskScores.computedAt))
        .limit(1);
      return row ? mapRiskScore(row) : null;
    },
    async listByVendor(vendorId, organizationId) {
      const rows = await db
        .select()
        .from(tpraRiskScores)
        .where(
          and(
            eq(tpraRiskScores.vendorId, vendorId),
            eq(tpraRiskScores.organizationId, organizationId),
          ),
        )
        .orderBy(desc(tpraRiskScores.computedAt));
      return rows.map(mapRiskScore);
    },
  },
});

