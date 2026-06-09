/**
 * SCF XLSX Importer
 *
 * Parses the official SCF Excel workbook (multi-tab) into the Standard
 * ScfDataset format. Handles:
 * - Main controls tab → ScfDomain[] + ScfControl[]
 * - Crosswalk tabs → ScfFramework[] + ScfFrameworkRequirement[] + ScfMapping[]
 * - Version metadata from filename / first row
 *
 * Uses SheetJS (xlsx) for parsing — isomórfico, sem deps nativas.
 * Designed for admin ingestion, not runtime hot-path.
 */

import * as XLSX from "xlsx";
import type {
  ScfControl,
  ScfDomain,
  ScfFramework,
  ScfFrameworkRequirement,
  ScfImportRun,
  ScfImportSource,
  ScfMapping,
  ScfStrmRelationship,
  ScfVersion,
  ScfAssessmentObjective,
  ScfEvidenceRequest,
  ScfMaturityCriteria,
  ScfRisk,
  ScfThreat,
} from "../types";
import type { DpmpPrinciple, DpmpFrameworkMapping } from "@standard/schemas";
import type { ScfImporter } from "./scf-importer";
import { sha256Hex, validateBaseImportSource } from "./scf-importer";
import {
  classifyTab,
  extractDomainCode,
  findControlCode,
  findControlDescription,
  findControlQuestion,
  findControlTitle,
  findControlWeight,
  findDomainName,
  getSheetHeaders,
  normalizeHeader,
  parseSheetToRows,
  type ParsedRow,
} from "./xlsx-tab-parser";

const newId = (): string => crypto.randomUUID();

// ──── Expected Column Validation ────

/** Minimum expected columns for a valid SCF controls tab */
const EXPECTED_CONTROLS_COLUMNS = [
  "scf_control_#",
  "scf_control",
  "scf_domain",
] as const;

/** Additional columns that improve import quality */
const OPTIONAL_CONTROLS_COLUMNS = [
  "scf_control_description",
  "scf_control_question",
  "scf_control_weighting",
] as const;

/**
 * Validate that expected columns are present in the controls tab.
 * Returns warnings for missing optional columns and errors for missing required columns.
 */
const validateExpectedColumns = (
  headers: string[],
): { errors: string[]; warnings: string[] } => {
  const normalizedHeaders = new Set(headers.map(normalizeHeader));
  const errors: string[] = [];
  const warnings: string[] = [];

  // At least one control identifier column must be present
  const hasControlId = [
    "scf_control_#",
    "scf_#",
    "control_#",
    "scf_control_identifier",
    "scf_identifier",
    "control_code",
  ].some((col) => normalizedHeaders.has(col));
  if (!hasControlId) {
    errors.push(
      "Missing required column: SCF control identifier (e.g. 'SCF Control #', 'SCF #'). Cannot parse controls.",
    );
  }

  // At least one control name/title column must be present
  const hasControlName = [
    "scf_control",
    "control_name",
    "control_title",
    "scf_control_name",
  ].some((col) => normalizedHeaders.has(col));
  if (!hasControlName) {
    errors.push(
      "Missing required column: SCF control name/title (e.g. 'SCF Control', 'Control Name'). Cannot parse control titles.",
    );
  }

  for (const col of OPTIONAL_CONTROLS_COLUMNS) {
    if (!normalizedHeaders.has(col)) {
      warnings.push(
        `Optional column missing: '${col}'. Import will proceed but this data will be empty.`,
      );
    }
  }

  return { errors, warnings };
};

// ──── Version Detection ────

const detectVersionFromFilename = (filename?: string): string | null => {
  if (!filename) return null;
  // Match patterns like "2024.4", "2026.1.1", etc.
  const match = filename.match(/(\d{4}\.\d+(?:\.\d+)?)/);
  return match?.[1] ? `SCF ${match[1]}` : null;
};

// ──── Controls Tab Parser ────

