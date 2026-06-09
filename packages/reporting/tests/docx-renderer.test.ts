import { renderDocxArtifact } from "../src/renderers/docx-renderer";
import { expect, test } from "./test-kit";

// ═══════════════════════════════════════════════════════════════
//  DOCX Renderer Tests
//
//  NOTE: The ReportSectionResponse schema types `content` as
//  Record<string, unknown>, but the DOCX renderer treats it as a
//  string (calling .split("\n")). This type mismatch exists in the
//  existing codebase and is tracked for fix. Tests use `as any`.
// ═══════════════════════════════════════════════════════════════

const makeSections = (overrides?: Record<string, unknown>[]): any[] =>
  overrides ?? [
    {
      section_id: "s1",
      report_version_id: "rv-001",
      title: "Executive Summary",
      section_type: "executive_summary",
      order: 1,
      content:
        "## Overview\n\nThis is the executive summary.\n\n- Finding A\n- Finding B",
    },
    {
      section_id: "s2",
      report_version_id: "rv-001",
      title: "Gap Analysis",
      section_type: "gap_analysis",
      order: 2,
      content: "# Gap Results\n\n5 critical gaps identified.",
    },
  ];

test("DOCX renderer gera artifact com formato correto", () => {
  const result = renderDocxArtifact("Test Report", "rv-001", makeSections());
  expect(result.format).toBe("docx");
  expect(result.artifact_type).toBe("report");
  expect(result.mime_type).toBe(
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
});

test("DOCX renderer gera conteúdo base64 não-vazio", () => {
  const result = renderDocxArtifact("Test Report", "rv-001", makeSections());
  expect(result.content.length).toBeGreaterThan(100);
});

test("DOCX renderer inclui título na XML gerada", () => {
  const result = renderDocxArtifact(
    "My Assessment Report",
    "rv-001",
    makeSections(),
  );
  const xml = atob(result.content);
  expect(xml).toContain("My Assessment Report");
});

test("DOCX renderer inclui seções na XML gerada", () => {
  const result = renderDocxArtifact("Test", "rv-001", makeSections());
  const xml = atob(result.content);
  expect(xml).toContain("Executive Summary");
  expect(xml).toContain("Gap Analysis");
});

test("DOCX renderer parseia bullet points markdown", () => {
  const result = renderDocxArtifact("Test", "rv-001", makeSections());
  const xml = atob(result.content);
  expect(xml).toContain("Finding A");
  expect(xml).toContain("ListBullet");
});

test("DOCX renderer parseia headings markdown", () => {
  const result = renderDocxArtifact("Test", "rv-001", makeSections());
  const xml = atob(result.content);
  expect(xml).toContain("Gap Results");
  expect(xml).toContain("Overview");
});

test("DOCX renderer escapa XML corretamente", () => {
  const sections = makeSections([
    {
      section_id: "s-xss",
      report_version_id: "rv-001",
      title: "Test <script>alert('xss')</script>",
      section_type: "executive_summary",
      order: 1,
      content: 'Content with & ampersand and "quotes"',
    },
  ]);

  const result = renderDocxArtifact("Safe <Report>", "rv-001", sections);
  const xml = atob(result.content);
  expect(xml).toContain("&amp;");
  expect(xml).toContain("&lt;script&gt;");
  expect(xml).toContain("&lt;Report&gt;");
});

test("DOCX renderer lida com seções vazias sem crash", () => {
  const sections = makeSections([
    {
      section_id: "s-empty",
      report_version_id: "rv-001",
      title: "Empty Section",
      section_type: "executive_summary",
      order: 1,
      content: "",
    },
  ]);

  const result = renderDocxArtifact("Test", "rv-001", sections);
  const xml = atob(result.content);
  expect(xml).toContain("Empty Section");
});
