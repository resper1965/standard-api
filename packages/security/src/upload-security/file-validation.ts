import { getExtension, sanitizeFilename, sha256Hex } from "@aegis/document-ingestion";
import type { FileSecurityPolicy, FileValidationSecurityResult } from "@aegis/schemas";
import { DEFAULT_FILE_SECURITY_POLICY } from "../constants";

export type SecurityFileDescriptor = {
  originalFilename: string;
  mimeType: string;
  bytes: Uint8Array;
};

export class FileSecurityService {
  constructor(private readonly policy: FileSecurityPolicy = DEFAULT_FILE_SECURITY_POLICY) {}

  async validate(file: SecurityFileDescriptor): Promise<FileValidationSecurityResult> {
    const normalized = sanitizeFilename(file.originalFilename);
    const extension = getExtension(normalized);
    const rejectionReasons: string[] = [];
    const warnings: string[] = [];

    if (normalized !== file.originalFilename.toLowerCase().split(/[\\/]/).pop()) warnings.push("FILENAME_NORMALIZED");
    if (file.bytes.byteLength > this.policy.max_file_size_bytes) rejectionReasons.push("FILE_TOO_LARGE");
    if (!this.policy.allowed_extensions.includes(extension)) rejectionReasons.push("UNSUPPORTED_EXTENSION");
    if (!this.policy.allowed_mime_types.includes(file.mimeType)) rejectionReasons.push("UNSUPPORTED_MIME_TYPE");

    return {
      accepted: rejectionReasons.length === 0,
      normalized_filename: normalized,
      content_hash: this.policy.require_content_hash ? await sha256Hex(file.bytes) : undefined,
      rejection_reasons: rejectionReasons,
      warnings,
      quarantine_required: rejectionReasons.length > 0 && this.policy.quarantine_on_rejection
    };
  }
}
