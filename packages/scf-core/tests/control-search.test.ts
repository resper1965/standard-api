/**
 * T3: scf-core vitest unit tests — control search
 *
 * Tests ScfControlService search, lookup by code, and domain filtering.
 * All fixtures are synthetic (AGENTS.md §7, §8).
 *
 * SCF Data Rules (AGENTS.md §8):
 * - Official mappings only when present in structured SCF base
 * - No invented crosswalks
 * - scf_version is always required for look-up
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  createInMemoryScfCore,
  SYNTHETIC_SCF_VERSION_ID,
  SYNTHETIC_GOV_DOMAIN_ID,
  SYNTHETIC_IAC_DOMAIN_ID,
  SYNTHETIC_GOV_001_CONTROL_ID,
} from "../../src/index";

describe("ScfControlService — control lookup and search", () => {
  let scf: ReturnType<typeof createInMemoryScfCore>;

  beforeEach(() => {
    scf = createInMemoryScfCore();
  });

  // ─── getControl ──────────────────────────────────────────────────────────

  it("getControl returns control by id", async () => {
    const control = await scf.controls.getControl(SYNTHETIC_GOV_001_CONTROL_ID);
    expect(control).not.toBeNull();
    expect(control!.control_code).toBe("GOV-001");
    expect(control!.scf_version_id).toBe(SYNTHETIC_SCF_VERSION_ID);
    expect(control!.is_synthetic).toBe(true);
  });

  it("getControl returns null for unknown id", async () => {
    const control = await scf.controls.getControl("00000000-0000-0000-0000-000000000000");
    expect(control).toBeNull();
  });

  // ─── getControlByCode ────────────────────────────────────────────────────

  it("getControlByCode returns control for existing code", async () => {
    const control = await scf.controls.getControlByCode(SYNTHETIC_SCF_VERSION_ID, "GOV-001");
    expect(control).not.toBeNull();
    expect(control!.control_title).toBe("Synthetic governance policy");
  });

  it("getControlByCode is case-insensitive", async () => {
    const control = await scf.controls.getControlByCode(SYNTHETIC_SCF_VERSION_ID, "gov-001");
    expect(control).not.toBeNull();
    expect(control!.control_code).toBe("GOV-001");
  });

  it("getControlByCode returns null for code in wrong version", async () => {
    const control = await scf.controls.getControlByCode("wrong-version-id", "GOV-001");
    expect(control).toBeNull();
  });

  it("getControlByCode returns null for unknown code", async () => {
    const control = await scf.controls.getControlByCode(SYNTHETIC_SCF_VERSION_ID, "NONEXISTENT-999");
    expect(control).toBeNull();
  });

  // ─── listControlsByDomain ────────────────────────────────────────────────

  it("listControlsByDomain returns controls for GOV domain", async () => {
    const controls = await scf.controls.listControlsByDomain(SYNTHETIC_SCF_VERSION_ID, SYNTHETIC_GOV_DOMAIN_ID);
    expect(controls).toHaveLength(2);
    const codes = controls.map((c) => c.control_code);
    expect(codes).toContain("GOV-001");
    expect(codes).toContain("GOV-002");
  });

  it("listControlsByDomain returns controls for IAC domain", async () => {
    const controls = await scf.controls.listControlsByDomain(SYNTHETIC_SCF_VERSION_ID, SYNTHETIC_IAC_DOMAIN_ID);
    expect(controls).toHaveLength(2);
    const codes = controls.map((c) => c.control_code);
    expect(codes).toContain("IAC-001");
    expect(codes).toContain("IAC-002");
  });

  it("listControlsByDomain returns empty array for unknown domain", async () => {
    const controls = await scf.controls.listControlsByDomain(SYNTHETIC_SCF_VERSION_ID, "00000000-0000-0000-0000-000000000000");
    expect(controls).toHaveLength(0);
  });

  // ─── searchControls ──────────────────────────────────────────────────────

  it("searchControls with control_code filter returns matching controls", async () => {
    const controls = await scf.controls.searchControls({
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      control_code: "GOV",
    });
    expect(controls.length).toBeGreaterThanOrEqual(2);
    expect(controls.every((c) => c.control_code.includes("GOV"))).toBe(true);
  });

  it("searchControls with free-text q filter finds controls by title", async () => {
    const controls = await scf.controls.searchControls({
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      q: "governance",
    });
    expect(controls.length).toBeGreaterThanOrEqual(1);
    expect(controls[0].control_code.startsWith("GOV")).toBe(true);
  });

  it("searchControls with domain_code filter scopes results", async () => {
    const controls = await scf.controls.searchControls({
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      domain_code: "IAC",
    });
    expect(controls.length).toBeGreaterThanOrEqual(2);
    expect(controls.every((c) => c.control_code.startsWith("IAC"))).toBe(true);
  });

  it("searchControls without scf_version_id falls back to latest version", async () => {
    // Latest version is the synthetic one; should still return results
    const controls = await scf.controls.searchControls({ control_code: "GOV-001" });
    expect(controls).toHaveLength(1);
    expect(controls[0].control_code).toBe("GOV-001");
  });

  it("searchControls with unknown control_code returns empty array", async () => {
    const controls = await scf.controls.searchControls({
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      control_code: "ZZZ-999",
    });
    expect(controls).toHaveLength(0);
  });

  it("searchControls results are sorted alphabetically by control_code", async () => {
    const controls = await scf.controls.searchControls({ scf_version_id: SYNTHETIC_SCF_VERSION_ID });
    const codes = controls.map((c) => c.control_code);
    const sorted = [...codes].sort();
    expect(codes).toEqual(sorted);
  });

  it("searchControls returns 4 controls total for synthetic fixture version", async () => {
    const controls = await scf.controls.searchControls({ scf_version_id: SYNTHETIC_SCF_VERSION_ID });
    expect(controls).toHaveLength(4);
  });
});
