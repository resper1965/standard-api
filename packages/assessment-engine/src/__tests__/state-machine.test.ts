/**
 * Assessment Engine â€” Lifecycle State Machine Tests
 *
 * Tests all critical state transitions defined in AGENTS.md Â§11.
 * Uses synthetic fixtures only â€” no real tenant data.
 */
import { describe, it, expect } from "vitest";
import { validateTransition } from "../engine";
import { assessmentStates, isTerminalAssessmentState } from "../states";
import type { AssessmentSnapshot, TransitionContext } from "../types";

// â”€â”€â”€ Synthetic Fixtures â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TENANT_ID = "10000000-0000-0000-0000-000000000001";
const ORG_ID = "20000000-0000-0000-0000-000000000001";
const ASSESS_ID = "30000000-0000-0000-0000-000000000001";

function makeSnapshot(
  state: AssessmentSnapshot["state"],
  overrides: Partial<AssessmentSnapshot> = {},
): AssessmentSnapshot {
  return {
    id: ASSESS_ID,
    organizationId: ORG_ID,
    state,
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
    ...overrides,
  };
}

function makeContext(
  overrides: Partial<TransitionContext> = {},
): TransitionContext {
  return {
    organizationId: ORG_ID,
    assessmentId: ASSESS_ID,
    reason: "test",
    traceId: "trace-test-001",
    occurredAt: new Date().toISOString(),
    ...overrides,
  };
}

// â”€â”€â”€ State Catalogue Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("assessmentStates catalogue", () => {
  it("contains the 26 states defined in AGENTS.md", () => {
    expect(assessmentStates).toHaveLength(26);
  });

  it("includes all mandatory AGENTS.md states", () => {
    const required = [
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
      "cancelled",
      "failed",
      "blocked",
    ] as const;
    for (const s of required) {
      expect(assessmentStates).toContain(s);
    }
  });

  it("identifies terminal states correctly", () => {
    expect(isTerminalAssessmentState("closed")).toBe(true);
    expect(isTerminalAssessmentState("archived")).toBe(true);
    expect(isTerminalAssessmentState("failed")).toBe(true);
    expect(isTerminalAssessmentState("cancelled")).toBe(true);
    expect(isTerminalAssessmentState("draft")).toBe(false);
    expect(isTerminalAssessmentState("gap_analysis_approved")).toBe(false);
  });
});

// â”€â”€â”€ Tenant Isolation Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("validateTransition â€” tenant isolation", () => {
  it("throws TENANT_CONTEXT_MISMATCH when organizationId differs", () => {
    const snapshot = makeSnapshot("draft", { documentCount: 1 });
    const ctx = makeContext({
      organizationId: "99999999-0000-0000-0000-000000000001",
    });

    expect(() =>
      validateTransition(snapshot, "documents_uploaded", ctx),
    ).toThrow("does not match assessment tenancy");
  });

  it("throws TENANT_CONTEXT_MISMATCH when organizationId differs", () => {
    const snapshot = makeSnapshot("draft", { documentCount: 1 });
    const ctx = makeContext({
      organizationId: "99999999-0000-0000-0000-000000000002",
    });

    expect(() =>
      validateTransition(snapshot, "documents_uploaded", ctx),
    ).toThrow("does not match assessment tenancy");
  });

  it("throws TENANT_CONTEXT_MISMATCH when assessmentId differs", () => {
    const snapshot = makeSnapshot("draft", { documentCount: 1 });
    const ctx = makeContext({
      assessmentId: "99999999-0000-0000-0000-000000000003",
    });

    expect(() =>
      validateTransition(snapshot, "documents_uploaded", ctx),
    ).toThrow("does not match assessment tenancy");
  });

  it("accepts transition when all tenant fields match", () => {
    const snapshot = makeSnapshot("draft", { documentCount: 1 });
    const ctx = makeContext();
    expect(() =>
      validateTransition(snapshot, "documents_uploaded", ctx),
    ).not.toThrow();
  });
});

