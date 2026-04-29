import type { ExtractedDocument } from "@aegis/schemas";
import type { DocumentTextExtractor } from "./types";

const decodeText = (bytes: Uint8Array): string => new TextDecoder("utf-8").decode(bytes);

export class PlainTextExtractor implements DocumentTextExtractor {
  supports(mimeType: string, extension: string): boolean {
    return mimeType === "text/plain" && extension === "txt";
  }

  async extract(input: { bytes: Uint8Array }): Promise<ExtractedDocument> {
    return { text: decodeText(input.bytes), metadata: { extractor: "plain_text" }, warnings: [] };
  }
}

export class MarkdownExtractor implements DocumentTextExtractor {
  supports(_mimeType: string, extension: string): boolean {
    return extension === "md" || extension === "markdown";
  }

  async extract(input: { bytes: Uint8Array }): Promise<ExtractedDocument> {
    return { text: decodeText(input.bytes), metadata: { extractor: "markdown" }, warnings: [] };
  }
}

export class CsvExtractor implements DocumentTextExtractor {
  supports(_mimeType: string, extension: string): boolean {
    return extension === "csv";
  }

  async extract(input: { bytes: Uint8Array }): Promise<ExtractedDocument> {
    return { text: decodeText(input.bytes), metadata: { extractor: "csv" }, warnings: [] };
  }
}

export class JsonExtractor implements DocumentTextExtractor {
  supports(_mimeType: string, extension: string): boolean {
    return extension === "json";
  }

  async extract(input: { bytes: Uint8Array }): Promise<ExtractedDocument> {
    const text = decodeText(input.bytes);
    JSON.parse(text);
    return { text, metadata: { extractor: "json" }, warnings: [] };
  }
}

export class PlaceholderBinaryExtractor implements DocumentTextExtractor {
  supports(_mimeType: string, extension: string): boolean {
    return extension === "pdf" || extension === "docx";
  }

  async extract(input: { extension: string }): Promise<ExtractedDocument> {
    throw new Error(`${input.extension.toUpperCase()} extraction requires an external extractor adapter.`);
  }
}

export const defaultExtractors = [
  new PlainTextExtractor(),
  new MarkdownExtractor(),
  new CsvExtractor(),
  new JsonExtractor(),
  new PlaceholderBinaryExtractor()
];
