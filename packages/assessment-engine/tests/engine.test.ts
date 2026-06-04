import { describe, it, expect } from "vitest";
import { executeTransition, validateTransition } from "../src/engine";
import { getAllowedNextStates } from "../src/transitions";
import { assessment, baseContext, ids } from "./fixtures";

/**
 * Helper vitest-compatible para verificar erro com código específico.
 */
function expectErrorCode(run: () => void, code: string): void {
  try {
    run();
    throw new Error(`[expectErrorCode] Expected error code "${code}", but no error was thrown`);
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      expect(String((err as Error & { code: string }).code)).toBe(code);
      return;
    }
    // Re-throw se for o próprio erro de "não lançou"
    throw err;
  }
}

// ── TENANT_CONTEXT_MISMATCH ─────────────────────────────────────

describe("Engine — TENANT_CONTEXT_MISMATCH", () => {
  it("rejeita transição quando organizationId do contexto difere do assessment", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({ documentCount: 1 }),
          "documents_uploaded",
          baseContext({ organizationId: "ffffffff-ffff-4fff-8fff-ffffffffffff" })
        ),
      "TENANT_CONTEXT_MISMATCH"
    );
  });

  it("rejeita transição quando organizationId do contexto difere do assessment", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({ documentCount: 1 }),
          "documents_uploaded",
          baseContext({ organizationId: "ffffffff-ffff-4fff-8fff-ffffffffffff" })
        ),
      "TENANT_CONTEXT_MISMATCH"
    );
  });

  it("rejeita transição quando assessmentId do contexto difere do assessment", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({ documentCount: 1 }),
          "documents_uploaded",
          baseContext({ assessmentId: "ffffffff-ffff-4fff-8fff-ffffffffffff" })
        ),
      "TENANT_CONTEXT_MISMATCH"
    );
  });
});

// ── TRANSITION_NOT_ALLOWED ─────────────────────────────────────

describe("Engine — TRANSITION_NOT_ALLOWED", () => {
  it("rejeita salto de estado não definido na tabela de transições", () => {
    expectErrorCode(
      () => validateTransition(assessment({ state: "draft" }), "gap_analysis_drafted", baseContext()),
      "TRANSITION_NOT_ALLOWED"
    );
  });

  it("rejeita transição reversa entre estados normais (soa_approved → draft)", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({ state: "soa_approved", soaApproved: true }),
          "draft",
          baseContext()
        ),
      "TRANSITION_NOT_ALLOWED"
    );
  });

  it("permite qualquer estado → failed (interruption state)", () => {
    const result = executeTransition(
      assessment({ documentCount: 1 }),
      "failed",
      baseContext({ reason: "pipeline failure" })
    );
    expect(result.assessment.state).toBe("failed");
    expect(result.event.eventType).toBe("assessment_failed");
  });

  it("permite qualquer estado → cancelled (interruption state)", () => {
    const result = executeTransition(
      assessment({ state: "soa_under_review", soaDraftVersionComplete: true }),
      "cancelled",
      baseContext({ reason: "client requested cancellation" })
    );
    expect(result.assessment.state).toBe("cancelled");
    expect(result.event.eventType).toBe("assessment_cancelled");
  });

  it("permite qualquer estado → blocked (interruption state)", () => {
    const result = executeTransition(
      assessment({ state: "gap_analysis_drafted", soaApproved: true, gapAnalysisDrafted: true }),
      "blocked",
      baseContext({ reason: "awaiting external data" })
    );
    expect(result.assessment.state).toBe("blocked");
    expect(result.event.eventType).toBe("assessment_blocked");
  });
});

// ── MISSING_PREREQUISITE: documentos ──────────────────────────

describe("Engine — MISSING_PREREQUISITE: documentos", () => {
  it("bloqueia draft → documents_uploaded sem documentos", () => {
    expectErrorCode(
      () => validateTransition(assessment(), "documents_uploaded", baseContext()),
      "MISSING_PREREQUISITE"
    );
  });

  it("permite draft → documents_uploaded com ao menos 1 documento", () => {
    const result = executeTransition(assessment({ documentCount: 1 }), "documents_uploaded", baseContext());
    expect(result.assessment.state).toBe("documents_uploaded");
  });
});

// ── MISSING_PREREQUISITE: ingestão ────────────────────────────

describe("Engine — MISSING_PREREQUISITE: ingestão", () => {
  it("bloqueia documents_uploaded → documents_ingested sem jobs concluídos", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({ state: "documents_uploaded", documentCount: 2, requiredDocumentJobsComplete: false }),
          "documents_ingested",
          baseContext()
        ),
      "MISSING_PREREQUISITE"
    );
  });

  it("permite documents_uploaded → documents_ingested com jobs concluídos", () => {
    const result = executeTransition(
      assessment({ state: "documents_uploaded", documentCount: 2, requiredDocumentJobsComplete: true }),
      "documents_ingested",
      baseContext()
    );
    expect(result.assessment.state).toBe("documents_ingested");
  });
});

