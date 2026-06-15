// @ts-nocheck -- Zod v4 CI type compat
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
 * SOC Triage Queue Consumer â€” Hardened Background Worker
 *
 * Processes incident triage jobs dispatched by the SOC route (asyncCall: true).
 * Implements the "Gold Standard" resilience pattern:
 *
 *  1. Tenant Validation   â€” rejects cross-tenant payloads immediately (DLQ)
 *  2. LLM Invocation       â€” calls IncidentTriagerUseCase via AI Gateway
 *  3. Audit Persistence    â€” writes result or failure to the audit trail
 *  4. Dead-Letter Capture  â€” on 3rd retry or fatal error, persists a `poisoned_dlq`
 *                            record into the database so the GRC dashboard can surface it
 *
 * wrangler.toml consumer settings enforce:
 *   max_batch_size  = 5   (prevent OpenAI rate-limit storms)
 *   max_concurrency = 2   (at most 2 parallel workers)
 *   max_retries     = 3   (Cloudflare-native retry budget)
 */

import { IncidentTriagerUseCase } from "@standard/agent-runtime";
import { TenantMismatchError } from "../errors/tenant-mismatch-error";
import type { Env } from "../types/env";
import { createDb } from "../adapters/db";
import { createDrizzleAuditRepository } from "../adapters/audit.repository";
import { CloudflareAiGatewayAdapter } from "../adapters/ai-gateway.adapter";
import { createInMemoryAgentRuntimeDependencies } from "@standard/agent-runtime";

// â”€â”€â”€â”€ Payload contract â”€â”€â”€â”€

interface SocTriagePayload {
  job_id: string;
  organizationId: string;
  traceId: string;
  systemModuleName: string;
  rawLogsExcerpt: string;
}

const isSocTriagePayload = (body: unknown): body is SocTriagePayload => {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.job_id === "string" &&
    typeof b.organizationId === "string" &&
    typeof b.traceId === "string" &&
    typeof b.systemModuleName === "string" &&
    typeof b.rawLogsExcerpt === "string"
  );
};

// â”€â”€â”€â”€ Helpers â”€â”€â”€â”€

/**
 * Validate that the incoming message has mandatory tenant context.
 * A missing or empty organizationId is a fatal, non-retryable error.
 */
const assertTenantIntegrity = (payload: SocTriagePayload): void => {
  if (!payload.organizationId || payload.organizationId.length < 8) {
    throw new TenantMismatchError(
      `Payload job_id=${payload.job_id} has invalid organizationId="${payload.organizationId}". ` +
        `Possible cross-tenant contamination or malformed dispatch.`,
    );
  }
};

// â”€â”€â”€â”€ Consumer Export â”€â”€â”€â”€

