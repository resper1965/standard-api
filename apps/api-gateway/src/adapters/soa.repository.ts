/**
 * @module soa.repository
 * @description Drizzle PostgreSQL repositories for SoA (Statement of Applicability).
 * Uses type-cast inserts since Zod response schemas differ from Drizzle column names.
 */
import { eq, and } from "drizzle-orm";
import { assessmentScope, soaVersions, soaItems } from "@standard/schemas";
import type { ScopeResponse, SoaVersionResponse, SoaItemResponse } from "@standard/schemas";
import type { ScopeRepository, SoaVersionRepository, SoaItemRepository, SoaRepositories } from "@standard/soa";
import type { DbClient } from "./db";

export const createDrizzleScopeRepository = (db: DbClient): ScopeRepository => ({
  async save(scope: ScopeResponse) {
    await db.insert(assessmentScope).values({
      id: scope.scope_id,
      tenantId: scope.tenant_id,
      organizationId: scope.organization_id,
      assessmentId: scope.assessment_id,
      title: scope.title,
      description: scope.description,
      scopeVersion: scope.scope_version,
      status: scope.status,
      scopeSummary: scope.description, // scope_summary maps to description
      businessUnits: scope.business_units,
      processes: scope.processes,
      systems: scope.systems,
      locations: scope.locations,
      legalEntities: scope.legal_entities,
      dataTypes: scope.data_types,
      thirdParties: scope.third_parties,
      exclusions: scope.exclusions,
      assumptions: scope.assumptions,
      constraints: scope.constraints,
      createdBy: scope.created_by,
    }).onConflictDoNothing();
  },
  async update(scope: ScopeResponse) {
    await db.update(assessmentScope).set({
      title: scope.title,
      description: scope.description,
      status: scope.status,
      scopeSummary: scope.description,
      businessUnits: scope.business_units,
      processes: scope.processes,
      systems: scope.systems,
      locations: scope.locations,
      legalEntities: scope.legal_entities,
      dataTypes: scope.data_types,
      thirdParties: scope.third_parties,
      exclusions: scope.exclusions,
      assumptions: scope.assumptions,
      constraints: scope.constraints,
      updatedAt: new Date(),
    }).where(and(eq(assessmentScope.id, scope.scope_id), eq(assessmentScope.tenantId, scope.tenant_id)));
  },
  async get(scopeId, tenantId) {
    const [row] = await db.select().from(assessmentScope)
      .where(and(eq(assessmentScope.id, scopeId), eq(assessmentScope.tenantId, tenantId)))
      .limit(1);
    if (!row) return null;
    return mapScopeRow(row);
  },
  async listByAssessment(assessmentId, tenantId) {
    const rows = await db.select().from(assessmentScope)
      .where(and(eq(assessmentScope.assessmentId, assessmentId), eq(assessmentScope.tenantId, tenantId)));
    return rows.map(mapScopeRow);
  }
});

export const createDrizzleSoaVersionRepository = (db: DbClient): SoaVersionRepository => ({
  async save(version: SoaVersionResponse) {
    await db.insert(soaVersions).values({
      id: version.soa_version_id,
      tenantId: version.tenant_id,
      organizationId: version.organization_id,
      assessmentId: version.assessment_id,
      versionNumber: version.version_number,
      status: version.status,
      sourceFrameworkId: version.source_framework_id,
      scfVersionId: version.scf_version_id,
      sourceScopeId: version.source_scope_id,
      createdByAgentRunId: version.generated_by_agent_run_id, // DB uses createdByAgentRunId
      createdBy: version.created_by,
      traceId: version.trace_id,
      metadata: version.metadata ?? {},
    }).onConflictDoNothing();
  },
  async update(version: SoaVersionResponse) {
    await db.update(soaVersions).set({
      status: version.status,
      submittedForReviewAt: version.submitted_for_review_at ? new Date(version.submitted_for_review_at) : undefined,
      approvedBy: version.approved_by,
      approvedAt: version.approved_at ? new Date(version.approved_at) : undefined,
      approvalEventId: version.approval_event_id,
      supersededBy: version.superseded_by,
      metadata: version.metadata ?? {},
      updatedAt: new Date(),
    }).where(and(eq(soaVersions.id, version.soa_version_id), eq(soaVersions.tenantId, version.tenant_id)));
  },
  async get(soaVersionId, tenantId) {
    const [row] = await db.select().from(soaVersions)
      .where(and(eq(soaVersions.id, soaVersionId), eq(soaVersions.tenantId, tenantId)))
      .limit(1);
    if (!row) return null;
    return mapSoaVersionRow(row);
  },
  async listByAssessment(assessmentId, tenantId) {
    const rows = await db.select().from(soaVersions)
      .where(and(eq(soaVersions.assessmentId, assessmentId), eq(soaVersions.tenantId, tenantId)));
    return rows.map(mapSoaVersionRow);
  }
});

