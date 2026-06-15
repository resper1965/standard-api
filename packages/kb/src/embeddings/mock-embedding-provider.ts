// @ts-nocheck -- Zod v4 CI type compat
import { DEFAULT_MOCK_EMBEDDING_DIMENSIONS, DEFAULT_MOCK_EMBEDDING_MODEL } from "../constants";
import type { EmbeddingModelInfo, EmbeddingProvider, EmbeddingResult } from "../types";

const normalize = (vector: number[]): number[] => {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(8)));
};

export class MockEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private readonly model = DEFAULT_MOCK_EMBEDDING_MODEL,
    private readonly dimensions = DEFAULT_MOCK_EMBEDDING_DIMENSIONS
  ) {}

  async embedText(text: string): Promise<EmbeddingResult> {
    const vector = Array.from({ length: this.dimensions }, () => 0);
    const normalizedText = text.toLowerCase();
    for (let index = 0; index < normalizedText.length; index += 1) {
      const bucket = index % this.dimensions;
      vector[bucket] = (vector[bucket] ?? 0) + normalizedText.charCodeAt(index) / 255;
    }

    return {
      vector: normalize(vector),
      model: this.model,
      dimensions: this.dimensions,
      usage: { provider: "mock", input_characters: text.length }
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    return Promise.all(texts.map((text) => this.embedText(text)));
  }

  getModelInfo(): EmbeddingModelInfo {
    return {
      provider: "mock",
      model: this.model,
      dimensions: this.dimensions
    };
  }
}

