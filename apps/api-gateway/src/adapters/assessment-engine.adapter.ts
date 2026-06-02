/**
 * @module assessment-engine.adapter
 * @description Builds AssessmentSnapshot from real PostgreSQL state.
 * Queries assessments, documents, extraction jobs, SoA, gap analysis, maturity,
 * POA&M, and report tables to compute boolean prerequisite flags.
 */
import { eq, and, count } from "drizzle-orm";
import {
  assessments,
  documents,
  documentExtractionJobs,
  soaVersions,
  gapAnalysisVersions,
  maturityAssessmentVersions,
  poamVersions,
  reportVersions,
  approvalEvents,
} from "@standard/schemas";
import type { AssessmentSnapshot } from "@standard/assessment-engine";
import type { DbClient } from "./db";

export type AssessmentSnapshotBuilder = {
  build(assessmentId: string, tenantId: string, organizationId: string): Promise<AssessmentSnapshot | null>;
};

export const createDrizzleAssessmentSnapshotBuilder = (db: DbClient): AssessmentSnapshotBuilder => ({
  async build(assessmentId, tenantId, organizationId) {
    // 1. Get base assessment
    const [assessment] = await db.select().from(assessments)
      .where(and(
        eq(assessments.id, assessmentId),
        eq(assessments.organizationId, organizationId)
      ))
      .limit(1);
    if (!assessment) return null;

    // 2. Count documents
    const [docCount] = await db.select({ count: count() }).from(documents)
      .where(and(eq(documents.assessmentId, assessmentId), ));
    const documentCount = docCount?.count ?? 0;

    // 3. Check extraction jobs
    const extractionJobs = await db.select().from(documentExtractionJobs)
      .where(and(eq(documentExtractionJobs.assessmentId, assessmentId), ));
    const requiredDocumentJobsComplete = extractionJobs.length === 0 ||
      extractionJobs.every(j => j.status === "completed" || j.status === "cancelled");

    // 4. SoA state
    const soaVersionsList = await db.select().from(soaVersions)
      .where(and(eq(soaVersions.assessmentId, assessmentId), ));
    const soaDraftVersionComplete = soaVersionsList.length > 0;
    const soaApproved = soaVersionsList.some(v => v.status === "approved");

    // 5. Gap Analysis state
    const gapVersionsList = await db.select().from(gapAnalysisVersions)
      .where(and(eq(gapAnalysisVersions.assessmentId, assessmentId), ));
    const gapAnalysisDrafted = gapVersionsList.length > 0;
    const gapAnalysisApproved = gapVersionsList.some(v => v.status === "approved");

    // 6. Maturity state
    const maturityVersionsList = await db.select().from(maturityAssessmentVersions)
      .where(and(eq(maturityAssessmentVersions.assessmentId, assessmentId), ));
    const maturityAssessed = maturityVersionsList.length > 0;
    const maturityApproved = maturityVersionsList.some(v => v.status === "approved");

    // 7. POA&M state
    const poamVersionsList = await db.select().from(poamVersions)
      .where(and(eq(poamVersions.assessmentId, assessmentId), ));
    const poamDrafted = poamVersionsList.length > 0;
    const poamApproved = poamVersionsList.some(v => v.status === "approved");

    // 8. Report state
    const reportVersionsList = await db.select().from(reportVersions)
      .where(and(eq(reportVersions.assessmentId, assessmentId), ));
    const reportGenerated = reportVersionsList.length > 0;

    // 9. Report approval events
    const reportApprovalEvents = reportVersionsList.length > 0
      ? await db.select().from(approvalEvents)
          .where(and(
            eq(approvalEvents.assessmentId, assessmentId),
            eq(approvalEvents.gate, "report"),
            eq(approvalEvents.decision, "approved"),
          ))
      : [];
    const reportApproved = reportApprovalEvents.length > 0;

    // 10. Infer state-based flags from assessment.state
    const state = assessment.state;
    const stateIndex = stateOrder.indexOf(state as typeof stateOrder[number]);

    return {
      id: assessment.id,
      tenantId: assessment.organizationId,
      organizationId: assessment.organizationId,
      state: assessment.state,
      documentCount,
      requiredDocumentJobsComplete,
      scfPreAnalysisRegistered: stateIndex >= stateOrder.indexOf("scf_pre_analysis_ready"),
      frameworkSelected: stateIndex >= stateOrder.indexOf("framework_selected"),
      scopeDrafted: stateIndex >= stateOrder.indexOf("scope_drafted"),
      soaDraftVersionComplete,
      soaApproved,
      soaIngested: stateIndex >= stateOrder.indexOf("soa_ingested"),
      evidenceAnalysisReady: stateIndex >= stateOrder.indexOf("evidence_analysis_ready"),
      gapAnalysisDrafted,
      gapAnalysisApproved,
      maturityAssessed,
      maturityApproved,
      poamDrafted,
      poamApproved,
      reportGenerated,
      reportApproved,
    };
  },
});

/**
 * Ordered assessment states for index-based comparison.
 */
const stateOrder = [
  "draft",
  "documents_uploaded",
  "documents_ingested",
  "scf_pre_analysis_ready",
  "framework_selected",
  "scope_drafted",
  "soa_drafted",
  "soa_under_review",
  "soa_approved",
  "soa_ingested",
  "evidence_analysis_ready",
  "gap_analysis_drafted",
  "gap_analysis_under_review",
  "gap_analysis_approved",
  "maturity_assessed",
  "maturity_under_review",
  "maturity_approved",
  "poam_drafted",
  "poam_under_review",
  "poam_approved",
  "report_generated",
  "closed",
  "archived",
] as const;

