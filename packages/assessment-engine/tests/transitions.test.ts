import {
  executeTransition,
  validateTransition
} from "../src/engine";
import { assessment, baseContext } from "./fixtures";
import { expect, expectErrorCode, test } from "./test-kit";

test("permite draft -> documents_uploaded quando há documento", () => {
  const current = assessment({ documentCount: 1 });
  const result = executeTransition(current, "documents_uploaded", baseContext());

  expect(result.assessment.state).toBe("documents_uploaded");
  expect(result.event.tenantId).toBe(current.tenantId);
  expect(result.event.assessmentId).toBe(current.id);
  expect(result.event.traceId).toBe(baseContext().traceId);
});

test("bloqueia draft -> framework_selected sem documentos, ingestão e pré-análise", () => {
  expectErrorCode(
    () => validateTransition(assessment(), "framework_selected", baseContext()),
    "TRANSITION_NOT_ALLOWED"
  );
});

test("bloqueia Gap Analysis antes de SoA aprovada", () => {
  expectErrorCode(
    () => validateTransition(assessment({ state: "evidence_analysis_ready", gapAnalysisDrafted: true }), "gap_analysis_drafted", baseContext()),
    "MISSING_PREREQUISITE"
  );
});

test("bloqueia maturidade antes de Gap Analysis aprovado", () => {
  expectErrorCode(
    () => validateTransition(assessment({ state: "gap_analysis_approved", maturityAssessed: true }), "maturity_assessed", baseContext()),
    "MISSING_PREREQUISITE"
  );
});

test("preserva tenant_id e assessment_id em toda transição crítica", () => {
  const current = assessment({ documentCount: 1 });
  const result = executeTransition(current, "documents_uploaded", baseContext());

  expect(result.event.tenantId).toBe(current.tenantId);
  expect(result.event.organizationId).toBe(current.organizationId);
  expect(result.event.assessmentId).toBe(current.id);
});
