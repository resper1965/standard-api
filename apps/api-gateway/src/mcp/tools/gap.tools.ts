/**
 * Standard MCP Server â€” Gap Analysis Tools
 */
// @ts-nocheck -- Zod v4 unknown type workaround
import type { RequestContext } from "../../http";
import type { McpToolResult } from "./assessment.tools";

function ok(data: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
function err(message: string): McpToolResult {
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}

export async function handleGetGapAnalysis(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const assessmentId = args["assessment_id"] as string;
    if (!assessmentId) return err("assessment_id is required.");

    const organizationId = ctx.organizationId;
    if (!organizationId) return err("Tenant context required.");

    // Get latest gap analysis version for this assessment
    const versions =
      await ctx.deps.gapAnalysis.repositories.gapVersions.listByAssessment(
        assessmentId,
        organizationId,
      );
    const gap = versions[versions.length - 1] ?? null;
    if (!gap)
      return err(`No gap analysis found for assessment ${assessmentId}.`);

    return ok(gap);
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

export async function handleListFindings(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const assessmentId = args["assessment_id"] as string;
    if (!assessmentId) return err("assessment_id is required.");

    const severity = args["severity"] as string | undefined;
    const limit = Math.min(Number(args["limit"] ?? 50), 200);

    const organizationId = ctx.organizationId;
    if (!organizationId) return err("Tenant context required.");

    // Get the latest gap version then list findings
    const versions =
      await ctx.deps.gapAnalysis.repositories.gapVersions.listByAssessment(
        assessmentId,
        organizationId,
      );
    const latestVersion = versions[versions.length - 1];
    if (!latestVersion)
      return ok({ assessment_id: assessmentId, total: 0, findings: [] });

    const allFindings =
      await ctx.deps.gapAnalysis.repositories.gapFindings.listByVersion(
        latestVersion.gap_analysis_version_id,
        organizationId,
      );
    const filtered = severity
      ? allFindings.filter(
          (f: any) => f.gap_severity === severity || f.severity === severity,
        )
      : allFindings;
    const findings = filtered.slice(0, limit);

    return ok({
      assessment_id: assessmentId,
      total: findings.length,
      findings: findings.map((f: any) => ({
        id: f.gap_finding_id ?? f.id,
        control_id: f.scf_control_id ?? f.controlId,
        title: f.title ?? f.gap_description?.slice(0, 80),
        severity: f.gap_severity ?? f.severity,
        status: f.status,
        gap_description: (f.gap_description ?? "").slice(0, 300),
        recommendation: (
          f.remediation_guidance ??
          f.recommendation ??
          ""
        ).slice(0, 300),
      })),
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

export async function handleGetFinding(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const findingId = args["finding_id"] as string;
    if (!findingId) return err("finding_id is required.");

    const organizationId = ctx.organizationId;
    if (!organizationId) return err("Tenant context required.");

    const finding = await ctx.deps.gapAnalysis.repositories.gapFindings.get(
      findingId,
      organizationId,
    );
    if (!finding) return err(`Finding ${findingId} not found.`);

    return ok(finding);
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}