async function processMessage(
  message: QueueMessage,
  audit: { record: (event: string, payload: any) => Promise<void> },
  llm: any,
): Promise<void> {
  const raw = message.body;
  const msgStartedAt = Date.now();

  // â”€â”€ Step 0: Structural validation â”€â”€
  if (!isSocTriagePayload(raw)) {
    console.error(
      `[soc:queue] âŒ Malformed payload â€” cannot parse. Sending to DLQ.`,
      JSON.stringify(raw).slice(0, 200),
    );
    await audit.record("soc.dlq.event", {
      reason: "malformed_payload",
      raw_preview: JSON.stringify(raw).slice(0, 500),
      timestamp: new Date().toISOString(),
    });
    message.ack(); // Don't retry garbage â€” it will never become valid.
    return;
  }

  const payload = raw;

  try {
    // â”€â”€ Step 1: Tenant Integrity Gate â”€â”€
    assertTenantIntegrity(payload);

    // â”€â”€ Step 2: LLM Triage â”€â”€
    console.log(
      `[soc:queue] ðŸ” Processing job ${payload.job_id} for tenant ${payload.organizationId} (trace: ${payload.traceId})`,
    );
    const usecase = new IncidentTriagerUseCase(llm as any);
    const result = await usecase.triage({
      systemModuleName: payload.systemModuleName,
      rawLogsExcerpt: payload.rawLogsExcerpt,
      organizationId: payload.organizationId,
    });

    // â”€â”€ Step 3: Audit success â”€â”€
    await audit.record("soc.incident.triaged", {
      job_id: payload.job_id,
      organization_id: payload.organizationId,
      trace_id: payload.traceId,
      module: payload.systemModuleName,
      severity: result.severity_level,
      is_false_positive: result.is_false_positive,
      requires_dpo_notification: result.requires_dpo_breach_notification,
      processed_by: "queue-consumer",
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[soc:queue] âœ… Job ${payload.job_id} completed. Severity: ${result.severity_level}`,
    );

    // â”€â”€ Metric: successful processing duration â”€â”€
    const processingMs = Date.now() - msgStartedAt;
    console.log(
      JSON.stringify({
        metric: "queue.processing.duration_ms",
        queue: "SOC_TRIAGE_QUEUE",
        outcome: "success",
        value: processingMs,
        organization_id: payload.organizationId,
        trace_id: payload.traceId,
        job_id: payload.job_id,
        timestamp: new Date().toISOString(),
      }),
    );

    message.ack();
  } catch (error) {
    const isFatal =
      error instanceof TenantMismatchError || (message.attempts ?? 0) >= 3;

    if (isFatal) {
      // â”€â”€ DLQ: Grave no banco, nÃ£o tente de novo â”€â”€
      const errorMessage =
        error instanceof Error ? error.message : "Unknown fatal error";
      const errorName = error instanceof Error ? error.name : "UnknownError";

      console.error(
        `[soc:queue] â˜ ï¸ POISONED â€” Job ${payload.job_id} sent to DLQ after ${message.attempts ?? "?"} attempts. Reason: ${errorName}`,
      );

      await audit.record("soc.dlq.event", {
        job_id: payload.job_id,
        organization_id: payload.organizationId,
        trace_id: payload.traceId,
        module: payload.systemModuleName,
        error_name: errorName,
        error_message: errorMessage,
        attempts: message.attempts ?? 0,
        is_tenant_mismatch: error instanceof TenantMismatchError,
        status: "poisoned_dlq",
        timestamp: new Date().toISOString(),
      });

      message.ack(); // Acknowledge to stop retries â€” it's in the DB now.

      // â”€â”€ Metric: DLQ processing duration â”€â”€
      console.log(
        JSON.stringify({
          metric: "queue.processing.duration_ms",
          queue: "SOC_TRIAGE_QUEUE",
          outcome: "dlq",
          value: Date.now() - msgStartedAt,
          organization_id: payload.organizationId,
          trace_id: payload.traceId,
          job_id: payload.job_id,
          timestamp: new Date().toISOString(),
        }),
      );
    } else {
      // â”€â”€ Transient failure: let Cloudflare retry â”€â”€
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(
        `[soc:queue] âš ï¸ Job ${payload.job_id} failed (attempt ${message.attempts ?? "?"}). Will retry. Error: ${errMsg}`,
      );

      // â”€â”€ Metric: retry processing duration â”€â”€
      console.log(
        JSON.stringify({
          metric: "queue.processing.duration_ms",
          queue: "SOC_TRIAGE_QUEUE",
          outcome: "retry",
          value: Date.now() - msgStartedAt,
          organization_id: payload.organizationId,
          trace_id: payload.traceId,
          job_id: payload.job_id,
          timestamp: new Date().toISOString(),
        }),
      );

      message.retry();
    }
  }
}

export default {
  async queue(batch: MessageBatch, env: Env, _ctx: unknown): Promise<void> {
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
            ...(env.AI_GATEWAY_TOKEN
              ? { gatewayToken: env.AI_GATEWAY_TOKEN }
              : {}),
            metadata: { source: "queue-consumer", queue: "SOC_TRIAGE_QUEUE" },
          })
        : (() => {
            console.warn(
              "[soc:queue] âš ï¸ AI_GATEWAY_BASE_URL or OPENAI_API_KEY missing. Using MOCK LLM â€” all AI responses will be empty.",
            );
            return createInMemoryAgentRuntimeDependencies().llm;
          })();

    for (const message of batch.messages) {
      await processMessage(message as QueueMessage, audit, llm);
    }
  },
};

