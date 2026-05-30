/**
 * Standard MCP Server — SCF Extended Tools
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
import type { RequestContext } from "../../http";
import type { McpToolResult } from "./assessment.tools";

function ok(data: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
function err(message: string): McpToolResult {
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

async function resolveVersionId(ctx: RequestContext, raw?: string): Promise<string | null> {
  if (raw && raw !== "latest") return raw;
  const latest = await ctx.deps.scf.versions.getLatestVersion();
  return latest?.id ?? null;
}

// ── List SCF Domains ────────────────────────────────────────────────────────
export async function handleListScfDomains(
  args: Record<string, unknown>,
  ctx: RequestContext
): Promise<McpToolResult> {
  try {
    const versionId = await resolveVersionId(ctx, args["scf_version_id"] as string | undefined);
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

// ── List Framework Requirements ─────────────────────────────────────────────
export async function handleListFrameworkRequirements(
  args: Record<string, unknown>,
  ctx: RequestContext
): Promise<McpToolResult> {
  try {
    const frameworkId = args["framework_id"] as string;
    if (!frameworkId) return err("framework_id is required.");

    const limit = Math.min(Number(args["limit"] ?? 50), 200);

    const requirements = await ctx.deps.scf.frameworks.listRequirements(frameworkId);
    const sliced = requirements.slice(0, limit);

    return ok({
      framework_id: frameworkId,
      total: requirements.length,
      showing: sliced.length,
      requirements: sliced.map((r: any) => ({
        id: r.id ?? r.scf_framework_requirement_id,
        requirement_code: r.requirement_code ?? r.code,
        title: r.requirement_title ?? r.title,
        description: (r.requirement_description ?? r.description ?? "").slice(0, 300),
      })),
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// ── Framework Coverage ──────────────────────────────────────────────────────
export async function handleGetFrameworkCoverage(
  args: Record<string, unknown>,
  ctx: RequestContext
): Promise<McpToolResult> {
  try {
    const frameworkId = args["framework_id"] as string;
    if (!frameworkId) return err("framework_id is required.");

    const versionId = await resolveVersionId(ctx, args["scf_version_id"] as string | undefined);
    if (!versionId) return err("No SCF version found.");

    const coverage = await ctx.deps.scf.mappings.getCoverageSummary(frameworkId, versionId);

    return ok({
      ...coverage,
      _hint: "requirement_count = total requirements in the framework. mapped_requirement_count = how many have SCF control mappings.",
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// ── Control Mappings (Crosswalks) ───────────────────────────────────────────
export async function handleGetControlMappings(
  args: Record<string, unknown>,
  ctx: RequestContext
): Promise<McpToolResult> {
  try {
    const controlId = args["control_id"] as string;
    if (!controlId) return err("control_id is required (UUID or control code like 'ACC-01').");

    const versionId = await resolveVersionId(ctx, args["scf_version_id"] as string | undefined);
    if (!versionId) return err("No SCF version found.");

    const limit = Math.min(Number(args["limit"] ?? 50), 200);

    const mappings = await ctx.deps.scf.mappings.getMappingsForControl(controlId, versionId);
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
      _hint: "These are official SCF crosswalk mappings. Each shows which framework requirement maps to this control.",
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// ── Cross-Framework Mapping ─────────────────────────────────────────────────
export async function handleCrossFrameworkMapping(
  args: Record<string, unknown>,
  ctx: RequestContext
): Promise<McpToolResult> {
  try {
    const frameworkA = args["framework_a"] as string;
    const frameworkB = args["framework_b"] as string;
    if (!frameworkA || !frameworkB) return err("framework_a and framework_b are required.");

    const versionId = await resolveVersionId(ctx, args["scf_version_id"] as string | undefined);
    if (!versionId) return err("No SCF version found.");

    // Get mappings for both frameworks via the correct service method
    const mappingsA = await ctx.deps.scf.mappings.mapFrameworkToScf(frameworkA, versionId);
    const mappingsB = await ctx.deps.scf.mappings.mapFrameworkToScf(frameworkB, versionId);

    const controlsA = new Set(mappingsA.map((m: any) => m.scf_control_id));
    const controlsB = new Set(mappingsB.map((m: any) => m.scf_control_id));

    const shared = Array.from(controlsA).filter(c => controlsB.has(c));
    const onlyA = Array.from(controlsA).filter(c => !controlsB.has(c));
    const onlyB = Array.from(controlsB).filter(c => !controlsA.has(c));

    return ok({
      framework_a: frameworkA,
      framework_b: frameworkB,
      scf_version_id: versionId,
      controls_in_a: controlsA.size,
      controls_in_b: controlsB.size,
      shared_controls: shared.length,
      only_in_a: onlyA.length,
      only_in_b: onlyB.length,
      overlap_a_to_b: controlsA.size > 0
        ? Math.round((shared.length / controlsA.size) * 100)
        : 0,
      overlap_b_to_a: controlsB.size > 0
        ? Math.round((shared.length / controlsB.size) * 100)
        : 0,
      _hint: `${shared.length} SCF controls are shared between both frameworks.`,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}
