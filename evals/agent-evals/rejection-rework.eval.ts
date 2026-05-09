/**
 * Eval: Rejection/Rework Traceability
 *
 * Validates that:
 * 1. Rejecting an artifact creates a proper rejected status with traceability
 * 2. Creating a reworked version links back to the rejected version
 * 3. Only under_review artifacts can be rejected
 * 4. Only rejected versions can be reworked
 */

import {
  createArtifactVersion,
  markArtifactUnderReview,
  rejectArtifactVersion,
  createReworkedVersion,
} from "../../packages/assessment-engine/src/artifacts";
import type { TransitionContext, RejectionEvent, ArtifactVersion } from "../../packages/assessment-engine/src/types";
import { baseMetrics, fail, failMetric, pass, type AgentEvalCase } from "./eval-kit";

const makeContext = (actor = "eval-actor"): TransitionContext => ({
  assessmentId: "assess-001",
  tenantId: "tenant-001",
  organizationId: "org-001",
  actorId: actor,
  reason: "eval-test",
  occurredAt: new Date().toISOString(),
  traceId: "trace-eval-rejection-001",
});

const makeRejectionEvent = (): RejectionEvent => ({
  id: "rejection-001",
  gate: "gap_analysis",
  decision: "rejected",
  rejectedBy: "reviewer-001",
  rejectedAt: new Date().toISOString(),
  reason: "Insufficient evidence coverage for controls in IAC domain.",
  traceId: "trace-eval-rejection-001",
});

export const rejectionReworkEval: AgentEvalCase = {
  name: "rejection_rework preserves traceability through reject → rework cycle",
  run() {
    const metrics = baseMetrics();

    // 1. Create artifact version → under_review → reject → rework
    const ctx = makeContext();
    const v1 = createArtifactVersion({
      id: "artifact-v1",
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId!,
      assessmentId: ctx.assessmentId,
      artifactType: "gap_analysis",
      createdBy: ctx.actorId!,
      createdAt: ctx.occurredAt,
      traceId: ctx.traceId,
    });

    const underReview = markArtifactUnderReview(v1, ctx);
    const rejectionEvent = makeRejectionEvent();
    const rejected = rejectArtifactVersion(underReview, rejectionEvent);

    // Verify rejection traceability
    if (rejected.status !== "rejected") {
      return fail(this.name, failMetric(metrics, "expected_status_match_rate"));
    }
    if (rejected.rejectedBy !== rejectionEvent.rejectedBy) {
      return fail(this.name, failMetric(metrics, "expected_status_match_rate"));
    }
    if (!rejected.rejectionReason) {
      return fail(this.name, failMetric(metrics, "expected_status_match_rate"));
    }

    // 2. Create reworked version
    const reworked = createReworkedVersion(rejected, ctx, "artifact-v2");

    // Verify rework traceability
    if (reworked.status !== "draft") {
      return fail(this.name, failMetric(metrics, "expected_status_match_rate"));
    }
    if (reworked.supersedesVersionId !== rejected.id) {
      return fail(this.name, failMetric(metrics, "expected_status_match_rate"));
    }
    if (reworked.versionNumber !== rejected.versionNumber + 1) {
      return fail(this.name, failMetric(metrics, "expected_status_match_rate"));
    }

    // 3. Guard: cannot reject a draft
    try {
      rejectArtifactVersion(v1, rejectionEvent);
      // Should have thrown
      return fail(this.name, failMetric(metrics, "approval_bypass_count"));
    } catch {
      // Expected: only under_review can be rejected
    }

    // 4. Guard: cannot rework a non-rejected version
    try {
      createReworkedVersion(underReview, ctx);
      return fail(this.name, failMetric(metrics, "approval_bypass_count"));
    } catch {
      // Expected: only rejected versions can be reworked
    }

    return pass(this.name, metrics);
  },
};
