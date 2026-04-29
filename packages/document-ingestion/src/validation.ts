import { getExtension, sanitizeFilename } from "./filename";
import { sha256Hex } from "./hash";
import type { FileDescriptor, ValidatedUpload } from "./types";

const maxFileSizeBytes = 10 * 1024 * 1024;

const allowedMimeByExtension: Record<string, string[]> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  txt: ["text/plain"],
  md: ["text/markdown", "text/plain"],
  markdown: ["text/markdown", "text/plain"],
  csv: ["text/csv", "text/plain", "application/csv"],
  json: ["application/json", "text/json"]
};

const hasPdfSignature = (bytes: Uint8Array): boolean =>
  bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;

const hasZipSignature = (bytes: Uint8Array): boolean =>
  bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07);

const appearsText = (bytes: Uint8Array): boolean => {
  const sample = bytes.slice(0, Math.min(bytes.length, 512));
  return !sample.some((byte) => byte === 0);
};

export const validateFile = async (file: FileDescriptor): Promise<Omit<ValidatedUpload, "storageKey">> => {
  const normalizedFilename = sanitizeFilename(file.originalFilename);
  const extension = getExtension(normalizedFilename);
  const expectedMimes = allowedMimeByExtension[extension] ?? [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (file.bytes.byteLength > maxFileSizeBytes) {
    errors.push("FILE_TOO_LARGE");
  }

  if (expectedMimes.length === 0) {
    errors.push("UNSUPPORTED_EXTENSION");
  }

  if (!expectedMimes.includes(file.mimeType)) {
    errors.push("UNSUPPORTED_MIME_TYPE");
  }

  if (extension === "pdf" && !hasPdfSignature(file.bytes)) {
    errors.push("INVALID_FILE_SIGNATURE");
  }

  if (extension === "docx" && !hasZipSignature(file.bytes)) {
    errors.push("INVALID_FILE_SIGNATURE");
  }

  if (["txt", "md", "markdown", "csv", "json"].includes(extension) && !appearsText(file.bytes)) {
    errors.push("INVALID_TEXT_FILE");
  }

  if (normalizedFilename !== file.originalFilename.toLowerCase()) {
    warnings.push("FILENAME_NORMALIZED");
  }

  if (errors.length > 0) {
    throw new Error(errors.join(","));
  }

  return {
    normalizedFilename,
    extension,
    mimeType: file.mimeType,
    fileSize: file.bytes.byteLength,
    contentHash: await sha256Hex(file.bytes),
    warnings
  };
};

export const allowedUploadTypes = Object.freeze(Object.keys(allowedMimeByExtension));
export const maxUploadSizeBytes = maxFileSizeBytes;
