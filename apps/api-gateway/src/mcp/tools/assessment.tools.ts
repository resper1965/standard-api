/**
 * Standard MCP Server â€” Tools
 * Assessment Management tools
 *
 * Uses AssessmentRepositoryAdapter (get, listByOrganization) from RequestContext.
 * No `as any` â€” all types flow from the adapter interface defined in http.ts.
 */

import type { RequestContext, AssessmentRecord } from "../../http";

export interface McpToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

function ok(data: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string): McpToolResult {
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}

function mapAssessment(a: AssessmentRecord) {
  return {
    id: a.assessment_id,
    name: a.name,
    status: a.snapshot?.state ?? "unknown",
    framework_selected: a.snapshot?.frameworkSelected ?? false,
    organization_id: a.organization_id,
    scf_version_id: a.scf_version_id,
    scf_version_label: a.scf_version_label,
    created_at: a.created_at,
    updated_at: a.updated_at,
  };
}

export async function handleListAssessments(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const organizationId = ctx.organizationId;
    if (!organizationId) return fail("Tenant context required.");

    const orgId =
      (args["organization_id"] as string | undefined) ?? ctx.organizationId;
    if (!orgId)
      return fail("organization_id is required (or must be set in context).");

    const repo = ctx.deps.assessments;
    const all = await repo.listByOrganization(orgId);

    // Optional status filter applied in-memory (adapter doesn't support it yet)
    const statusFilter = args["status"] as string | undefined;
    const limit = Math.min(Number(args["limit"] ?? 20), 100);
    const filtered = statusFilter
      ? all.filter((a) => (a.snapshot?.state ?? "") === statusFilter)
      : all;
    const page = filtered.slice(0, limit);

    return ok({ total: page.length, assessments: page.map(mapAssessment) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export async function handleGetAssessment(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const id = args["assessment_id"] as string;
    if (!id) return fail("assessment_id is required.");

    const organizationId = ctx.organizationId;
    if (!organizationId) return fail("Tenant context required.");

    const assessment = await ctx.deps.assessments.get(id, organizationId);
    if (!assessment) return fail(`Assessment ${id} not found.`);

    return ok(mapAssessment(assessment));
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export async function handleGetAssessmentStatus(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const id = args["assessment_id"] as string;
    if (!id) return fail("assessment_id is required.");

    const organizationId = ctx.organizationId;
    if (!organizationId) return fail("Tenant context required.");

    const assessment = await ctx.deps.assessments.get(id, organizationId);
    if (!assessment) return fail(`Assessment ${id} not found.`);

    return ok({
      id: assessment.assessment_id,
      name: assessment.name,
      status: assessment.snapshot?.state ?? "unknown",
      lifecycle_stage: assessment.snapshot?.state ?? "unknown",
      framework_selected: assessment.snapshot?.frameworkSelected ?? false,
      organization_id: assessment.organization_id,
      updated_at: assessment.updated_at,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export async function handleListAssessmentDocuments(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const id = args["assessment_id"] as string;
    if (!id) return fail("assessment_id is required.");

    const organizationId = ctx.organizationId;
    if (!organizationId) return fail("Tenant context required.");

    // Verify assessment ownership before listing docs
    const assessment = await ctx.deps.assessments.get(id, organizationId);
    if (!assessment) return fail(`Assessment ${id} not found.`);

    // Documents are retrieved via the evidence findings repository
    const gapRepo = ctx.deps.gapAnalysis.repositories;
    const docs = await gapRepo.evidenceFindings.listByAssessment(
      id,
      organizationId,
    );

    return ok({
      assessment_id: id,
      total: docs.length,
      documents: docs.map((d) => ({
        id: d.evidence_finding_id,
        soa_item_id: d.soa_item_id,
        framework_requirement_id: d.framework_requirement_id,
        status: d.evidence_status,
        uploaded_at: d.created_at,
      })),
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}
