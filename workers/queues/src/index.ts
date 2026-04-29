import { processKbEmbeddingQueueMessage } from "./kb-embedding.consumer";

export interface Env {
  AEGIS_DOCUMENTS_BUCKET: R2Bucket;
  AEGIS_REPORTS_BUCKET?: R2Bucket;
  AEGIS_EXPORTS_BUCKET?: R2Bucket;
  AEGIS_KB_INDEX: VectorizeIndex;
}

export default {
  async queue(batch: MessageBatch<unknown>): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processKbEmbeddingQueueMessage(message.body);
        message.ack();
      } catch {
        message.retry();
      }
    }
  },

  async fetch(): Promise<Response> {
    return Response.json({
      service: "aegis-queues",
      message: "Worker reservado para jobs assíncronos do assessment lifecycle."
    });
  }
};
