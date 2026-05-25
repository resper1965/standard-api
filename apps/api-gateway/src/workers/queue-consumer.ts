/**
 * Inline Cloudflare Workers type stubs.
 */
interface QueueMessage<T = unknown> {
  readonly body: T;
  readonly id: string;
  readonly timestamp: Date;
  readonly attempts: number;
  ack(): void;
  retry(): void;
}
interface MessageBatch<T = unknown> {
  readonly queue: string;
  readonly messages: readonly QueueMessage<T>[];
  ackAll(): void;
  retryAll(): void;
}

/**
 * SOC Triage Queue Consumer — Hardened Background Worker
 *
 * Processes incident triage jobs dispatched by the SOC route (asyncCall: true).
 * Implements the "Gold Standard" resilience pattern:
 *
 *  1. Tenant Validation   — rejects cross-tenant payloads immediately (DLQ)
 *  2. LLM Invocation       — calls IncidentTriagerUseCase via AI Gateway
 *  3. Audit Persistence    — writes result or failure to the audit trail
 *  4. Dead-Letter Capture  — on 3rd retry or fatal error, persists a `poisoned_dlq`
 *                            record into the database so the GRC dashboard can surface it
 *
 * wrangler.toml consumer settings enforce:
 *   max_batch_size  = 5   (prevent OpenAI rate-limit storms)
 *   max_concurrency = 2   (at most 2 parallel workers)
 *   max_retries     = 3   (Cloudflare-native retry budget)
 */

import { IncidentTriagerUseCase } from "@standard/agent-runtime";
import { TenantMismatchError } from "../errors/tenant-mismatch-error";
import type { Env } from "../index";
import { createDb } from "../adapters/db";
import { createDrizzleAuditRepository } from "../adapters/audit.repository";
import { CloudflareAiGatewayAdapter } from "../adapters/ai-gateway.adapter";
import { createInMemoryAgentRuntimeDependencies } from "@standard/agent-runtime";

// ──── Payload contract ────

interface SocTriagePayload {
  job_id: string;
  tenantId: string;
  traceId: string;
  systemModuleName: string;
  rawLogsExcerpt: string;
}

const isSocTriagePayload = (body: unknown): body is SocTriagePayload => {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.job_id === "string" &&
    typeof b.tenantId === "string" &&
    typeof b.traceId === "string" &&
    typeof b.systemModuleName === "string" &&
    typeof b.rawLogsExcerpt === "string"
  );
};

// ──── Helpers ────

/**
 * Validate that the incoming message has mandatory tenant context.
 * A missing or empty tenantId is a fatal, non-retryable error.
 */
const assertTenantIntegrity = (payload: SocTriagePayload): void => {
  if (!payload.tenantId || payload.tenantId.length < 8) {
    throw new TenantMismatchError(
      `Payload job_id=${payload.job_id} has invalid tenantId="${payload.tenantId}". ` +
      `Possible cross-tenant contamination or malformed dispatch.`
    );
  }
};

// ──── Consumer Export ────