// â”€â”€â”€ Valid Transitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("validateTransition â€” valid happy path", () => {
  it("draft â†’ documents_uploaded (with documentCount > 0)", () => {
    const snap = makeSnapshot("draft", { documentCount: 1 });
    expect(() =>
      validateTransition(snap, "documents_uploaded", makeContext()),
    ).not.toThrow();
  });

  it("draft â†’ cancelled (always allowed)", () => {
    const snap = makeSnapshot("draft");
    expect(() =>
      validateTransition(snap, "cancelled", makeContext()),
    ).not.toThrow();
  });

  it("documents_uploaded â†’ documents_ingested (requiredDocumentJobsComplete)", () => {
    const snap = makeSnapshot("documents_uploaded", {
      requiredDocumentJobsComplete: true,
    });
    expect(() =>
      validateTransition(snap, "documents_ingested", makeContext()),
    ).not.toThrow();
  });

  it("documents_ingested â†’ scf_pre_analysis_ready (scfPreAnalysisRegistered)", () => {
    const snap = makeSnapshot("documents_ingested", {
      scfPreAnalysisRegistered: true,
    });
    expect(() =>
      validateTransition(snap, "scf_pre_analysis_ready", makeContext()),
    ).not.toThrow();
  });

  it("scf_pre_analysis_ready â†’ framework_selected (frameworkSelected)", () => {
    const snap = makeSnapshot("scf_pre_analysis_ready", {
      frameworkSelected: true,
    });
    expect(() =>
      validateTransition(snap, "framework_selected", makeContext()),
    ).not.toThrow();
  });

  it("framework_selected â†’ scope_drafted (scopeDrafted)", () => {
    const snap = makeSnapshot("framework_selected", { scopeDrafted: true });
    expect(() =>
      validateTransition(snap, "scope_drafted", makeContext()),
    ).not.toThrow();
  });

  it("scope_drafted â†’ soa_drafted (soaDraftVersionComplete)", () => {
    const snap = makeSnapshot("scope_drafted", {
      soaDraftVersionComplete: true,
    });
    expect(() =>
      validateTransition(snap, "soa_drafted", makeContext()),
    ).not.toThrow();
  });
});

// â”€â”€â”€ Invalid / Blocked Transitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("validateTransition â€” prerequisite enforcement", () => {
  it("blocks documents_uploaded when documentCount is 0", () => {
    const snap = makeSnapshot("draft", { documentCount: 0 });
    expect(() =>
      validateTransition(snap, "documents_uploaded", makeContext()),
    ).toThrow("at_least_one_document");
  });

  it("blocks documents_ingested when jobs not complete", () => {
    const snap = makeSnapshot("documents_uploaded", {
      requiredDocumentJobsComplete: false,
    });
    expect(() =>
      validateTransition(snap, "documents_ingested", makeContext()),
    ).toThrow("required_document_jobs_complete");
  });

  it("blocks closed when report not approved", () => {
    const snap = makeSnapshot("report_generated", {
      reportGenerated: true,
      reportApproved: false,
    });
    // reportGenerated passes — error only mentions the failing prerequisite
    expect(() => validateTransition(snap, "closed", makeContext())).toThrow(
      "report_approved_or_accepted",
    );
  });

  it("blocks non-adjacent transitions (draft â†’ gap_analysis_drafted)", () => {
    const snap = makeSnapshot("draft");
    expect(() =>
      validateTransition(snap, "gap_analysis_drafted", makeContext()),
    ).toThrow("is not allowed");
  });

  it("blocks transition from terminal state (closed â†’ draft)", () => {
    const snap = makeSnapshot("closed");
    expect(() => validateTransition(snap, "draft", makeContext())).toThrow(
      "is not allowed",
    );
  });
});

