/**
 * @module standard-queues
 * @description Cloudflare Queues worker for asynchronous job processing.
 * Routes messages from multiple queues to appropriate consumers.
 * Supports: kb-embedding, report-export, document-ingestion.
 */
import { processKbEmbeddingQueueMessage } from "./kb-embedding.consumer";
import { processAgentRunQueueMessage } from "./agent-run.consumer";
import {
  processDataRetentionPurge,
  type RetentionPurgeMessage,
} from "./data-retention.consumer";
import {
  processSocAlert,
  processDlqQueueMessage,
  type SocAlertMessage,
} from "./soc-monitoring.consumer";
import {
  processUserLifecycleMessage,
  type UserLifecycleMessage,
} from "./user-lifecycle.consumer";
import {
  processMcpToolMessage,
  type McpToolQueueMessage,
} from "./mcp-tool.consumer";

export interface Env {
  STANDARD_DOCUMENTS_BUCKET: R2Bucket;
  STANDARD_REPORTS_BUCKET?: R2Bucket;
  STANDARD_EXPORTS_BUCKET?: R2Bucket;
  STANDARD_KB_INDEX: VectorizeIndex;
  DATABASE_URL?: string;
  STANDARD_ENV?: string;
  AI: any;
  OPENAI_API_KEY?: string;
  AI_GATEWAY_BASE_URL?: string;
  AI_GATEWAY_TOKEN?: string;
  SENTRY_DSN?: string;
}

type QueueMessageBody = {
  queue_type?: string;
  [key: string]: unknown;
};

import * as Sentry from "@sentry/cloudflare";

export default Sentry.withSentry(
  (env: Env) => ({
    dsn:
      env.SENTRY_DSN ||
      "https://REDACTED_SENTRY_DSN",
    sendDefaultPii: true,
  }),
  {
    async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
      for (const message of batch.messages) {
        try {
          const body = message.body as QueueMessageBody;
          const queueType =
            body?.queue_type ?? detectQueueType(batch.queue, body);

          switch (queueType) {
            case "kb_embedding":
              await processKbEmbeddingQueueMessage(message.body, env);
              break;

            case "agent_run":
              await processAgentRunQueueMessage(message.body, env);
              break;

            case "mcp_tool_async":
              // ADR-003 Grupo B — async tool execution via queue
              await processMcpToolMessage(
                body as unknown as McpToolQueueMessage,
                env,
              );
              break;

            case "report_export":
              // Phase 5: Will render report to R2
              console.log(
                `[queues] report_export job received:`,
                JSON.stringify(body).slice(0, 200),
              );
              break;

            case "document_ingestion":
              // Handled by dedicated ingestion worker via separate queue consumer
              console.log(
                `[queues] document_ingestion job routed to ingestion worker`,
              );
              break;

            case "soc_triage":
              console.log(
                `[queues] soc_triage job received:`,
                JSON.stringify(body).slice(0, 200),
              );
              // Phase: SOC triage AI processing will be implemented here
              break;

            case "data_retention_purge": {
              // Triggered by scheduled cron (every Sunday 02:00 UTC) or manually by operator.
              // dry_run=true logs what would be deleted without touching data.
              const retentionSummary = await processDataRetentionPurge(
                body as unknown as RetentionPurgeMessage,
                env,
              );
              console.log(
                `[queues] data_retention_purge complete:`,
                JSON.stringify(retentionSummary),
              );
              break;
            }

            case "soc_monitoring_alert":
              // SOC alert: DLQ notifications, tenant mismatch, anomaly detection.
              // Always persists to security_events — never silent.
              await processSocAlert(body as unknown as SocAlertMessage, env);
              break;

            case "user_lifecycle":
              await processUserLifecycleMessage(
                body as unknown as UserLifecycleMessage,
                env,
              );
              break;

            case "dlq_passthrough":
              // Catch-all for messages arriving from dead letter queues without
              // a structured queue_type. Wraps them into a DLQ alert automatically.
              await processDlqQueueMessage(body, batch.queue, env);
              break;

            default:
              console.warn(
                `[queues] Unknown queue_type: ${queueType}`,
                JSON.stringify(body).slice(0, 200),
              );
          }

          message.ack();
        } catch (error) {
          console.error(`[queues] Message processing failed:`, error);
          message.retry();
        }
      }
    },

    async fetch(): Promise<Response> {
      return Response.json({
        service: "standard-queues",
        version: "1.0.0",
        queues: [
          "standard-kb-embedding",
          "standard-report-export",
          "standard-agent-run",
          "standard-soc-triage",
          "standard-user-lifecycle",
        ],
        status: "operational",
      });
    },

    /**
     * Scheduled cron trigger for data retention purge.
     * Configured in wrangler.toml: crons = ["0 2 * * SUN"] (every Sunday 02:00 UTC)
     *
     * To run a dry-run manually via Cloudflare Dashboard:
     *   Workers > standard-queues > Triggers > Crons > Run
     */
    async scheduled(
      controller: ScheduledController,
      env: Env,
      ctx: ExecutionContext,
    ): Promise<void> {
      console.log(
        `[queues] Scheduled cron fired: ${controller.cron} at ${new Date(controller.scheduledTime).toISOString()}`,
      );

      ctx.waitUntil(
        processDataRetentionPurge(
          {
            queue_type: "data_retention_purge",
            dry_run: false,
            scope: "all",
            initiated_by: "cron",
          },
          env,
        )
          .then((summary) => {
            console.log(
              `[queues] Scheduled retention purge complete:`,
              JSON.stringify(summary),
            );
          })
          .catch((err) => {
            console.error(`[queues] Scheduled retention purge failed:`, err);
          }),
      );
    },
  } satisfies ExportedHandler<Env>,
);

/**
 * Infers queue type from queue name or message shape when `queue_type` is absent.
 */
function detectQueueType(queueName: string, body: QueueMessageBody): string {
  if (queueName.includes("kb-embedding") || body?.job_type === "kb_embedding")
    return "kb_embedding";
  if (queueName.includes("report-export") || body?.job_type === "report_export")
    return "report_export";
  if (
    queueName.includes("document-ingestion") ||
    body?.job_type === "document_ingestion"
  )
    return "document_ingestion";
  if (queueName.includes("agent-run") || body?.job_type === "agent_run")
    return "agent_run";
  if (queueName.includes("soc-triage") || body?.job_type === "soc_triage")
    return "soc_triage";
  if (
    queueName.includes("user-lifecycle") ||
    body?.job_type === "user_lifecycle"
  )
    return "user_lifecycle";
  // DLQ queues: any message landing here has exhausted all retries → SOC alert
  if (queueName.includes("dead-letter") || queueName.includes("dlq"))
    return "dlq_passthrough";
  return "unknown";
}