type ControlsParseResult = {
  domains: ScfDomain[];
  controls: ScfControl[];
  warnings: string[];
};

const parseControlsTab = (
  rows: ParsedRow[],
  versionId: string,
): ControlsParseResult => {
  const domains: ScfDomain[] = [];
  const controls: ScfControl[] = [];
  const warnings: string[] = [];
  const domainByCode = new Map<string, string>();
  let domainSortOrder = 0;

  for (const row of rows) {
    const controlCode = findControlCode(row);
    if (!controlCode) continue;

    const domainCode = extractDomainCode(controlCode);
    if (!domainCode) {
      warnings.push(
        `Row skipped: cannot extract domain from control code "${controlCode}".`,
      );
      continue;
    }

    // Auto-create domain if not seen
    if (!domainByCode.has(domainCode)) {
      const domainId = newId();
      domainByCode.set(domainCode, domainId);
      domainSortOrder += 1;
      const domainName = findDomainName(row) ?? domainCode;
      domains.push({
        id: domainId,
        scf_version_id: versionId,
        domain_code: domainCode,
        domain_name: domainName,
        description: `SCF domain: ${domainName}`,
        sort_order: domainSortOrder,
        is_synthetic: false,
      });
    }

    const domainId = domainByCode.get(domainCode)!;
    const controlTitle = findControlTitle(row);
    if (!controlTitle) {
      warnings.push(`Control "${controlCode}" skipped: no title found.`);
      continue;
    }

    const controlDescription = findControlDescription(row);
    const controlQuestion = findControlQuestion(row);
    const controlWeight = findControlWeight(row);
    const compensatingGuidance = row["compensating_control_guidance"] ||
      row["compensating_controls"] ||
      row["proposed_compensating_controls"] ||
      row["compensating_control"] ||
      undefined;

    controls.push({
      id: newId(),
      scf_version_id: versionId,
      scf_domain_id: domainId,
      control_code: controlCode,
      control_title: controlTitle,
      ...(controlDescription
        ? { control_description: controlDescription }
        : {}),
      ...(controlQuestion ? { control_question: controlQuestion } : {}),
      ...(controlWeight !== undefined ? { control_weight: controlWeight } : {}),
      ...(compensatingGuidance ? { compensating_control_guidance: compensatingGuidance } : {}),
      status: "active",
      is_synthetic: false,
    });
  }

  return { domains, controls, warnings };
};

// ──── Crosswalk Tab Parser ────

type CrosswalkParseResult = {
  framework: ScfFramework;
  requirements: ScfFrameworkRequirement[];
  mappings: ScfMapping[];
  warnings: string[];
};