// ── MISSING_PREREQUISITE: SCF pré-análise ─────────────────────

describe("Engine — MISSING_PREREQUISITE: SCF pré-análise", () => {
  it("bloqueia documents_ingested → scf_pre_analysis_ready sem registro", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({ state: "documents_ingested", requiredDocumentJobsComplete: true }),
          "scf_pre_analysis_ready",
          baseContext()
        ),
      "MISSING_PREREQUISITE"
    );
  });

  it("permite documents_ingested → scf_pre_analysis_ready com registro", () => {
    const result = executeTransition(
      assessment({ state: "documents_ingested", requiredDocumentJobsComplete: true, scfPreAnalysisRegistered: true }),
      "scf_pre_analysis_ready",
      baseContext()
    );
    expect(result.assessment.state).toBe("scf_pre_analysis_ready");
  });
});

// ── MISSING_PREREQUISITE: framework e escopo ─────────────────

describe("Engine — MISSING_PREREQUISITE: framework e escopo", () => {
  it("bloqueia scf_pre_analysis_ready → framework_selected sem seleção", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({ state: "scf_pre_analysis_ready", scfPreAnalysisRegistered: true }),
          "framework_selected",
          baseContext()
        ),
      "MISSING_PREREQUISITE"
    );
  });

  it("bloqueia framework_selected → scope_drafted sem escopo", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({ state: "framework_selected", frameworkSelected: true }),
          "scope_drafted",
          baseContext()
        ),
      "MISSING_PREREQUISITE"
    );
  });
});

// ── MISSING_PREREQUISITE: SoA ────────────────────────────────

describe("Engine — MISSING_PREREQUISITE: SoA", () => {
  it("bloqueia scope_drafted → soa_drafted sem rascunho da SoA", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({ state: "scope_drafted", scopeDrafted: true }),
          "soa_drafted",
          baseContext()
        ),
      "MISSING_PREREQUISITE"
    );
  });

  it("bloqueia soa_drafted → soa_under_review sem versão completa", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({ state: "soa_drafted", soaDraftVersionComplete: false }),
          "soa_under_review",
          baseContext()
        ),
      "MISSING_PREREQUISITE"
    );
  });

  it("bloqueia soa_approved → soa_ingested sem aprovação", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({ state: "soa_approved", soaApproved: false }),
          "soa_ingested",
          baseContext()
        ),
      "MISSING_PREREQUISITE"
    );
  });

  it("bloqueia soa_ingested → evidence_analysis_ready sem ingestão", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({ state: "soa_ingested", soaIngested: false }),
          "evidence_analysis_ready",
          baseContext()
        ),
      "MISSING_PREREQUISITE"
    );
  });
});

// ── MISSING_PREREQUISITE: Gap Analysis ──────────────────────

describe("Engine — MISSING_PREREQUISITE: Gap Analysis", () => {
  it("bloqueia evidence_analysis_ready → gap_analysis_drafted sem SoA aprovada e gap rascunhado", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({ state: "evidence_analysis_ready", soaApproved: false, gapAnalysisDrafted: false }),
          "gap_analysis_drafted",
          baseContext()
        ),
      "MISSING_PREREQUISITE"
    );
  });

  it("bloqueia gap_analysis_drafted → gap_analysis_under_review sem rascunho", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({ state: "gap_analysis_drafted", soaApproved: true, gapAnalysisDrafted: false }),
          "gap_analysis_under_review",
          baseContext()
        ),
      "MISSING_PREREQUISITE"
    );
  });
});

// ── MISSING_PREREQUISITE: Maturidade ────────────────────────

describe("Engine — MISSING_PREREQUISITE: Maturidade", () => {
  it("bloqueia gap_analysis_approved → maturity_assessed sem gap aprovado e maturidade avaliada", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({ state: "gap_analysis_approved", gapAnalysisApproved: false, maturityAssessed: false }),
          "maturity_assessed",
          baseContext()
        ),
      "MISSING_PREREQUISITE"
    );
  });

  it("bloqueia maturity_assessed → maturity_under_review sem avaliação", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({ state: "maturity_assessed", maturityAssessed: false }),
          "maturity_under_review",
          baseContext()
        ),
      "MISSING_PREREQUISITE"
    );
  });
});

// ── MISSING_PREREQUISITE: POA&M ─────────────────────────────

