// @ts-nocheck -- Zod v4 CI type compat
import type { ScfRepository } from "../repositories/scf.repository";
import type { ScfDomain } from "../types";

export class ScfDomainService {
  constructor(private readonly repository: ScfRepository) {}

  listDomains(versionId: string): Promise<ScfDomain[]> {
    return this.repository.listDomains(versionId);
  }
}

