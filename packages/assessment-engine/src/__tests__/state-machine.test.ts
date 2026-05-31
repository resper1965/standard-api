/**
 * Assessment Engine — Lifecycle State Machine Tests
 *
 * Tests all critical state transitions defined in AGENTS.md §11.
 * Uses synthetic fixtures only — no real tenant data.
 */
import { describe, it, expect } from "vitest";
import { validateTransition } from "../engine";
import { assessmentStates, isTerminalAssessmentState } from "../states";
import type { AssessmentSnapshot, TransitionContext } from "../types";

// ─── Synthetic Fixtures ────────────────────────────────────────────────────

const TENANT_ID = "10000000-0000-0000-0000-000000000001";
const ORG_ID    = "20000000-0000-0000-0000-000000000001";
const ASSESS_ID = "30000000-0000-0000-0000-000000000001";

function makeSnapshot(state: AssessmentSnapshot["state"], overrides: Partial<AssessmentSnapshot> = {}): AssessmentSnapshot {
  return {
    id: ASSESS_ID,
    tenantId: TENANT_ID,
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

function makeContext(overrides: Partial<TransitionContext> = {}): TransitionContext {
  return {
    tenantId: TENANT_ID,
    organizationId: ORG_ID,
    assessmentId: ASSESS_ID,
    reason: "test",
    traceId: "trace-test-001",
    occurredAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── State Catalogue Tests ─────────────────────────────────────────────────

describe("assessmentStates catalogue", () => {
  it("contains the 26 states defined in AGENTS.md", () => {
    expect(assessmentStates).toHaveLength(26);
  });

  it("includes all mandatory AGENTS.md states", () => {
    const required = [
      "draft", "documents_uploaded", "documents_ingested",
      "scf_pre_analysis_ready", "framework_selected",
      "scope_drafted", "soa_drafted", "soa_under_review", "soa_approved", "soa_ingested",
      "evidence_analysis_ready", "gap_analysis_drafted", "gap_analysis_under_review", "gap_analysis_approved",
      "maturity_assessed", "maturity_under_review", "maturity_approved",
      "poam_drafted", "poam_under_review", "poam_approved",
      "report_generated", "closed", "archived", "cancelled", "failed", "blocked",
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

// ─── Tenant Isolation Tests ────────────────────────────────────────────────

describe("validateTransition — tenant isolation", () => {
  it("throws TENANT_CONTEXT_MISMATCH when tenantId differs", () => {
    const snapshot = makeSnapshot("draft", { documentCount: 1 });
    const ctx = makeContext({ tenantId: "99999999-0000-0000-0000-000000000001" });

    expect(() => validateTransition(snapshot, "documents_uploaded", ctx)).toThrow("does not match assessment tenancy");
  });

  it("throws TENANT_CONTEXT_MISMATCH when organizationId differs", () => {
    const snapshot = makeSnapshot("draft", { documentCount: 1 });
    const ctx = makeContext({ organizationId: "99999999-0000-0000-0000-000000000002" });

    expect(() => validateTransition(snapshot, "documents_uploaded", ctx)).toThrow("does not match assessment tenancy");
  });

  it("throws TENANT_CONTEXT_MISMATCH when assessmentId differs", () => {
    const snapshot = makeSnapshot("draft", { documentCount: 1 });
    const ctx = makeContext({ assessmentId: "99999999-0000-0000-0000-000000000003" });

    expect(() => validateTransition(snapshot, "documents_uploaded", ctx)).toThrow("does not match assessment tenancy");
  });

  it("accepts transition when all tenant fields match", () => {
    const snapshot = makeSnapshot("draft", { documentCount: 1 });
    const ctx = makeContext();
    expect(() => validateTransition(snapshot, "documents_uploaded", ctx)).not.toThrow();
  });
});

// ─── Valid Transitions ─────────────────────────────────────────────────────

describe("validateTransition — valid happy path", () => {
  it("draft → documents_uploaded (with documentCount > 0)", () => {
    const snap = makeSnapshot("draft", { documentCount: 1 });
    expect(() => validateTransition(snap, "documents_uploaded", makeContext())).not.toThrow();
  });

  it("draft → cancelled (always allowed)", () => {
    const snap = makeSnapshot("draft");
    expect(() => validateTransition(snap, "cancelled", makeContext())).not.toThrow();
  });

  it("documents_uploaded → documents_ingested (requiredDocumentJobsComplete)", () => {
    const snap = makeSnapshot("documents_uploaded", { requiredDocumentJobsComplete: true });
    expect(() => validateTransition(snap, "documents_ingested", makeContext())).not.toThrow();
  });

  it("documents_ingested → scf_pre_analysis_ready (scfPreAnalysisRegistered)", () => {
    const snap = makeSnapshot("documents_ingested", { scfPreAnalysisRegistered: true });
    expect(() => validateTransition(snap, "scf_pre_analysis_ready", makeContext())).not.toThrow();
  });

  it("scf_pre_analysis_ready → framework_selected (frameworkSelected)", () => {
    const snap = makeSnapshot("scf_pre_analysis_ready", { frameworkSelected: true });
    expect(() => validateTransition(snap, "framework_selected", makeContext())).not.toThrow();
  });

  it("framework_selected → scope_drafted (scopeDrafted)", () => {
    const snap = makeSnapshot("framework_selected", { scopeDrafted: true });
    expect(() => validateTransition(snap, "scope_drafted", makeContext())).not.toThrow();
  });

  it("scope_drafted → soa_drafted (soaDraftVersionComplete)", () => {
    const snap = makeSnapshot("scope_drafted", { soaDraftVersionComplete: true });
    expect(() => validateTransition(snap, "soa_drafted", makeContext())).not.toThrow();
  });
});

// ─── Invalid / Blocked Transitions ────────────────────────────────────────

describe("validateTransition — prerequisite enforcement", () => {
  it("blocks documents_uploaded when documentCount is 0", () => {
    const snap = makeSnapshot("draft", { documentCount: 0 });
    expect(() => validateTransition(snap, "documents_uploaded", makeContext())).toThrow("at_least_one_document");
  });

  it("blocks documents_ingested when jobs not complete", () => {
    const snap = makeSnapshot("documents_uploaded", { requiredDocumentJobsComplete: false });
    expect(() => validateTransition(snap, "documents_ingested", makeContext())).toThrow("required_document_jobs_complete");
  });

  it("blocks closed when report not generated or approved", () => {
    const snap = makeSnapshot("report_generated", { reportGenerated: true, reportApproved: false });
    expect(() => validateTransition(snap, "closed", makeContext())).toThrow("report_generated");
  });

  it("blocks non-adjacent transitions (draft → gap_analysis_drafted)", () => {
    const snap = makeSnapshot("draft");
    expect(() => validateTransition(snap, "gap_analysis_drafted", makeContext())).toThrow("is not allowed");
  });

  it("blocks transition from terminal state (closed → draft)", () => {
    const snap = makeSnapshot("closed");
    expect(() => validateTransition(snap, "draft", makeContext())).toThrow("is not allowed");
  });
});

// ─── Approval Gate Tests ───────────────────────────────────────────────────

describe("validateTransition — approval gates", () => {
  it("blocks soa_approved without approvalEvent", () => {
    const snap = makeSnapshot("soa_under_review", { soaDraftVersionComplete: true });
    const ctx = makeContext(); // no approvalEvent
    expect(() => validateTransition(snap, "soa_approved", ctx)).toThrow();
  });

  it("allows soa_approved with valid approvalEvent", () => {
    const snap = makeSnapshot("soa_under_review", { soaDraftVersionComplete: true });
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
});
