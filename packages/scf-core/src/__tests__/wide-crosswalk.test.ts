/**
 * Wide Crosswalk Parser
 *
 * Edition 2026.1.1 of the SCF catalogue has no crosswalk tabs: the 250
 * frameworks are columns inside the `SCF 2026.1` sheet, indexed by the
 * `Authoritative Sources` sheet (250 rows, 8 columns). These tests cover
 * `parseAuthoritativeSources` (the index) and `parseWideCrosswalk` (the
 * column-per-framework body), driven entirely by hand-built row fixtures —
 * no workbook is involved.
 *
 * ADR-001: the crosswalk states no STRM operator. Every mapping this parser
 * produces must carry `relationship_type: null` — see case 6. That is the
 * invariant this whole branch exists to protect; never soften it with a
 * default, a fallback, or a "conservative" guess.
 *
 * See docs/superpowers/plans/2026-08-31-wide-crosswalk-parser.md, Task 1.
 */
import { describe, it, expect } from "vitest";
import {
  parseAuthoritativeSources,
  type AuthoritativeSource,
} from "../importers/authoritative-sources";
import { parseWideCrosswalk } from "../importers/wide-crosswalk";

const AS_HEADER = [
  "Geography",
  "SCF Column Header",
  "Focal Document Identifier (FDI)",
  "Source",
  "Focal Document Name (FDN)",
  "Focal Document Title (FDT)",
  "Focal Document Source (FDS)",
  "Set Theory Relationship Mapping (STRM)",
];

describe("parseAuthoritativeSources", () => {
  it("reports an empty sheet instead of parsing one", () => {
    // No header row means no way to locate a column, and guessing at fixed
    // positions is exactly what this parser refuses to do everywhere else.
    const { sources, warnings } = parseAuthoritativeSources([]);

    expect(sources).toEqual([]);
    expect(warnings).toEqual([
      "Authoritative Sources: no header row found.",
    ]);
  });

  it("maps the eight columns onto the descriptor", () => {
    const rows = [
      AS_HEADER,
      [
        "General",
        "AICPA TSC 2017:2022 (used for SOC 2)",
        "general-aicpa-tsc-2017",
        "AICPA",
        "Trust Services Criteria (TSC) (2017)",
        "American Institute of Certified Public Accountants",
        "https://example.com/tsc-2017",
        "https://example.com/strm-tsc-2017",
      ],
    ];

    const { sources, warnings } = parseAuthoritativeSources(rows);

    expect(warnings).toEqual([]);
    expect(sources).toEqual<AuthoritativeSource[]>([
      {
        fdi: "general-aicpa-tsc-2017",
        columnHeader: "AICPA TSC 2017:2022 (used for SOC 2)",
        name: "Trust Services Criteria (TSC) (2017)",
        geography: "General",
        source: "AICPA",
        sourceUrl: "https://example.com/tsc-2017",
      },
    ]);
  });

  it("skips rows with a blank FDI, and warns once per skipped row", () => {
    const rows = [
      AS_HEADER,
      [
        "General",
        "AICPA TSC 2017:2022 (used for SOC 2)",
        "", // blank FDI
        "AICPA",
        "Trust Services Criteria (TSC) (2017)",
        "",
        "https://example.com/tsc-2017",
        "",
      ],
      [
        "General",
        "APEC Privacy Framework",
        "general-apec-privacy-framework-2015",
        "APEC",
        "APEC Privacy Framework (2015)",
        "",
        "https://example.com/apec",
        "",
      ],
    ];

    const { sources, warnings } = parseAuthoritativeSources(rows);

    expect(sources).toHaveLength(1);
    expect(sources[0]?.fdi).toBe("general-apec-privacy-framework-2015");
    expect(warnings).toHaveLength(1);
  });

  it("warns and returns nothing when a required header is missing", () => {
    const rows = [
      [
        "Geography",
        "SCF Column Header",
        // "Focal Document Identifier (FDI)" column removed entirely
        "Source",
        "Focal Document Name (FDN)",
        "Focal Document Title (FDT)",
        "Focal Document Source (FDS)",
        "Set Theory Relationship Mapping (STRM)",
      ],
      ["General", "AICPA TSC", "AICPA", "TSC", "", "https://example.com", ""],
    ];

    const { sources, warnings } = parseAuthoritativeSources(rows);

    expect(sources).toEqual([]);
    expect(warnings.length).toBeGreaterThan(0);
  });
});

// ──── parseWideCrosswalk ────

const source = (overrides: Partial<AuthoritativeSource> = {}): AuthoritativeSource => ({
  fdi: "general-aicpa-tsc-2017",
  columnHeader: "AICPA TSC 2017:2022 (used for SOC 2)",
  name: "Trust Services Criteria (TSC) (2017)",
  geography: "General",
  source: "AICPA",
  sourceUrl: "https://example.com/tsc-2017",
  ...overrides,
});

