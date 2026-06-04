import { describe, it, expect } from "vitest";
import {
  approveArtifactVersion,
  assertVersionEditable,
  createNextArtifactVersion,
  markArtifactUnderReview,
} from "../src/artifacts";
import { baseContext } from "./fixtures";

const baseVersion = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  organizationId: "11111111-1111-4111-8111-111111111111",
  assessmentId: "33333333-3333-4333-8333-333333333333",
  artifactType: "soa" as const,
  versionNumber: 1,
  status: "draft" as const,
  createdBy: "44444444-4444-4444-8444-444444444444",
  createdAt: "2026-04-28T17:00:00.000Z",
  traceId: "trace-test-0001",
};

describe("Artifact Versions — imutabilidade e versionamento", () => {
  it("marca versão draft como under_review", () => {
    const version = markArtifactUnderReview(baseVersion, baseContext());

    expect(version.status).toBe("under_review");
    expect(version.traceId).toBe(baseContext().traceId);
  });

  it("aprova versão de artefato com approval_event válido", () => {
    const version = approveArtifactVersion(
      { ...baseVersion, status: "under_review" as const },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        gate: "soa",
        decision: "approved",
        approvedBy: "44444444-4444-4444-8444-444444444444",
        approvedAt: "2026-04-28T17:01:00.000Z",
        traceId: "trace-test-0001",
      }
    );

    expect(version.status).toBe("approved");
    expect(version.approvedBy).toBe("44444444-4444-4444-8444-444444444444");
  });

  it("impede edição de versão aprovada (ARTIFACT_VERSION_IMMUTABLE)", () => {
    expect(() =>
      assertVersionEditable({ ...baseVersion, status: "approved" as const })
    ).toThrow();

    try {
      assertVersionEditable({ ...baseVersion, status: "approved" as const });
    } catch (err) {
      expect((err as Error & { code: string }).code).toBe("ARTIFACT_VERSION_IMMUTABLE");
    }
  });

  it("cria nova versão ao alterar artefato aprovado — versionNumber incrementa", () => {
    const next = createNextArtifactVersion(
      {
        ...baseVersion,
        status: "approved" as const,
        approvedBy: baseVersion.createdBy,
        approvedAt: baseVersion.createdAt,
      },
      baseContext()
    );

    expect(next.versionNumber).toBe(2);
    expect(next.status).toBe("draft");
    expect(next.supersedesVersionId).toBe(baseVersion.id);
  });

  it("nova versão herda organizationId, organizationId, assessmentId da versão anterior", () => {
    const next = createNextArtifactVersion(
      {
        ...baseVersion,
        status: "approved" as const,
        approvedBy: baseVersion.createdBy,
        approvedAt: baseVersion.createdAt,
      },
      baseContext()
    );

    expect(next.organizationId).toBe(baseVersion.organizationId);
    expect(next.assessmentId).toBe(baseVersion.assessmentId);
  });
});
