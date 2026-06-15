// @ts-nocheck -- Zod v4 CI type compat
import { createInMemoryScfCore } from "@standard/scf-core";
import { createInMemoryGapAnalysisDependencies } from "@standard/gap-analysis";
import { createInMemoryPoamRepositories } from "./repositories/poam.repositories";
import type { PoamDependencies } from "./types";

export const createInMemoryPoamDependencies = (overrides: Partial<Omit<PoamDependencies, "repositories">> & {
  repositories?: PoamDependencies["repositories"];
} = {}): PoamDependencies => ({
  repositories: overrides.repositories ?? createInMemoryPoamRepositories(),
  gapAnalysis: overrides.gapAnalysis ?? createInMemoryGapAnalysisDependencies(),
  scf: overrides.scf ?? createInMemoryScfCore(),
  ...(overrides.maturity ? { maturity: overrides.maturity } : {})
});


