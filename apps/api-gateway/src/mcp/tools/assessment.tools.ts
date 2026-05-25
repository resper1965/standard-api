/**
 * Standard MCP Server — Tools
 * Assessment Management tools
 */

import type { RequestContext } from "../../http";

export interface McpToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

function ok(data: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function err(message: string): McpToolResult {
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

export async function handleListAssessments(
  args: Record<string, unknown>,
  ctx: RequestContext
): Promise<McpToolResult> {
  try {
    const status = args["status"] as string | undefined;
    const limit = Math.min(Number(args["limit"] ?? 20), 100);

    const repo = ctx.deps.assessments;
    const tenantId = ctx.tenantId;

    if (!tenantId) return err("Tenant context required.");

    const all = await (repo as any).listByTenant?.(tenantId, { status, limit }) ??
      await (repo as any).list?.({ tenantId, status, limit }) ??
      [];
    return ok({
      total: all.length,
      assessments: all.map((a: any) => ({
        id: a.id,
        title: a.title,
        status: a.status,
        framework_id: a.frameworkId,
        organization_id: a.organizationId,
        created_at: a.createdAt,
        updated_at: a.updatedAt,
      })),
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

export async function handleGetAssessment(
  args: Record<string, unknown>,
  ctx: RequestContext
): Promise<McpToolResult> {
  try {
    const id = args["assessment_id"] as string;
    if (!id) return err("assessment_id is required.");

    const tenantId = ctx.tenantId;
    if (!tenantId) return err("Tenant context required.");

    const repo = ctx.deps.assessments;
    const assessment = await (repo as any).findById?.(id, tenantId) ??
      await (repo as any).getById?.(id, tenantId) ??
      null;
    if (!assessment) return err(`Assessment ${id} not found.`);

    return ok(assessment);
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

export async function handleGetAssessmentStatus(
  args: Record<string, unknown>,
  ctx: RequestContext
): Promise<McpToolResult> {
  try {
    const id = args["assessment_id"] as string;
    if (!id) return err("assessment_id is required.");

    const tenantId = ctx.tenantId;
    if (!tenantId) return err("Tenant context required.");

    const repo = ctx.deps.assessments;
    const assessment = await (repo as any).findById?.(id, tenantId) ??
      await (repo as any).getById?.(id, tenantId) ??
      null;
    if (!assessment) return err(`Assessment ${id} not found.`);

    return ok({
      id: assessment.id,
      title: (assessment as any).title,
      status: (assessment as any).status,
      lifecycle_stage: (assessment as any).lifecycleStage ?? (assessment as any).status,
      framework_id: (assessment as any).frameworkId,
      organization_id: (assessment as any).organizationId,
      updated_at: (assessment as any).updatedAt,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

export async function handleListAssessmentDocuments(
  args: Record<string, unknown>,
  ctx: RequestContext
): Promise<McpToolResult> {
  try {
    const id = args["assessment_id"] as string;
    if (!id) return err("assessment_id is required.");

    const tenantId = ctx.tenantId;
    if (!tenantId) return err("Tenant context required.");

    // Documents are retrieved via the KB evidence findings repository
    const gapRepo = ctx.deps.gapAnalysis.repositories;
    const docs = await gapRepo.evidenceFindings.listByAssessment(id, tenantId);

    return ok({
      assessment_id: id,
      total: docs.length,
      documents: docs.map((d: any) => ({
        id: d.evidence_finding_id ?? d.id,
        filename: d.source_ref ?? d.filename,
        status: d.evidence_status ?? d.status,
        chunk_count: d.chunk_count,
        uploaded_at: d.created_at,
      })),
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}
