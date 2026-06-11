/**
 * SCF Version Tenancy — A2
 *
 * Tests the organization-scoped filtering logic in the InMemoryScfRepository
 * (scf.repository.ts, listVersions method, lines 152-165).
 *
 * Rules:
 *   - Global versions (organization_id = null/undefined) are visible to ALL callers.
 *   - Org-specific versions are visible ONLY to the owning organization.
 *   - Org A cannot see Org B's versions.
 *   - Unauthenticated (no organizationId) sees only global versions.
 *
 * All data is synthetic (AGENTS.md §7). No DB required.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createInMemoryScfRepository } from "../../src/repositories/scf.repository";
import type { ScfDataset } from "../../src/types";

// ── Synthetic IDs ────────────────────────────────────────────────────────────
const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const GLOBAL_VERSION_ID = "10000000-0000-4000-8000-000000000001";
const ORG_A_VERSION_ID = "10000000-0000-4000-8000-000000000002";
const ORG_B_VERSION_ID = "10000000-0000-4000-8000-000000000003";

const baseVersion = (overrides: Record<string, unknown>) => ({
  id: GLOBAL_VERSION_ID,
  version_label: "2026.1-synthetic",
  release_date: "2026-01-01",
  source_hash: "sha256:test",
  import_status: "succeeded" as const,
  imported_at: "2026-01-01T00:00:00.000Z",
  is_synthetic: true,
  ...overrides,
});

const emptyDataset: ScfDataset = {
  versions: [],
  domains: [],
  controls: [],
  frameworks: [],
  requirements: [],
  mappings: [],
  strmRelationships: [],
  importRuns: [],
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("SCF Version Tenancy — InMemoryScfRepository", () => {
  let repo: ReturnType<typeof createInMemoryScfRepository>;

  beforeEach(() => {
    const dataset: ScfDataset = {
      ...emptyDataset,
      versions: [
        // Global version — no organization_id
        baseVersion({
          id: GLOBAL_VERSION_ID,
          version_label: "Global 2026.1",
        }),
        // Org A private version
        baseVersion({
          id: ORG_A_VERSION_ID,
          version_label: "OrgA Custom 1.0",
          organization_id: ORG_A,
        }),
        // Org B private version
        baseVersion({
          id: ORG_B_VERSION_ID,
          version_label: "OrgB Custom 1.0",
          organization_id: ORG_B,
        }),
      ],
    };
    repo = createInMemoryScfRepository(dataset);
  });

  describe("Global versions are visible to all", () => {
    it("Org A sees the global version", async () => {
      const versions = await repo.listVersions(ORG_A);
      const ids = versions.map((v) => v.id);
      expect(ids).toContain(GLOBAL_VERSION_ID);
    });

    it("Org B sees the global version", async () => {
      const versions = await repo.listVersions(ORG_B);
      const ids = versions.map((v) => v.id);
      expect(ids).toContain(GLOBAL_VERSION_ID);
    });
  });

  describe("Org-specific versions visible only to owning org", () => {
    it("Org A sees its own version", async () => {
      const versions = await repo.listVersions(ORG_A);
      const ids = versions.map((v) => v.id);
      expect(ids).toContain(ORG_A_VERSION_ID);
    });

    it("Org B sees its own version", async () => {
      const versions = await repo.listVersions(ORG_B);
      const ids = versions.map((v) => v.id);
      expect(ids).toContain(ORG_B_VERSION_ID);
    });
  });

  describe("Cross-org isolation", () => {
    it("Org A cannot see Org B's version", async () => {
      const versions = await repo.listVersions(ORG_A);
      const ids = versions.map((v) => v.id);
      expect(ids).not.toContain(ORG_B_VERSION_ID);
    });

    it("Org B cannot see Org A's version", async () => {
      const versions = await repo.listVersions(ORG_B);
      const ids = versions.map((v) => v.id);
      expect(ids).not.toContain(ORG_A_VERSION_ID);
    });
  });

  describe("Unauthenticated sees only global", () => {
    it("no organizationId → only global versions", async () => {
      const versions = await repo.listVersions(undefined);
      expect(versions).toHaveLength(1);
      expect(versions[0]!.id).toBe(GLOBAL_VERSION_ID);
    });
  });

  describe("Org A sees correct total count", () => {
    it("Org A sees exactly 2 versions (global + own)", async () => {
      const versions = await repo.listVersions(ORG_A);
      expect(versions).toHaveLength(2);
    });
  });

  describe("getLatestVersion respects tenancy", () => {
    it("Org A latest version is from its visible set", async () => {
      const latest = await repo.getLatestVersion(ORG_A);
      expect(latest).not.toBeNull();
      // latest should be one of the two visible to Org A
      expect([GLOBAL_VERSION_ID, ORG_A_VERSION_ID]).toContain(latest!.id);
    });

    it("unauthenticated latest version is the global one", async () => {
      const latest = await repo.getLatestVersion(undefined);
      expect(latest).not.toBeNull();
      expect(latest!.id).toBe(GLOBAL_VERSION_ID);
    });
  });
});