const parseCrosswalkTab = (
  rows: ParsedRow[],
  headers: string[],
  sheetName: string,
  versionId: string,
  controlByCode: Map<string, string>,
): CrosswalkParseResult => {
  const warnings: string[] = [];
  const frameworkId = newId();

  // Create framework from sheet name
  const framework: ScfFramework = {
    id: frameworkId,
    framework_code: sheetName.trim(),
    framework_name: sheetName.trim(),
    status: "active",
    is_synthetic: false,
  };

  const requirements: ScfFrameworkRequirement[] = [];
  const mappings: ScfMapping[] = [];
  const requirementByCode = new Map<string, string>();

  // Find the SCF control code column
  const normalizedHeaders = headers.map(normalizeHeader);

  // In SCF XLSX crosswalk tabs, each row typically has:
  // - An SCF control code column
  // - One or more framework requirement reference columns
  // The exact column names vary per framework tab.

  // Find which column has SCF control codes by checking content
  let scfColumnKey: string | null = null;
  for (const row of rows.slice(0, 10)) {
    for (const [key, value] of Object.entries(row)) {
      if (extractDomainCode(value)) {
        scfColumnKey = key;
        break;
      }
    }
    if (scfColumnKey) break;
  }

  if (!scfColumnKey) {
    warnings.push(
      `Crosswalk tab "${sheetName}": no SCF control code column detected.`,
    );
    return { framework, requirements, mappings, warnings };
  }

  // Find the framework reference columns (non-SCF columns with data)
  const referenceColumns = normalizedHeaders.filter(
    (h) => h !== scfColumnKey && h.length > 0 && !h.startsWith("scf_"),
  );

  if (referenceColumns.length === 0) {
    warnings.push(
      `Crosswalk tab "${sheetName}": no framework reference columns found.`,
    );
    return { framework, requirements, mappings, warnings };
  }

  // Use the first reference column as the primary mapping source
  const primaryRefCol = referenceColumns[0]!;
  let reqSortOrder = 0;

  for (const row of rows) {
    const controlCode = row[scfColumnKey]?.trim();
    if (!controlCode || !extractDomainCode(controlCode)) continue;

    const controlId = controlByCode.get(controlCode);
    if (!controlId) {
      // Control not found in the catalog — skip but don't warn excessively
      continue;
    }

    const reqCode = row[primaryRefCol]?.trim();
    if (!reqCode) continue;

    // Split multiple requirement codes (some cells contain semicolons/newlines)
    const reqCodes = reqCode
      .split(/[;\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const singleReqCode of reqCodes) {
      // Create requirement if not seen
      if (!requirementByCode.has(singleReqCode)) {
        const reqId = newId();
        requirementByCode.set(singleReqCode, reqId);
        reqSortOrder += 1;
        requirements.push({
          id: reqId,
          scf_framework_id: frameworkId,
          requirement_code: singleReqCode,
          requirement_title: singleReqCode,
          sort_order: reqSortOrder,
          status: "active",
          is_synthetic: false,
        });
      }

      const requirementId = requirementByCode.get(singleReqCode)!;

      mappings.push({
        id: newId(),
        scf_version_id: versionId,
        scf_framework_id: frameworkId,
        scf_framework_requirement_id: requirementId,
        scf_control_id: controlId,
        relationship_type: "related",
        mapping_source: `SCF XLSX crosswalk: ${sheetName}`,
        is_official: true,
        status: "active",
        is_synthetic: false,
      });
    }
  }

  return { framework, requirements, mappings, warnings };
};

// ──── Extended Catalog Parsers ────

const parsePptdfBool = (value: string | undefined): boolean | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const v = value.toString().toLowerCase().trim();
  return v === "x" || v === "yes" || v === "true" || v === "1" ? true : false;
};

const parseAssessmentObjectivesTab = (
  rows: ParsedRow[],
  versionId: string,
  controlByCode: Map<string, string>,
): ScfAssessmentObjective[] => {
  const result: ScfAssessmentObjective[] = [];
  for (const row of rows) {
    const controlCode =
      row["scf_#"] ||
      row["scf_control_#"] ||
      row["control_#"] ||
      row["scf_control_identifier"];
    if (!controlCode) continue;

    const controlId = controlByCode.get(controlCode.trim());
    if (!controlId) continue;

    const objectiveCode =
      row["scf_ao_#"] ||
      row["assessment_objective_code"] ||
      row["ao_#"] ||
      row["objective_code"] ||
      row["assessment_objective_#"];

    // Find the text column by prefix match
    let text = "";
    for (const [key, value] of Object.entries(row)) {
      if (
        key.startsWith("scf_assessment_objective_ao") &&
        value &&
        value.trim().length > 0
      ) {
        text = value.trim();
        break;
      }
    }

    if (!text) {
      text =
        row["assessment_objective"] ||
        row["objective_text"] ||
        row["text"] ||
        row["assessment_objectives"] ||
        "";
    }

    if (objectiveCode && text) {
      result.push({
        id: crypto.randomUUID(),
        scf_version_id: versionId,
        scf_control_id: controlId,
        objective_code: objectiveCode.trim(),
        text: text.trim(),
        pptdf_people: parsePptdfBool(row["people"] || row["pptdf_people"] || row["pptdf - people"]),
        pptdf_process: parsePptdfBool(row["process"] || row["pptdf_process"] || row["pptdf - process"]),
        pptdf_technology: parsePptdfBool(row["technology"] || row["pptdf_technology"] || row["pptdf - technology"]),
        pptdf_data: parsePptdfBool(row["data"] || row["pptdf_data"] || row["pptdf - data"]),
        pptdf_facility: parsePptdfBool(row["facility"] || row["pptdf_facility"] || row["pptdf - facility"]),
      });
    }
  }
  return result;
};

