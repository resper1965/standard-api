/**
 * Standard MCP Server â€” SCF Extended Tools
 *
 * Phase 2: Complete SCF catalog access via MCP.
 * Covers domains, requirements, coverage, crosswalks.
 *
 * Uses real ScfCoreServices methods:
 *   domains.listDomains(versionId)
 *   frameworks.listRequirements(frameworkId)
 *   frameworks.getFramework(frameworkId)
 *   mappings.mapFrameworkToScf(frameworkId, scfVersionId)
 *   mappings.getMappingsForControl(controlId, scfVersionId)
 *   mappings.getCoverageSummary(frameworkId, scfVersionId)
 */
// @ts-nocheck -- Zod v4 unknown type workaround
import type { RequestContext } from "../../http";
import type { McpToolResult } from "./assessment.tools";
import { ComplianceOptimizerService } from "@standard/assessment-engine";

function ok(data: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
function err(message: string): McpToolResult {
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}

async function resolveVersionId(
  ctx: RequestContext,
  raw?: string,
): Promise<string | null> {
  if (raw && raw !== "latest") return raw;
  const latest = await ctx.deps.scf.versions.getLatestVersion();
  return latest?.id ?? null;
}

// â”€â”€ List SCF Domains â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleListScfDomains(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const versionId = await resolveVersionId(
      ctx,
      args["scf_version_id"] as string | undefined,
    );
    if (!versionId) return err("No SCF version found.");

    const domains = await ctx.deps.scf.domains.listDomains(versionId);

    return ok({
      scf_version_id: versionId,
      total: domains.length,
      domains: domains.map((d: any) => ({
        id: d.id ?? d.scf_domain_id,
        code: d.domain_code ?? d.code,
        name: d.domain_name ?? d.name,
        description: d.description,
      })),
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ List Framework Requirements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleListFrameworkRequirements(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const frameworkId = args["framework_id"] as string;
    if (!frameworkId) return err("framework_id is required.");

    const limit = Math.min(Number(args["limit"] ?? 50), 200);

    const requirements =
      await ctx.deps.scf.frameworks.listRequirements(frameworkId);
    const sliced = requirements.slice(0, limit);

    return ok({
      framework_id: frameworkId,
      total: requirements.length,
      showing: sliced.length,
      requirements: sliced.map((r: any) => ({
        id: r.id ?? r.scf_framework_requirement_id,
        requirement_code: r.requirement_code ?? r.code,
        title: r.requirement_title ?? r.title,
        description: (r.requirement_description ?? r.description ?? "").slice(
          0,
          300,
        ),
      })),
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ Framework Coverage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleGetFrameworkCoverage(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const frameworkId = args["framework_id"] as string;
    if (!frameworkId) return err("framework_id is required.");

    const versionId = await resolveVersionId(
      ctx,
      args["scf_version_id"] as string | undefined,
    );
    if (!versionId) return err("No SCF version found.");

    const coverage = await ctx.deps.scf.mappings.getCoverageSummary(
      frameworkId,
      versionId,
    );

    return ok({
      ...coverage,
      _hint:
        "requirement_count = total requirements in the framework. mapped_requirement_count = how many have SCF control mappings.",
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ Control Mappings (Crosswalks) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleGetControlMappings(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const controlId = args["control_id"] as string;
    if (!controlId)
      return err(
        "control_id is required (UUID or control code like 'ACC-01').",
      );

    const versionId = await resolveVersionId(
      ctx,
      args["scf_version_id"] as string | undefined,
    );
    if (!versionId) return err("No SCF version found.");

    const limit = Math.min(Number(args["limit"] ?? 50), 200);

    const mappings = await ctx.deps.scf.mappings.getMappingsForControl(
      controlId,
      versionId,
    );
    const enriched = await ctx.deps.scf.mappings.enrichMappings(mappings);
    const sliced = enriched.slice(0, limit);

    return ok({
      control_id: controlId,
      scf_version_id: versionId,
      total_mappings: enriched.length,
      showing: sliced.length,
      mappings: sliced.map((m: any) => ({
        framework_id: m.scf_framework_id,
        framework_name: m.framework_name,
        framework_code: m.framework_code,
        requirement_id: m.scf_framework_requirement_id,
        requirement_code: m.requirement_code,
        is_official: m.is_official,
      })),
      _hint:
        "These are official SCF crosswalk mappings. Each shows which framework requirement maps to this control.",
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ Cross-Framework Mapping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleCrossFrameworkMapping(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const frameworkA = args["framework_a"] as string;
    const frameworkB = args["framework_b"] as string;
    if (!frameworkA || !frameworkB)
      return err("framework_a and framework_b are required.");

    const versionId = await resolveVersionId(
      ctx,
      args["scf_version_id"] as string | undefined,
    );
    if (!versionId) return err("No SCF version found.");

    // Get mappings for both frameworks via the correct service method
    const mappingsA = await ctx.deps.scf.mappings.mapFrameworkToScf(
      frameworkA,
      versionId,
    );
    const mappingsB = await ctx.deps.scf.mappings.mapFrameworkToScf(
      frameworkB,
      versionId,
    );

    const controlsA = new Set(mappingsA.map((m: any) => m.scf_control_id));
    const controlsB = new Set(mappingsB.map((m: any) => m.scf_control_id));

    const shared = Array.from(controlsA).filter((c) => controlsB.has(c));
    const onlyA = Array.from(controlsA).filter((c) => !controlsB.has(c));
    const onlyB = Array.from(controlsB).filter((c) => !controlsA.has(c));

    return ok({
      framework_a: frameworkA,
      framework_b: frameworkB,
      scf_version_id: versionId,
      controls_in_a: controlsA.size,
      controls_in_b: controlsB.size,
      shared_controls: shared.length,
      only_in_a: onlyA.length,
      only_in_b: onlyB.length,
      overlap_a_to_b:
        controlsA.size > 0
          ? Math.round((shared.length / controlsA.size) * 100)
          : 0,
      overlap_b_to_a:
        controlsB.size > 0
          ? Math.round((shared.length / controlsB.size) * 100)
          : 0,
      _hint: `${shared.length} SCF controls are shared between both frameworks.`,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ Get Evidence Requirements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleGetEvidenceRequirements(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const controlId = args["control_id"] as string;
    if (!controlId) return err("control_id is required.");

    const versionId = await resolveVersionId(
      ctx,
      args["scf_version_id"] as string | undefined,
    );
    if (!versionId) return err("No SCF version found.");

    // Resolve control UUID if a code is passed
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        controlId,
      );
    let resolvedControlId = controlId;
    if (!isUuid) {
      const control = await ctx.deps.scf.controls.getControlByCode(
        versionId,
        controlId,
      );
      if (!control) return err(`SCF control '${controlId}' not found.`);
      resolvedControlId = control.id;
    }

    const objectives =
      await ctx.deps.scf.repository.listAssessmentObjectivesForControl(
        resolvedControlId,
      );
    const requests =
      await ctx.deps.scf.repository.listEvidenceRequestsForControl(
        resolvedControlId,
      );

    return ok({
      control_id: controlId,
      scf_version_id: versionId,
      assessment_objectives: objectives.map((ao: any) => ({
        code: ao.objective_code,
        text: ao.text,
      })),
      evidence_requests: requests.map((er: any) => ({
        item: er.request_item,
        type: er.evidence_type,
      })),
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ Compare Frameworks STRM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleCompareFrameworks(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const source = args["source"] as string;
    const target = args["target"] as string;
    if (!source || !target)
      return err(
        "Both 'source' and 'target' framework IDs or codes are required.",
      );

    const versionId = await resolveVersionId(
      ctx,
      args["scf_version_id"] as string | undefined,
    );
    if (!versionId) return err("No SCF version found.");

    // Resolve framework UUIDs if code is passed
    const resolveFw = async (val: string) => {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          val,
        );
      if (isUuid) return val;
      const frameworks = await ctx.deps.scf.frameworks.listFrameworks();
      const found = frameworks.find(
        (f) => f.framework_code.toLowerCase() === val.toLowerCase(),
      );
      if (!found) throw new Error(`Framework not found: ${val}`);
      return found.id;
    };

    const sourceId = await resolveFw(source);
    const targetId = await resolveFw(target);

    const comparison = await ctx.deps.scf.mappings.compareFrameworks(
      sourceId,
      targetId,
      versionId,
    );

    return ok(comparison);
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ Optimize Compliance Strategy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleOptimizeComplianceStrategy(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const frameworkIdsRaw = args["framework_ids"];
    if (
      !frameworkIdsRaw ||
      !Array.isArray(frameworkIdsRaw) ||
      frameworkIdsRaw.length === 0
    ) {
      return err(
        "framework_ids is required and must be a non-empty array of framework codes or UUIDs.",
      );
    }

    const versionId = await resolveVersionId(
      ctx,
      args["scf_version_id"] as string | undefined,
    );
    if (!versionId) return err("No SCF version found.");

    const db = ctx.deps._db;
    if (!db) return err("DB client not available.");

    const resolveFw = async (val: string) => {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          val,
        );
      if (isUuid) return val;
      const frameworks = await ctx.deps.scf.frameworks.listFrameworks();
      const found = frameworks.find(
        (f) => f.framework_code.toLowerCase() === val.toLowerCase(),
      );
      if (!found) throw new Error(`Framework not found: ${val}`);
      return found.id;
    };

    const resolvedFrameworkIds = await Promise.all(
      frameworkIdsRaw.map((fId) => resolveFw(String(fId))),
    );

    const optimizer = new ComplianceOptimizerService(db);
    const result = await optimizer.optimizePath({
      frameworkIds: resolvedFrameworkIds,
      scfVersionId: versionId,
    });

    return ok(result);
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}
