/**
 * Maturity Drizzle Repository Contract Tests
 *
 * Validates the MaturityVersionRepository and MaturityScoreRepository
 * contracts using the in-memory implementation (same interface that
 * the Drizzle implementation must satisfy).
 *
 * Covers:
 *   - Basic CRUD (save, get, update, listByAssessment/listByVersion)
 *   - Tenant isolation (wrong organizationId returns null/empty)
 *   - Approval gate (status=approved + approvalEventId)
 *   - Edge cases (empty saveMany, cross-assessment isolation)
 */
import { test, expect } from "./test-kit";
import { createInMemoryMaturityRepositories } from "../src/repositories/maturity.repositories";
import type { MaturityAssessmentVersion, MaturityScore } from "../src/types";

const ORG_ID = "org-contract-test";
const ASSESS_ID = "assess-contract-test";

const makeVersion = (
  overrides: Partial<MaturityAssessmentVersion> = {},
): MaturityAssessmentVersion => ({
  id: crypto.randomUUID(),
  organizationId: ORG_ID,
  assessmentId: ASSESS_ID,
  versionNumber: 1,
  status: "draft",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const makeScore = (
  versionId: string,
  overrides: Partial<MaturityScore> = {},
): MaturityScore => ({
  id: crypto.randomUUID(),
  organizationId: ORG_ID,
  assessmentId: ASSESS_ID,
  maturityAssessmentVersionId: versionId,
  scfControlId: "ctrl-" + crypto.randomUUID().slice(0, 8),
  score: 3,
  confidenceScore: 0.85,
  rationale: "Test rationale",
  evidenceCoverage: 0.9,
  ...overrides,
});

// ── MaturityVersionRepository contract ────────────────────────────────────────

test("version: save and get by id + organizationId", async () => {
  const repos = createInMemoryMaturityRepositories();
  const v = makeVersion();
  await repos.versions.save(v);
  const found = await repos.versions.get(v.id, ORG_ID);
  expect(found?.id).toBe(v.id);
  expect(found?.status).toBe("draft");
  expect(found?.assessmentId).toBe(ASSESS_ID);
});

test("version: get returns null for wrong organizationId (tenant isolation)", async () => {
  const repos = createInMemoryMaturityRepositories();
  const v = makeVersion();
  await repos.versions.save(v);
  const found = await repos.versions.get(v.id, "wrong-org-id");
  expect(found).toBe(null);
});

test("version: get returns null for unknown id", async () => {
  const repos = createInMemoryMaturityRepositories();
  const found = await repos.versions.get("non-existent-id", ORG_ID);
  expect(found).toBe(null);
});

test("version: listByAssessment scopes to correct assessment+org", async () => {
  const repos = createInMemoryMaturityRepositories();
  await repos.versions.save(
    makeVersion({ assessmentId: ASSESS_ID, versionNumber: 1 }),
  );
  await repos.versions.save(
    makeVersion({ assessmentId: "other-assessment", versionNumber: 1 }),
  );
  const list = await repos.versions.listByAssessment(ASSESS_ID, ORG_ID);
  expect(list.length).toBe(1);
  expect(list[0]!.assessmentId).toBe(ASSESS_ID);
});

test("version: listByAssessment is empty for wrong org (tenant isolation)", async () => {
  const repos = createInMemoryMaturityRepositories();
  await repos.versions.save(makeVersion());
  const list = await repos.versions.listByAssessment(ASSESS_ID, "wrong-org");
  expect(list.length).toBe(0);
});

test("version: update persists new status", async () => {
  const repos = createInMemoryMaturityRepositories();
  const v = makeVersion({ status: "draft" });
  await repos.versions.save(v);
  await repos.versions.update({ ...v, status: "under_review" });
  const found = await repos.versions.get(v.id, ORG_ID);
  expect(found?.status).toBe("under_review");
});

test("version: approve sets status=approved and approvalEventId (approval gate)", async () => {
  const repos = createInMemoryMaturityRepositories();
  const v = makeVersion({ status: "under_review" });
  await repos.versions.save(v);
  const APPROVAL_EVENT_ID = "approval-evt-" + crypto.randomUUID().slice(0, 8);
  await repos.versions.update({
    ...v,
    status: "approved",
    approvalEventId: APPROVAL_EVENT_ID,
  });
  const found = await repos.versions.get(v.id, ORG_ID);
  expect(found?.status).toBe("approved");
  expect(found?.approvalEventId).toBe(APPROVAL_EVENT_ID);
});

test("version: supersede previous approved when new version approved", async () => {
  const repos = createInMemoryMaturityRepositories();
  const v1 = makeVersion({ status: "approved", versionNumber: 1 });
  const v2 = makeVersion({ status: "under_review", versionNumber: 2 });
  await repos.versions.save(v1);
  await repos.versions.save(v2);
  // Simulate approval service superseding v1
  await repos.versions.update({ ...v1, status: "superseded" });
  await repos.versions.update({
    ...v2,
    status: "approved",
    approvalEventId: "evt-002",
  });
  const found1 = await repos.versions.get(v1.id, ORG_ID);
  const found2 = await repos.versions.get(v2.id, ORG_ID);
  expect(found1?.status).toBe("superseded");
  expect(found2?.status).toBe("approved");
});

// ── MaturityScoreRepository contract ──────────────────────────────────────────

test("score: saveMany and listByVersion", async () => {
  const repos = createInMemoryMaturityRepositories();
  const v = makeVersion();
  await repos.versions.save(v);
  const scores = [
    makeScore(v.id, { scfControlId: "ctrl-001", score: 3 }),
    makeScore(v.id, { scfControlId: "ctrl-002", score: 4 }),
    makeScore(v.id, { scfControlId: "ctrl-003", score: 2 }),
  ];
  await repos.scores.saveMany(scores);
  const list = await repos.scores.listByVersion(v.id, ORG_ID);
  expect(list.length).toBe(3);
});

test("score: listByVersion scopes to correct version (no cross-version leakage)", async () => {
  const repos = createInMemoryMaturityRepositories();
  const v1 = makeVersion({ versionNumber: 1 });
  const v2 = makeVersion({ versionNumber: 2 });
  await repos.versions.save(v1);
  await repos.versions.save(v2);
  await repos.scores.saveMany([makeScore(v1.id, { scfControlId: "ctrl-A" })]);
  await repos.scores.saveMany([makeScore(v2.id, { scfControlId: "ctrl-B" })]);
  const listV1 = await repos.scores.listByVersion(v1.id, ORG_ID);
  const listV2 = await repos.scores.listByVersion(v2.id, ORG_ID);
  expect(listV1.length).toBe(1);
  expect(listV2.length).toBe(1);
  expect(listV1[0]!.scfControlId).toBe("ctrl-A");
  expect(listV2[0]!.scfControlId).toBe("ctrl-B");
});

test("score: listByVersion returns empty for wrong org (tenant isolation)", async () => {
  const repos = createInMemoryMaturityRepositories();
  const v = makeVersion();
  await repos.versions.save(v);
  await repos.scores.saveMany([makeScore(v.id)]);
  const list = await repos.scores.listByVersion(v.id, "wrong-org");
  expect(list.length).toBe(0);
});

test("score: get by id + organizationId", async () => {
  const repos = createInMemoryMaturityRepositories();
  const v = makeVersion();
  await repos.versions.save(v);
  const s = makeScore(v.id, { score: 4 });
  await repos.scores.saveMany([s]);
  const found = await repos.scores.get(s.id, ORG_ID);
  expect(found?.id).toBe(s.id);
  expect(found?.score).toBe(4);
});

test("score: get returns null for wrong org (tenant isolation)", async () => {
  const repos = createInMemoryMaturityRepositories();
  const v = makeVersion();
  await repos.versions.save(v);
  const s = makeScore(v.id);
  await repos.scores.saveMany([s]);
  const found = await repos.scores.get(s.id, "wrong-org");
  expect(found).toBe(null);
});

test("score: update persists new score value", async () => {
  const repos = createInMemoryMaturityRepositories();
  const v = makeVersion();
  await repos.versions.save(v);
  const s = makeScore(v.id, { score: 2 });
  await repos.scores.saveMany([s]);
  await repos.scores.update({
    ...s,
    score: 5,
    rationale: "Updated after review",
  });
  const found = await repos.scores.get(s.id, ORG_ID);
  expect(found?.score).toBe(5);
  expect(found?.rationale).toBe("Updated after review");
});

test("score: saveMany with empty array is a no-op (does not throw)", async () => {
  const repos = createInMemoryMaturityRepositories();
  await repos.scores.saveMany([]);
  expect(true).toBe(true);
});
