import { createInMemoryKbDependencies } from "@standard/kb";
import { createInMemoryScfCore } from "@standard/scf-core";
import { createInMemorySoaRepositories } from "./repositories/soa.repositories";
import type { SoaDependencies } from "./types";

export const createInMemorySoaDependencies = (overrides: Partial<Omit<SoaDependencies, "repositories">> & {
  repositories?: SoaDependencies["repositories"];
} = {}): SoaDependencies => ({
  repositories: overrides.repositories ?? createInMemorySoaRepositories(),
  scf: overrides.scf ?? createInMemoryScfCore(),
  kb: overrides.kb ?? createInMemoryKbDependencies()
});

