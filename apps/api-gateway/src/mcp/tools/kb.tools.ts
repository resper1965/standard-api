/**
 * Standard MCP Server â€” KB & Evidence Tools
 *
 * Phase 1: Expose knowledge base search and AI evidence evaluation via MCP.
 *
 * These tools use runtime duck-typing to access the KB search service
 * because the dependency graph is wired at startup and the exact shape
 * depends on whether Vectorize/embeddings are configured.
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

// â”€â”€ KB Semantic Search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleSearchKb(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const assessmentId = args["assessment_id"] as string;
    const query = args["query"] as string;
    if (!assessmentId) return err("assessment_id is required.");
    if (!query) return err("query is required (e.g. 'access control policy').");

    const organizationId =
      ctx.organizationId ?? "00000000-0000-0000-0000-000000000000";
    if (!organizationId) return err("Tenant context required.");

    const topK = Math.min(Number(args["top_k"] ?? 10), 30);

    // The KB deps carry the raw components needed to instantiate KbSearchService.
    // We dynamically import and instantiate it so we don't break typecheck
    // when the embedding provider isn't configured.
    const kbDeps = ctx.deps.kb as Record<string, unknown> | undefined;
    if (!kbDeps?.embeddingProvider || !kbDeps?.vectorStore) {
      return err(
        "KB semantic search is not available on this deployment. " +
          "Vectorize and an embedding provider must be configured.",
      );
    }

    const { KbSearchService } = await import("@standard/kb");
    const searchService = new KbSearchService(ctx.deps.kb as any);

    const result = await searchService.search(
      {
        organizationId,
        assessmentId,
        traceId: ctx.traceId,
      },
      {
        query,
        top_k: topK,
        search_type: "semantic",
        filters: {},
        include_context: false,
      },
    );

    return ok({
      assessment_id: assessmentId,
      query,
      search_type: "semantic",
      total: result.data.length,
      candidate_evidence: true,
      warning: result.warning,
      results: result.data.map((r: any) => ({
        chunk_id: r.chunk_id,
        document_id: r.document_id,
        document_title: r.document_title,
        snippet: r.snippet,
        score: r.score,
        page_number: r.page_number,
      })),
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ Evaluate Evidence (AI-assisted) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleEvaluateEvidence(
  args: Record<string, unknown>,
  _ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const controlRequirement = args["control_requirement"] as string;
    const evidenceDescription = args["evidence_description"] as string;
    if (!controlRequirement)
      return err(
        "control_requirement is required (describe what the control requires).",
      );
    if (!evidenceDescription)
      return err(
        "evidence_description is required (describe the evidence found).",
      );

    // This tool returns a structured evaluation template for the AI agent
    // to fill in. The actual AI evaluation endpoint (POST /gap/evaluate-evidence)
    // requires an assessment context and full evidence pipeline.
    // Via MCP, the agent IS the AI â€” so we provide the template and let it reason.
    return ok({
      _mode: "agent_evaluation",
      _hint:
        "You are the AI evaluator. Use the control requirement and evidence description below to assess coverage. Fill in the evaluation fields.",
      control_requirement: controlRequirement,
      evidence_description: evidenceDescription,
      evaluation_schema: {
        coverage: {
          type: "enum",
          values: ["full", "partial", "none"],
          description:
            "Does the evidence fully cover, partially cover, or not cover the control requirement?",
        },
        confidence: {
          type: "number",
          range: "0.0 to 1.0",
          description: "Your confidence in this assessment.",
        },
        gaps_identified: {
          type: "string[]",
          description:
            "Specific gaps between the requirement and the evidence.",
        },
        recommendation: {
          type: "string",
          description: "Remediation guidance to close identified gaps.",
        },
        evidence_strength: {
          type: "enum",
          values: ["strong", "moderate", "weak", "absent"],
          description: "Overall strength of the evidence.",
        },
      },
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ Architect Remediation (AI-assisted) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleArchitectRemediation(
  args: Record<string, unknown>,
  _ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const evidenceContext = args["evidence_context"] as string;
    if (!evidenceContext)
      return err(
        "evidence_context is required (describe the gap/finding to remediate).",
      );

    const systemDescription = args["system_architecture_description"] as
      | string
      | undefined;

    // Like evaluate-evidence, the MCP agent IS the AI. We provide
    // a structured template for remediation planning.
    return ok({
      _mode: "agent_remediation",
      _hint:
        "You are the remediation architect. Use the gap context and optional system architecture below to design a remediation plan.",
      evidence_context: evidenceContext,
      system_architecture_description:
        systemDescription ??
        "Not provided â€” ask the user for system architecture context for better recommendations.",
      remediation_schema: {
        action_items: {
          type: "array",
          description:
            "Specific, actionable steps to remediate the gap. Each item should have a title, description, and estimated effort.",
        },
        priority: {
          type: "enum",
          values: ["critical", "high", "medium", "low"],
          description: "Overall priority of this remediation.",
        },
        estimated_effort: {
          type: "string",
          description: "Estimated effort (e.g. '2-4 weeks', '40 hours').",
        },
        controls_addressed: {
          type: "string[]",
          description: "SCF control IDs that this remediation addresses.",
        },
        dependencies: {
          type: "string[]",
          description: "Prerequisites or dependencies for this remediation.",
        },
        verification_criteria: {
          type: "string[]",
          description: "How to verify the remediation is complete.",
        },
      },
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}
