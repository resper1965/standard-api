import { createInMemoryKbDependencies } from "@standard/kb";
import { createInMemorySoaDependencies } from "@standard/soa";
import { createInMemoryGapAnalysisRepositories } from "./repositories/gap-analysis.repositories";
import type { GapAnalysisDependencies } from "./types";

export const createInMemoryGapAnalysisDependencies = (overrides: Partial<Omit<GapAnalysisDependencies, "repositories">> & {
  repositories?: GapAnalysisDependencies["repositories"];
} = {}): GapAnalysisDependencies => {
  const kb = overrides.kb ?? createInMemoryKbDependencies();
  const soa = overrides.soa ?? createInMemorySoaDependencies({ kb });
  return {
    repositories: overrides.repositories ?? createInMemoryGapAnalysisRepositories(),
    soa,
    kb,
    ...(overrides.scf ? { scf: overrides.scf } : {})
  };
};


