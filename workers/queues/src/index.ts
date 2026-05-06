/**
 * @module standard-queues
 * @description Cloudflare Queues worker for asynchronous job processing.
 * Routes messages from multiple queues to appropriate consumers.
 * Supports: kb-embedding, report-export, document-ingestion.
 */
import { processKbEmbeddingQueueMessage } from "./kb-embedding.consumer";
import { processAgentRunQueueMessage } from "./agent-run.consumer";

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
}

type QueueMessageBody = {
  queue_type?: string;
  [key: string]: unknown;
};

export default {
  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        const body = message.body as QueueMessageBody;
        const queueType = body?.queue_type ?? detectQueueType(batch.queue, body);

        switch (queueType) {
          case "kb_embedding":
            await processKbEmbeddingQueueMessage(message.body, env);
            break;

          case "agent_run":
            await processAgentRunQueueMessage(message.body, env);
            break;

          case "report_export":
            // Phase 5: Will render report to R2
            console.log(`[queues] report_export job received:`, JSON.stringify(body).slice(0, 200));
            break;

          case "document_ingestion":
            // Handled by dedicated ingestion worker via separate queue consumer
            console.log(`[queues] document_ingestion job routed to ingestion worker`);
            break;

          default:
            console.warn(`[queues] Unknown queue_type: ${queueType}`, JSON.stringify(body).slice(0, 200));
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
      queues: ["standard-kb-embedding", "standard-report-export", "standard-agent-run"],
      status: "operational"
    });
  }
};

/**
 * Infers queue type from queue name or message shape when `queue_type` is absent.
 */
function detectQueueType(queueName: string, body: QueueMessageBody): string {
  if (queueName.includes("kb-embedding") || body?.job_type === "kb_embedding") return "kb_embedding";
  if (queueName.includes("report-export") || body?.job_type === "report_export") return "report_export";
  if (queueName.includes("document-ingestion") || body?.job_type === "document_ingestion") return "document_ingestion";
  if (queueName.includes("agent-run") || body?.job_type === "agent_run") return "agent_run";
  return "unknown";
}

