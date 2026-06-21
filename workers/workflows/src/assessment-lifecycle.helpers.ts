/**
 * @module assessment-lifecycle.helpers
 * @description Testable helper functions for the assessment lifecycle workflow entrypoint.
 * Separated from the Cloudflare WorkflowEntrypoint to enable unit testing
 * without `cloudflare:workers` runtime dependency.
 *
 * These functions are imported by both:
 * - assessment-lifecycle.ts (Cloudflare entrypoint, uses cloudflare:workers)
 * - assessment-lifecycle.entrypoint.test.ts (vitest, no cloudflare:workers)
 */
import { AssessmentLifecycleWorkflowInputSchema } from "@standard/schemas";
import type { AssessmentLifecycleWorkflowInput } from "@standard/schemas";
import {
  createInMemoryWorkflowRepository,
  createInMemoryWorkflowAuditAdapter,
  createAssessmentEngineAdapter,
} from "./repositories";
import type { TenantScopedWorkflowDependencies } from "./types";

/**
 * Validates and parses workflow input parameters against the Zod schema.
 * Throws ZodError if validation fails.
 */
export function validateWorkflowParams(input: unknown): AssessmentLifecycleWorkflowInput {
  return AssessmentLifecycleWorkflowInputSchema.parse(input);
}

/**
 * Creates in-memory tenant-scoped workflow dependencies for testing.
 * In production, these would be backed by Drizzle/PostgreSQL adapters.
 */
export function createWorkflowOrchestratorDeps(
  organizationId: string,
): TenantScopedWorkflowDependencies {
  const repo = createInMemoryWorkflowRepository();
  const audit = createInMemoryWorkflowAuditAdapter();
  const engine = createAssessmentEngineAdapter();

  return {
    workflows: repo.withOrganization(organizationId),
    audit,
    assessmentEngine: engine,
  };
}
