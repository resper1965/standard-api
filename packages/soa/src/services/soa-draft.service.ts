import { assertActor, assertContext, SoaWorkflowError } from "../errors";
import type { CreateDraftFromRequirementsInput, SoaDependencies, SoaItemFilters, SoaItemResponse, SoaVersionResponse, SoaWorkflowContext } from "../types";

export class SoaDraftService {
  constructor(private readonly deps: SoaDependencies) {}

  async createDraftFromFramework(assessmentId: string, frameworkId: string, scfVersionId: string, context: SoaWorkflowContext): Promise<SoaVersionResponse> {
    assertContext(context);
    assertActor(context);
    if (assessmentId !== context.assessmentId) throw new SoaWorkflowError("TENANT_CONTEXT_MISMATCH", "Assessment id does not match context.");
    const requirements = await this.deps.scf.frameworks.listRequirements(frameworkId);
    const mappings = await this.deps.scf.mappings.mapFrameworkToScf(frameworkId, scfVersionId);
    return this.createDraftFromRequirements({ assessmentId, frameworkId, scfVersionId, requirements, mappings }, context);
  }

  async createDraftFromRequirements(input: CreateDraftFromRequirementsInput, context: SoaWorkflowContext): Promise<SoaVersionResponse> {
    assertContext(context);
    assertActor(context);
    const now = new Date().toISOString();
    const existing = await this.deps.repositories.versions.listByAssessment(context.assessmentId, context.organizationId);
    const version: SoaVersionResponse = {
      soa_version_id: crypto.randomUUID(),
      organization_id: context.organizationId,
      assessment_id: context.assessmentId,
      version_number: existing.length + 1,
      status: "draft",
      source_framework_id: input.frameworkId,
      scf_version_id: input.scfVersionId,
      ...(input.sourceScopeId ? { source_scope_id: input.sourceScopeId } : {}),
      created_by: context.actorId!,
      created_at: now,
      trace_id: context.traceId,
      metadata: { soa_ingestion_status: "not_required" }
    };

    const items = this.buildItems(version, input, now);
    await this.deps.repositories.versions.save(version);
    await this.deps.repositories.items.saveMany(items);
    return version;
  }

  regenerateDraft(assessmentId: string, options: { frameworkId: string; scfVersionId: string }, context: SoaWorkflowContext): Promise<SoaVersionResponse> {
    return this.createDraftFromFramework(assessmentId, options.frameworkId, options.scfVersionId, context);
  }

  async getSoaVersion(soaVersionId: string, context: SoaWorkflowContext): Promise<SoaVersionResponse> {
    assertContext(context);
    const version = await this.deps.repositories.versions.get(soaVersionId, context.organizationId);
    if (!version || version.assessment_id !== context.assessmentId) throw new SoaWorkflowError("SOA_VERSION_NOT_FOUND", "SoA version not found.");
    return version;
  }

  listSoaVersions(assessmentId: string, context: SoaWorkflowContext): Promise<SoaVersionResponse[]> {
    assertContext(context);
    return this.deps.repositories.versions.listByAssessment(assessmentId, context.organizationId);
  }

  async listSoaItems(soaVersionId: string, filters: SoaItemFilters, context: SoaWorkflowContext): Promise<SoaItemResponse[]> {
    await this.getSoaVersion(soaVersionId, context);
    const items = await this.deps.repositories.items.listByVersion(soaVersionId, context.organizationId);
    return filters.applicability_status ? items.filter((item) => item.applicability_status === filters.applicability_status) : items;
  }

  private buildItems(version: SoaVersionResponse, input: CreateDraftFromRequirementsInput, now: string): SoaItemResponse[] {
    const mappingsByRequirement = new Map<string, typeof input.mappings>();
    for (const mapping of input.mappings.filter((candidate) => candidate.is_official)) {
      const existing = mappingsByRequirement.get(mapping.scf_framework_requirement_id) ?? [];
      mappingsByRequirement.set(mapping.scf_framework_requirement_id, [...existing, mapping]);
    }

    return input.requirements.flatMap((requirement) => {
      const mappings = mappingsByRequirement.get(requirement.id) ?? [];
      if (mappings.length === 0) {
        return [this.createItem(version, requirement.id, now, { mappingStatus: "no_official_mapping" })];
      }
      return mappings.map((mapping) => {
        const itemMapping = {
          mappingStatus: "official_mapping",
          sourceMappingId: mapping.id,
          scfControlId: mapping.scf_control_id,
          relationshipType: mapping.relationship_type,
          ...(mapping.relationship_strength ? { relationshipStrength: mapping.relationship_strength } : {})
        } as const;
        return this.createItem(version, requirement.id, now, itemMapping);
      });
    });
  }

  private createItem(
    version: SoaVersionResponse,
    frameworkRequirementId: string,
    now: string,
    mapping: {
      mappingStatus: "official_mapping" | "no_official_mapping";
      sourceMappingId?: string;
      scfControlId?: string;
      relationshipType?: string;
      relationshipStrength?: string;
    }
  ): SoaItemResponse {
    return {
      soa_item_id: crypto.randomUUID(),
      organization_id: version.organization_id,
      assessment_id: version.assessment_id,
      soa_version_id: version.soa_version_id,
      framework_id: version.source_framework_id,
      framework_requirement_id: frameworkRequirementId,
      scf_version_id: version.scf_version_id,
      ...(mapping.scfControlId ? { scf_control_id: mapping.scfControlId } : {}),
      applicability_status: "requires_validation",
      implementation_status: "not_assessed",
      evidence_coverage: "not_checked",
      confidence_score: 0,
      requires_user_validation: true,
      validation_notes: mapping.mappingStatus === "no_official_mapping" ? "No official SCF mapping is available for this requirement." : "Requires applicability validation.",
      ...(mapping.sourceMappingId ? { source_mapping_id: mapping.sourceMappingId } : {}),
      mapping_status: mapping.mappingStatus,
      ...(mapping.relationshipType ? { relationship_type: mapping.relationshipType } : {}),
      ...(mapping.relationshipStrength ? { relationship_strength: mapping.relationshipStrength } : {}),
      created_at: now,
      updated_at: now
    };
  }
}
