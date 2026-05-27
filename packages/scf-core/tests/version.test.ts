/**
 * T3: scf-core vitest unit tests — version invariants
 *
 * Tests ScfVersionService using the in-memory repository + synthetic fixture.
 * No DB required. All fixtures are synthetic (AGENTS.md §7).
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  createInMemoryScfCore,
  SYNTHETIC_SCF_VERSION_ID,
  SYNTHETIC_SCF_VERSION_LABEL,
  SYNTHETIC_SOURCE_HASH,
} from "../../src/index";

describe("ScfVersionService — synthetic fixture invariants", () => {
  let scf: ReturnType<typeof createInMemoryScfCore>;

  beforeEach(() => {
    scf = createInMemoryScfCore();
  });

  it("listVersions returns exactly 1 version for synthetic fixture", async () => {
    const versions = await scf.versions.listVersions();
    expect(versions).toHaveLength(1);
  });

  it("listVersions version has correct id and label", async () => {
    const [v] = await scf.versions.listVersions();
    expect(v.id).toBe(SYNTHETIC_SCF_VERSION_ID);
    expect(v.version_label).toBe(SYNTHETIC_SCF_VERSION_LABEL);
    expect(v.source_hash).toBe(SYNTHETIC_SOURCE_HASH);
    expect(v.is_synthetic).toBe(true);
  });

  it("getVersion by id returns the version", async () => {
    const version = await scf.versions.getVersion(SYNTHETIC_SCF_VERSION_ID);
    expect(version).not.toBeNull();
    expect(version!.id).toBe(SYNTHETIC_SCF_VERSION_ID);
  });

  it("getVersion with unknown id returns null", async () => {
    const version = await scf.versions.getVersion("00000000-0000-0000-0000-000000000000");
    expect(version).toBeNull();
  });

  it("getLatestVersion returns the synthetic version", async () => {
    const latest = await scf.versions.getLatestVersion();
    expect(latest).not.toBeNull();
    expect(latest!.id).toBe(SYNTHETIC_SCF_VERSION_ID);
  });

  it("registerImportRun creates a new import run with status running", async () => {
    const run = await scf.versions.registerImportRun({
      scfVersionId: SYNTHETIC_SCF_VERSION_ID,
      sourceType: "xlsx",
      sourceFilename: "test.xlsx",
      sourceHash: "sha256:test",
      traceId: "trace-test-001",
    });
    expect(run.status).toBe("running");
    expect(run.source_hash).toBe("sha256:test");
    expect(run.trace_id).toBe("trace-test-001");
    expect(run.id).toBeTruthy();
  });

  it("completeImportRun transitions status to succeeded", async () => {
    const run = await scf.versions.registerImportRun({
      scfVersionId: SYNTHETIC_SCF_VERSION_ID,
      sourceType: "csv",
      sourceHash: "sha256:complete-test",
      traceId: "trace-002",
    });
    const stats = {
      versions: 1, domains: 2, controls: 10, frameworks: 3,
      requirements: 20, mappings: 30, strm_relationships: 5, warnings: 0, synthetic_records: 0,
    };
    const completed = await scf.versions.completeImportRun(run.id, stats);
    expect(completed).not.toBeNull();
    expect(completed!.status).toBe("succeeded");
    expect(completed!.import_statistics.controls).toBe(10);
  });

  it("failImportRun transitions status to failed with error summary", async () => {
    const run = await scf.versions.registerImportRun({
      scfVersionId: SYNTHETIC_SCF_VERSION_ID,
      sourceType: "xlsx",
      sourceHash: "sha256:fail-test",
      traceId: "trace-003",
    });
    const failed = await scf.versions.failImportRun(run.id, "File parsing error in row 42");
    expect(failed).not.toBeNull();
    expect(failed!.status).toBe("failed");
    expect(failed!.error_summary_safe).toContain("File parsing error");
  });

  it("failImportRun truncates error_summary_safe to 240 chars", async () => {
    const run = await scf.versions.registerImportRun({
      scfVersionId: SYNTHETIC_SCF_VERSION_ID,
      sourceType: "xlsx",
      sourceHash: "sha256:truncation-test",
      traceId: "trace-004",
    });
    const longError = "x".repeat(500);
    const failed = await scf.versions.failImportRun(run.id, longError);
    expect(failed!.error_summary_safe!.length).toBeLessThanOrEqual(240);
  });

  it("completeImportRun on unknown run returns null", async () => {
    const result = await scf.versions.completeImportRun(
      "00000000-0000-0000-0000-000000000099",
      { versions: 0, domains: 0, controls: 0, frameworks: 0, requirements: 0, mappings: 0, strm_relationships: 0, warnings: 0, synthetic_records: 0 }
    );
    expect(result).toBeNull();
  });
});
