// ─── Types ──────────────────────────────────────────────────────────
export type {
  PrivacyDependencies,
  PrivacyRepositories,
  PrivacyContext,
  PrivacyActivityFilters,
  PrivacyActivityRepository,
  PrivacyDataSubjectRepository,
  PrivacyDataCategoryRepository,
  PrivacyThirdPartyRepository,
  PrivacyScreeningRepository,
  PrivacyFieldReviewRepository,
  PrivacyScfControlRepository,
} from "./types";

// ─── Errors ─────────────────────────────────────────────────────────
export { PrivacyError } from "./errors";

// ─── Repositories ───────────────────────────────────────────────────
export {
  createInMemoryPrivacyRepositories,
  createInMemoryPrivacyActivityRepository,
  createInMemoryPrivacyDataSubjectRepository,
  createInMemoryPrivacyDataCategoryRepository,
  createInMemoryPrivacyThirdPartyRepository,
  createInMemoryPrivacyScreeningRepository,
  createInMemoryPrivacyFieldReviewRepository,
  createInMemoryPrivacyScfControlRepository,
} from "./repositories/privacy.repositories";

// ─── Services ───────────────────────────────────────────────────────
export { PrivacyCrudService } from "./services/privacy-crud.service";
export { PrivacyCompletenessService } from "./services/privacy-completeness.service";
export { PrivacyStatusService } from "./services/privacy-status.service";
export { PrivacyScreeningService } from "./services/privacy-screening.service";
export { PrivacyAiService } from "./services/privacy-ai.service";
export type { PrivacyExtractionResult } from "./services/privacy-ai.service";
export { PrivacyReportService } from "./services/privacy-report.service";
export type { RopaReport, RopaReportFormat, RopaReportField, RopaFieldOrigin } from "./services/privacy-report.service";
export { PrivacyScfBridge } from "./services/privacy-scf-bridge.service";
export type { PrivacyControlMapping, PrivacyScfAnchor } from "./services/privacy-scf-bridge.service";

// ─── Factory ────────────────────────────────────────────────────────
export { createInMemoryPrivacyDependencies } from "./factory";

// ─── Re-export Zod schemas for route validation ─────────────────────
export {
  CreatePrivacyActivityRequestSchema,
  UpdatePrivacyActivityRequestSchema,
  UpdatePrivacyActivityStatusRequestSchema,
  CreatePrivacyDataSubjectRequestSchema,
  CreatePrivacyDataCategoryRequestSchema,
  CreatePrivacyThirdPartyRequestSchema,
  CreatePrivacyFieldReviewRequestSchema,
  UpdatePrivacyFieldReviewRequestSchema,
} from "@standard/schemas";
