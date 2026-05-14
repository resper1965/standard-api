import { executeTransition, validateTransition } from "../src/engine";
import { requiresApprovalGate } from "../src/approvals";
import { assessment, baseContext } from "./fixtures";
import { expect, expectErrorCode, test } from "./test-kit";

test("bloqueia soa_under_review -> soa_approved sem approval_event", () => {
  expectErrorCode(
    () => validateTransition(assessment({ state: "soa_under_review", soaDraftVersionComplete: true }), "soa_approved", baseContext()),
    "APPROVAL_REQUIRED"
  );
});

test("permite soa_under_review -> soa_approved com approval_event válido", () => {
  const result = executeTransition(
    assessment({ state: "soa_under_review", soaDraftVersionComplete: true }),
    "soa_approved",
    baseContext({
      approvalEvent: {
        id: "55555555-5555-4555-8555-555555555555",
        gate: "soa",
        decision: "approved",
        approvedBy: "44444444-4444-4444-8444-444444444444",
        approvedAt: "2026-04-28T17:00:00.000Z",
        traceId: "trace-test-0001"
      }
    })
  );

  expect(result.assessment.state).toBe("soa_approved");
  expect(result.event.eventType).toBe("soa_approved");
});

test("bloqueia POA&M final sem aprovação", () => {
  expectErrorCode(
    () => validateTransition(assessment({ state: "poam_under_review", poamDrafted: true }), "poam_approved", baseContext()),
    "APPROVAL_REQUIRED"
  );
});

test("identifica gates de aprovação obrigatórios", () => {
  expect(requiresApprovalGate("soa_approved")).toBe("soa");
  expect(requiresApprovalGate("gap_analysis_approved")).toBe("gap_analysis");
  expect(requiresApprovalGate("maturity_approved")).toBe("maturity_assessment");
  expect(requiresApprovalGate("poam_approved")).toBe("poam");
});
