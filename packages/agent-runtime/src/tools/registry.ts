/**
 * @module registry
 * @description Central ToolRegistry factory that wires all 8 agent tools.
 * Injects domain dependencies into each tool, producing a ToolRegistry
 * consumable by the AgentExecutor.
 */
import type { ToolRegistry } from "../types";
import { createScfControlLookupTool, type ScfControlLookupDependencies } from "./scf-control-lookup.tool";
import { createScfMappingLookupTool, type ScfMappingLookupDependencies } from "./scf-mapping-lookup.tool";
import { createKbEvidenceSearchTool, type KbEvidenceSearchDependencies } from "./kb-evidence-search.tool";
import { createAssessmentStateReadTool, type AssessmentStateReadDependencies } from "./assessment-state-read.tool";
import { createArtifactVersionReadTool, type ArtifactVersionReadDependencies } from "./artifact-version-read.tool";
import { createArtifactDraftCreateTool, type ArtifactDraftCreateDependencies } from "./artifact-draft-create.tool";
import { createValidationResultWriteTool, type ValidationResultWriteDependencies } from "./validation-result-write.tool";
import { createApprovalEventCreateTool } from "./approval-event-create.tool";

export type ToolRegistryDependencies = {
  scf: ScfControlLookupDependencies;
  scfMappings: ScfMappingLookupDependencies;
  kb: KbEvidenceSearchDependencies;
  assessment: AssessmentStateReadDependencies;
  artifacts: ArtifactVersionReadDependencies;
  drafts: ArtifactDraftCreateDependencies;
  validation: ValidationResultWriteDependencies;
};

/**
 * Creates a complete ToolRegistry with all 8 agent tools wired to domain repos.
 *
 * @example
 * ```ts
 * const registry = createToolRegistry({
 *   scf: { searchControls: scfRepo.searchControls },
 *   scfMappings: { lookupMappings: scfRepo.lookupMappings },
 *   kb: { semanticSearch: kbService.semanticSearch },
 *   assessment: { getAssessmentSnapshot: assessmentRepo.getSnapshot },
 *   artifacts: { getArtifactVersion: artifactRepo.get, listArtifactVersions: artifactRepo.list },
 *   drafts: { createDraft: artifactRepo.createDraft },
 *   validation: { writeValidation: validationRepo.write },
 * });
 * ```
 */
export function createToolRegistry(deps: ToolRegistryDependencies): ToolRegistry {
  return {
    assessment_state_read: createAssessmentStateReadTool(deps.assessment),
    scf_control_lookup: createScfControlLookupTool(deps.scf),
    scf_mapping_lookup: createScfMappingLookupTool(deps.scfMappings),
    kb_evidence_search: createKbEvidenceSearchTool(deps.kb),
    artifact_version_read: createArtifactVersionReadTool(deps.artifacts),
    artifact_draft_create: createArtifactDraftCreateTool(deps.drafts),
    validation_result_write: createValidationResultWriteTool(deps.validation),
    approval_event_create: createApprovalEventCreateTool(),
  };
}