// â”€â”€â”€ Approval Gate Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("validateTransition â€” approval gates", () => {
  // â”€â”€ SoA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it("blocks soa_approved without approvalEvent", () => {
    const snap = makeSnapshot("soa_under_review", {
      soaDraftVersionComplete: true,
    });
    const ctx = makeContext(); // no approvalEvent
    expect(() => validateTransition(snap, "soa_approved", ctx)).toThrow();
  });

  it("allows soa_approved with valid approvalEvent", () => {
    const snap = makeSnapshot("soa_under_review", {
      soaDraftVersionComplete: true,
    });
    const ctx = makeContext({
      approvalEvent: {
        id: "approval-001",
        gate: "soa",
        decision: "approved",
        approvedBy: "user-001",
        approvedAt: new Date().toISOString(),
        traceId: "trace-001",
      },
    });
    expect(() => validateTransition(snap, "soa_approved", ctx)).not.toThrow();
  });

  // â”€â”€ Gap Analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it("blocks gap_analysis_approved without approvalEvent", () => {
    const snap = makeSnapshot("gap_analysis_under_review", {
      gapAnalysisDrafted: true,
    });
    const ctx = makeContext();
    expect(() =>
      validateTransition(snap, "gap_analysis_approved", ctx),
    ).toThrow();
  });

  it("allows gap_analysis_approved with valid approvalEvent", () => {
    const snap = makeSnapshot("gap_analysis_under_review", {
      gapAnalysisDrafted: true,
    });
    const ctx = makeContext({
      approvalEvent: {
        id: "approval-002",
        gate: "gap_analysis",
        decision: "approved",
        approvedBy: "user-001",
        approvedAt: new Date().toISOString(),
        traceId: "trace-002",
      },
    });
    expect(() =>
      validateTransition(snap, "gap_analysis_approved", ctx),
    ).not.toThrow();
  });

  // â”€â”€ Maturity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it("blocks maturity_approved without approvalEvent", () => {
    const snap = makeSnapshot("maturity_under_review", {
      maturityAssessed: true,
    });
    const ctx = makeContext();
    expect(() => validateTransition(snap, "maturity_approved", ctx)).toThrow();
  });

  it("allows maturity_approved with valid approvalEvent", () => {
    const snap = makeSnapshot("maturity_under_review", {
      gapAnalysisApproved: true,
      maturityAssessed: true,
    });
    const ctx = makeContext({
      approvalEvent: {
        id: "approval-003",
        gate: "maturity_assessment",
        decision: "approved",
        approvedBy: "user-001",
        approvedAt: new Date().toISOString(),
        traceId: "trace-003",
      },
    });
    expect(() =>
      validateTransition(snap, "maturity_approved", ctx),
    ).not.toThrow();
  });

  // â”€â”€ POA&M â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it("blocks poam_approved without approvalEvent", () => {
    const snap = makeSnapshot("poam_under_review", { poamDrafted: true });
    const ctx = makeContext();
    expect(() => validateTransition(snap, "poam_approved", ctx)).toThrow();
  });

  it("allows poam_approved with valid approvalEvent", () => {
    const snap = makeSnapshot("poam_under_review", { poamDrafted: true });
    const ctx = makeContext({
      approvalEvent: {
        id: "approval-004",
        gate: "poam",
        decision: "approved",
        approvedBy: "user-001",
        approvedAt: new Date().toISOString(),
        traceId: "trace-004",
      },
    });
    expect(() => validateTransition(snap, "poam_approved", ctx)).not.toThrow();
  });
});

