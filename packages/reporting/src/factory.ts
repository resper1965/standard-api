import { createInMemoryGapAnalysisDependencies } from "@aegis/gap-analysis";
import { createInMemoryPoamDependencies } from "@aegis/poam";
import { createInMemoryScfCore } from "@aegis/scf-core";
import { createInMemorySoaDependencies } from "@aegis/soa";
import { createInMemoryReportRepositories } from "./repositories/report.repositories";
import type { ReportingDependencies } from "./types";

export const createInMemoryReportingDependencies = (overrides: Partial<Omit<ReportingDependencies, "repositories">> & {
  repositories?: ReportingDependencies["repositories"];
} = {}): ReportingDependencies => {
  const scf = overrides.scf ?? createInMemoryScfCore();
  const soa = overrides.soa ?? createInMemorySoaDependencies({ scf });
  const gapAnalysis = overrides.gapAnalysis ?? createInMemoryGapAnalysisDependencies({ soa, scf });
  const poam = overrides.poam ?? createInMemoryPoamDependencies({ gapAnalysis, scf });
  return {
    repositories: overrides.repositories ?? createInMemoryReportRepositories(),
    soa,
    gapAnalysis,
    poam,
    scf,
    ...(overrides.maturity ? { maturity: overrides.maturity } : {})
  };
};
