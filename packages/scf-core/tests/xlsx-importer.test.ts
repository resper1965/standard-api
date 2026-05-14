/**
 * XLSX Importer Tests
 *
 * Creates a synthetic XLSX workbook programmatically, then
 * validates that the importer correctly parses controls, domains,
 * crosswalk mappings, and import run statistics.
 */

import * as XLSX from "xlsx";
import { createXlsxScfImporter } from "../src/importers/xlsx-importer";
import { test, expect } from "./test-kit";

// ──── Helpers ────

/** Convert Uint8Array to base64 string (universal, no Node Buffer needed) */
const uint8ToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

// ──── Synthetic XLSX Fixture ────

/**
 * Build a minimal SCF-like XLSX workbook with:
 * - 1 controls tab ("SCF") with 5 controls across 3 domains
 * - 1 crosswalk tab ("ISO 27001") with 5 requirement mappings
 * - 1 metadata tab ("Readme") that should be skipped
 */
const buildSyntheticWorkbook = (): string => {
  const wb = XLSX.utils.book_new();

  // Controls tab
  const controlsData = [
    {
      "SCF Domain": "Governance",
      "SCF Control #": "GOV-01",
      "SCF Control": "Cybersecurity Governance Program",
      "SCF Control Description": "Establish a governance program.",
      "SCF Control Question": "Is there a governance program?",
      "SCF Control Weighting": "9.5",
    },
    {
      "SCF Domain": "Governance",
      "SCF Control #": "GOV-02",
      "SCF Control": "Publishing Documentation",
      "SCF Control Description": "Publish security policies.",
      "SCF Control Question": "Are policies published?",
      "SCF Control Weighting": "8.0",
    },
    {
      "SCF Domain": "Access Control",
      "SCF Control #": "IAC-01",
      "SCF Control": "Identity & Access Management",
      "SCF Control Description": "Enforce least privilege IAM.",
      "SCF Control Weighting": "10",
    },
    {
      "SCF Domain": "Access Control",
      "SCF Control #": "IAC-02",
      "SCF Control": "User Authentication",
      "SCF Control Description": "Uniquely identify users.",
      "SCF Control Weighting": "9",
    },
    {
      "SCF Domain": "Data Protection",
      "SCF Control #": "DCH-01",
      "SCF Control": "Data Classification",
      "SCF Control Description": "Classify data by sensitivity.",
    },
  ];
  const controlsWs = XLSX.utils.json_to_sheet(controlsData);
  XLSX.utils.book_append_sheet(wb, controlsWs, "SCF");

  // Crosswalk tab: ISO 27001
  const isoData = [
    { "SCF Control #": "GOV-01", "ISO 27001:2022": "A.5.1" },
    { "SCF Control #": "GOV-02", "ISO 27001:2022": "A.5.1" },
    { "SCF Control #": "IAC-01", "ISO 27001:2022": "A.8.3" },
    { "SCF Control #": "IAC-02", "ISO 27001:2022": "A.8.5" },
    { "SCF Control #": "DCH-01", "ISO 27001:2022": "A.5.12" },
  ];
  const isoWs = XLSX.utils.json_to_sheet(isoData);
  XLSX.utils.book_append_sheet(wb, isoWs, "ISO 27001");

  // A metadata tab that should be skipped
  const readmeWs = XLSX.utils.json_to_sheet([{ "Info": "This is a test workbook." }]);
  XLSX.utils.book_append_sheet(wb, readmeWs, "Readme");

  // Write to buffer and convert to base64
  const xlsxOutput = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return uint8ToBase64(new Uint8Array(xlsxOutput));
};

/** Build an empty workbook with no controls tab */
const buildEmptyWorkbook = (): string => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([["foo"], ["bar"]]);
  XLSX.utils.book_append_sheet(wb, ws, "Empty");
  const xlsxOutput = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return uint8ToBase64(new Uint8Array(xlsxOutput));
};

// ──── Tests ────

test("xlsx-importer: validate accepts well-formed workbook", async () => {
  const importer = createXlsxScfImporter();
  const content = buildSyntheticWorkbook();

  const result = await importer.validate({
    source_type: "xlsx",
    version_label: "SCF Test 1.0",
    content,
  });

  expect(result.valid).toBe(true);
  expect(result.errors.length).toBe(0);
});

test("xlsx-importer: validate rejects empty workbook", async () => {
  const importer = createXlsxScfImporter();
  const content = buildEmptyWorkbook();

  const result = await importer.validate({
    source_type: "xlsx",
    version_label: "Test",
    content,
  });

  expect(result.valid).toBe(false);
});

