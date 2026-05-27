import { describe, it, expect } from "vitest";
import {
  assessmentStates,
  terminalAssessmentStates,
  isTerminalAssessmentState,
} from "../src/states";

describe("Assessment States — AGENTS.md §11 conformance", () => {
  it("inclui todos os 26 estados mandatórios do AGENTS.md §11", () => {
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

    // assessmentStates is a readonly const array
    const stateList = assessmentStates as readonly string[];

    for (const state of required) {
      expect(stateList).toContain(state);
    }
  });

  it("tem exatamente 26 estados (sem duplicatas nem extras não documentados)", () => {
    expect(assessmentStates.length).toBe(26);
  });

  it("terminalAssessmentStates inclui closed, archived, failed, cancelled", () => {
    const terminals = terminalAssessmentStates as readonly string[];
    expect(terminals).toContain("closed");
    expect(terminals).toContain("archived");
    expect(terminals).toContain("failed");
    expect(terminals).toContain("cancelled");
  });

  it("isTerminalAssessmentState retorna true para estados terminais", () => {
    expect(isTerminalAssessmentState("closed")).toBe(true);
    expect(isTerminalAssessmentState("archived")).toBe(true);
    expect(isTerminalAssessmentState("failed")).toBe(true);
    expect(isTerminalAssessmentState("cancelled")).toBe(true);
  });

  it("isTerminalAssessmentState retorna false para estados não-terminais", () => {
    expect(isTerminalAssessmentState("draft")).toBe(false);
    expect(isTerminalAssessmentState("blocked")).toBe(false);
    expect(isTerminalAssessmentState("soa_approved")).toBe(false);
    expect(isTerminalAssessmentState("report_generated")).toBe(false);
  });

  it("blocked NÃO é estado terminal (é interruption, mas pode retomar)", () => {
    expect(isTerminalAssessmentState("blocked")).toBe(false);
    const terminals = terminalAssessmentStates as readonly string[];
    expect(terminals).not.toContain("blocked");
  });
});