const parseDpmpTab = (
  rows: ParsedRow[],
  versionId: string,
): { principles: DpmpPrinciple[]; frameworkMappings: DpmpFrameworkMapping[] } => {
  const principles: DpmpPrinciple[] = [];
  const frameworkMappings: DpmpFrameworkMapping[] = [];

  // Identify non-data columns (structural columns to skip for framework detection)
  const STRUCTURAL_COLS = new Set([
    "principle_code", "dpmp_#", "principle_#", "code", "#",
    "domain", "dpmp_domain",
    "title", "principle", "dpmp_principle", "principle_title",
    "description", "principle_description",
    "scf_control", "scf_controls", "scf_control_mappings", "scf_control_codes",
    "sort_order", "order",
  ]);

  for (const row of rows) {
    const principleCode =
      row["principle_code"] || row["dpmp_#"] || row["principle_#"] || row["code"] || row["#"];
    if (!principleCode) continue;

    const domain = (
      row["domain"] || row["dpmp_domain"] || "privacy_governance"
    ).toLowerCase().replace(/ /g, "_") as DpmpPrinciple["domain"];

    const title =
      row["title"] || row["principle"] || row["dpmp_principle"] || row["principle_title"] || "";
    if (!title.trim()) continue;

    const description =
      row["description"] || row["principle_description"] || undefined;

    const scfControlsRaw =
      row["scf_control"] || row["scf_controls"] || row["scf_control_mappings"] || row["scf_control_codes"] || "";
    const scfControlCodes = scfControlsRaw
      ? scfControlsRaw.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
      : [];

    const sortOrder = principles.length + 1;

    const principle: DpmpPrinciple = {
      id: crypto.randomUUID(),
      scf_version_id: versionId,
      principle_code: principleCode.trim(),
      domain,
      title: title.trim(),
      description: description?.trim() || null,
      scf_control_codes: scfControlCodes,
      sort_order: sortOrder,
      is_synthetic: false,
    };

    principles.push(principle);

    // All remaining columns with values are framework mappings
    for (const [colKey, cellValue] of Object.entries(row)) {
      const normalizedCol = colKey.toLowerCase().trim();
      if (STRUCTURAL_COLS.has(normalizedCol)) continue;
      if (!cellValue || !cellValue.toString().trim()) continue;

      frameworkMappings.push({
        id: crypto.randomUUID(),
        scf_version_id: versionId,
        dpmp_principle_id: principle.id,
        framework_id: colKey.trim().toUpperCase(),
        requirement_reference: cellValue.toString().trim(),
        mapping_note: null,
        is_synthetic: false,
      });
    }
  }

  return { principles, frameworkMappings };
};

const parseEvidenceRequestsTab = (
  rows: ParsedRow[],
  versionId: string,
  controlByCode: Map<string, string>,
): ScfEvidenceRequest[] => {
  const result: ScfEvidenceRequest[] = [];
  for (const row of rows) {
    const scfControlMappings =
      row["scf_control_mappings"] ||
      row["scf_control_mappings_"] ||
      row["scf_controls"] ||
      row["controls"];
    if (!scfControlMappings) continue;

    const requestItem =
      row["documentation_artifact"] ||
      row["evidence_request_item"] ||
      row["request_item"] ||
      row["evidence_request"] ||
      row["item"];
    const evidenceType =
      row["area_of_focus"] || row["evidence_type"] || row["type"];

    if (!requestItem) continue;

    // Split multiple control codes (some cells contain newlines or semicolons)
    const codes = scfControlMappings
      .split(/[;,\n\r]+/)
      .map((c) => c.trim())
      .filter(Boolean);
    for (const code of codes) {
      const controlId = controlByCode.get(code);
      if (controlId) {
        result.push({
          id: crypto.randomUUID(),
          scf_version_id: versionId,
          scf_control_id: controlId,
          request_item: requestItem.trim(),
          evidence_type: evidenceType ? evidenceType.trim() : undefined,
        });
      }
    }
  }
  return result;
};