// â”€â”€â”€ Second-Half Lifecycle Transitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("validateTransition â€” second-half lifecycle (soa_approved â†’ archived)", () => {
  it("soa_approved â†’ soa_ingested", () => {
    const snap = makeSnapshot("soa_approved", { soaApproved: true });
    expect(() =>
      validateTransition(snap, "soa_ingested", makeContext()),
    ).not.toThrow();
  });

  it("soa_ingested â†’ evidence_analysis_ready", () => {
    const snap = makeSnapshot("soa_ingested", { soaIngested: true });
    expect(() =>
      validateTransition(snap, "evidence_analysis_ready", makeContext()),
    ).not.toThrow();
  });

  it("evidence_analysis_ready â†’ gap_analysis_drafted", () => {
    // prerequisites for gap_analysis_drafted: soaApproved + gapAnalysisDrafted
    const snap = makeSnapshot("evidence_analysis_ready", {
      soaApproved: true,
      soaIngested: true,
      evidenceAnalysisReady: true,
      gapAnalysisDrafted: true,
    });
    expect(() =>
      validateTransition(snap, "gap_analysis_drafted", makeContext()),
    ).not.toThrow();
  });

  it("gap_analysis_drafted â†’ gap_analysis_under_review", () => {
    const snap = makeSnapshot("gap_analysis_drafted", {
      soaApproved: true,
      gapAnalysisDrafted: true,
    });
    expect(() =>
      validateTransition(snap, "gap_analysis_under_review", makeContext()),
    ).not.toThrow();
  });

  it("gap_analysis_approved â†’ maturity_assessed", () => {
    // prerequisites for maturity_assessed: gapAnalysisApproved + maturityAssessed
    const snap = makeSnapshot("gap_analysis_approved", {
      gapAnalysisApproved: true,
      maturityAssessed: true,
    });
    expect(() =>
      validateTransition(snap, "maturity_assessed", makeContext()),
    ).not.toThrow();
  });

  it("maturity_assessed â†’ maturity_under_review", () => {
    const snap = makeSnapshot("maturity_assessed", { maturityAssessed: true });
    expect(() =>
      validateTransition(snap, "maturity_under_review", makeContext()),
    ).not.toThrow();
  });

  it("maturity_approved â†’ poam_drafted", () => {
    // prerequisites for poam_drafted: gapAnalysisApproved + poamDrafted
    const snap = makeSnapshot("maturity_approved", {
      gapAnalysisApproved: true,
      maturityApproved: true,
      poamDrafted: true,
    });
    expect(() =>
      validateTransition(snap, "poam_drafted", makeContext()),
    ).not.toThrow();
  });

  it("gap_analysis_approved â†’ poam_drafted (dual entry point)", () => {
    // prerequisites for poam_drafted: gapAnalysisApproved + poamDrafted
    const snap = makeSnapshot("gap_analysis_approved", {
      gapAnalysisApproved: true,
      poamDrafted: true,
    });
    expect(() =>
      validateTransition(snap, "poam_drafted", makeContext()),
    ).not.toThrow();
  });

  it("poam_drafted â†’ poam_under_review", () => {
    const snap = makeSnapshot("poam_drafted", {
      gapAnalysisApproved: true,
      poamDrafted: true,
    });
    expect(() =>
      validateTransition(snap, "poam_under_review", makeContext()),
    ).not.toThrow();
  });

  it("poam_approved â†’ report_generated", () => {
    // prerequisites for report_generated: soaApproved + gapAnalysisApproved + maturityApproved + poamApproved
    const snap = makeSnapshot("poam_approved", {
      soaApproved: true,
      gapAnalysisApproved: true,
      maturityApproved: true,
      poamApproved: true,
    });
    expect(() =>
      validateTransition(snap, "report_generated", makeContext()),
    ).not.toThrow();
  });

  it("report_generated â†’ closed (with reportApproved)", () => {
    const snap = makeSnapshot("report_generated", {
      reportGenerated: true,
      reportApproved: true,
    });
    const ctx = makeContext({
      approvalEvent: {
        id: "approval-report-001",
        gate: "report",
        decision: "approved",
        approvedBy: "user-001",
        approvedAt: new Date().toISOString(),
        traceId: "trace-report-001",
      },
    });
    expect(() => validateTransition(snap, "closed", ctx)).not.toThrow();
  });

  it("closed â†’ archived", () => {
    const snap = makeSnapshot("closed");
    expect(() =>
      validateTransition(snap, "archived", makeContext()),
    ).not.toThrow();
  });

  // Rejection back-loops â€” re-entering prior state requires the same accumulated prereqs
  it("gap_analysis_under_review â†’ gap_analysis_drafted (rejection)", () => {
    const snap = makeSnapshot("gap_analysis_under_review", {
      soaApproved: true,
      gapAnalysisDrafted: true,
    });
    expect(() =>
      validateTransition(snap, "gap_analysis_drafted", makeContext()),
    ).not.toThrow();
  });

  it("maturity_under_review â†’ maturity_assessed (rejection)", () => {
    const snap = makeSnapshot("maturity_under_review", {
      gapAnalysisApproved: true,
      maturityAssessed: true,
    });
    expect(() =>
      validateTransition(snap, "maturity_assessed", makeContext()),
    ).not.toThrow();
  });

  it("poam_under_review â†’ poam_drafted (rejection)", () => {
    const snap = makeSnapshot("poam_under_review", {
      gapAnalysisApproved: true,
      poamDrafted: true,
    });
    expect(() =>
      validateTransition(snap, "poam_drafted", makeContext()),
    ).not.toThrow();
  });
});
