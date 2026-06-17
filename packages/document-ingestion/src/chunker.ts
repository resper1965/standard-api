import type { ChunkingConfig, ExtractedDocument } from "@standard/schemas";
import { sha256Hex } from "./hash";
import type { DocumentChunk } from "./types";

const normalizeWhitespace = (text: string): string => text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();

const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

const splitByTokenEstimate = (text: string, maxTokens: number): string[] => {
  const paragraphs = normalizeWhitespace(text).split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs.length > 0 ? paragraphs : [normalizeWhitespace(text)]) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (estimateTokens(candidate) <= maxTokens) {
      current = candidate;
      continue;
    }

    if (current) chunks.push(current);
    if (estimateTokens(paragraph) <= maxTokens) {
      current = paragraph;
      continue;
    }

    const words = paragraph.split(/\s+/);
    let wordChunk = "";
    for (const word of words) {
      const candidateWordChunk = wordChunk ? `${wordChunk} ${word}` : word;
      if (estimateTokens(candidateWordChunk) > maxTokens && wordChunk) {
        chunks.push(wordChunk);
        wordChunk = word;
      } else {
        wordChunk = candidateWordChunk;
      }
    }
    current = wordChunk;
  }

  if (current) chunks.push(current);
  return chunks.filter((chunk) => chunk.trim().length > 0);
};

export const chunkExtractedDocument = async (input: {
  extracted: ExtractedDocument;
  config: ChunkingConfig;
  organizationId: string;
  assessmentId: string;
  documentId: string;
  now: string;
  idFactory: () => string;
}): Promise<DocumentChunk[]> => {
  const textParts =
    input.config.strategy === "by_pages" && input.extracted.pages?.length
      ? input.extracted.pages.map((page) => ({ text: page.text, pageNumber: page.page_number }))
      : [{ text: input.extracted.text, pageNumber: undefined }];

  const chunks: DocumentChunk[] = [];
  for (const part of textParts) {
    const partChunks = splitByTokenEstimate(part.text, input.config.max_tokens_estimate);
    for (const chunkText of partChunks) {
      const normalized = normalizeWhitespace(chunkText);
      if (!normalized) continue;
      chunks.push({
        chunk_id: input.idFactory(),
        organization_id: input.organizationId,
        assessment_id: input.assessmentId,
        document_id: input.documentId,
        chunk_index: chunks.length,
        chunk_text: normalized,
        text_hash: await sha256Hex(normalized),
        token_count_estimate: estimateTokens(normalized),
        ...(part.pageNumber ? { page_number: part.pageNumber } : {}),
        location_metadata: { strategy: input.config.strategy },
        created_at: input.now
      });
    }
  }

  return chunks;
};


