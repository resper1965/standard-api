// @ts-nocheck -- Zod v4 CI type compat
import type { ExtractedDocument } from "@standard/schemas";
import type { DocumentTextExtractor } from "./types";

const decodeText = (bytes: Uint8Array): string =>
  new TextDecoder("utf-8").decode(bytes);

export class PlainTextExtractor implements DocumentTextExtractor {
  supports(mimeType: string, extension: string): boolean {
    return mimeType === "text/plain" && extension === "txt";
  }

  async extract(input: { bytes: Uint8Array }): Promise<ExtractedDocument> {
    return {
      text: decodeText(input.bytes),
      metadata: { extractor: "plain_text" },
      warnings: [],
    };
  }
}

export class MarkdownExtractor implements DocumentTextExtractor {
  supports(_mimeType: string, extension: string): boolean {
    return extension === "md" || extension === "markdown";
  }

  async extract(input: { bytes: Uint8Array }): Promise<ExtractedDocument> {
    return {
      text: decodeText(input.bytes),
      metadata: { extractor: "markdown" },
      warnings: [],
    };
  }
}

export class CsvExtractor implements DocumentTextExtractor {
  supports(_mimeType: string, extension: string): boolean {
    return extension === "csv";
  }

  async extract(input: { bytes: Uint8Array }): Promise<ExtractedDocument> {
    return {
      text: decodeText(input.bytes),
      metadata: { extractor: "csv" },
      warnings: [],
    };
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

export class AzurePdfExtractor implements DocumentTextExtractor {
  constructor(
    private readonly apiKey: string,
    private readonly endpoint: string,
  ) {}

  supports(mimeType: string, extension: string): boolean {
    const ext = extension.toLowerCase();
    return (
      ["pdf", "docx", "png", "jpg", "jpeg", "webp"].includes(ext) ||
      mimeType === "application/pdf" ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType.startsWith("image/")
    );
  }

  async extract(input: {
    bytes: Uint8Array;
    mimeType: string;
    filename: string;
  }): Promise<ExtractedDocument> {
    if (!this.apiKey || !this.endpoint) {
      console.warn(
        "Azure endpoints not configured. Using dummy fallback extraction.",
      );
      return {
        text: `Dummy extraction for ${input.filename}. Real PDF content cannot be extracted without an API Key.`,
        metadata: { extractor: "azure_fallback", originalName: input.filename },
        warnings: ["Missing Azure API Key. Used fallback dummy text."],
      };
    }

    try {
      const response = await fetch(
        `${this.endpoint}/documentModels/prebuilt-read:analyze?api-version=2023-07-31`,
        {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": this.apiKey,
            "Content-Type": input.mimeType || "application/pdf",
          },
          body: new Blob([input.bytes as unknown as BlobPart]),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Azure API error: ${response.status} ${response.statusText}`,
        );
      }

      const operationLocation = response.headers.get("Operation-Location");
      if (!operationLocation)
        throw new Error("Missing Operation-Location header from Azure.");

      // Poll for completion
      let parsedText = "";
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const poll = await fetch(operationLocation, {
          headers: { "Ocp-Apim-Subscription-Key": this.apiKey },
        });
        const result = (await poll.json()) as any;
        if (result.status === "succeeded") {
          parsedText = result.analyzeResult?.content || "No content found.";
          break;
        }
        if (result.status === "failed")
          throw new Error("Azure Extraction Failed");
      }

      return {
        text: parsedText,
        metadata: { extractor: "azure_doc_intelligence" },
        warnings: [],
      };
    } catch (e) {
      console.error(e);
      throw new Error(`Failed to extract PDF: ${(e as Error).message}`, {
        cause: e,
      });
    }
  }
}

export class WebhookOcrExtractor implements DocumentTextExtractor {
  constructor(private readonly endpoint: string) {}

  supports(mimeType: string, extension: string): boolean {
    // Supports images, PDFs and Word documents for open-source self-hosted OCR parsing
    return (
      ["pdf", "png", "jpg", "jpeg", "tif", "tiff", "doc", "docx"].includes(
        extension.toLowerCase(),
      ) ||
      mimeType.startsWith("image/") ||
      mimeType === "application/pdf" ||
      mimeType.includes("word")
    );
  }

  async extract(input: {
    bytes: Uint8Array;
    mimeType: string;
    filename: string;
  }): Promise<ExtractedDocument> {
    if (!this.endpoint) {
      throw new Error("Webhook OCR endpoint is not configured.");
    }

    try {
      const formData = new FormData();
      formData.append(
        "files",
        new Blob([input.bytes as any], { type: input.mimeType }),
        input.filename,
      );

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          Accept: "text/markdown, text/plain, application/json",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(
          `Webhook OCR failed: ${response.status} ${response.statusText}`,
        );
      }

      const contentType = response.headers.get("Content-Type") || "";
      let parsedText = "";

      if (contentType.includes("application/json")) {
        const json = (await response.json()) as any;
        // Supports unstructured.io standard schema or fallback custom texts
        parsedText = Array.isArray(json)
          ? json.map((e) => e.text).join("\n\n")
          : json.text || JSON.stringify(json);
      } else {
        parsedText = await response.text();
      }

      return {
        text: parsedText,
        metadata: { extractor: "webhook_ocr" },
        warnings: [],
      };
    } catch (e) {
      console.error(e);
      throw new Error(
        `Failed to extract via Webhook OCR: ${(e as Error).message}`,
        { cause: e },
      );
    }
  }
}

export const getDefaultExtractors = (env?: Record<string, string>) => {
  const defaults = [
    new PlainTextExtractor(),
    new MarkdownExtractor(),
    new CsvExtractor(),
    new JsonExtractor(),
  ];

  if (env?.OPENSOURCE_OCR_ENDPOINT) {
    defaults.push(new WebhookOcrExtractor(env.OPENSOURCE_OCR_ENDPOINT));
  } else if (
    env?.AZURE_DOCUMENT_INTELLIGENCE_KEY &&
    env?.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
  ) {
    defaults.push(
      new AzurePdfExtractor(
        env.AZURE_DOCUMENT_INTELLIGENCE_KEY,
        env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
      ),
    );
  } else {
    // Inject the fallback if no APIs are present
    defaults.push(new AzurePdfExtractor("", ""));
  }

  return defaults;
};