const VERSION_ID = "20000000-0000-4000-8000-000000000001";

describe("parseWideCrosswalk", () => {
  it("matches a source's columnHeader to the header row after collapsing whitespace and lowercasing", () => {
    // Real headers in SCF 2026.1 contain literal newlines and doubled spaces;
    // the source's columnHeader (from Authoritative Sources) does not always
    // reproduce them verbatim, so the match must normalise both sides.
    const headerRow = ["SCF #", "aicpa  tsc\n2017:2022 (used for  soc 2)"];
    const dataRows = [["GOV-01", "CC1.1"]];
    const controlByCode = new Map([["GOV-01", "control-1"]]);

    const { frameworks, mappings, warnings } = parseWideCrosswalk({
      headerRow,
      dataRows,
      sources: [source()],
      versionId: VERSION_ID,
      controlByCode,
      controlCodeColumn: 0,
    });

    expect(warnings).toEqual([]);
    expect(frameworks).toHaveLength(1);
    expect(frameworks[0]?.framework_code).toBe("general-aicpa-tsc-2017");
    expect(mappings).toHaveLength(1);
  });

  it("produces a warning and no framework when a columnHeader matches no column — never a partial match", () => {
    const headerRow = ["SCF #", "AICPA TSC 2017:2022 (used for SOC 2)"];
    const dataRows = [["GOV-01", "CC1.1"]];
    const controlByCode = new Map([["GOV-01", "control-1"]]);

    // "AICPA TSC 2017" is a genuine substring of the real header above — a
    // fuzzy/prefix matcher would find it. An exact matcher must not.
    const { frameworks, mappings, warnings } = parseWideCrosswalk({
      headerRow,
      dataRows,
      sources: [source({ columnHeader: "AICPA TSC 2017" })],
      versionId: VERSION_ID,
      controlByCode,
      controlCodeColumn: 0,
    });

    expect(frameworks).toEqual([]);
    expect(mappings).toEqual([]);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("splits a multi-code cell into three requirements and three mappings for that control", () => {
    const headerRow = ["SCF #", "AICPA TSC 2017:2022 (used for SOC 2)"];
    const dataRows = [["GOV-01", "CC1.1\nCC1.1-POF1\nCC1.2"]];
    const controlByCode = new Map([["GOV-01", "control-1"]]);

    const { requirements, mappings } = parseWideCrosswalk({
      headerRow,
      dataRows,
      sources: [source()],
      versionId: VERSION_ID,
      controlByCode,
      controlCodeColumn: 0,
    });

    expect(requirements).toHaveLength(3);
    expect(requirements.map((r) => r.requirement_code).sort()).toEqual(
      ["CC1.1", "CC1.1-POF1", "CC1.2"].sort(),
    );
    expect(mappings).toHaveLength(3);
  });

  it("produces ONE requirement and TWO mappings when two controls cite the same requirement code", () => {
    const headerRow = ["SCF #", "AICPA TSC 2017:2022 (used for SOC 2)"];
    const dataRows = [
      ["GOV-01", "CC1.1"],
      ["GOV-02", "CC1.1"],
    ];
    const controlByCode = new Map([
      ["GOV-01", "control-1"],
      ["GOV-02", "control-2"],
    ]);

    const { requirements, mappings } = parseWideCrosswalk({
      headerRow,
      dataRows,
      sources: [source()],
      versionId: VERSION_ID,
      controlByCode,
      controlCodeColumn: 0,
    });

    expect(requirements).toHaveLength(1);
    expect(mappings).toHaveLength(2);
    expect(mappings.map((m) => m.scf_control_id).sort()).toEqual(
      ["control-1", "control-2"].sort(),
    );
  });

  it("every mapping has relationship_type null — the crosswalk states no STRM operator", () => {
    const headerRow = ["SCF #", "AICPA TSC 2017:2022 (used for SOC 2)"];
    const dataRows = [["GOV-01", "CC1.1\nCC1.2"]];
    const controlByCode = new Map([["GOV-01", "control-1"]]);

    const { mappings } = parseWideCrosswalk({
      headerRow,
      dataRows,
      sources: [source()],
      versionId: VERSION_ID,
      controlByCode,
      controlCodeColumn: 0,
    });

    expect(mappings.length).toBeGreaterThan(0);
    for (const mapping of mappings) {
      expect(mapping.relationship_type).toBeNull();
    }
  });

  it("produces a warning and no mapping when the row's control code is absent from controlByCode", () => {
    const headerRow = ["SCF #", "AICPA TSC 2017:2022 (used for SOC 2)"];
    const dataRows = [["GOV-99", "CC1.1"]]; // GOV-99 not in controlByCode
    const controlByCode = new Map([["GOV-01", "control-1"]]);

    const { mappings, warnings } = parseWideCrosswalk({
      headerRow,
      dataRows,
      sources: [source()],
      versionId: VERSION_ID,
      controlByCode,
      controlCodeColumn: 0,
    });

    expect(mappings).toEqual([]);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("skips a row with no control code without warning about it", () => {
    // The sheet's trailing rows carry formatting but no control. They are not
    // a defect and must not be reported as one — a warning per blank row would
    // bury the ones that name a control the catalogue does not have.
    const headerRow = ["SCF #", "AICPA TSC 2017:2022 (used for SOC 2)"];
    const dataRows = [
      ["", "CC1.1"],
      ["   ", "CC1.2"],
      ["GOV-01", "CC1.3"],
    ];
    const controlByCode = new Map([["GOV-01", "control-1"]]);

    const { mappings, warnings } = parseWideCrosswalk({
      headerRow,
      dataRows,
      sources: [source()],
      versionId: VERSION_ID,
      controlByCode,
      controlCodeColumn: 0,
    });

    expect(warnings).toEqual([]);
    expect(mappings).toHaveLength(1);
  });

  it("skips an empty framework cell, and treats a missing one as empty", () => {
    const headerRow = ["SCF #", "AICPA TSC 2017:2022 (used for SOC 2)"];
    // Row 2 is short, so the framework column is `undefined` rather than "".
    const dataRows = [["GOV-01", ""], ["GOV-02"], ["GOV-03", "CC1.1"]];
    const controlByCode = new Map([
      ["GOV-01", "control-1"],
      ["GOV-02", "control-2"],
      ["GOV-03", "control-3"],
    ]);

    const { mappings, requirements, warnings } = parseWideCrosswalk({
      headerRow,
      dataRows,
      sources: [source()],
      versionId: VERSION_ID,
      controlByCode,
      controlCodeColumn: 0,
    });

    expect(warnings).toEqual([]);
    expect(requirements).toHaveLength(1);
    expect(mappings).toHaveLength(1);
  });

  it("omits the optional framework fields the index does not supply", () => {
    // Geography, Source and Focal Document Source are blank for some of the
    // 250 rows. Writing "" into jurisdiction/publisher/source_reference would
    // record an empty string as if it were a stated value.
    const headerRow = ["SCF #", "AICPA TSC 2017:2022 (used for SOC 2)"];
    const dataRows = [["GOV-01", "CC1.1"]];
    const controlByCode = new Map([["GOV-01", "control-1"]]);

    const { frameworks } = parseWideCrosswalk({
      headerRow,
      dataRows,
      sources: [source({ geography: "", source: "", sourceUrl: "" })],
      versionId: VERSION_ID,
      controlByCode,
      controlCodeColumn: 0,
    });

    expect(frameworks).toHaveLength(1);
    expect(frameworks[0]).not.toHaveProperty("jurisdiction");
    expect(frameworks[0]).not.toHaveProperty("publisher");
    expect(frameworks[0]).not.toHaveProperty("source_reference");
  });

  it("emits one mapping per requirement and control, however often the pair is cited", () => {
    // scf_mappings carries a unique index on (requirement, control). A cell can
    // repeat a code, and two cells in one framework column can cite the same
    // code against the same control — both say nothing the first row does not,
    // and both abort the seed with 23505 on a database that has the index.
    const headerRow = ["SCF #", "AICPA TSC 2017:2022 (used for SOC 2)"];
    const dataRows = [["GOV-01", "CC1.1\nCC1.1\nCC1.2"]];
    const controlByCode = new Map([["GOV-01", "control-1"]]);

    const { requirements, mappings } = parseWideCrosswalk({
      headerRow,
      dataRows,
      sources: [source()],
      versionId: VERSION_ID,
      controlByCode,
      controlCodeColumn: 0,
    });

    expect(requirements.map((r) => r.requirement_code).sort()).toEqual([
      "CC1.1",
      "CC1.2",
    ]);
    expect(mappings).toHaveLength(2);

    const pairs = mappings.map(
      (m) => `${m.scf_framework_requirement_id}::${m.scf_control_id}`,
    );
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it("falls back to the FDI when the index states no framework name", () => {
    const headerRow = ["SCF #", "AICPA TSC 2017:2022 (used for SOC 2)"];
    const dataRows = [["GOV-01", "CC1.1"]];
    const controlByCode = new Map([["GOV-01", "control-1"]]);

    const { frameworks } = parseWideCrosswalk({
      headerRow,
      dataRows,
      sources: [source({ name: "" })],
      versionId: VERSION_ID,
      controlByCode,
      controlCodeColumn: 0,
    });

    expect(frameworks[0]?.framework_name).toBe("general-aicpa-tsc-2017");
  });
});