test("xlsx-importer: parse extracts correct domains", async () => {
  const importer = createXlsxScfImporter();
  const content = buildSyntheticWorkbook();

  const result = await importer.parse({
    source_type: "xlsx",
    source_filename: "SCF-Test-2024.4.xlsx",
    version_label: "SCF 2024.4",
    content,
  });

  // Should extract 3 domains: GOV, IAC, DCH
  expect(result.dataset.domains.length).toBe(3);

  const domainCodes = result.dataset.domains.map((d) => d.domain_code).sort();
  expect(domainCodes).toContain("GOV");
  expect(domainCodes).toContain("IAC");
  expect(domainCodes).toContain("DCH");
});

test("xlsx-importer: parse extracts correct controls", async () => {
  const importer = createXlsxScfImporter();
  const content = buildSyntheticWorkbook();

  const result = await importer.parse({
    source_type: "xlsx",
    version_label: "SCF Test",
    content,
  });

  // Should extract 5 controls
  expect(result.dataset.controls.length).toBe(5);

  const codes = result.dataset.controls.map((c) => c.control_code).sort();
  expect(codes).toContain("GOV-01");
  expect(codes).toContain("IAC-02");
  expect(codes).toContain("DCH-01");

  // Check control metadata
  const gov01 = result.dataset.controls.find((c) => c.control_code === "GOV-01");
  expect(gov01?.control_title).toBe("Cybersecurity Governance Program");
  expect(gov01?.control_description).toBe("Establish a governance program.");
  expect(gov01?.control_question).toBe("Is there a governance program?");
  expect(gov01?.control_weight).toBe(9.5);
  expect(gov01?.is_synthetic).toBe(false);
});

test("xlsx-importer: parse extracts crosswalk framework", async () => {
  const importer = createXlsxScfImporter();
  const content = buildSyntheticWorkbook();

  const result = await importer.parse({
    source_type: "xlsx",
    version_label: "SCF Test",
    content,
  });

  // Should extract 1 framework (ISO 27001)
  expect(result.dataset.frameworks.length).toBe(1);
  expect(result.dataset.frameworks[0]?.framework_name).toBe("ISO 27001");
});

test("xlsx-importer: parse extracts crosswalk requirements and mappings", async () => {
  const importer = createXlsxScfImporter();
  const content = buildSyntheticWorkbook();

  const result = await importer.parse({
    source_type: "xlsx",
    version_label: "SCF Test",
    content,
  });

  // Should extract requirements (unique codes: A.5.1, A.8.3, A.8.5, A.5.12)
  expect(result.dataset.requirements.length).toBe(4);

  // Should extract 5 mappings (one per data row in crosswalk)
  expect(result.dataset.mappings.length).toBe(5);

  // All mappings should be official
  for (const m of result.dataset.mappings) {
    expect(m.is_official).toBe(true);
    expect(m.is_synthetic).toBe(false);
  }
});

test("xlsx-importer: parse generates correct import run stats", async () => {
  const importer = createXlsxScfImporter();
  const content = buildSyntheticWorkbook();

  const result = await importer.parse({
    source_type: "xlsx",
    version_label: "SCF Test",
    content,
  });

  const run = result.dataset.importRuns[0]!;
  expect(run.status).toBe("succeeded");
  expect(run.source_type).toBe("xlsx");
  expect(run.import_statistics.versions).toBe(1);
  expect(run.import_statistics.domains).toBe(3);
  expect(run.import_statistics.controls).toBe(5);
  expect(run.import_statistics.frameworks).toBe(1);
  expect(run.import_statistics.requirements).toBe(4);
  expect(run.import_statistics.mappings).toBe(5);
  expect(run.import_statistics.synthetic_records).toBe(0);
});

test("xlsx-importer: parse skips metadata tabs", async () => {
  const importer = createXlsxScfImporter();
  const content = buildSyntheticWorkbook();

  const result = await importer.parse({
    source_type: "xlsx",
    version_label: "SCF Test",
    content,
  });

  // The Readme tab should NOT appear as a framework
  const fwNames = result.dataset.frameworks.map((f) => f.framework_name);
  for (const name of fwNames) {
    expect(name !== "Readme").toBe(true);
  }
});

test("xlsx-importer: parse sets version from source", async () => {
  const importer = createXlsxScfImporter();
  const content = buildSyntheticWorkbook();

  const result = await importer.parse({
    source_type: "xlsx",
    version_label: "SCF 2026.1.1",
    content,
  });

  expect(result.dataset.versions.length).toBe(1);
  expect(result.dataset.versions[0]?.version_label).toBe("SCF 2026.1.1");
  expect(result.dataset.versions[0]?.is_synthetic).toBe(false);
});
