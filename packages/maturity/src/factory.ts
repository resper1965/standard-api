import { createInMemoryMaturityRepositories } from "./repositories/maturity.repositories";
import type { MaturityDependencies } from "./types";

export const createInMemoryMaturityDependencies = (
  overrides: Partial<MaturityDependencies> = {}
): MaturityDependencies => ({
  repositories: overrides.repositories ?? createInMemoryMaturityRepositories(),
  getApprovedGapAnalysis: overrides.getApprovedGapAnalysis ?? (async () => null)
});
