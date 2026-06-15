// @ts-nocheck -- Zod v4 CI type compat
import { createInMemoryMaturityRepositories } from "./repositories/maturity.repositories";
import { createDrizzleMaturityRepositories } from "./repositories/drizzle-maturity.repository";
import type { MaturityDependencies } from "./types";

export const createInMemoryMaturityDependencies = (
  overrides: Partial<MaturityDependencies> = {},
): MaturityDependencies => ({
  repositories: overrides.repositories ?? createInMemoryMaturityRepositories(),
  getApprovedGapAnalysis:
    overrides.getApprovedGapAnalysis ?? (async () => null),
});

/**
 * Creates Drizzle-backed (production) maturity dependencies.
 *
 * @param db - Any Drizzle client (NeonHttpDatabase or PostgresJsDatabase)
 * @param getApprovedGapAnalysis - Resolver for the approved gap analysis version + findings
 */
export const createDrizzleMaturityDependencies = (
  db: any,
  getApprovedGapAnalysis: MaturityDependencies["getApprovedGapAnalysis"],
): MaturityDependencies => ({
  repositories: createDrizzleMaturityRepositories(db),
  getApprovedGapAnalysis,
});

