/**
 * @module soc-monitoring.consumer
 * @description SOC Monitoring consumer for the Standard platform.
 *
 * Handles two alert categories:
 *
 * 1. **DLQ Alert**: Messages that exhausted all retries land in the dead letter queue.
 *    This consumer is bound as a consumer of `standard-dead-letter-*` queues.
 *    It records a security event and logs structured metadata for every DLQ entry.
 *
 * 2. **Tenant Mismatch Alert**: Fired by the API gateway when it detects a request
 *    where the session organization_id != the payload/path organization_id. This is a critical
 *    security signal — it can indicate a confused deputy attack or a bug in
 *    multi-tenant isolation.
 *
 * Both alert types:
 *   - Write to `security_events` audit table (permanent, 2-year retention)
 *   - Emit a structured Cloudflare log line (picked up by tail workers / log drain)
 *   - Return structured summaries for dashboard consumption
 */

import { neon } from "@neondatabase/serverless";
import type { Env } from "./index";

// ── Types ──────────────────────────────────────────────────────────────────

export type DlqAlertMessage = {
  queue_type: "dlq_alert";
  original_queue: string;
  original_message: unknown;
  failure_reason?: string;
  retry_count?: number;
  organization_id?: string;
  assessment_id?: string;
  agent_run_id?: string;
  trace_id?: string;
};

export type TenantMismatchAlertMessage = {
  queue_type: "tenant_mismatch_alert";
  session_tenant_id: string;
  payload_tenant_id: string;
  actor_id: string;
  request_path: string;
  request_method: string;
  trace_id: string;
  ip_country?: string;
};

export type SocAlertMessage = DlqAlertMessage | TenantMismatchAlertMessage;

// ── DLQ Alert Handler ──────────────────────────────────────────────────────

export async function processDlqAlert(
  body: DlqAlertMessage,
  env: Env
): Promise<void> {
  const timestamp = new Date().toISOString();

  // Structured log — picked up by Cloudflare Logpush / tail workers
  console.error(JSON.stringify({
    level: "CRITICAL",
    event: "dlq.message_received",
    original_queue: body.original_queue,
    failure_reason: body.failure_reason ?? "unknown",
    retry_count: body.retry_count ?? 0,
    organization_id: body.organization_id ?? "unknown",
    assessment_id: body.assessment_id,
    agent_run_id: body.agent_run_id,
    trace_id: body.trace_id ?? crypto.randomUUID(),
    timestamp,
    original_message_preview: JSON.stringify(body.original_message).slice(0, 500),
    action: "DLQ message requires manual investigation",
  }));

  // Persist to security_events if DB available
  if (env.DATABASE_URL && body.organization_id) {
    try {
      const sql = neon(env.DATABASE_URL);
      await sql`
        INSERT INTO security_events (
          id, organization_id, event_type, severity,
          actor_id, metadata, created_at
        ) VALUES (
          gen_random_uuid(),
          ${body.organization_id},
          'queue.dlq_message',
          'HIGH',
          'system',
          ${JSON.stringify({
            original_queue: body.original_queue,
            failure_reason: body.failure_reason,
            retry_count: body.retry_count,
            trace_id: body.trace_id,
            agent_run_id: body.agent_run_id,
            assessment_id: body.assessment_id,
          })},
          NOW()
        )
      `;
    } catch (dbErr) {
      // Non-fatal — log is already emitted above
      console.warn(`[soc:dlq] Failed to persist security event: ${(dbErr as Error).message}`);
    }

    // ── DLQ Reconciliation ─────────────────────────────────────────────────
    // Update the source entity status so it doesn't remain orphaned forever.
    // Documents stuck in 'queued_for_extraction'/'extracting' → 'failed'
    // Agent runs stuck in 'queued'/'running' → 'poisoned_dlq'
    try {
      const sql = neon(env.DATABASE_URL);
      const queue = body.original_queue ?? "";
      const msg = body.original_message as Record<string, unknown> | undefined;

      if (queue.includes("document-ingestion") && msg?.document_id) {
        await sql`
          UPDATE documents
          SET scan_status = 'error',
              updated_at = NOW()
          WHERE id = ${String(msg.document_id)}
            AND organization_id = ${body.organization_id}
            AND scan_status IN ('pending')
        `;
        // Also mark extraction job as failed
        if (msg.job_id) {
          await sql`
            UPDATE document_extraction_jobs
            SET status = 'failed',
                error_code = 'DLQ_EXHAUSTED_RETRIES',
                error_message = ${`Message exhausted retries on queue ${queue}`},
                completed_at = NOW()
            WHERE id = ${String(msg.job_id)}
          `;
        }
        console.warn(`[soc:dlq:reconcile] Document ${msg.document_id} marked as failed (DLQ reconciliation)`);
      }

      if (queue.includes("agent-run") && (body.agent_run_id || msg?.agent_run_id)) {
        const runId = body.agent_run_id ?? String(msg?.agent_run_id);
        await sql`
          UPDATE agent_runs
          SET status = 'poisoned_dlq',
              error_message = ${`Agent run exhausted retries on queue ${queue}`},
              completed_at = NOW()
          WHERE id = ${runId}
            AND organization_id = ${body.organization_id}
            AND status IN ('queued', 'running')
        `;
        console.warn(`[soc:dlq:reconcile] Agent run ${runId} marked as poisoned_dlq (DLQ reconciliation)`);
      }

      if (queue.includes("kb-embedding") && msg?.document_chunk_id) {
        await sql`
          UPDATE kb_embedding_jobs
          SET status = 'failed',
              error_code = 'DLQ_EXHAUSTED_RETRIES',
              error_message_safe = ${`Embedding job exhausted retries on queue ${queue}`},
              completed_at = NOW()
          WHERE id = ${String(msg.job_id ?? msg.document_chunk_id)}
            AND organization_id = ${body.organization_id}
        `;
        console.warn(`[soc:dlq:reconcile] KB embedding job marked as failed (DLQ reconciliation)`);
      }
    } catch (reconcileErr) {
      // Non-fatal — the security event was already persisted above
      console.warn(`[soc:dlq:reconcile] Reconciliation failed: ${(reconcileErr as Error).message}`);
    }
  }
}

