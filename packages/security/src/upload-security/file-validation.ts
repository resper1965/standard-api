import {
  getExtension,
  sanitizeFilename,
  sha256Hex,
} from "@standard/document-ingestion";
import type {
  FileSecurityPolicy,
  FileValidationSecurityResult,
} from "@standard/schemas";
import { DEFAULT_FILE_SECURITY_POLICY } from "../constants";
import type {
  MalwareScanProvider,
  MalwareScanResult,
} from "./malware-scan.placeholder";

export type SecurityFileDescriptor = {
  originalFilename: string;
  mimeType: string;
  bytes: Uint8Array;
};

export class FileSecurityService {
  constructor(
    private readonly policy: FileSecurityPolicy = DEFAULT_FILE_SECURITY_POLICY,
    private readonly malwareScanner?: MalwareScanProvider,
  ) {}

  async validate(
    file: SecurityFileDescriptor,
  ): Promise<
    FileValidationSecurityResult & { malwareScan?: MalwareScanResult }
  > {
    const policy = this.policy as any;
    const normalized = sanitizeFilename(file.originalFilename);
    const extension = getExtension(normalized);
    const rejectionReasons: string[] = [];
    const warnings: string[] = [];

    if (normalized !== file.originalFilename.toLowerCase().split(/[\\/]/).pop())
      warnings.push("FILENAME_NORMALIZED");
    if (file.bytes.byteLength > policy.max_file_size_bytes)
      rejectionReasons.push("FILE_TOO_LARGE");
    if (!policy.allowed_extensions.includes(extension))
      rejectionReasons.push("UNSUPPORTED_EXTENSION");
    if (!policy.allowed_mime_types.includes(file.mimeType))
      rejectionReasons.push("UNSUPPORTED_MIME_TYPE");

    // Run malware scan if provider is configured and basic validation passed
    let malwareScan: MalwareScanResult | undefined;
    if (this.malwareScanner && rejectionReasons.length === 0) {
      malwareScan = await this.malwareScanner.scan({
        filename: normalized,
        mimeType: file.mimeType,
        bytes: file.bytes,
      });
      if (malwareScan.status === "rejected") {
        rejectionReasons.push("MALWARE_DETECTED");
      }
      if (malwareScan.status === "not_configured") {
        warnings.push("MALWARE_SCAN_NOT_CONFIGURED");
      }
      if (malwareScan.status === "scan_error") {
        warnings.push("MALWARE_SCAN_ERROR");
      }
    }

    return {
      accepted: rejectionReasons.length === 0,
      normalized_filename: normalized,
      content_hash: this.policy.require_content_hash
        ? await sha256Hex(file.bytes)
        : undefined,
      rejection_reasons: rejectionReasons,
      warnings,
      quarantine_required:
        rejectionReasons.length > 0 && this.policy.quarantine_on_rejection,
      ...(malwareScan ? { malwareScan } : {}),
    };
  }
}
