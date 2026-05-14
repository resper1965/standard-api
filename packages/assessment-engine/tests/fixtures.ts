import type { AssessmentSnapshot, TransitionContext } from "../src/types";

export const ids = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  organizationId: "22222222-2222-4222-8222-222222222222",
  assessmentId: "33333333-3333-4333-8333-333333333333",
  actorId: "44444444-4444-4444-8444-444444444444",
  traceId: "trace-test-0001"
};

export const baseContext = (overrides: Partial<TransitionContext> = {}): TransitionContext => ({
  tenantId: ids.tenantId,
  organizationId: ids.organizationId,
  assessmentId: ids.assessmentId,
  actorId: ids.actorId,
  reason: "unit test transition",
  traceId: ids.traceId,
  occurredAt: "2026-04-28T17:00:00.000Z",
  idempotencyKey: "idem-test-0001",
  metadata: { synthetic: true },
  ...overrides
});

export const assessment = (overrides: Partial<AssessmentSnapshot> = {}): AssessmentSnapshot => ({
  id: ids.assessmentId,
  tenantId: ids.tenantId,
  organizationId: ids.organizationId,
  state: "draft",
  documentCount: 0,
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
  ...overrides
});
