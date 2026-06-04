import { test, expect, expectRejects } from "./test-kit";
import { validateMaturityVersion } from "../src";
import type { MaturityAssessmentVersion, MaturityContext, MaturityDependencies, MaturityScore } from "../src/types";

const ids = {
  organizationId: "11111111-1111-4111-8111-111111111111",
  organizationId: "22222222-2222-4222-8222-222222222222",
  assessmentId: "33333333-3333-4333-8333-333333333333",
  versionId: "44444444-4444-4444-8444-444444444444",
  actorId: "55555555-5555-4555-8555-555555555555"
};

const context = (): MaturityContext => ({
  organizationId: ids.organizationId,
  assessmentId: ids.assessmentId,
  actorId: ids.actorId,
  traceId: "trace-test-0001"
});

const versionFixture = (patch: Partial<MaturityAssessmentVersion> = {}): MaturityAssessmentVersion => ({
  id: ids.versionId,
  organizationId: ids.organizationId,
  assessmentId: ids.assessmentId,
  versionNumber: 1,
  status: "draft",
  ...patch
});

const scoreFixture = (patch: Partial<MaturityScore> = {}): MaturityScore => ({
  id: "score-id",
  organizationId: ids.organizationId,
  assessmentId: ids.assessmentId,
  maturityAssessmentVersionId: ids.versionId,
  scfControlId: "SCF-01",
  score: 3,
  confidenceScore: 0.8,
  rationale: "Standardized process is defined.",
  evidenceCoverage: 0.9,
  ...patch
});

test("validação de versão inexistente joga erro", async () => {
  const deps: MaturityDependencies = {
    repositories: {
      versions: {
        async save() {},
        async update() {},
        async get() { return null; },
        async listByAssessment() { return []; }
      },
      scores: {
        async saveMany() {},
        async update() {},
        async get() { return null; },
        async listByVersion() { return []; }
      }
    },
    async getApprovedGapAnalysis() { return null; }
  };

  await expectRejects(
    () => validateMaturityVersion(ids.versionId, context(), deps),
    "VERSION_NOT_FOUND"
  );
});

test("validação rejeita versão sem scores", async () => {
  const deps: MaturityDependencies = {
    repositories: {
      versions: {
        async save() {},
        async update() {},
        async get() { return versionFixture(); },
        async listByAssessment() { return []; }
      },
      scores: {
        async saveMany() {},
        async update() {},
        async get() { return null; },
        async listByVersion() { return []; }
      }
    },
    async getApprovedGapAnalysis() { return null; }
  };

  const result = await validateMaturityVersion(ids.versionId, context(), deps);
  expect(result.valid).toBe(false);
  expect(result.blocking_errors.includes("Maturity assessment has no scored controls.")).toBe(true);
});

test("validação rejeita versão que não está em draft", async () => {
  const deps: MaturityDependencies = {
    repositories: {
      versions: {
        async save() {},
        async update() {},
        async get() { return versionFixture({ status: "approved" }); },
        async listByAssessment() { return []; }
      },
      scores: {
        async saveMany() {},
        async update() {},
        async get() { return null; },
        async listByVersion() { return [scoreFixture()]; }
      }
    },
    async getApprovedGapAnalysis() { return null; }
  };

  const result = await validateMaturityVersion(ids.versionId, context(), deps);
  expect(result.valid).toBe(false);
  expect(result.blocking_errors.includes("Version status is 'approved', expected 'draft'.")).toBe(true);
});

test("validação rejeita scores sem rationale", async () => {
  const deps: MaturityDependencies = {
    repositories: {
      versions: {
        async save() {},
        async update() {},
        async get() { return versionFixture(); },
        async listByAssessment() { return []; }
      },
      scores: {
        async saveMany() {},
        async update() {},
        async get() { return null; },
        async listByVersion() { return [scoreFixture({ rationale: "" })]; }
      }
    },
    async getApprovedGapAnalysis() { return null; }
  };

  const result = await validateMaturityVersion(ids.versionId, context(), deps);
  expect(result.valid).toBe(false);
  expect(result.blocking_errors.includes("1 score(s) are missing rationale.")).toBe(true);
});

test("validação emite warning para scores com baixa confiança", async () => {
  const deps: MaturityDependencies = {
    repositories: {
      versions: {
        async save() {},
        async update() {},
        async get() { return versionFixture(); },
        async listByAssessment() { return []; }
      },
      scores: {
        async saveMany() {},
        async update() {},
        async get() { return null; },
        async listByVersion() { return [scoreFixture({ confidenceScore: 0.4 })]; }
      }
    },
    async getApprovedGapAnalysis() { return null; }
  };

  const result = await validateMaturityVersion(ids.versionId, context(), deps);
  expect(result.valid).toBe(true);
  expect(result.warnings.includes("1 score(s) have confidence below 50%.")).toBe(true);
});