// ── Tenant Mismatch Alert Handler ──────────────────────────────────────────

export async function processTenantMismatchAlert(
  body: TenantMismatchAlertMessage,
  env: Env
): Promise<void> {
  const timestamp = new Date().toISOString();

  // This is CRITICAL — any tenant mismatch must be investigated immediately
  console.error(JSON.stringify({
    level: "CRITICAL",
    event: "security.tenant_mismatch",
    session_tenant_id: body.session_tenant_id,
    payload_tenant_id: body.payload_tenant_id,
    actor_id: body.actor_id,
    request_path: body.request_path,
    request_method: body.request_method,
    ip_country: body.ip_country ?? "unknown",
    trace_id: body.trace_id,
    timestamp,
    action: "BLOCKED — request rejected, security event recorded",
  }));

  if (env.DATABASE_URL) {
    try {
      const sql = neon(env.DATABASE_URL);
      await sql`
        INSERT INTO security_events (
          id, organization_id, event_type, severity,
          actor_id, metadata, created_at
        ) VALUES (
          gen_random_uuid(),
          ${body.session_tenant_id},
          'security.tenant_mismatch',
          'CRITICAL',
          ${body.actor_id},
          ${JSON.stringify({
            session_tenant_id: body.session_tenant_id,
            payload_tenant_id: body.payload_tenant_id,
            request_path: body.request_path,
            request_method: body.request_method,
            ip_country: body.ip_country,
            trace_id: body.trace_id,
          })},
          NOW()
        )
      `;
    } catch (dbErr) {
      console.warn(`[soc:mismatch] Failed to persist security event: ${(dbErr as Error).message}`);
    }
  }
}

// ── Aggregate SOC Alert Processor ─────────────────────────────────────────

export async function processSocAlert(body: SocAlertMessage, env: Env): Promise<void> {
  switch (body.queue_type) {
    case "dlq_alert":
      return processDlqAlert(body, env);
    case "tenant_mismatch_alert":
      return processTenantMismatchAlert(body, env);
    default:
      console.warn(`[soc:monitoring] Unknown SOC alert type: ${(body as any).queue_type}`);
  }
}

// ── DLQ Queue Consumer (wraps any DLQ message into a structured alert) ────

export async function processDlqQueueMessage(
  originalBody: unknown,
  queueName: string,
  env: Env
): Promise<void> {
  const alertBody: DlqAlertMessage = {
    queue_type: "dlq_alert",
    original_queue: queueName,
    original_message: originalBody,
    organization_id: (originalBody as any)?.organization_id,
    assessment_id: (originalBody as any)?.assessment_id,
    agent_run_id: (originalBody as any)?.agent_run_id,
    trace_id: (originalBody as any)?.trace_id,
    failure_reason: "exhausted_retries",
  };
  return processDlqAlert(alertBody, env);
}
