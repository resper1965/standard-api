// @ts-nocheck -- Zod v4 CI type compat
/**
 * Standard MCP Server â€” SCF Catalog Tools
 */
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

export async function handleSearchScfControls(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const query = args["query"] as string | undefined;
    const domain = args["domain"] as string | undefined;
    const frameworkId = args["framework_id"] as string | undefined;
    const limit = Math.min(Number(args["limit"] ?? 20), 100);

    const controls = await ctx.deps.scf.controls.searchControls({
      keyword: query,
      scf_domain_id: domain,
      framework_id: frameworkId,
      limit,
    } as any);

    return ok({
      total: controls.length,
      controls: controls.map((c: any) => ({
        id: c.id,
        control_id: c.controlId,
        title: c.title,
        domain: c.domain,
        description: c.description?.slice(0, 200),
        frameworks: c.frameworks ?? [],
      })),
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

export async function handleGetScfControl(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const controlId = args["control_id"] as string;
    if (!controlId) return err("control_id is required.");

    const control = await ctx.deps.scf.controls.getControl(controlId);
    if (!control) return err(`SCF control ${controlId} not found.`);

    return ok(control);
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

export async function handleListScfFrameworks(
  _args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const frameworks = await ctx.deps.scf.frameworks.listFrameworks();

    return ok({
      total: frameworks.length,
      frameworks: frameworks.map((f: any) => ({
        id: f.id,
        name: f.name,
        version: f.version,
        description: f.description,
      })),
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}
