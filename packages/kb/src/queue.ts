import type { KbEmbeddingJobMessage, KbQueueAdapter } from "./types";

export class InMemoryKbQueueAdapter implements KbQueueAdapter {
  readonly messages: KbEmbeddingJobMessage[] = [];

  async enqueue(message: KbEmbeddingJobMessage): Promise<void> {
    this.messages.push(message);
  }
}

