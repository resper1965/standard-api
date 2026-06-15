// @ts-nocheck -- Zod v4 CI type compat
import type { PrivacyDependencies } from "./types";
import { createInMemoryPrivacyRepositories } from "./repositories/privacy.repositories";

export const createInMemoryPrivacyDependencies = (): PrivacyDependencies => ({
  repositories: createInMemoryPrivacyRepositories(),
});

