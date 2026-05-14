import {
  approveArtifactVersion,
  assertVersionEditable,
  createNextArtifactVersion,
  markArtifactUnderReview
} from "../src/artifacts";
import { baseContext } from "./fixtures";
import { expect, expectErrorCode, test } from "./test-kit";

const baseVersion = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  tenantId: "11111111-1111-4111-8111-111111111111",
  organizationId: "22222222-2222-4222-8222-222222222222",
  assessmentId: "33333333-3333-4333-8333-333333333333",
  artifactType: "soa" as const,
  versionNumber: 1,
  status: "draft" as const,
  createdBy: "44444444-4444-4444-8444-444444444444",
  createdAt: "2026-04-28T17:00:00.000Z",
  traceId: "trace-test-0001"
};

test("marca versão draft como under_review", () => {
  const version = markArtifactUnderReview(baseVersion, baseContext());

  expect(version.status).toBe("under_review");
  expect(version.traceId).toBe(baseContext().traceId);
});

test("aprova versão de artefato com approval_event válido", () => {
  const version = approveArtifactVersion(
    { ...baseVersion, status: "under_review" },
    {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      gate: "soa",
      decision: "approved",
      approvedBy: "44444444-4444-4444-8444-444444444444",
      approvedAt: "2026-04-28T17:01:00.000Z",
      traceId: "trace-test-0001"
    }
  );

  expect(version.status).toBe("approved");
  expect(version.approvedBy).toBe("44444444-4444-4444-8444-444444444444");
});

test("impede edição de versão aprovada", () => {
  expectErrorCode(
    () => assertVersionEditable({ ...baseVersion, status: "approved" }),
    "ARTIFACT_VERSION_IMMUTABLE"
  );
});

test("cria nova versão ao alterar artefato aprovado", () => {
  const next = createNextArtifactVersion(
    { ...baseVersion, status: "approved", approvedBy: baseVersion.createdBy, approvedAt: baseVersion.createdAt },
    baseContext()
  );

  expect(next.versionNumber).toBe(2);
  expect(next.status).toBe("draft");
  expect(next.supersedesVersionId).toBe(baseVersion.id);
});
