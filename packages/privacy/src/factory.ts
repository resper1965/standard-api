import type { PrivacyDependencies } from "./types";
import { createInMemoryPrivacyRepositories } from "./repositories/privacy.repositories";

export const createInMemoryPrivacyDependencies = (): PrivacyDependencies => ({
  repositories: createInMemoryPrivacyRepositories(),
});
