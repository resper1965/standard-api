import { describe, it, expect } from "vitest";
import { parseStrmBundleRows } from "../importers/strm-bundle-importer.js";

// Regression coverage for defects found running the importer against the real
// 183-file STRM bundle:
//
//   - defect 2: the streaming XLSX reader (needed because exceljs's
//     non-streaming loader crashes on 175/183 real bundle files) yields
//     genuinely-blank rows that `eachRow({ includeEmpty: false })` used to
//     drop, which shifts every fixed row offset the parser relies on.
//   - defect 3: `framework_name` must come from the cell after the "Focal
//     Document:" label, not the sheet name — real files are almost all named
//     "Sheet1".
//   - defect 4: scf-strm-usa-federal-doe-c2m2-2-1.xlsx duplicates its first
//     column, shifting every later column right by one. Read at fixed offsets
//     its operator column landed on STRM Rationale ("Functional"), which the
//     parser drops as a leaked header — losing all 567 rows of that framework.
//
// These drive `parseStrmBundleRows` with plain arrays rather than writing an
// .xlsx and reading it back. ExcelJS cannot reliably read small archives — the
// same fixed bytes failed 22 of 40 reads — so a synthetic workbook is not a
// stable test input, and the seven things tried are recorded in
// docs/runbooks/strm-reimport.md. The reading half is proven where it matters:
// the seeder parses 183 of 183 real files on every run.

/** Metadata block as the real files carry it: label in col 5, value in col 6. */
const meta = (name: string | "", extra: string[] = []): (string | number)[][] => [
  ["NIST IR 8477-Based Set Theory Relationship Mapping", "", "", "", "", "Focal Document: ", name, ...extra],
  ["Reference document:", "SCF 2026.1", "", "", "", "Focal Document URL: ", "https://example.com/focal"],
  ["STRM Guidance: ", "https://example.com/guidance", "", "", "", "Published STRM URL:", "https://example.com/strm"],
];

const HEADER = [
  "FDE #",
  "FDE Name",
  "Focal Document Element",
  "STRM Rationale",
  "STRM Relationship",
  "SCF Control",
  "SCF #",
  "Secure Controls Framework (SCF) Control Description",
  "Strength of Relationship",
  "Notes",
];

describe("parseStrmBundleRows", () => {
  it("reads framework_name from the metadata cell, not the 'Sheet1' sheet name", () => {
    const result = parseStrmBundleRows(
      [
        ...meta("Australia -Essential Eight maturity model (2024)"),
        HEADER,
        ["FDE-1", "", "", "", "Equal", "", "SCF-1"],
      ],
      "Sheet1",
      "framework-name.xlsx",
    );

    expect(result.framework_name).toBe(
      "Australia -Essential Eight maturity model (2024)",
    );
    expect(result.focal_document_url).toBe("https://example.com/focal");
    expect(result.published_strm_url).toBe("https://example.com/strm");
  });

  it("falls back to the sheet name when the metadata cell is blank", () => {
    const result = parseStrmBundleRows(
      [...meta(""), HEADER, ["FDE-1", "", "", "", "Equal", "", "SCF-1"]],
      "Sheet1",
      "framework-name-fallback.xlsx",
    );

    expect(result.framework_name).toBe("Sheet1");
  });

  it("falls back to the filename when there is no sheet name either", () => {
    const result = parseStrmBundleRows(
      [...meta(""), HEADER, ["FDE-1", "", "", "", "Equal", "", "SCF-1"]],
      "",
      "last-resort.xlsx",
    );

    expect(result.framework_name).toBe("last-resort.xlsx");
  });

  it("reports a workbook with no sheets rather than parsing one", () => {
    const result = parseStrmBundleRows([], undefined, "empty.xlsx");

    expect(result.entries).toEqual([]);
    expect(result.warnings).toEqual(["No sheets found in workbook"]);
  });

  it("reads a row at the standard offsets", () => {
    // The blank row the streaming reader emits is dropped upstream by
    // rowValuesToCellsOrNull, so by here rows 0-2 are metadata, 3 the header
    // and 4+ the data — the invariant every offset below depends on.
    const result = parseStrmBundleRows(
      [
        ...meta("Test Framework"),
        HEADER,
        [
          "FDE-1",
          "Some Requirement",
          "",
          "Functional",
          "Equal",
          "SCF Control Name",
          "SCF-1",
          "",
          9,
          "a note",
        ],
      ],
      "Sheet1",
      "blank-row-shift.xlsx",
    );

    expect(result.warnings).toEqual([]);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      fde_code: "FDE-1",
      fde_name: "Some Requirement",
      relationship_type: "equal",
      scf_code: "SCF-1",
      scf_control_name: "SCF Control Name",
      strength_raw: 9,
      relationship_strength: "strong",
      notes: "a note",
    });
  });

  it("follows a shifted column layout instead of dropping the whole file", () => {
    // The DOE C2M2 layout: "FDE #" twice, everything after it one column right,
    // and the metadata label at index 6 rather than 5.
    const result = parseStrmBundleRows(
      [
        [
          "NIST IR 8477-Based Set Theory Relationship Mapping",
          "",
          "",
          "",
          "",
          "",
          "Focal Document: ",
          "Cybersecurity Capability Maturity Model (C2M2)",
        ],
        ["Reference document: ", "Reference document: ", "SCF 2026.1", "", "", "", "Focal Document URL: ", "https://c2m2.doe.gov/"],
        ["STRM Guidance: ", "STRM Guidance: ", "https://example.com/guidance", "", "", "", "Published STRM URL:", "https://example.com/strm"],
        ["FDE #", "FDE #", ...HEADER.slice(1)],
        [
          "ASSET-1a",
          "ASSET-1.a",
          "N/A",
          "IT and OT assets are inventoried",
          "Functional",
          "Intersects With",
          "Asset-Service Dependency",
          "AST-01.1",
          "",
          8,
        ],
      ],
      "Sheet1",
      "shifted-columns.xlsx",
    );

    expect(result.framework_name).toBe(
      "Cybersecurity Capability Maturity Model (C2M2)",
    );
    expect(result.entries).toHaveLength(1);
    // The leftmost of the two "FDE #" columns is the one whose notation matches
    // the catalogue (ACCESS-1a, not ACCESS-1.a), and fde_code is what the
    // operator backfill joins on.
    expect(result.entries[0]).toMatchObject({
      fde_code: "ASSET-1a",
      relationship_type: "intersects",
      scf_code: "AST-01.1",
      scf_control_name: "Asset-Service Dependency",
      strength_raw: 8,
    });
    expect(result.skipped).toBe(0);
  });

  it("keeps a row whose operator is unreadable, with no operator and a warning", () => {
    const result = parseStrmBundleRows(
      [
        ...meta("Test Framework"),
        HEADER,
        ["FDE-1", "", "", "", "Partially Related", "", "SCF-1"],
      ],
      "Sheet1",
      "unknown-operator.xlsx",
    );

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.relationship_type).toBeNull();
    expect(result.unknown_operator).toBe(1);
    expect(result.warnings[0]).toContain("Partially Related");
  });

  it("skips rows with no applicable SCF control", () => {
    const result = parseStrmBundleRows(
      [
        ...meta("Test Framework"),
        HEADER,
        ["FDE-1", "", "", "", "No Relationship", "", "N/A"],
        ["FDE-2", "", "", "", "Equal", "", "SCF-1"],
      ],
      "Sheet1",
      "skips.xlsx",
    );

    expect(result.entries.map((e) => e.fde_code)).toEqual(["FDE-2"]);
    expect(result.skipped).toBe(1);
  });
});
