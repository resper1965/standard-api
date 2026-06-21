/**
 * @module report-export.consumer
 * @description Queue consumer for report export jobs.
 * Renders assessment report data to JSON and persists to R2 (STANDARD_REPORTS_BUCKET).
 * R2 key format: {organization_id}/{assessment_id}/reports/{report_version_id}.{format}
 *
 * Per AGENTS.md: Every critical data must carry organization_id, assessment_id, trace_id.
 */
import { z } from "zod";

// ── Message Schema ──

export const ReportExportMessageSchema = z.object({
  queue_type: z.literal("report_export"),
  report_version_id: z.string().min(1),
  assessment_id: z.string().min(1),
  organization_id: z.string().min(1),
  format: z.enum(["json", "markdown"]).default("json"),
  trace_id: z.string().min(1),
  timestamp: z.string().datetime(),
  idempotency_key: z.string().optional(),
});

export type ReportExportMessage = z.infer<typeof ReportExportMessageSchema>;

// ── Report Data Placeholder ──

interface ReportPayload {
  report_version_id: string;
  assessment_id: string;
  organization_id: string;
  format: string;
  generated_at: string;
  content: Record<string, unknown>;
}

function buildReportPayload(msg: ReportExportMessage): ReportPayload {
  return {
    report_version_id: msg.report_version_id,
    assessment_id: msg.assessment_id,
    organization_id: msg.organization_id,
    format: msg.format,
    generated_at: new Date().toISOString(),
    content: {
      // Placeholder — in production this would fetch from DB and assemble
      // the full assessment report (SoA, Gap Analysis, Maturity, POA&M).
      note: "Report content will be populated by reporting package",
    },
  };
}

function renderReport(payload: ReportPayload): { body: string; contentType: string } {
  if (payload.format === "markdown") {
    const md = [
      `# Assessment Report`,
      ``,
      `**Report Version:** ${payload.report_version_id}`,
      `**Assessment:** ${payload.assessment_id}`,
      `**Organization:** ${payload.organization_id}`,
      `**Generated:** ${payload.generated_at}`,
      ``,
      `## Content`,
      ``,
      JSON.stringify(payload.content, null, 2),
    ].join("\n");
    return { body: md, contentType: "text/markdown; charset=utf-8" };
  }

  // Default: JSON
  return {
    body: JSON.stringify(payload, null, 2),
    contentType: "application/json; charset=utf-8",
  };
}

// ── Consumer ──

export async function processReportExportMessage(
  msg: ReportExportMessage,
  env: { STANDARD_REPORTS_BUCKET?: R2Bucket; [key: string]: unknown },
): Promise<void> {
  const start = Date.now();

  // Validate R2 bucket binding
  if (!env.STANDARD_REPORTS_BUCKET) {
    throw new Error(
      "[report-export] STANDARD_REPORTS_BUCKET R2 binding is not configured. " +
      "Cannot persist report. Check wrangler.toml r2_buckets configuration.",
    );
  }

  const bucket = env.STANDARD_REPORTS_BUCKET;

  // Build tenant-scoped R2 key
  const ext = msg.format === "markdown" ? "md" : "json";
  const r2Key = `${msg.organization_id}/${msg.assessment_id}/reports/${msg.report_version_id}.${ext}`;

  // Build and render report
  const payload = buildReportPayload(msg);
  const { body, contentType } = renderReport(payload);

  // Persist to R2
  await bucket.put(r2Key, body, {
    httpMetadata: { contentType },
    customMetadata: {
      organization_id: msg.organization_id,
      assessment_id: msg.assessment_id,
      report_version_id: msg.report_version_id,
      trace_id: msg.trace_id,
      format: msg.format,
    },
  });

  const durationMs = Date.now() - start;

  // Structured log (per AGENTS.md: structured, with trace_id and organization_id)
  console.log(
    JSON.stringify({
      level: "info",
      message: "report_export_completed",
      service: "queue-worker",
      module: "report-export",
      trace_id: msg.trace_id,
      metadata: {
        report_version_id: msg.report_version_id,
        assessment_id: msg.assessment_id,
        organization_id: msg.organization_id.slice(0, 3) + "***",
        format: msg.format,
        r2_key: r2Key,
        size_bytes: body.length,
        duration_ms: durationMs,
      },
    }),
  );
}