describe("Engine — MISSING_PREREQUISITE: POA&M", () => {
  it("bloqueia gap_analysis_approved → poam_drafted sem gap aprovado e poam rascunhado", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({ state: "gap_analysis_approved", gapAnalysisApproved: false, poamDrafted: false }),
          "poam_drafted",
          baseContext()
        ),
      "MISSING_PREREQUISITE"
    );
  });

  it("bloqueia poam_drafted → poam_under_review sem rascunho do POAM", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({ state: "poam_drafted", gapAnalysisApproved: true, poamDrafted: false }),
          "poam_under_review",
          baseContext()
        ),
      "MISSING_PREREQUISITE"
    );
  });
});

// ── MISSING_PREREQUISITE: Relatório e Fechamento ────────────

describe("Engine — MISSING_PREREQUISITE: Relatório e Fechamento", () => {
  it("bloqueia poam_approved → report_generated sem artefatos completos", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({
            state: "poam_approved",
            soaApproved: false,
            gapAnalysisApproved: false,
            maturityApproved: false,
            poamApproved: false,
          }),
          "report_generated",
          baseContext()
        ),
      "MISSING_PREREQUISITE"
    );
  });

  it("bloqueia report_generated → closed sem relatório aprovado", () => {
    expectErrorCode(
      () =>
        validateTransition(
          assessment({ state: "report_generated", reportGenerated: false, reportApproved: false }),
          "closed",
          baseContext()
        ),
      "MISSING_PREREQUISITE"
    );
  });
});

// ── REJEIÇÃO ────────────────────────────────────────────────

describe("Engine — Rejeições (retorno ao estado anterior)", () => {
  it("permite soa_under_review → soa_drafted por rejeição", () => {
    const result = executeTransition(
      assessment({ state: "soa_under_review", soaDraftVersionComplete: true }),
      "soa_drafted",
      baseContext({ reason: "reviewer requested changes" })
    );
    expect(result.assessment.state).toBe("soa_drafted");
    expect(result.event.eventType).toBe("soa_rejected");
  });

  it("permite gap_analysis_under_review → gap_analysis_drafted por rejeição", () => {
    const result = executeTransition(
      assessment({ state: "gap_analysis_under_review", soaApproved: true, gapAnalysisDrafted: true }),
      "gap_analysis_drafted",
      baseContext({ reason: "gaps incompletos" })
    );
    expect(result.assessment.state).toBe("gap_analysis_drafted");
    expect(result.event.eventType).toBe("gap_analysis_rejected");
  });

  it("permite poam_under_review → poam_drafted por rejeição", () => {
    const result = executeTransition(
      assessment({ state: "poam_under_review", gapAnalysisApproved: true, poamDrafted: true }),
      "poam_drafted",
      baseContext({ reason: "plano de ação incompleto" })
    );
    expect(result.assessment.state).toBe("poam_drafted");
    expect(result.event.eventType).toBe("poam_rejected");
  });
});

// ── INTEGRIDADE DO EVENTO ────────────────────────────────────

describe("Engine — Integridade do evento de transição", () => {
  it("evento de transição inclui previousState e nextState corretos", () => {
    const current = assessment({ documentCount: 1 });
    const result = executeTransition(current, "documents_uploaded", baseContext());
    expect(result.event.previousState).toBe("draft");
    expect(result.event.nextState).toBe("documents_uploaded");
  });

  it("evento preserva traceId do contexto", () => {
    const ctx = baseContext({ idempotencyKey: "idem-chave-especifica" });
    const result = executeTransition(assessment({ documentCount: 1 }), "documents_uploaded", ctx);
    expect(result.event.traceId).toBe(ctx.traceId);
  });

  it("snapshot retornado tem estado atualizado mas mantém outros campos inalterados", () => {
    const current = assessment({ documentCount: 3, state: "draft" });
    const result = executeTransition(current, "documents_uploaded", baseContext());
    expect(result.assessment.state).toBe("documents_uploaded");
    expect(result.assessment.documentCount).toBe(3);
    expect(result.assessment.organizationId).toBe(ids.organizationId);
  });

  it("evento preserva organization_id, organization_id e assessment_id", () => {
    const current = assessment({ documentCount: 1 });
    const result = executeTransition(current, "documents_uploaded", baseContext());
    expect(result.event.organizationId).toBe(current.organizationId);
    expect(result.event.assessmentId).toBe(current.id);
  });
});

// ── getAllowedNextStates ──────────────────────────────────────

describe("Engine — getAllowedNextStates", () => {
  it("inclui interruption states para qualquer estado", () => {
    const allowed = getAllowedNextStates("draft");
    expect(allowed).toContain("failed");
    expect(allowed).toContain("cancelled");
    expect(allowed).toContain("blocked");
  });

  it("para draft inclui documents_uploaded", () => {
    const allowed = getAllowedNextStates("draft");
    expect(allowed).toContain("documents_uploaded");
  });
});
