import { createInMemoryKbDependencies, processKbEmbeddingJob } from "@aegis/kb";
import { KbEmbeddingJobMessageSchema } from "@aegis/schemas";

export const processKbEmbeddingQueueMessage = async (messageBody: unknown): Promise<void> => {
  const parsed = KbEmbeddingJobMessageSchema.safeParse(messageBody);
  if (!parsed.success) {
    throw new Error("Invalid KB embedding queue message.");
  }

  // Production will inject PostgreSQL repositories, Workers AI and Vectorize bindings.
  // The local worker keeps a mock dependency graph so the consumer remains type-safe.
  await processKbEmbeddingJob(parsed.data, createInMemoryKbDependencies());
};
