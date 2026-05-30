/**
 * Standard MCP Server — SoA (Statement of Applicability) Tools
 *
 * Exposes the full SoA lifecycle via MCP so AI agents can:
 *   - List/get SoA versions for an assessment
 *   - List SoA items with filters (applicability, implementation, evidence)
 *   - Get SoA item details
 *   - Validate SoA readiness for review
 *   - Get SoA summary statistics
 */
import type { RequestContext } from "../../http";
import type { McpToolResult } from "./assessment.tools";

function ok(data: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
function err(message: string): McpToolResult {
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

// ── list-soa-versions ───────────────────────────────────────────────────────

export async function handleListSoaVersions(
  args: Record<string, unknown>,
  ctx: RequestContext
): Promise<McpToolResult> {
  try {
    const assessmentId = args["assessment_id"] as string;
    if (!assessmentId) return err("assessment_id is required.");
    const tenantId = ctx.tenantId;
    if (!tenantId) return err("Tenant context required.");

    const versions = await ctx.deps.soa.repositories.versions
      .listByAssessment(assessmentId, tenantId);

    return ok({
      assessment_id: assessmentId,
      total: versions.length,
      versions: versions.map((v: any) => ({
        soa_version_id: v.soa_version_id,
        version_number: v.version_number,
        status: v.status,
        source_framework_id: v.source_framework_id,
        scf_version_id: v.scf_version_id,
        created_by: v.created_by,
        created_at: v.created_at,
        approved_by: v.approved_by,
        approved_at: v.approved_at,
        superseded_by: v.superseded_by,
      })),
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// ── get-soa-version ─────────────────────────────────────────────────────────

export async function handleGetSoaVersion(
  args: Record<string, unknown>,
  ctx: RequestContext
): Promise<McpToolResult> {
  try {
    const soaVersionId = args["soa_version_id"] as string;
    if (!soaVersionId) return err("soa_version_id is required.");
    const tenantId = ctx.tenantId;
    if (!tenantId) return err("Tenant context required.");

    const version = await ctx.deps.soa.repositories.versions
      .get(soaVersionId, tenantId);
    if (!version) return err(`SoA version ${soaVersionId} not found.`);

    return ok(version);
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// ── list-soa-items ──────────────────────────────────────────────────────────

export async function handleListSoaItems(
  args: Record<string, unknown>,
  ctx: RequestContext
): Promise<McpToolResult> {
  try {
    const soaVersionId = args["soa_version_id"] as string;
    if (!soaVersionId) return err("soa_version_id is required.");
    const tenantId = ctx.tenantId;
    if (!tenantId) return err("Tenant context required.");

    const applicabilityFilter = args["applicability_status"] as string | undefined;
    const implementationFilter = args["implementation_status"] as string | undefined;
    const evidenceFilter = args["evidence_coverage"] as string | undefined;
    const limit = Math.min(Number(args["limit"] ?? 50), 200);

    let items = await ctx.deps.soa.repositories.items
      .listByVersion(soaVersionId, tenantId);

    if (applicabilityFilter) {
      items = items.filter((i: any) => i.applicability_status === applicabilityFilter);
    }
    if (implementationFilter) {
      items = items.filter((i: any) => i.implementation_status === implementationFilter);
    }
    if (evidenceFilter) {
      items = items.filter((i: any) => i.evidence_coverage === evidenceFilter);
    }

    const total = items.length;
    const page = items.slice(0, limit);

    return ok({
      soa_version_id: soaVersionId,
      total,
      showing: page.length,
      items: page.map((i: any) => ({
        soa_item_id: i.soa_item_id,
        framework_requirement_id: i.framework_requirement_id,
        scf_control_id: i.scf_control_id,
        applicability_status: i.applicability_status,
        implementation_status: i.implementation_status,
        evidence_coverage: i.evidence_coverage,
        confidence_score: i.confidence_score,
        requires_user_validation: i.requires_user_validation,
        mapping_status: i.mapping_status,
        validation_notes: i.validation_notes,
      })),
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// ── get-soa-item ────────────────────────────────────────────────────────────

export async function handleGetSoaItem(
  args: Record<string, unknown>,
  ctx: RequestContext
): Promise<McpToolResult> {
  try {
    const soaItemId = args["soa_item_id"] as string;
    if (!soaItemId) return err("soa_item_id is required.");
    const tenantId = ctx.tenantId;
    if (!tenantId) return err("Tenant context required.");

    const item = await ctx.deps.soa.repositories.items
      .get(soaItemId, tenantId);
    if (!item) return err(`SoA item ${soaItemId} not found.`);

    return ok(item);
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// ── validate-soa ────────────────────────────────────────────────────────────

export async function handleValidateSoa(
  args: Record<string, unknown>,
  ctx: RequestContext
): Promise<McpToolResult> {
  try {
    const soaVersionId = args["soa_version_id"] as string;
    if (!soaVersionId) return err("soa_version_id is required.");
    const assessmentId = args["assessment_id"] as string;
    if (!assessmentId) return err("assessment_id is required.");
    const tenantId = ctx.tenantId;
    const organizationId = ctx.organizationId;
    if (!tenantId || !organizationId) return err("Tenant and organization context required.");

    // Use the SoaReviewService to validate
    const { SoaReviewService } = await import("@standard/soa");
    const reviewService = new SoaReviewService(ctx.deps.soa);
    const validation = await reviewService.validateSoaForReview(soaVersionId, {
      tenantId,
      organizationId,
      assessmentId,
      traceId: `mcp-validate-${Date.now()}`,
    });

    return ok({
      soa_version_id: soaVersionId,
      valid: validation.valid,
      blocking_errors: validation.blocking_errors,
      warnings: validation.warnings,
      recommendation: validation.valid
        ? "SoA is ready for review submission."
        : `${validation.blocking_errors.length} blocking error(s) must be resolved before review.`,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// ── get-soa-summary ─────────────────────────────────────────────────────────

export async function handleGetSoaSummary(
  args: Record<string, unknown>,
  ctx: RequestContext
): Promise<McpToolResult> {
  try {
    const assessmentId = args["assessment_id"] as string;
    if (!assessmentId) return err("assessment_id is required.");
    const tenantId = ctx.tenantId;
    if (!tenantId) return err("Tenant context required.");

    // Get the latest (or specified) SoA version
    const soaVersionId = args["soa_version_id"] as string | undefined;
    let version: any;

    if (soaVersionId) {
      version = await ctx.deps.soa.repositories.versions.get(soaVersionId, tenantId);
    } else {
      const versions = await ctx.deps.soa.repositories.versions
        .listByAssessment(assessmentId, tenantId);
      version = versions[versions.length - 1] ?? null;
    }

    if (!version) return err(`No SoA found for assessment ${assessmentId}.`);

    // Get all items and compute statistics
    const items = await ctx.deps.soa.repositories.items
      .listByVersion(version.soa_version_id, tenantId);

    const applicabilityCounts: Record<string, number> = {};
    const implementationCounts: Record<string, number> = {};
    const evidenceCounts: Record<string, number> = {};
    let pendingValidation = 0;

    for (const item of items) {
      const app = (item as any).applicability_status ?? "unknown";
      const impl = (item as any).implementation_status ?? "unknown";
      const ev = (item as any).evidence_coverage ?? "unknown";
      applicabilityCounts[app] = (applicabilityCounts[app] ?? 0) + 1;
      implementationCounts[impl] = (implementationCounts[impl] ?? 0) + 1;
      evidenceCounts[ev] = (evidenceCounts[ev] ?? 0) + 1;
      if ((item as any).requires_user_validation) pendingValidation++;
    }

    return ok({
      assessment_id: assessmentId,
      soa_version_id: version.soa_version_id,
      version_number: version.version_number,
      status: version.status,
      source_framework_id: version.source_framework_id,
      total_items: items.length,
      pending_validation: pendingValidation,
      applicability_breakdown: applicabilityCounts,
      implementation_breakdown: implementationCounts,
      evidence_breakdown: evidenceCounts,
      created_at: version.created_at,
      approved_at: version.approved_at,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}
