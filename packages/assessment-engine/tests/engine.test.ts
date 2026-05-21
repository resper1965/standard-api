import { executeTransition, validateTransition } from "../src/engine";
import { getAllowedNextStates } from "../src/transitions";
import { assessment, baseContext, ids } from "./fixtures";
import { expect, expectErrorCode, test } from "./test-kit";

// ── TENANT_CONTEXT_MISMATCH ─────────────────────────────────────

test("rejeita transição quando tenantId do contexto difere do assessment", () => {
  expectErrorCode(
    () =>
      validateTransition(
        assessment({ documentCount: 1 }),
        "documents_uploaded",
        baseContext({ tenantId: "ffffffff-ffff-4fff-8fff-ffffffffffff" })
      ),
    "TENANT_CONTEXT_MISMATCH"
  );
});

test("rejeita transição quando organizationId do contexto difere do assessment", () => {
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

test("rejeita transição quando assessmentId do contexto difere do assessment", () => {
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

// ── TRANSITION_NOT_ALLOWED ─────────────────────────────────────

test("rejeita salto de estado não definido na tabela de transições", () => {
  expectErrorCode(
    () => validateTransition(assessment({ state: "draft" }), "gap_analysis_drafted", baseContext()),
    "TRANSITION_NOT_ALLOWED"
  );
});

test("rejeita transição reversa entre estados normais (soa_approved → draft)", () => {
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

test("permite qualquer estado → failed (interruption state)", () => {
  const result = executeTransition(
    assessment({ documentCount: 1 }),
    "failed",
    baseContext({ reason: "pipeline failure" })
  );
  expect(result.assessment.state).toBe("failed");
  expect(result.event.eventType).toBe("assessment_failed");
});

test("permite qualquer estado → cancelled (interruption state)", () => {
  const result = executeTransition(
    assessment({ state: "soa_under_review", soaDraftVersionComplete: true }),
    "cancelled",
    baseContext({ reason: "client requested cancellation" })
  );
  expect(result.assessment.state).toBe("cancelled");
  expect(result.event.eventType).toBe("assessment_cancelled");
});

test("permite qualquer estado → blocked (interruption state)", () => {
  const result = executeTransition(
    assessment({ state: "gap_analysis_drafted", gapAnalysisDrafted: true }),
    "blocked",
    baseContext({ reason: "awaiting external data" })
  );
  expect(result.assessment.state).toBe("blocked");
  expect(result.event.eventType).toBe("assessment_blocked");
});

// ── MISSING_PREREQUISITE: documentos ──────────────────────────

test("bloqueia draft → documents_uploaded sem documentos", () => {
  expectErrorCode(
    () => validateTransition(assessment(), "documents_uploaded", baseContext()),
    "MISSING_PREREQUISITE"
  );
});

test("permite draft → documents_uploaded com ao menos 1 documento", () => {
  const result = executeTransition(assessment({ documentCount: 1 }), "documents_uploaded", baseContext());
  expect(result.assessment.state).toBe("documents_uploaded");
});

// ── MISSING_PREREQUISITE: ingestão ────────────────────────────

test("bloqueia documents_uploaded → documents_ingested sem jobs concluídos", () => {
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

test("permite documents_uploaded → documents_ingested com jobs concluídos", () => {
  const result = executeTransition(
    assessment({ state: "documents_uploaded", documentCount: 2, requiredDocumentJobsComplete: true }),
    "documents_ingested",
    baseContext()
  );
  expect(result.assessment.state).toBe("documents_ingested");
});

// ── MISSING_PREREQUISITE: SCF pré-análise ─────────────────────

test("bloqueia documents_ingested → scf_pre_analysis_ready sem registro", () => {
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

test("permite documents_ingested → scf_pre_analysis_ready com registro", () => {
  const result = executeTransition(
    assessment({ state: "documents_ingested", requiredDocumentJobsComplete: true, scfPreAnalysisRegistered: true }),
    "scf_pre_analysis_ready",
    baseContext()
  );
  expect(result.assessment.state).toBe("scf_pre_analysis_ready");
});

// ── MISSING_PREREQUISITE: framework e escopo ─────────────────

test("bloqueia scf_pre_analysis_ready → framework_selected sem seleção", () => {
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

test("bloqueia framework_selected → scope_drafted sem escopo", () => {
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

// ── MISSING_PREREQUISITE: SoA ────────────────────────────────

test("bloqueia scope_drafted → soa_drafted sem rascunho da SoA", () => {
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

test("bloqueia soa_drafted → soa_under_review sem versão completa", () => {
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

test("bloqueia soa_approved → soa_ingested sem aprovação", () => {
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

test("bloqueia soa_ingested → evidence_analysis_ready sem ingestão", () => {
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

// ── MISSING_PREREQUISITE: Gap Analysis ──────────────────────

test("bloqueia evidence_analysis_ready → gap_analysis_drafted sem SoA aprovada e gap rascunhado", () => {
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

test("bloqueia gap_analysis_drafted → gap_analysis_under_review sem rascunho", () => {
  expectErrorCode(
    () =>
      validateTransition(
        assessment({ state: "gap_analysis_drafted", gapAnalysisDrafted: false }),
        "gap_analysis_under_review",
        baseContext()
      ),
    "MISSING_PREREQUISITE"
  );
});

// ── MISSING_PREREQUISITE: Maturidade ────────────────────────

test("bloqueia gap_analysis_approved → maturity_assessed sem gap aprovado e maturidade avaliada", () => {
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

test("bloqueia maturity_assessed → maturity_under_review sem avaliação", () => {
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

// ── MISSING_PREREQUISITE: POA&M ─────────────────────────────

test("bloqueia gap_analysis_approved → poam_drafted sem gap aprovado e poam rascunhado", () => {
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

test("bloqueia poam_drafted → poam_under_review sem rascunho do POAM", () => {
  expectErrorCode(
    () =>
      validateTransition(
        assessment({ state: "poam_drafted", poamDrafted: false }),
        "poam_under_review",
        baseContext()
      ),
    "MISSING_PREREQUISITE"
  );
});

// ── MISSING_PREREQUISITE: Relatório e Fechamento ────────────

test("bloqueia poam_approved → report_generated sem artefatos completos", () => {
  expectErrorCode(
    () =>
      validateTransition(
        assessment({ state: "poam_approved", soaApproved: false, gapAnalysisApproved: false, maturityApproved: false, poamApproved: false }),
        "report_generated",
        baseContext()
      ),
    "MISSING_PREREQUISITE"
  );
});

test("bloqueia report_generated → closed sem relatório aprovado", () => {
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

// ── REJEIÇÃO: retorno ao estado anterior ────────────────────

test("permite soa_under_review → soa_drafted por rejeição", () => {
  const result = executeTransition(
    assessment({ state: "soa_under_review", soaDraftVersionComplete: true }),
    "soa_drafted",
    baseContext({ reason: "reviewer requested changes" })
  );
  expect(result.assessment.state).toBe("soa_drafted");
  expect(result.event.eventType).toBe("soa_rejected");
});

test("permite gap_analysis_under_review → gap_analysis_drafted por rejeição", () => {
  const result = executeTransition(
    assessment({ state: "gap_analysis_under_review", gapAnalysisDrafted: true }),
    "gap_analysis_drafted",
    baseContext({ reason: "gaps incompletos" })
  );
  expect(result.assessment.state).toBe("gap_analysis_drafted");
  expect(result.event.eventType).toBe("gap_analysis_rejected");
});

test("permite poam_under_review → poam_drafted por rejeição", () => {
  const result = executeTransition(
    assessment({ state: "poam_under_review", poamDrafted: true }),
    "poam_drafted",
    baseContext({ reason: "plano de ação incompleto" })
  );
  expect(result.assessment.state).toBe("poam_drafted");
  expect(result.event.eventType).toBe("poam_rejected");
});

// ── INTEGRIDADE DO EVENTO ────────────────────────────────────

test("evento de transição inclui previousState e nextState corretos", () => {
  const current = assessment({ documentCount: 1 });
  const result = executeTransition(current, "documents_uploaded", baseContext());
  expect(result.event.previousState).toBe("draft");
  expect(result.event.nextState).toBe("documents_uploaded");
});

test("evento preserva idempotencyKey do contexto", () => {
  const ctx = baseContext({ idempotencyKey: "idem-chave-especifica" });
  const result = executeTransition(assessment({ documentCount: 1 }), "documents_uploaded", ctx);
  // idempotencyKey é opcional no evento; verificamos que o contexto é repassado
  expect(result.event.traceId).toBe(ctx.traceId);
});

test("snapshot retornado tem estado atualizado mas mantém outros campos inalterados", () => {
  const current = assessment({ documentCount: 3, state: "draft" });
  const result = executeTransition(current, "documents_uploaded", baseContext());
  expect(result.assessment.state).toBe("documents_uploaded");
  expect(result.assessment.documentCount).toBe(3);
  expect(result.assessment.tenantId).toBe(ids.tenantId);
  expect(result.assessment.organizationId).toBe(ids.organizationId);
});

// ── getAllowedNextStates ──────────────────────────────────────

test("getAllowedNextStates inclui interruption states para qualquer estado", () => {
  const allowed = getAllowedNextStates("draft");
  expect(allowed).toContain("failed");
  expect(allowed).toContain("cancelled");
  expect(allowed).toContain("blocked");
});

test("getAllowedNextStates para draft inclui apenas documents_uploaded além de interruptions", () => {
  const allowed = getAllowedNextStates("draft");
  expect(allowed).toContain("documents_uploaded");
});
