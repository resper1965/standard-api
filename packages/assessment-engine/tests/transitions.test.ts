import { describe, it, expect } from "vitest";
import { getAllowedNextStates } from "../src/transitions";
import { assessmentTransitions, interruptionStates } from "../src/transitions";

/**
 * Helper para verificar que uma função lança um erro com o código esperado.
 * Substitui o expectErrorCode do test-kit legado.
 */
function expectErrorCode(run: () => void, code: string): void {
  try {
    run();
    throw new Error(`Expected error code ${code}, but no error was thrown`);
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      expect(String((error as Error & { code: string }).code)).toBe(code);
      return;
    }
    throw error;
  }
}

describe("Assessment Transitions — tabela e getAllowedNextStates", () => {
  it("assessmentTransitions não é vazio", () => {
    expect(assessmentTransitions.length).toBeGreaterThan(0);
  });

  it("happy path: draft → documents_uploaded está na tabela", () => {
    const transition = assessmentTransitions.find(
      (t) => t.from === "draft" && t.to === "documents_uploaded"
    );
    expect(transition).toBeDefined();
    expect(transition?.eventType).toBe("document_uploaded");
  });

  it("happy path: report_generated → closed está na tabela", () => {
    const transition = assessmentTransitions.find(
      (t) => t.from === "report_generated" && t.to === "closed"
    );
    expect(transition).toBeDefined();
    expect(transition?.eventType).toBe("assessment_closed");
  });

  it("4 approval gates obrigatórios — soa_under_review → soa_approved existe", () => {
    const soaApproval = assessmentTransitions.find(
      (t) => t.from === "soa_under_review" && t.to === "soa_approved"
    );
    expect(soaApproval).toBeDefined();
  });

  it("4 approval gates obrigatórios — gap_analysis_under_review → gap_analysis_approved existe", () => {
    const gapApproval = assessmentTransitions.find(
      (t) => t.from === "gap_analysis_under_review" && t.to === "gap_analysis_approved"
    );
    expect(gapApproval).toBeDefined();
  });

  it("4 approval gates obrigatórios — maturity_under_review → maturity_approved existe", () => {
    const maturityApproval = assessmentTransitions.find(
      (t) => t.from === "maturity_under_review" && t.to === "maturity_approved"
    );
    expect(maturityApproval).toBeDefined();
  });

  it("4 approval gates obrigatórios — poam_under_review → poam_approved existe", () => {
    const poamApproval = assessmentTransitions.find(
      (t) => t.from === "poam_under_review" && t.to === "poam_approved"
    );
    expect(poamApproval).toBeDefined();
  });

  it("interruptionStates inclui failed, cancelled, blocked", () => {
    const interruptions = interruptionStates as readonly string[];
    expect(interruptions).toContain("failed");
    expect(interruptions).toContain("cancelled");
    expect(interruptions).toContain("blocked");
  });

  it("getAllowedNextStates inclui interruption states para qualquer estado", () => {
    const allowed = getAllowedNextStates("draft");
    expect(allowed).toContain("failed");
    expect(allowed).toContain("cancelled");
    expect(allowed).toContain("blocked");
  });

  it("getAllowedNextStates para draft inclui documents_uploaded", () => {
    const allowed = getAllowedNextStates("draft");
    expect(allowed).toContain("documents_uploaded");
  });

  it("getAllowedNextStates para draft NÃO inclui gap_analysis_drafted (salto inválido)", () => {
    const allowed = getAllowedNextStates("draft");
    expect(allowed).not.toContain("gap_analysis_drafted");
  });

  it("rejeição SoA: soa_under_review → soa_drafted está na tabela (evento soa_rejected)", () => {
    const rejection = assessmentTransitions.find(
      (t) => t.from === "soa_under_review" && t.to === "soa_drafted"
    );
    expect(rejection).toBeDefined();
    expect(rejection?.eventType).toBe("soa_rejected");
  });

  it("rejeição gap analysis: gap_analysis_under_review → gap_analysis_drafted (evento gap_analysis_rejected)", () => {
    const rejection = assessmentTransitions.find(
      (t) =>
        t.from === "gap_analysis_under_review" && t.to === "gap_analysis_drafted"
    );
    expect(rejection).toBeDefined();
    expect(rejection?.eventType).toBe("gap_analysis_rejected");
  });

  it("rejeição maturity: maturity_under_review → maturity_assessed (evento maturity_rejected)", () => {
    const rejection = assessmentTransitions.find(
      (t) =>
        t.from === "maturity_under_review" && t.to === "maturity_assessed"
    );
    expect(rejection).toBeDefined();
    expect(rejection?.eventType).toBe("maturity_rejected");
  });

  it("rejeição POA&M: poam_under_review → poam_drafted (evento poam_rejected)", () => {
    const rejection = assessmentTransitions.find(
      (t) => t.from === "poam_under_review" && t.to === "poam_drafted"
    );
    expect(rejection).toBeDefined();
    expect(rejection?.eventType).toBe("poam_rejected");
  });
});
