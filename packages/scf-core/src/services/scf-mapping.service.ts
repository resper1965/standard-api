import type {
  ScfFrameworkCoverageResponse,
  ScfMappingResponse,
} from "@standard/schemas";
import type { ScfRepository } from "../repositories/scf.repository";
import type { ScfMapping } from "../types";

export class ScfMappingService {
  constructor(private readonly repository: ScfRepository) {}

  getMappingsForRequirement(
    frameworkRequirementId: string,
    scfVersionId: string,
  ): Promise<ScfMapping[]> {
    return this.repository.listMappingsByRequirement(
      frameworkRequirementId,
      scfVersionId,
    );
  }

  async getMappingsForControl(
    controlId: string,
    scfVersionId: string,
    frameworkId?: string,
  ): Promise<ScfMapping[]> {
    const mappings = await this.repository.listMappingsByControl(
      controlId,
      scfVersionId,
    );
    return frameworkId
      ? mappings.filter((mapping) => mapping.scf_framework_id === frameworkId)
      : mappings;
  }

  mapFrameworkToScf(
    frameworkId: string,
    scfVersionId: string,
  ): Promise<ScfMapping[]> {
    return this.repository.listMappingsByFramework(frameworkId, scfVersionId);
  }

  async getCoverageSummary(
    frameworkId: string,
    scfVersionId: string,
  ): Promise<ScfFrameworkCoverageResponse> {
    const requirements = await this.repository.listRequirements(frameworkId);
    const mappings = await this.repository.listMappingsByFramework(
      frameworkId,
      scfVersionId,
    );
    const mappedRequirementIds = new Set(
      mappings.map((mapping) => mapping.scf_framework_requirement_id),
    );
    const controlIds = new Set(
      mappings.map((mapping) => mapping.scf_control_id),
    );
    return {
      framework_id: frameworkId,
      scf_version_id: scfVersionId,
      requirement_count: requirements.length,
      mapped_requirement_count: mappedRequirementIds.size,
      control_count: controlIds.size,
      official_mapping_count: mappings.filter((mapping) => mapping.is_official)
        .length,
      is_synthetic: mappings.some((mapping) => mapping.is_synthetic),
    };
  }

  async enrichMappings(mappings: ScfMapping[]): Promise<ScfMappingResponse[]> {
    return Promise.all(
      mappings.map(async (mapping) => {
        const control = await this.repository.getControl(
          mapping.scf_control_id,
        );
        const requirement = await this.repository.getRequirement(
          mapping.scf_framework_requirement_id,
        );
        const framework = requirement
          ? await this.repository.getFramework(requirement.scf_framework_id)
          : null;
        return {
          ...mapping,
          ...(control ? { control_code: control.control_code } : {}),
          ...(requirement
            ? { requirement_code: requirement.requirement_code }
            : {}),
          ...(framework
            ? {
                framework_code: framework.framework_code,
                framework_name: framework.framework_name,
              }
            : {}),
        };
      }),
    );
  }

  async compareFrameworks(
    sourceFrameworkId: string,
    targetFrameworkId: string,
    scfVersionId: string,
  ) {
    const sourceMappings = await this.repository.listMappingsByFramework(
      sourceFrameworkId,
      scfVersionId,
    );
    const targetMappings = await this.repository.listMappingsByFramework(
      targetFrameworkId,
      scfVersionId,
    );

    const sourceControlMap = new Map<string, ScfMapping>();
    for (const m of sourceMappings) {
      sourceControlMap.set(m.scf_control_id, m);
    }

    const targetControlMap = new Map<string, ScfMapping>();
    for (const m of targetMappings) {
      targetControlMap.set(m.scf_control_id, m);
    }

    const overlappingControls: any[] = [];
    const gaps: any[] = [];
    let sourceOnlyCount = 0;
    let targetOnlyCount = 0;

    const allControlIds = new Set([
      ...sourceControlMap.keys(),
      ...targetControlMap.keys(),
    ]);

    for (const controlId of allControlIds) {
      const sourceMap = sourceControlMap.get(controlId);
      const targetMap = targetControlMap.get(controlId);
      const control = await this.repository.getControl(controlId);

      if (sourceMap && targetMap) {
        overlappingControls.push({
          control_id: controlId,
          control_code: control?.control_code ?? "",
          control_title: control?.control_title ?? "",
          source_relationship_type: sourceMap.relationship_type,
          target_relationship_type: targetMap.relationship_type,
          relationship_strength: sourceMap.relationship_strength,
        });
      } else if (sourceMap && !targetMap) {
        sourceOnlyCount++;
      } else if (!sourceMap && targetMap) {
        targetOnlyCount++;
        gaps.push({
          control_id: controlId,
          control_code: control?.control_code ?? "",
          control_title: control?.control_title ?? "",
          reason: `Target framework requires control ${control?.control_code} but source framework does not cover it.`,
        });
      }
    }

    const overlapCount = overlappingControls.length;
    const gapCount = gaps.length;
    const similarityIndex =
      allControlIds.size > 0 ? overlapCount / allControlIds.size : 0;

    return {
      source_framework_id: sourceFrameworkId,
      target_framework_id: targetFrameworkId,
      scf_version_id: scfVersionId,
      overlap_count: overlapCount,
      gap_count: gapCount,
      source_only_count: sourceOnlyCount,
      target_only_count: targetOnlyCount,
      similarity_index: similarityIndex,
      overlapping_controls: overlappingControls,
      gaps,
    };
  }
}

