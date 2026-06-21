/**
 * @module soc-triage.consumer
 * @description Queue consumer for SOC triage jobs.
 * Classifies security alerts by severity and produces structured triage results.
 * Follows AGENTS.md: structured logs, trace_id, organization_id.
 */
import { z } from "zod";

// ── Message Schema ──

export const SocTriageMessageSchema = z.object({
  queue_type: z.literal("soc_triage"),
  organization_id: z.string().min(1),
  alert_type: z.string().min(1),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  source: z.string().min(1),
  details: z.record(z.string(), z.unknown()).default({}),
  trace_id: z.string().min(1),
  timestamp: z.string().datetime(),
  idempotency_key: z.string().optional(),
});

export type SocTriageMessage = z.infer<typeof SocTriageMessageSchema>;

// ── Triage Logic ──

type RecommendedAction =
  | "immediate_escalation"
  | "escalate_to_analyst"
  | "queue_for_review"
  | "log_and_monitor"
  | "acknowledge";

const SEVERITY_ACTION_MAP: Record<string, RecommendedAction> = {
  critical: "immediate_escalation",
  high: "escalate_to_analyst",
  medium: "queue_for_review",
  low: "log_and_monitor",
  info: "acknowledge",
};

export interface SocTriageResult {
  triaged: boolean;
  severity_classification: string;
  recommended_action: RecommendedAction;
  organization_id: string;
  alert_type: string;
  source: string;
  triaged_at: string;
  trace_id: string;
}

function classifyAlert(msg: SocTriageMessage): SocTriageResult {
  const action = SEVERITY_ACTION_MAP[msg.severity] ?? "queue_for_review";

  return {
    triaged: true,
    severity_classification: msg.severity,
    recommended_action: action,
    organization_id: msg.organization_id,
    alert_type: msg.alert_type,
    source: msg.source,
    triaged_at: new Date().toISOString(),
    trace_id: msg.trace_id,
  };
}

// ── Consumer ──

export async function processSocTriageMessage(
  msg: SocTriageMessage,
  _env: Record<string, unknown>,
): Promise<SocTriageResult> {
  const start = Date.now();

  const result = classifyAlert(msg);

  const durationMs = Date.now() - start;

  // Structured log (per AGENTS.md)
  console.log(
    JSON.stringify({
      level: "info",
      message: "soc_triage_completed",
      service: "queue-worker",
      module: "soc-triage",
      trace_id: msg.trace_id,
      metadata: {
        alert_type: msg.alert_type,
        severity: msg.severity,
        recommended_action: result.recommended_action,
        source: msg.source,
        organization_id: msg.organization_id.slice(0, 3) + "***",
        duration_ms: durationMs,
      },
    }),
  );

  return result;
}