export default {
  async queue(
    batch: MessageBatch,
    env: Env,
    _ctx: unknown,
  ): Promise<void> {
    // Bootstrap lightweight dependencies for background processing.
    // We intentionally avoid the full cachedApp to keep memory low.
    const hasDb = Boolean(env.DATABASE_URL);
    const audit = hasDb
      ? createDrizzleAuditRepository(createDb(env.DATABASE_URL!))
      : { record: async () => {} };

    const llm =
      env.AI_GATEWAY_BASE_URL && env.OPENAI_API_KEY
        ? new CloudflareAiGatewayAdapter({
            baseUrl: env.AI_GATEWAY_BASE_URL,
            apiKey: env.OPENAI_API_KEY,
          })
        : createInMemoryAgentRuntimeDependencies().llm;

    for (const message of batch.messages) {
      const raw = message.body;
      const msgStartedAt = Date.now();

      // ── Step 0: Structural validation ──
      if (!isSocTriagePayload(raw)) {
        console.error(
          `[soc:queue] ❌ Malformed payload — cannot parse. Sending to DLQ.`,
          JSON.stringify(raw).slice(0, 200),
        );
        await audit.record("soc.dlq.event", {
          reason: "malformed_payload",
          raw_preview: JSON.stringify(raw).slice(0, 500),
          timestamp: new Date().toISOString(),
        });
        message.ack(); // Don't retry garbage — it will never become valid.
        continue;
      }

      const payload = raw;

      try {
        // ── Step 1: Tenant Integrity Gate ──
        assertTenantIntegrity(payload);

        // ── Step 2: LLM Triage ──
        console.log(
          `[soc:queue] 🔍 Processing job ${payload.job_id} for tenant ${payload.tenantId} (trace: ${payload.traceId})`,
        );
        const usecase = new IncidentTriagerUseCase(llm as any);
        const result = await usecase.triage({
          systemModuleName: payload.systemModuleName,
          rawLogsExcerpt: payload.rawLogsExcerpt,
          tenantId: payload.tenantId,
        });

        // ── Step 3: Audit success ──
        await audit.record("soc.incident.triaged", {
          job_id: payload.job_id,
          tenant_id: payload.tenantId,
          trace_id: payload.traceId,
          module: payload.systemModuleName,
          severity: result.severity_level,
          is_false_positive: result.is_false_positive,
          requires_dpo_notification: result.requires_dpo_breach_notification,
          processed_by: "queue-consumer",
          timestamp: new Date().toISOString(),
        });

        console.log(
          `[soc:queue] ✅ Job ${payload.job_id} completed. Severity: ${result.severity_level}`,
        );

        // ── Metric: successful processing duration ──
        const processingMs = Date.now() - msgStartedAt;
        console.log(JSON.stringify({
          metric: "queue.processing.duration_ms",
          queue: "SOC_TRIAGE_QUEUE",
          outcome: "success",
          value: processingMs,
          tenant_id: payload.tenantId,
          trace_id: payload.traceId,
          job_id: payload.job_id,
          timestamp: new Date().toISOString(),
        }));

        message.ack();
      } catch (error) {
        const isFatal =
          error instanceof TenantMismatchError ||
          (message.attempts ?? 0) >= 3;

        if (isFatal) {
          // ── DLQ: Grave no banco, não tente de novo ──
          const errorMessage =
            error instanceof Error ? error.message : "Unknown fatal error";
          const errorName =
            error instanceof Error ? error.name : "UnknownError";

          console.error(
            `[soc:queue] ☠️ POISONED — Job ${payload.job_id} sent to DLQ after ${message.attempts ?? "?"} attempts. Reason: ${errorName}`,
          );

          await audit.record("soc.dlq.event", {
            job_id: payload.job_id,
            tenant_id: payload.tenantId,
            trace_id: payload.traceId,
            module: payload.systemModuleName,
            error_name: errorName,
            error_message: errorMessage,
            attempts: message.attempts ?? 0,
            is_tenant_mismatch: error instanceof TenantMismatchError,
            status: "poisoned_dlq",
            timestamp: new Date().toISOString(),
          });

          message.ack(); // Acknowledge to stop retries — it's in the DB now.

          // ── Metric: DLQ processing duration ──
          console.log(JSON.stringify({
            metric: "queue.processing.duration_ms",
            queue: "SOC_TRIAGE_QUEUE",
            outcome: "dlq",
            value: Date.now() - msgStartedAt,
            tenant_id: payload.tenantId,
            trace_id: payload.traceId,
            job_id: payload.job_id,
            timestamp: new Date().toISOString(),
          }));
        } else {
          // ── Transient failure: let Cloudflare retry ──
          const errMsg =
            error instanceof Error ? error.message : String(error);
          console.warn(
            `[soc:queue] ⚠️ Job ${payload.job_id} failed (attempt ${message.attempts ?? "?"}). Will retry. Error: ${errMsg}`,
          );

          // ── Metric: retry processing duration ──
          console.log(JSON.stringify({
            metric: "queue.processing.duration_ms",
            queue: "SOC_TRIAGE_QUEUE",
            outcome: "retry",
            value: Date.now() - msgStartedAt,
            tenant_id: payload.tenantId,
            trace_id: payload.traceId,
            job_id: payload.job_id,
            timestamp: new Date().toISOString(),
          }));

          message.retry();
        }
      }
    }
  },
};