export const createDrizzleSoaItemRepository = (db: DbClient): SoaItemRepository => ({
  async saveMany(items: SoaItemResponse[]) {
    if (items.length === 0) return;
    await db.insert(soaItems).values(items.map(item => ({
      id: item.soa_item_id,
      tenantId: item.tenant_id,
      organizationId: item.organization_id,
      assessmentId: item.assessment_id,
      soaVersionId: item.soa_version_id,
      frameworkId: item.framework_id,
      frameworkRequirementId: item.framework_requirement_id,
      scfVersionId: item.scf_version_id,
      scfControlId: item.scf_control_id,
      scfFrameworkRequirementId: item.framework_requirement_id,
      applicability: item.applicability_status, // DB requires applicability text
      applicabilityStatus: item.applicability_status,
      implementationStatus: item.implementation_status,
      applicabilityRationale: item.applicability_rationale,
      nonApplicabilityRationale: item.non_applicability_rationale,
      scopeRationale: item.scope_rationale,
      evidenceSummary: item.evidence_summary,
      evidenceCoverage: item.evidence_coverage,
      confidenceScore: String(item.confidence_score),
      requiresUserValidation: item.requires_user_validation,
      validationNotes: item.validation_notes,
      sourceMappingId: item.source_mapping_id,
      mappingStatus: item.mapping_status,
      relationshipType: item.relationship_type,
      relationshipStrength: item.relationship_strength,
    }))).onConflictDoNothing();
  },
  async update(item: SoaItemResponse) {
    await db.update(soaItems).set({
      applicabilityStatus: item.applicability_status,
      implementationStatus: item.implementation_status,
      applicabilityRationale: item.applicability_rationale,
      nonApplicabilityRationale: item.non_applicability_rationale,
      scopeRationale: item.scope_rationale,
      evidenceSummary: item.evidence_summary,
      evidenceCoverage: item.evidence_coverage,
      confidenceScore: String(item.confidence_score),
      requiresUserValidation: item.requires_user_validation,
      validationNotes: item.validation_notes,
      updatedAt: new Date(),
    }).where(and(eq(soaItems.id, item.soa_item_id), eq(soaItems.tenantId, item.tenant_id)));
  },
  async get(soaItemId, tenantId) {
    const [row] = await db.select().from(soaItems)
      .where(and(eq(soaItems.id, soaItemId), eq(soaItems.tenantId, tenantId)))
      .limit(1);
    if (!row) return null;
    return mapSoaItemRow(row);
  },
  async listByVersion(soaVersionId, tenantId) {
    const rows = await db.select().from(soaItems)
      .where(and(eq(soaItems.soaVersionId, soaVersionId), eq(soaItems.tenantId, tenantId)));
    return rows.map(mapSoaItemRow);
  }
});

export const createDrizzleSoaRepositories = (db: DbClient): SoaRepositories => ({
  scopes: createDrizzleScopeRepository(db),
  versions: createDrizzleSoaVersionRepository(db),
  items: createDrizzleSoaItemRepository(db),
});

// --- Row mappers (using typeof table.$inferSelect for type safety) ---

type ScopeRow = typeof assessmentScope.$inferSelect;
type SoaVersionRow = typeof soaVersions.$inferSelect;
type SoaItemRow = typeof soaItems.$inferSelect;

const mapScopeRow = (row: ScopeRow): ScopeResponse => ({
  scope_id: row.id,
  tenant_id: row.tenantId,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  title: row.title ?? "",
  description: row.description ?? row.scopeSummary,
  scope_version: row.scopeVersion,
  status: row.status as ScopeResponse["status"],
  business_units: row.businessUnits,
  processes: row.processes,
  systems: row.systems,
  locations: row.locations,
  legal_entities: row.legalEntities,
  data_types: row.dataTypes,
  third_parties: row.thirdParties,
  exclusions: row.exclusions,
  assumptions: row.assumptions,
  constraints: row.constraints,
  created_by: row.createdBy ?? "system",
  approval_event_id: row.approvalEventId ?? undefined,
  created_at: row.createdAt.toISOString(),
  updated_at: row.updatedAt.toISOString(),
  trace_id: "scope-" + row.id,
});

const mapSoaVersionRow = (row: SoaVersionRow): SoaVersionResponse => ({
  soa_version_id: row.id,
  tenant_id: row.tenantId,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  version_number: row.versionNumber,
  status: row.status as SoaVersionResponse["status"],
  source_framework_id: row.sourceFrameworkId ?? "",
  scf_version_id: row.scfVersionId ?? "",
  source_scope_id: row.sourceScopeId ?? undefined,
  generated_by_agent_run_id: row.createdByAgentRunId ?? undefined,
  created_by: row.createdBy ?? "system",
  created_at: row.createdAt.toISOString(),
  submitted_for_review_at: row.submittedForReviewAt?.toISOString(),
  approved_by: row.approvedBy ?? undefined,
  approved_at: row.approvedAt?.toISOString(),
  approval_event_id: row.approvalEventId ?? undefined,
  superseded_by: row.supersededBy ?? undefined,
  trace_id: row.traceId ?? "trace-not-set",
  metadata: row.metadata,
});

const mapSoaItemRow = (row: SoaItemRow): SoaItemResponse => ({
  soa_item_id: row.id,
  tenant_id: row.tenantId,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  soa_version_id: row.soaVersionId,
  framework_id: row.frameworkId ?? "",
  framework_requirement_id: row.frameworkRequirementId ?? "",
  scf_version_id: row.scfVersionId ?? "",
  scf_control_id: row.scfControlId ?? undefined,
  applicability_status: row.applicabilityStatus as SoaItemResponse["applicability_status"],
  implementation_status: row.implementationStatus as SoaItemResponse["implementation_status"],
  applicability_rationale: row.applicabilityRationale ?? undefined,
  non_applicability_rationale: row.nonApplicabilityRationale ?? undefined,
  scope_rationale: row.scopeRationale ?? undefined,
  evidence_summary: row.evidenceSummary ?? undefined,
  evidence_coverage: row.evidenceCoverage as SoaItemResponse["evidence_coverage"],
  confidence_score: Number(row.confidenceScore ?? 0),
  requires_user_validation: row.requiresUserValidation,
  validation_notes: row.validationNotes ?? undefined,
  source_mapping_id: row.sourceMappingId ?? undefined,
  mapping_status: row.mappingStatus as SoaItemResponse["mapping_status"],
  relationship_type: row.relationshipType ?? undefined,
  relationship_strength: row.relationshipStrength ?? undefined,
  created_at: row.createdAt.toISOString(),
  updated_at: row.updatedAt.toISOString(),
});