const parseMaturityCriteriaFromControls = (
  rows: ParsedRow[],
  versionId: string,
  controlByCode: Map<string, string>,
): ScfMaturityCriteria[] => {
  const result: ScfMaturityCriteria[] = [];

  for (const row of rows) {
    const controlCode = findControlCode(row);
    if (!controlCode) continue;

    const controlId = controlByCode.get(controlCode);
    if (!controlId) continue;

    for (let level = 0; level <= 5; level++) {
      const keys = [
        `scr-cmm_level_${level}`,
        `scr_cmm_level_${level}`,
        `maturity_level_${level}`,
        `l${level}_criteria`,
        `maturity_l${level}`,
        `level_${level}_criteria`,
        `cmmc_l${level}`,
        `maturity_level_${level}_criteria`,
      ];

      let criteriaText = "";
      for (const key of keys) {
        for (const rowKey of Object.keys(row)) {
          if (
            rowKey.startsWith(key) &&
            row[rowKey] &&
            row[rowKey].trim().length > 0
          ) {
            criteriaText = row[rowKey].trim();
            break;
          }
        }
        if (criteriaText) break;
      }

      if (criteriaText) {
        result.push({
          id: crypto.randomUUID(),
          scf_version_id: versionId,
          scf_control_id: controlId,
          level,
          criteria_text: criteriaText,
        });
      }
    }
  }
  return result;
};

const parseRisksTab = (rows: ParsedRow[], versionId: string): ScfRisk[] => {
  const risks: ScfRisk[] = [];

  for (const row of rows) {
    const riskCode =
      row["risk_#"] ||
      row["risk_code"] ||
      row["risk_id"] ||
      row["cp-rmm_code"] ||
      row["cp_rmm_code"];
    if (!riskCode) continue;

    const codeTrim = riskCode.trim();
    if (
      codeTrim.startsWith("*") ||
      codeTrim.toLowerCase().includes("definition") ||
      codeTrim.length === 0
    )
      continue;

    // Find the title column by prefix match
    let title = "";
    for (const [key, value] of Object.entries(row)) {
      if (
        key.startsWith("risk") &&
        ![
          "risk_#",
          "risk_code",
          "risk_id",
          "risk_grouping",
          "risk_category",
        ].includes(key) &&
        !key.includes("description") &&
        value &&
        value.trim().length > 0
      ) {
        title = value.trim();
        break;
      }
    }

    if (!title) {
      title = row["risk"] || row["risk_title"] || row["title"] || "";
    }

    if (!title) continue;

    let description = "";
    for (const [key, value] of Object.entries(row)) {
      if (key.includes("description") && value && value.trim().length > 0) {
        description = value.trim();
        break;
      }
    }

    const category = row["risk_grouping"] || row["category"] || row["grouping"];

    risks.push({
      id: crypto.randomUUID(),
      scf_version_id: versionId,
      risk_code: codeTrim,
      title: title.trim(),
      description: description || undefined,
      category: category ? category.trim() : undefined,
    });
  }
  return risks;
};

