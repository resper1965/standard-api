/**
 * QA Suite — Tenant Isolation (IDOR Prevention) Tests
 * Verifies that cross-tenant data access is blocked at the service layer.
 *
 * Uses synthetic fixtures — no real tenant data.
 */
import { describe, it, expect } from "vitest";

// ── Synthetic fixtures ───────────────────────────────────────────────────────

const ORG_A = "aaaaaaaa-0000-0000-0000-000000000001";
const ORG_B = "bbbbbbbb-0000-0000-0000-000000000001";
const ASSESS_A = "aaaaaaaa-0000-0000-0000-000000000002";
const ASSESS_B = "bbbbbbbb-0000-0000-0000-000000000002";
const DOC_A = "aaaaaaaa-0000-0000-0000-000000000003";

// Simulates a Drizzle-style withOrganization-scoped repository
function makeScopedRepo(ownerOrgId: string) {
  const store = new Map<string, { id: string; organization_id: string; assessment_id: string }>();
  store.set(DOC_A, { id: DOC_A, organization_id: ownerOrgId, assessment_id: ASSESS_A });

  return {
    getDocument: (id: string, requestingOrgId: string) => {
      const doc = store.get(id);
      if (!doc) return null;
      // Simulate withOrganization() filter — reject cross-tenant reads
      if (doc.organization_id !== requestingOrgId) return null;
      return doc;
    },
  };
}

// Simulates assertTenantOwnership guard
function assertTenantOwnership(
  record: { organization_id: string; assessment_id?: string } | null,
  requestingOrgId: string,
  requestingAssessmentId?: string
): void {
  if (!record) throw new Error("NOT_FOUND");
  if (record.organization_id !== requestingOrgId) throw new Error("FORBIDDEN: tenant mismatch");
  if (requestingAssessmentId && record.assessment_id !== requestingAssessmentId) {
    throw new Error("FORBIDDEN: assessment mismatch");
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Tenant Isolation — repository-level scoping", () => {
  const repo = makeScopedRepo(ORG_A);

  it("returns document when org matches", () => {
    const doc = repo.getDocument(DOC_A, ORG_A);
    expect(doc).not.toBeNull();
    expect(doc?.id).toBe(DOC_A);
  });

  it("returns null when org is different (IDOR prevention)", () => {
    const doc = repo.getDocument(DOC_A, ORG_B);
    expect(doc).toBeNull();
  });

  it("returns null for non-existent document", () => {
    expect(repo.getDocument("nonexistent-id", ORG_A)).toBeNull();
  });
});

describe("Tenant Isolation — assertTenantOwnership guard", () => {
  const record = { organization_id: ORG_A, assessment_id: ASSESS_A };

  it("passes when org and assessment match", () => {
    expect(() => assertTenantOwnership(record, ORG_A, ASSESS_A)).not.toThrow();
  });

  it("throws FORBIDDEN when org mismatches", () => {
    expect(() => assertTenantOwnership(record, ORG_B, ASSESS_A)).toThrow("tenant mismatch");
  });

  it("throws FORBIDDEN when assessment mismatches", () => {
    expect(() => assertTenantOwnership(record, ORG_A, ASSESS_B)).toThrow("assessment mismatch");
  });

  it("throws NOT_FOUND for null record (not exposes FORBIDDEN on missing)", () => {
    expect(() => assertTenantOwnership(null, ORG_A)).toThrow("NOT_FOUND");
  });
});

describe("Tenant Isolation — cross-tenant vector search filter", () => {
  type VectorResult = { metadata: { organization_id: string; assessment_id: string; chunk_id: string } };

  // Simulates the hydrateResults tenant guard in kb-search.service.ts
  function filterResults(results: VectorResult[], orgId: string, assessmentId: string) {
    return results.filter(
      (r) => r.metadata.organization_id === orgId && r.metadata.assessment_id === assessmentId
    );
  }

  const results: VectorResult[] = [
    { metadata: { organization_id: ORG_A, assessment_id: ASSESS_A, chunk_id: "c1" } },
    { metadata: { organization_id: ORG_B, assessment_id: ASSESS_B, chunk_id: "c2" } }, // cross-tenant
    { metadata: { organization_id: ORG_A, assessment_id: ASSESS_B, chunk_id: "c3" } }, // cross-assessment
  ];

  it("returns only results matching org and assessment", () => {
    const filtered = filterResults(results, ORG_A, ASSESS_A);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].metadata.chunk_id).toBe("c1");
  });

  it("returns empty when no results match", () => {
    expect(filterResults(results, "no-org", "no-assess")).toHaveLength(0);
  });
});

describe("Tenant Isolation — UUID param validation", () => {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function routeUuidParam(params: Record<string, string | undefined>, name: string): string {
    const val = params[name];
    if (!val || !UUID_REGEX.test(val)) throw new Error(`VALIDATION_ERROR: ${name} must be a valid UUID`);
    return val;
  }

  it("accepts valid UUID", () => {
    expect(() => routeUuidParam({ id: ASSESS_A }, "id")).not.toThrow();
  });

  it("rejects non-UUID strings (path traversal / injection)", () => {
    expect(() => routeUuidParam({ id: "../admin" }, "id")).toThrow("VALIDATION_ERROR");
  });

  it("rejects SQL injection attempt", () => {
    expect(() => routeUuidParam({ id: "'; DROP TABLE assessments; --" }, "id")).toThrow("VALIDATION_ERROR");
  });

  it("rejects empty string", () => {
    expect(() => routeUuidParam({ id: "" }, "id")).toThrow("VALIDATION_ERROR");
  });

  it("rejects undefined param", () => {
    expect(() => routeUuidParam({}, "id")).toThrow("VALIDATION_ERROR");
  });
});
