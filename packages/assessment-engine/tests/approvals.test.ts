import { describe, it, expect } from "vitest";
import { executeTransition, validateTransition } from "../src/engine";
import { requiresApprovalGate } from "../src/approvals";
import { assessment, baseContext } from "./fixtures";

describe("Approval Gates — AGENTS.md §11 (4 gates obrigatórios)", () => {
  it("bloqueia soa_under_review → soa_approved sem approval_event (APPROVAL_REQUIRED)", () => {
    expect(() =>
      validateTransition(
        assessment({ state: "soa_under_review", soaDraftVersionComplete: true }),
        "soa_approved",
        baseContext()
      )
    ).toThrow();

    try {
      validateTransition(
        assessment({ state: "soa_under_review", soaDraftVersionComplete: true }),
        "soa_approved",
        baseContext()
      );
    } catch (err) {
      expect((err as Error & { code: string }).code).toBe("APPROVAL_REQUIRED");
    }
  });

  it("permite soa_under_review → soa_approved com approval_event válido", () => {
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
          traceId: "trace-test-0001",
        },
      })
    );

    expect(result.assessment.state).toBe("soa_approved");
    expect(result.event.eventType).toBe("soa_approved");
  });

  it("bloqueia poam_under_review → poam_approved sem approval_event (APPROVAL_REQUIRED)", () => {
    expect(() =>
      validateTransition(
        assessment({ state: "poam_under_review", gapAnalysisApproved: true, poamDrafted: true }),
        "poam_approved",
        baseContext()
      )
    ).toThrow();

    try {
      validateTransition(
        assessment({ state: "poam_under_review", gapAnalysisApproved: true, poamDrafted: true }),
        "poam_approved",
        baseContext()
      );
    } catch (err) {
      expect((err as Error & { code: string }).code).toBe("APPROVAL_REQUIRED");
    }
  });

  it("requiresApprovalGate identifica gate 'soa' para soa_approved", () => {
    expect(requiresApprovalGate("soa_approved")).toBe("soa");
  });

  it("requiresApprovalGate identifica gate 'gap_analysis' para gap_analysis_approved", () => {
    expect(requiresApprovalGate("gap_analysis_approved")).toBe("gap_analysis");
  });

  it("requiresApprovalGate identifica gate 'maturity_assessment' para maturity_approved", () => {
    expect(requiresApprovalGate("maturity_approved")).toBe("maturity_assessment");
  });

  it("requiresApprovalGate identifica gate 'poam' para poam_approved", () => {
    expect(requiresApprovalGate("poam_approved")).toBe("poam");
  });

  it("requiresApprovalGate retorna undefined para estados sem gate", () => {
    expect(requiresApprovalGate("draft")).toBeUndefined();
    expect(requiresApprovalGate("documents_uploaded")).toBeUndefined();
  });
});
