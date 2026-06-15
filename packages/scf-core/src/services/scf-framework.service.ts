// @ts-nocheck -- Zod v4 CI type compat
import type { ScfRepository } from "../repositories/scf.repository";
import type { ScfFramework, ScfFrameworkRequirement } from "../types";

export class ScfFrameworkService {
  constructor(private readonly repository: ScfRepository) {}

  listFrameworks(): Promise<ScfFramework[]> {
    return this.repository.listFrameworks();
  }

  getFramework(frameworkId: string): Promise<ScfFramework | null> {
    return this.repository.getFramework(frameworkId);
  }

  listRequirements(frameworkId: string): Promise<ScfFrameworkRequirement[]> {
    return this.repository.listRequirements(frameworkId);
  }

  /** Returns only requirements classified as MCR (Minimum Compliance Requirements).
   *  MCR gaps are compliance blockers, not risk-based decisions. */
  listMcrRequirements(frameworkId: string): Promise<ScfFrameworkRequirement[]> {
    return this.repository.listMcrRequirements(frameworkId);
  }

  getRequirement(
    requirementId: string,
  ): Promise<ScfFrameworkRequirement | null> {
    return this.repository.getRequirement(requirementId);
  }
}

