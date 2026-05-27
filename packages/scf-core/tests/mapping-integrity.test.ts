/**
 * T3: scf-core vitest unit tests — mapping integrity
 *
 * Tests ScfMappingService: framework-to-control mappings, coverage summary,
 * enrichment. Validates AGENTS.md §8 mapping rules:
 * - Official mappings only when is_official = true in structured SCF base
 * - No crosswalks invented — only what's in fixture
 * - scf_version_id and framework_id always required for mapping queries
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  createInMemoryScfCore,
  SYNTHETIC_SCF_VERSION_ID,
  SYNTHETIC_FRAMEWORK_ID,
  SYNTHETIC_GOV_001_CONTROL_ID,
  SYNTHETIC_IAC_001_CONTROL_ID,
  SYNTHETIC_REQ_1_1_ID,
  SYNTHETIC_REQ_1_2_ID,
} from "../src/index";

describe("ScfMappingService — mapping integrity", () => {
  let scf: ReturnType<typeof createInMemoryScfCore>;

  beforeEach(() => {
    scf = createInMemoryScfCore();
  });

  // ─── mapFrameworkToScf ───────────────────────────────────────────────────

  it("mapFrameworkToScf returns 2 mappings for synthetic framework", async () => {
    const mappings = await scf.mappings.mapFrameworkToScf(SYNTHETIC_FRAMEWORK_ID, SYNTHETIC_SCF_VERSION_ID);
    expect(mappings).toHaveLength(2);
  });

  it("mapFrameworkToScf all mappings have is_official = true (synthetic fixture)", async () => {
    const mappings = await scf.mappings.mapFrameworkToScf(SYNTHETIC_FRAMEWORK_ID, SYNTHETIC_SCF_VERSION_ID);
    expect(mappings.every((m) => m.is_official)).toBe(true);
  });

  it("mapFrameworkToScf all mappings are is_synthetic = true (synthetic fixture)", async () => {
    const mappings = await scf.mappings.mapFrameworkToScf(SYNTHETIC_FRAMEWORK_ID, SYNTHETIC_SCF_VERSION_ID);
    expect(mappings.every((m) => m.is_synthetic)).toBe(true);
  });

  it("mapFrameworkToScf returns empty array for unknown framework", async () => {
    const mappings = await scf.mappings.mapFrameworkToScf(
      "00000000-0000-0000-0000-000000000000",
      SYNTHETIC_SCF_VERSION_ID
    );
    expect(mappings).toHaveLength(0);
  });

  it("mapFrameworkToScf returns empty array for wrong scf_version_id", async () => {
    const mappings = await scf.mappings.mapFrameworkToScf(
      SYNTHETIC_FRAMEWORK_ID,
      "00000000-0000-0000-0000-000000000000"
    );
    expect(mappings).toHaveLength(0);
  });

  // ─── getMappingsForControl ────────────────────────────────────────────────

  it("getMappingsForControl returns 1 mapping for GOV-001 control", async () => {
    const mappings = await scf.mappings.getMappingsForControl(
      SYNTHETIC_GOV_001_CONTROL_ID,
      SYNTHETIC_SCF_VERSION_ID
    );
    expect(mappings).toHaveLength(1);
    expect(mappings[0]!.scf_control_id).toBe(SYNTHETIC_GOV_001_CONTROL_ID);
  });

  it("getMappingsForControl with frameworkId filter narrows results", async () => {
    const mappings = await scf.mappings.getMappingsForControl(
      SYNTHETIC_GOV_001_CONTROL_ID,
      SYNTHETIC_SCF_VERSION_ID,
      SYNTHETIC_FRAMEWORK_ID
    );
    expect(mappings).toHaveLength(1);
  });

  it("getMappingsForControl with wrong frameworkId returns empty", async () => {
    const mappings = await scf.mappings.getMappingsForControl(
      SYNTHETIC_GOV_001_CONTROL_ID,
      SYNTHETIC_SCF_VERSION_ID,
      "00000000-0000-0000-0000-000000000000"
    );
    expect(mappings).toHaveLength(0);
  });

  // ─── getMappingsForRequirement ────────────────────────────────────────────

  it("getMappingsForRequirement returns 1 mapping for SYNTH-1.1", async () => {
    const mappings = await scf.mappings.getMappingsForRequirement(
      SYNTHETIC_REQ_1_1_ID,
      SYNTHETIC_SCF_VERSION_ID
    );
    expect(mappings).toHaveLength(1);
    expect(mappings[0]!.scf_framework_requirement_id).toBe(SYNTHETIC_REQ_1_1_ID);
    expect(mappings[0]!.scf_control_id).toBe(SYNTHETIC_GOV_001_CONTROL_ID);
  });

  it("getMappingsForRequirement returns 1 mapping for SYNTH-1.2", async () => {
    const mappings = await scf.mappings.getMappingsForRequirement(
      SYNTHETIC_REQ_1_2_ID,
      SYNTHETIC_SCF_VERSION_ID
    );
    expect(mappings).toHaveLength(1);
    expect(mappings[0]!.scf_control_id).toBe(SYNTHETIC_IAC_001_CONTROL_ID);
  });

  // ─── getCoverageSummary ───────────────────────────────────────────────────

  it("getCoverageSummary returns correct counts for synthetic framework", async () => {
    const summary = await scf.mappings.getCoverageSummary(
      SYNTHETIC_FRAMEWORK_ID,
      SYNTHETIC_SCF_VERSION_ID
    );
    expect(summary.framework_id).toBe(SYNTHETIC_FRAMEWORK_ID);
    expect(summary.scf_version_id).toBe(SYNTHETIC_SCF_VERSION_ID);
    expect(summary.requirement_count).toBe(2);
    expect(summary.mapped_requirement_count).toBe(2);
    expect(summary.control_count).toBe(2);
    expect(summary.official_mapping_count).toBe(2);
    expect(summary.is_synthetic).toBe(true);
  });

  it("getCoverageSummary for unknown framework returns zeroed coverage", async () => {
    const summary = await scf.mappings.getCoverageSummary(
      "00000000-0000-0000-0000-000000000000",
      SYNTHETIC_SCF_VERSION_ID
    );
    expect(summary.requirement_count).toBe(0);
    expect(summary.mapped_requirement_count).toBe(0);
    expect(summary.control_count).toBe(0);
    expect(summary.official_mapping_count).toBe(0);
  });

  // ─── enrichMappings ───────────────────────────────────────────────────────

  it("enrichMappings adds control_code and requirement_code to each mapping", async () => {
    const rawMappings = await scf.mappings.mapFrameworkToScf(
      SYNTHETIC_FRAMEWORK_ID,
      SYNTHETIC_SCF_VERSION_ID
    );
    const enriched = await scf.mappings.enrichMappings(rawMappings);
    expect(enriched).toHaveLength(2);
    for (const m of enriched) {
      expect(typeof m.control_code).toBe("string");
      expect(typeof m.requirement_code).toBe("string");
    }
    const codes = enriched.map((m) => m.control_code).sort();
    expect(codes).toContain("GOV-001");
    expect(codes).toContain("IAC-001");
  });
});
