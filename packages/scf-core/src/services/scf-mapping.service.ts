import type { ScfFrameworkCoverageResponse, ScfMappingResponse } from "@standard/schemas";
import type { ScfRepository } from "../repositories/scf.repository";
import type { ScfMapping } from "../types";

export class ScfMappingService {
  constructor(private readonly repository: ScfRepository) {}

  getMappingsForRequirement(frameworkRequirementId: string, scfVersionId: string): Promise<ScfMapping[]> {
    return this.repository.listMappingsByRequirement(frameworkRequirementId, scfVersionId);
  }

  async getMappingsForControl(controlId: string, scfVersionId: string, frameworkId?: string): Promise<ScfMapping[]> {
    const mappings = await this.repository.listMappingsByControl(controlId, scfVersionId);
    return frameworkId ? mappings.filter((mapping) => mapping.scf_framework_id === frameworkId) : mappings;
  }

  mapFrameworkToScf(frameworkId: string, scfVersionId: string): Promise<ScfMapping[]> {
    return this.repository.listMappingsByFramework(frameworkId, scfVersionId);
  }

  async getCoverageSummary(frameworkId: string, scfVersionId: string): Promise<ScfFrameworkCoverageResponse> {
    const requirements = await this.repository.listRequirements(frameworkId);
    const mappings = await this.repository.listMappingsByFramework(frameworkId, scfVersionId);
    const mappedRequirementIds = new Set(mappings.map((mapping) => mapping.scf_framework_requirement_id));
    const controlIds = new Set(mappings.map((mapping) => mapping.scf_control_id));
    return {
      framework_id: frameworkId,
      scf_version_id: scfVersionId,
      requirement_count: requirements.length,
      mapped_requirement_count: mappedRequirementIds.size,
      control_count: controlIds.size,
      official_mapping_count: mappings.filter((mapping) => mapping.is_official).length,
      is_synthetic: mappings.some((mapping) => mapping.is_synthetic)
    };
  }

  async enrichMappings(mappings: ScfMapping[]): Promise<ScfMappingResponse[]> {
    return Promise.all(
      mappings.map(async (mapping) => {
        const control = await this.repository.getControl(mapping.scf_control_id);
        const requirement = await this.repository.getRequirement(mapping.scf_framework_requirement_id);
        return {
          ...mapping,
          ...(control ? { control_code: control.control_code } : {}),
          ...(requirement ? { requirement_code: requirement.requirement_code } : {})
        };
      })
    );
  }
}