const parseThreatsTab = (rows: ParsedRow[], versionId: string): ScfThreat[] => {
  const threats: ScfThreat[] = [];

  for (const row of rows) {
    const threatCode =
      row["threat_#"] || row["threat_code"] || row["threat_id"];
    const title = row["threat"] || row["threat_title"] || row["title"];
    if (!threatCode || !title) continue;

    const codeTrim = threatCode.trim();
    if (
      codeTrim.startsWith("*") ||
      codeTrim.toLowerCase().includes("definition")
    )
      continue;

    let description = "";
    for (const [key, value] of Object.entries(row)) {
      if (key.includes("description") && value && value.trim().length > 0) {
        description = value.trim();
        break;
      }
    }

    const category =
      row["threat_grouping"] || row["category"] || row["grouping"];

    threats.push({
      id: crypto.randomUUID(),
      scf_version_id: versionId,
      threat_code: codeTrim,
      title: title.trim(),
      description: description || undefined,
      category: category ? category.trim() : undefined,
    });
  }
  return threats;
};

// ──── Main XLSX Importer ────

export const createXlsxScfImporter = (): ScfImporter => ({
  sourceType: "xlsx",

  validate: async (source: ScfImportSource) => {
    const base = validateBaseImportSource(source);
    if (!base.valid) return base;

    try {
      // Attempt to parse the XLSX to validate structure
      const data = Uint8Array.from(atob(source.content), (c) =>
        c.charCodeAt(0),
      );
      const workbook = XLSX.read(data, { type: "array" });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return {
          valid: false,
          errors: ["XLSX workbook contains no sheets."],
          warnings: [],
        };
      }

      // Check if at least one tab is classified as controls
      let hasControlsTab = false;
      const allWarnings: string[] = [];
      for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name];
        if (!sheet) continue;
        const headers = getSheetHeaders(sheet);
        const classification = classifyTab(name, headers);
        if (classification.type === "controls") {
          hasControlsTab = true;

          // Validate expected columns are present
          const columnValidation = validateExpectedColumns(headers);
          if (columnValidation.errors.length > 0) {
            return {
              valid: false,
              errors: [
                `Controls tab "${name}": ${columnValidation.errors.join("; ")}`,
              ],
              warnings: columnValidation.warnings,
            };
          }
          allWarnings.push(...columnValidation.warnings);
          break;
        }
      }

      if (!hasControlsTab) {
        return {
          valid: false,
          errors: [
            "No SCF controls catalog tab detected. Expected a tab with SCF control identifiers.",
          ],
          warnings: [],
        };
      }

      return { valid: true, errors: [], warnings: allWarnings };
    } catch (err) {
      return {
        valid: false,
        errors: [
          `Failed to parse XLSX: ${err instanceof Error ? err.message : "unknown error"}`,
        ],
        warnings: [],
      };
    }
  },

  parse: async (source: ScfImportSource) => {
    const sourceHash =
      source.source_hash ??
      `sha256:${await sha256Hex(source.content.slice(0, 1024))}`;
    const data = Uint8Array.from(atob(source.content), (c) => c.charCodeAt(0));
    const workbook = XLSX.read(data, { type: "array" });

    const versionId = newId();
    const versionLabel =
      source.version_label ??
      detectVersionFromFilename(source.source_filename) ??
      "SCF (unknown version)";

    const version: ScfVersion = {
      id: versionId,
      version_label: versionLabel,
      source_hash: sourceHash,
      import_status: "succeeded",
      imported_at: new Date().toISOString(),
      imported_by: "xlsx-importer",
      notes: `Imported from XLSX workbook with ${workbook.SheetNames.length} tabs.`,
      is_synthetic: false,
    };

    let allDomains: ScfDomain[] = [];
    let allControls: ScfControl[] = [];
    const allFrameworks: ScfFramework[] = [];
    const allRequirements: ScfFrameworkRequirement[] = [];
    const allMappings: ScfMapping[] = [];
    const allWarnings: string[] = [];
    const controlByCode = new Map<string, string>();
    const rawRiskMappings: { controlCode: string; riskCode: string }[] = [];
    const rawThreatMappings: { controlCode: string; threatCode: string }[] = [];

    // Phase 1: Parse controls tab(s) first — we need control IDs for crosswalk mapping
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;

      const headers = getSheetHeaders(sheet);
      const classification = classifyTab(name, headers);

      if (classification.type === "controls") {
        const rows = parseSheetToRows(sheet);
        const result = parseControlsTab(rows, versionId);

        allDomains = [...allDomains, ...result.domains];
        allControls = [...allControls, ...result.controls];
        allWarnings.push(...result.warnings);

        // Build lookup for crosswalk phase
        for (const ctrl of result.controls) {
          controlByCode.set(ctrl.control_code, ctrl.id);
        }

        // Collect raw risk/threat mappings from controls sheet columns
        for (const row of rows) {
          const controlCode = findControlCode(row);
          if (!controlCode) continue;
          for (const [key, value] of Object.entries(row)) {
            if (value && value.trim().length > 0) {
              const valTrim = value.trim();
              if (
                key.startsWith("risk_") &&
                /^[r]-[a-z]+-\d+$/i.test(key.slice(5))
              ) {
                rawRiskMappings.push({
                  controlCode,
                  riskCode: valTrim.toUpperCase(),
                });
              } else if (
                key.startsWith("threat_") &&
                /^[mn]t-\d+$/i.test(key.slice(7))
              ) {
                rawThreatMappings.push({
                  controlCode,
                  threatCode: valTrim.toUpperCase(),
                });
              }
            }
          }
        }
      }
    }

    if (allControls.length === 0) {
      allWarnings.push("No controls extracted from controls tab(s).");
    }

    // Phase 2: Parse crosswalk tabs
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;

      const headers = getSheetHeaders(sheet);
      const classification = classifyTab(name, headers);

      if (classification.type === "crosswalk") {
        const rows = parseSheetToRows(sheet);
        const result = parseCrosswalkTab(
          rows,
          headers,
          name,
          versionId,
          controlByCode,
        );

        // Only add framework if it produced at least one mapping
        if (result.mappings.length > 0) {
          allFrameworks.push(result.framework);
          allRequirements.push(...result.requirements);
          allMappings.push(...result.mappings);
        }
        allWarnings.push(...result.warnings);
      }
    }

    // Phase 1.5: Parse extended meta-model tabs (AOs, ERL, Risks, Threats, Maturity, DPMP)
    const allAssessmentObjectives: ScfAssessmentObjective[] = [];
    const allEvidenceRequests: ScfEvidenceRequest[] = [];
    const allMaturityCriteria: ScfMaturityCriteria[] = [];
    const allRisks: ScfRisk[] = [];
    const allThreats: ScfThreat[] = [];
    const allRiskControlMappings: any[] = [];
    const allThreatControlMappings: any[] = [];
    const allDpmpPrinciples: DpmpPrinciple[] = [];
    const allDpmpFrameworkMappings: DpmpFrameworkMapping[] = [];

    const riskByCode = new Map<string, string>();
    const threatByCode = new Map<string, string>();

    // Extract maturity criteria from controls sheet
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;
      const headers = getSheetHeaders(sheet);
      const classification = classifyTab(name, headers);
      if (classification.type === "controls") {
        const rows = parseSheetToRows(sheet);
        const mc = parseMaturityCriteriaFromControls(
          rows,
          versionId,
          controlByCode,
        );
        allMaturityCriteria.push(...mc);
      }
    }

    // Process specific catalog sheets
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;

      const headers = getSheetHeaders(sheet);
      const classification = classifyTab(name, headers);

      if (classification.type === "assessment_objectives") {
        const rows = parseSheetToRows(sheet);
        const objectives = parseAssessmentObjectivesTab(
          rows,
          versionId,
          controlByCode,
        );
        allAssessmentObjectives.push(...objectives);
      } else if (classification.type === "evidence_requests") {
        const rows = parseSheetToRows(sheet);
        const requests = parseEvidenceRequestsTab(
          rows,
          versionId,
          controlByCode,
        );
        allEvidenceRequests.push(...requests);
      } else if (classification.type === "risk_catalog") {
        // Shift range to row 5 (0-indexed) to skip headers and definition rows
        const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
        range.s.r = 5;
        sheet["!ref"] = XLSX.utils.encode_range(range);

        const rows = parseSheetToRows(sheet);
        const risks = parseRisksTab(rows, versionId);
        allRisks.push(...risks);
        for (const r of risks) {
          riskByCode.set(r.risk_code.toUpperCase(), r.id);
        }
      } else if (classification.type === "threat_catalog") {
        // Shift range to row 5 (0-indexed) to skip headers and definition rows
        const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
        range.s.r = 5;
        sheet["!ref"] = XLSX.utils.encode_range(range);

        const rows = parseSheetToRows(sheet);
        const threats = parseThreatsTab(rows, versionId);
        allThreats.push(...threats);
        for (const t of threats) {
          threatByCode.set(t.threat_code.toUpperCase(), t.id);
        }
      } else if (classification.type === "dpmp") {
        const rows = parseSheetToRows(sheet);
        const { principles, frameworkMappings } = parseDpmpTab(rows, versionId);
        allDpmpPrinciples.push(...principles);
        allDpmpFrameworkMappings.push(...frameworkMappings);
      }
    }

    // Resolve risk-control mappings
    for (const raw of rawRiskMappings) {
      const controlId = controlByCode.get(raw.controlCode);
      const riskId = riskByCode.get(raw.riskCode);
      if (controlId && riskId) {
        allRiskControlMappings.push({
          id: crypto.randomUUID(),
          scf_version_id: versionId,
          scf_risk_id: riskId,
          scf_control_id: controlId,
        });
      }
    }

    // Resolve threat-control mappings
    for (const raw of rawThreatMappings) {
      const controlId = controlByCode.get(raw.controlCode);
      const threatId = threatByCode.get(raw.threatCode);
      if (controlId && threatId) {
        allThreatControlMappings.push({
          id: crypto.randomUUID(),
          scf_version_id: versionId,
          scf_threat_id: threatId,
          scf_control_id: controlId,
        });
      }
    }

    const importRun: ScfImportRun = {
      id: newId(),
      scf_version_id: versionId,
      source_type: "xlsx",
      ...(source.source_filename
        ? { source_filename: source.source_filename }
        : {}),
      source_hash: sourceHash,
      status: "succeeded",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      import_statistics: {
        versions: 1,
        domains: allDomains.length,
        controls: allControls.length,
        frameworks: allFrameworks.length,
        requirements: allRequirements.length,
        mappings: allMappings.length,
        strm_relationships: 0,
        warnings: allWarnings.length,
        synthetic_records: 0,
        // Extended stats
        assessment_objectives: allAssessmentObjectives.length,
        evidence_requests: allEvidenceRequests.length,
        maturity_criteria: allMaturityCriteria.length,
        risks: allRisks.length,
        threats: allThreats.length,
        dpmp_principles: allDpmpPrinciples.length,
        dpmp_framework_mappings: allDpmpFrameworkMappings.length,
      },
      trace_id: `xlsx-importer-${Date.now()}`,
    };

    const strmRelationships: ScfStrmRelationship[] = [];

    return {
      dataset: {
        versions: [version],
        domains: allDomains,
        controls: allControls,
        frameworks: allFrameworks,
        requirements: allRequirements,
        mappings: allMappings,
        strmRelationships,
        importRuns: [importRun],
        assessmentObjectives: allAssessmentObjectives,
        evidenceRequests: allEvidenceRequests,
        maturityCriteria: allMaturityCriteria,
        risks: allRisks,
        threats: allThreats,
        riskControlMappings: allRiskControlMappings,
        threatControlMappings: allThreatControlMappings,
        dpmpPrinciples: allDpmpPrinciples,
        dpmpFrameworkMappings: allDpmpFrameworkMappings,
      },
      warnings: allWarnings,
    };
  },
});
