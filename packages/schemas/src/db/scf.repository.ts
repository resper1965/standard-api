import {
  eq,
  and,
  ilike,
  or,
  asc,
  desc,
  sql,
  isNull,
  isNotNull,
  inArray,
  gte,
} from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { getSparseSelect } from "./utils.js";
import {
  scfVersions,
  scfDomains,
  scfControls,
  scfFrameworks,
  scfFrameworkRequirements,
  scfMappings,
  scfStrmRelationships,
  scfImportRuns,
  scfControlMetadata,
  scfAssessmentObjectives,
  scfEvidenceRequests,
  scfMaturityCriteria,
  scfRisks,
  scfThreats,
  scfRiskControlMappings,
  scfThreatControlMappings,
} from "./schema.js";
import type { ScfRepository } from "@standard/scf-core";
import type {
  ScfDataset,
  ScfVersion,
  ScfDomain,
  ScfControl,
  ScfFramework,
  ScfFrameworkRequirement,
  ScfMapping,
  ScfStrmRelationship,
  ScfImportRun,
  ScfAssessmentObjective,
  ScfEvidenceRequest,
  ScfMaturityCriteria,
  ScfRisk,
  ScfThreat,
} from "@standard/scf-core";

/** Shape of a Drizzle PG database — keeps this module DB-agnostic */
type Db = PgDatabase<any, any, any>;

/** Safely convert a Date or string to ISO string (neon-http returns strings, not Dates) */
const safeIso = (val: Date | string | null | undefined): string | undefined => {
  if (!val) return undefined;
  if (typeof val === "string") return val;
  if (val instanceof Date) return val.toISOString();
  return String(val);
};

const mapVersion = (row: typeof scfVersions.$inferSelect): ScfVersion => ({
  id: row.id,
  version_label: row.version,
  release_date: safeIso(row.publishedAt),
  source_url: row.sourceUri ?? undefined,
  source_hash: row.contentHash ?? "",
  import_status: "succeeded",
  imported_at: safeIso(row.createdAt) ?? new Date().toISOString(),
  is_synthetic: false,
});

const mapDomain = (row: typeof scfDomains.$inferSelect): ScfDomain => ({
  id: row.id,
  scf_version_id: row.scfVersionId,
  domain_code: row.domainCode,
  domain_name: row.name,
  description: row.description ?? undefined,
  sort_order: row.sortOrder,
  is_synthetic: row.isSynthetic,
});

const mapControl = (row: typeof scfControls.$inferSelect): ScfControl => ({
  id: row.id,
  scf_version_id: row.scfVersionId,
  scf_domain_id: row.scfDomainId,
  control_code: row.controlCode,
  control_title: row.title,
  control_description: row.description ?? undefined,
  control_question: row.controlQuestion ?? undefined,
  control_intent: row.controlIntent ?? undefined,
  implementation_guidance: row.implementationGuidance ?? undefined,
  expected_evidence: row.expectedEvidence ?? undefined,
  control_weight: row.controlWeight ? Number(row.controlWeight) : undefined,
  maturity_criteria_ref: row.maturityCriteriaRef ?? undefined,
  status: (row.status ?? "active") as ScfControl["status"],
  is_synthetic: row.isSynthetic,
});

const mapFramework = (
  row: typeof scfFrameworks.$inferSelect,
): ScfFramework => ({
  id: row.id,
  framework_code: row.frameworkId,
  framework_name: row.name,
  framework_version: row.versionLabel ?? undefined,
  publisher: row.publisher ?? undefined,
  jurisdiction: row.jurisdiction ?? undefined,
  category: row.category ?? undefined,
  source_reference: row.sourceReference ?? undefined,
  status: (row.status ?? "active") as ScfFramework["status"],
  is_synthetic: row.isSynthetic,
});

const mapRequirement = (
  row: typeof scfFrameworkRequirements.$inferSelect,
): ScfFrameworkRequirement => ({
  id: row.id,
  scf_framework_id: row.scfFrameworkId,
  requirement_code: row.requirementCode,
  fde_code: row.fdeCode ?? undefined,
  requirement_title: row.title,
  requirement_text: row.description ?? row.requirementText ?? undefined,
  parent_requirement_id: row.parentRequirementId ?? undefined,
  sort_order: row.sortOrder,
  status: (row.status ?? "active") as ScfFrameworkRequirement["status"],
  is_synthetic: row.isSynthetic,
  is_mcr: row.isMcr,
  mcr_rationale: row.mcrRationale ?? undefined,
});

const mapMapping = (
  row: typeof scfMappings.$inferSelect,
  scfFrameworkId: string,
): ScfMapping => ({
  id: row.id,
  scf_version_id: row.scfVersionId,
  // Joined from the mapping's requirement. It used to be hardcoded to "",
  // which silently broke the framework filter in ScfMappingService and told
  // API consumers the mapping belonged to no framework.
  scf_framework_id: scfFrameworkId,
  scf_framework_requirement_id: row.scfFrameworkRequirementId,
  scf_control_id: row.scfControlId,
  relationship_type: row.relationshipType as ScfMapping["relationship_type"],
  // strengthScore (numeric 0â€“1) replaces legacy relationshipStrength (text enum)
  relationship_strength: row.strengthScore?.toString() ?? undefined,
  mapping_rationale: row.mappingRationale ?? undefined,
  mapping_source: row.mappingSource,
  is_official: row.isOfficial,
  status: (row.status ?? "active") as ScfMapping["status"],
  is_synthetic: row.isSynthetic,
});

const mapImportRun = (
  row: typeof scfImportRuns.$inferSelect,
): ScfImportRun => ({
  id: row.id,
  scf_version_id: row.scfVersionId ?? undefined,
  source_type: row.sourceType as ScfImportRun["source_type"],
  source_filename: row.sourceFilename ?? undefined,
  source_hash: row.sourceHash,
  status: row.status as ScfImportRun["status"],
  started_at: safeIso(row.startedAt) ?? new Date().toISOString(),
  completed_at: safeIso(row.completedAt),
  error_summary_safe: row.errorSummarySafe ?? undefined,
  import_statistics: row.importStatistics as ScfImportRun["import_statistics"],
  trace_id: row.traceId,
});

export const createDrizzleScfRepository = (db: Db): ScfRepository => ({
  // â”€â”€â”€ Versions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listVersions: async (organizationId) => {
    // Tenant filter: show global (org IS NULL) + org-specific versions.
    // Unauthenticated: show only global versions.
    const orgFilter = organizationId
      ? or(
          isNull(scfVersions.organizationId),
          eq(scfVersions.organizationId, organizationId),
        )
      : isNull(scfVersions.organizationId);
    const rows = await db
      .select()
      .from(scfVersions)
      .where(orgFilter)
      .orderBy(desc(scfVersions.createdAt));
    return rows.map(mapVersion);
  },

  getVersion: async (id) => {
    const [row] = await db
      .select()
      .from(scfVersions)
      .where(eq(scfVersions.id, id))
      .limit(1);
    return row ? mapVersion(row) : null;
  },

  getLatestVersion: async (organizationId) => {
    // Tenant filter: show global (org IS NULL) + org-specific versions.
    const orgFilter = organizationId
      ? or(
          isNull(scfVersions.organizationId),
          eq(scfVersions.organizationId, organizationId),
        )
      : isNull(scfVersions.organizationId);
    // Prefer published versions â€” an unpublished draft should never be "latest" in the explorer.
    // Fall back to newest by created_at only if no versions have been published yet.
    const [published] = await db
      .select()
      .from(scfVersions)
      .where(and(isNotNull(scfVersions.publishedAt), orgFilter))
      .orderBy(desc(scfVersions.publishedAt))
      .limit(1);
    if (published) return mapVersion(published);

    const [fallback] = await db
      .select()
      .from(scfVersions)
      .where(orgFilter)
      .orderBy(desc(scfVersions.createdAt))
      .limit(1);
    return fallback ? mapVersion(fallback) : null;
  },

  findVersionByLabel: async (label) => {
    const [row] = await db
      .select()
      .from(scfVersions)
      .where(ilike(scfVersions.version, label))
      .limit(1);
    return row ? mapVersion(row) : null;
  },

  saveVersion: async (version) => {
    await db
      .insert(scfVersions)
      .values({
        id: version.id,
        version: version.version_label,
        sourceUri: version.source_url,
        contentHash: version.source_hash,
        publishedAt: version.release_date
          ? new Date(version.release_date)
          : null,
      })
      .onConflictDoUpdate({
        target: scfVersions.id,
        set: {
          version: version.version_label,
          sourceUri: version.source_url,
          contentHash: version.source_hash,
          updatedAt: new Date(),
        },
      });
  },

  // â”€â”€â”€ Domains â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listDomains: async (versionId) => {
    const rows = await db
      .select()
      .from(scfDomains)
      .where(eq(scfDomains.scfVersionId, versionId))
      .orderBy(asc(scfDomains.sortOrder));
    return rows.map(mapDomain);
  },

  getDomain: async (id) => {
    const [row] = await db
      .select()
      .from(scfDomains)
      .where(eq(scfDomains.id, id))
      .limit(1);
    return row ? mapDomain(row) : null;
  },

  // â”€â”€â”€ Controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listControls: async (versionId) => {
    const rows = await db
      .select()
      .from(scfControls)
      .where(eq(scfControls.scfVersionId, versionId))
      .orderBy(asc(scfControls.controlCode));
    return rows.map(mapControl);
  },

  searchControls: async (query) => {
    const conditions = [];
    if (query.scf_version_id) {
      conditions.push(eq(scfControls.scfVersionId, query.scf_version_id));
    }
    if (query.control_code) {
      conditions.push(
        ilike(scfControls.controlCode, `%${query.control_code}%`),
      );
    }

    const selectFields = getSparseSelect(scfControls, query.fields);
    let dbQuery = db.select({ control: selectFields }).from(scfControls) as any;

    if (query.domain_code) {
      dbQuery = dbQuery.innerJoin(
        scfDomains,
        eq(scfControls.scfDomainId, scfDomains.id),
      );
      conditions.push(ilike(scfDomains.domainCode, query.domain_code));
    }

    if (query.q) {
      conditions.push(
        or(
          ilike(scfControls.controlCode, `%${query.q}%`),
          ilike(scfControls.title, `%${query.q}%`),
          ilike(scfControls.description, `%${query.q}%`),
        ),
      );
    }

    if (query.tags && query.tags.length > 0) {
      dbQuery = dbQuery.innerJoin(
        scfControlMetadata,
        eq(scfControls.id, scfControlMetadata.scfControlId),
      );
      conditions.push(
        sql`${scfControlMetadata.threatTags} @> ${JSON.stringify(query.tags)}::jsonb`,
      );
    }

    // â”€â”€ Cursor-based (keyset) pagination â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (query.after) {
      try {
        const decoded = JSON.parse(atob(query.after));
        const cursorCode = decoded.c as string;
        const cursorId = decoded.i as string;
        // Keyset condition: (control_code, id) > (cursor_code, cursor_id)
        conditions.push(
          sql`(${scfControls.controlCode}, ${scfControls.id}) > (${cursorCode}, ${cursorId})`,
        );
      } catch {
        // Invalid cursor â€” ignore and fall through to default behavior
      }
    }

    const fetchLimit = (query.limit ?? 50) + 1; // +1 to detect has_more
    dbQuery = dbQuery.limit(fetchLimit);

    // When using cursor pagination, skip offset-based params
    if (!query.after) {
      if (query.offset) {
        dbQuery = dbQuery.offset(query.offset);
      }
    }

    const rows = await dbQuery
      .where(and(...conditions))
      .orderBy(asc(scfControls.controlCode), asc(scfControls.id));
    return rows.map((r: any) => mapControl(r.control));
  },

  getControl: async (id) => {
    const [row] = await db
      .select()
      .from(scfControls)
      .where(eq(scfControls.id, id))
      .limit(1);
    return row ? mapControl(row) : null;
  },

  getControlByCode: async (versionId, controlCode) => {
    const [row] = await db
      .select()
      .from(scfControls)
      .where(
        and(
          eq(scfControls.scfVersionId, versionId),
          ilike(scfControls.controlCode, controlCode),
        ),
      )
      .limit(1);
    return row ? mapControl(row) : null;
  },

  // â”€â”€â”€ Frameworks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listFrameworks: async () => {
    const rows = await db
      .select()
      .from(scfFrameworks)
      .orderBy(asc(scfFrameworks.frameworkId));
    return rows.map(mapFramework);
  },

  getFramework: async (id) => {
    const [row] = await db
      .select()
      .from(scfFrameworks)
      .where(eq(scfFrameworks.id, id))
      .limit(1);
    return row ? mapFramework(row) : null;
  },

  // â”€â”€â”€ Requirements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listRequirements: async (frameworkId) => {
    const rows = await db
      .select()
      .from(scfFrameworkRequirements)
      .where(eq(scfFrameworkRequirements.scfFrameworkId, frameworkId))
      .orderBy(asc(scfFrameworkRequirements.sortOrder));
    return rows.map(mapRequirement);
  },

  listMcrRequirements: async (frameworkId) => {
    const rows = await db
      .select()
      .from(scfFrameworkRequirements)
      .where(
        and(
          eq(scfFrameworkRequirements.scfFrameworkId, frameworkId),
          eq(scfFrameworkRequirements.isMcr, true),
        ),
      )
      .orderBy(asc(scfFrameworkRequirements.sortOrder));
    return rows.map(mapRequirement);
  },

  getRequirement: async (id) => {
    const [row] = await db
      .select()
      .from(scfFrameworkRequirements)
      .where(eq(scfFrameworkRequirements.id, id))
      .limit(1);
    return row ? mapRequirement(row) : null;
  },

  // â”€â”€â”€ Mappings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listMappingsByRequirement: async (requirementId, versionId) => {
    const rows = await db
      .select({
        mapping: scfMappings,
        frameworkId: scfFrameworkRequirements.scfFrameworkId,
      })
      .from(scfMappings)
      .innerJoin(
        scfFrameworkRequirements,
        eq(scfMappings.scfFrameworkRequirementId, scfFrameworkRequirements.id),
      )
      .where(
        and(
          eq(scfMappings.scfFrameworkRequirementId, requirementId),
          eq(scfMappings.scfVersionId, versionId),
        ),
      );
    return rows.map((r) => mapMapping(r.mapping, r.frameworkId));
  },

  listMappingsByControl: async (controlId, versionId) => {
    const rows = await db
      .select({
        mapping: scfMappings,
        frameworkId: scfFrameworkRequirements.scfFrameworkId,
      })
      .from(scfMappings)
      .innerJoin(
        scfFrameworkRequirements,
        eq(scfMappings.scfFrameworkRequirementId, scfFrameworkRequirements.id),
      )
      .where(
        and(
          eq(scfMappings.scfControlId, controlId),
          eq(scfMappings.scfVersionId, versionId),
        ),
      );
    return rows.map((r) => mapMapping(r.mapping, r.frameworkId));
  },

  /**
   * listMappingsByControlIds â€” bulk fetch scf_mappings for multiple control IDs.
   * Used by dashboard to avoid N+1 queries when computing STRM-weighted compliance (ADR-001).
   *
   * Returns minimal projection needed by buildStrmControlInputs():
   *   scf_control_id, relationship_type, strength_score
   *
   * Processes in batches of 100 to avoid SQL parameter limits.
   */
  listMappingsByControlIds: async (
    controlIds: string[],
    scfVersionId: string,
  ): Promise<
    Array<{
      scf_control_id: string;
      relationship_type: string | null;
      strength_score: number | null;
    }>
  > => {
    if (controlIds.length === 0) return [];

    const result: Array<{
      scf_control_id: string;
      relationship_type: string | null;
      strength_score: number | null;
    }> = [];

    const BATCH_SIZE = 100;
    for (let i = 0; i < controlIds.length; i += BATCH_SIZE) {
      const batch = controlIds.slice(i, i + BATCH_SIZE);
      const rows = await db
        .select({
          scf_control_id: scfMappings.scfControlId,
          relationship_type: scfMappings.relationshipType,
          strength_score: scfMappings.strengthScore,
        })
        .from(scfMappings)
        .where(
          and(
            inArray(scfMappings.scfControlId, batch),
            eq(scfMappings.scfVersionId, scfVersionId),
          ),
        );
      result.push(
        ...rows.map((r) => ({
          scf_control_id: r.scf_control_id,
          relationship_type: r.relationship_type,
          strength_score:
            r.strength_score != null
              ? parseFloat(r.strength_score as unknown as string)
              : null,
        })),
      );
    }

    return result;
  },

  listMappingsByFramework: async (frameworkId, versionId) => {
    // Join through requirements to filter by framework
    const reqRows = await db
      .select({ id: scfFrameworkRequirements.id })
      .from(scfFrameworkRequirements)
      .where(eq(scfFrameworkRequirements.scfFrameworkId, frameworkId));

    if (reqRows.length === 0) return [];

    const reqIds = reqRows.map((r) => r.id);
    const allMappings: ScfMapping[] = [];

    // Process in batches to avoid SQL parameter limits
    const BATCH_SIZE = 100;
    for (let i = 0; i < reqIds.length; i += BATCH_SIZE) {
      const batch = reqIds.slice(i, i + BATCH_SIZE);
      const rows = await db
        .select({
          mapping: scfMappings,
          frameworkId: scfFrameworkRequirements.scfFrameworkId,
        })
        .from(scfMappings)
        .innerJoin(
          scfFrameworkRequirements,
          eq(
            scfMappings.scfFrameworkRequirementId,
            scfFrameworkRequirements.id,
          ),
        )
        .where(
          and(
            eq(scfMappings.scfVersionId, versionId),
            inArray(scfMappings.scfFrameworkRequirementId, batch),
          ),
        );
      allMappings.push(
        ...rows.map((r) => mapMapping(r.mapping, r.frameworkId)),
      );
    }

    return allMappings;
  },

  // â”€â”€â”€ STRM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listStrmRelationships: async () => {
    const rows = await db.select().from(scfStrmRelationships);
    return rows.map((row) => ({
      id: row.id,
      scf_mapping_id: row.scfMappingId ?? undefined,
      scf_control_id: row.scfControlId ?? undefined,
      fde_code: row.fdeCode ?? undefined,
      fde_name: row.fdeName ?? undefined,
      relationship_type: row.relationshipType,
      // strengthScore replaces legacy relationshipStrength
      relationship_strength: row.strengthScore?.toString() ?? undefined,
      rationale: row.rationale ?? undefined,
      source: row.source,
      organization_id: row.organizationId ?? undefined,
    }));
  },

  lookupStrmByFdeCode: async (fdeCode, opts) => {
    const rows = await db
      .select({
        id: scfStrmRelationships.id,
        scfMappingId: scfStrmRelationships.scfMappingId,
        scfControlId: scfStrmRelationships.scfControlId,
        fdeCode: scfStrmRelationships.fdeCode,
        fdeName: scfStrmRelationships.fdeName,
        relationshipType: scfStrmRelationships.relationshipType,
        // strengthScore replaces legacy relationshipStrength
        strengthScore: scfStrmRelationships.strengthScore,
        rationale: scfStrmRelationships.rationale,
        source: scfStrmRelationships.source,
        organizationId: scfStrmRelationships.organizationId,
        // denorm
        controlCode: scfControls.controlCode,
        controlTitle: scfControls.title,
      })
      .from(scfStrmRelationships)
      .leftJoin(
        scfControls,
        eq(scfControls.id, scfStrmRelationships.scfControlId),
      )
      .where(
        and(
          ilike(scfStrmRelationships.fdeCode, fdeCode.trim()),
          ...(opts?.relationshipType
            ? [
                eq(
                  scfStrmRelationships.relationshipType,
                  opts.relationshipType as
                    | "equal"
                    | "subset"
                    | "intersects"
                    | "superset"
                    | "no_relation",
                ),
              ]
            : []),
        ),
      )
      .limit(opts?.limit ?? 100);

    return rows.map((row) => ({
      id: row.id,
      scf_mapping_id: row.scfMappingId ?? undefined,
      scf_control_id: row.scfControlId ?? undefined,
      fde_code: row.fdeCode ?? undefined,
      fde_name: row.fdeName ?? undefined,
      relationship_type: row.relationshipType,
      // strengthScore replaces legacy relationshipStrength
      relationship_strength: row.strengthScore?.toString() ?? undefined,
      rationale: row.rationale ?? undefined,
      source: row.source,
      organization_id: row.organizationId ?? undefined,
      // extras â€” will be picked up by the response shape
      _control_code: row.controlCode ?? undefined,
      _control_title: row.controlTitle ?? undefined,
    })) as ScfStrmRelationship[];
  },

  lookupStrmByControlCode: async (controlCode, opts) => {
    // First resolve control id from code
    const control = await db
      .select({
        id: scfControls.id,
        code: scfControls.controlCode,
        title: scfControls.title,
      })
      .from(scfControls)
      .where(ilike(scfControls.controlCode, controlCode.trim()))
      .limit(1);

    if (!control.length) return [];

    const rows = await db
      .select({
        id: scfStrmRelationships.id,
        scfMappingId: scfStrmRelationships.scfMappingId,
        scfControlId: scfStrmRelationships.scfControlId,
        fdeCode: scfStrmRelationships.fdeCode,
        fdeName: scfStrmRelationships.fdeName,
        relationshipType: scfStrmRelationships.relationshipType,
        // strengthScore replaces legacy relationshipStrength
        strengthScore: scfStrmRelationships.strengthScore,
        rationale: scfStrmRelationships.rationale,
        source: scfStrmRelationships.source,
        organizationId: scfStrmRelationships.organizationId,
      })
      .from(scfStrmRelationships)
      .where(
        and(
          eq(scfStrmRelationships.scfControlId, control[0]!.id),
          ...(opts?.relationshipType
            ? [
                eq(
                  scfStrmRelationships.relationshipType,
                  opts.relationshipType as
                    | "equal"
                    | "subset"
                    | "intersects"
                    | "superset"
                    | "no_relation",
                ),
              ]
            : []),
        ),
      )
      .limit(opts?.limit ?? 100);

    return rows.map((row) => ({
      id: row.id,
      scf_mapping_id: row.scfMappingId ?? undefined,
      scf_control_id: row.scfControlId ?? undefined,
      fde_code: row.fdeCode ?? undefined,
      fde_name: row.fdeName ?? undefined,
      relationship_type: row.relationshipType,
      // strengthScore replaces legacy relationshipStrength
      relationship_strength: row.strengthScore?.toString() ?? undefined,
      rationale: row.rationale ?? undefined,
      source: row.source,
      organization_id: row.organizationId ?? undefined,
    }));
  },

  searchStrm: async (query) => {
    const conditions = [];

    if (query.control_id) {
      conditions.push(eq(scfStrmRelationships.scfControlId, query.control_id));
    }

    if (query.relationship_type) {
      conditions.push(
        eq(
          scfStrmRelationships.relationshipType,
          query.relationship_type as any,
        ),
      );
    }

    if (query.min_confidence_score !== undefined) {
      conditions.push(
        gte(
          scfStrmRelationships.strengthScore,
          query.min_confidence_score.toString(),
        ),
      );
    }

    let dbQuery = db
      .select({
        id: scfStrmRelationships.id,
        scfMappingId: scfStrmRelationships.scfMappingId,
        scfControlId: scfStrmRelationships.scfControlId,
        fdeCode: scfStrmRelationships.fdeCode,
        fdeName: scfStrmRelationships.fdeName,
        relationshipType: scfStrmRelationships.relationshipType,
        strengthScore: scfStrmRelationships.strengthScore,
        rationale: scfStrmRelationships.rationale,
        source: scfStrmRelationships.source,
        organizationId: scfStrmRelationships.organizationId,
      })
      .from(scfStrmRelationships)
      .$dynamic();

    // If we need to filter by framework_id, source_framework_id, or target_framework_id,
    // we need to join scfMappings -> scfFrameworkRequirements
    if (
      query.framework_id ||
      query.source_framework_id ||
      query.scf_version_id
    ) {
      // For now we assume framework_id or source_framework_id filters by the requirement's framework
      // We join scfMappings to get the requirement, then scfFrameworkRequirements to get the frameworkId
      dbQuery = dbQuery
        .leftJoin(
          scfMappings,
          eq(scfMappings.id, scfStrmRelationships.scfMappingId),
        )
        .leftJoin(
          scfFrameworkRequirements,
          eq(
            scfFrameworkRequirements.id,
            scfMappings.scfFrameworkRequirementId,
          ),
        );

      if (query.framework_id) {
        conditions.push(
          eq(scfFrameworkRequirements.scfFrameworkId, query.framework_id),
        );
      }
      if (query.source_framework_id) {
        conditions.push(
          eq(
            scfFrameworkRequirements.scfFrameworkId,
            query.source_framework_id,
          ),
        );
      }
      if (query.scf_version_id) {
        // Optionally filter by SCF version from mappings
        conditions.push(eq(scfMappings.scfVersionId, query.scf_version_id));
      }
    }

    if (conditions.length > 0) {
      dbQuery = dbQuery.where(and(...conditions));
    }

    const rows = await dbQuery
      .limit(query.limit ?? 100)
      .offset(query.offset ?? 0);

    return rows.map((row) => {
      const strm =
        "id" in row && "scfMappingId" in row
          ? row
          : (row as any).scf_strm_relationships;
      return {
        id: strm.id,
        scf_mapping_id: strm.scfMappingId ?? undefined,
        scf_control_id: strm.scfControlId ?? undefined,
        fde_code: strm.fdeCode ?? undefined,
        fde_name: strm.fdeName ?? undefined,
        relationship_type: strm.relationshipType,
        relationship_strength: strm.strengthScore?.toString() ?? undefined,
        rationale: strm.rationale ?? undefined,
        source: strm.source,
        organization_id: strm.organizationId ?? undefined,
      };
    });
  },

  createImportRun: async (run) => {
    await db.insert(scfImportRuns).values({
      id: run.id,
      scfVersionId: run.scf_version_id,
      sourceType: run.source_type,
      sourceFilename: run.source_filename,
      sourceHash: run.source_hash,
      status: run.status,
      startedAt: new Date(run.started_at),
      completedAt: run.completed_at ? new Date(run.completed_at) : null,
      errorSummarySafe: run.error_summary_safe,
      importStatistics: run.import_statistics as Record<string, unknown>,
      traceId: run.trace_id,
    });
    return run;
  },

  saveImportRun: async (run) => {
    await db
      .update(scfImportRuns)
      .set({
        status: run.status,
        completedAt: run.completed_at ? new Date(run.completed_at) : null,
        errorSummarySafe: run.error_summary_safe,
        importStatistics: run.import_statistics as Record<string, unknown>,
        scfVersionId: run.scf_version_id,
        updatedAt: new Date(),
      })
      .where(eq(scfImportRuns.id, run.id));
  },

  listImportRuns: async () => {
    const rows = await db
      .select()
      .from(scfImportRuns)
      .orderBy(desc(scfImportRuns.startedAt));
    return rows.map(mapImportRun);
  },

  getImportRun: async (id) => {
    const [row] = await db
      .select()
      .from(scfImportRuns)
      .where(eq(scfImportRuns.id, id))
      .limit(1);
    return row ? mapImportRun(row) : null;
  },

  getControlCrossMappings: async (versionId, controlCode, frameworkFilter) => {
    const [control] = await db
      .select()
      .from(scfControls)
      .where(
        and(
          eq(scfControls.scfVersionId, versionId),
          eq(sql`LOWER(${scfControls.controlCode})`, controlCode.toLowerCase()),
        ),
      )
      .limit(1);

    if (!control) return null;

    const rows = await db
      .select({
        frameworkName: scfFrameworks.name,
        frameworkId: scfFrameworks.frameworkId,
        requirementCode: scfFrameworkRequirements.requirementCode,
        requirementTitle: scfFrameworkRequirements.title,
        requirementDescription: scfFrameworkRequirements.description,
        relationshipType: scfMappings.relationshipType,
      })
      .from(scfMappings)
      .innerJoin(
        scfFrameworkRequirements,
        eq(scfMappings.scfFrameworkRequirementId, scfFrameworkRequirements.id),
      )
      .innerJoin(
        scfFrameworks,
        eq(scfFrameworkRequirements.scfFrameworkId, scfFrameworks.id),
      )
      .where(
        and(
          eq(scfMappings.scfControlId, control.id),
          eq(scfMappings.scfVersionId, versionId),
        ),
      );

    let mappings = rows.map((r) => ({
      framework: r.frameworkName,
      control_id: r.requirementCode,
      control_title: r.requirementTitle,
      control_description: r.requirementDescription ?? "",
      mapping_type: r.relationshipType,
    }));

    if (frameworkFilter) {
      const filterLower = frameworkFilter.toLowerCase();
      mappings = mappings.filter((m, index) => {
        const originalRow = rows[index]!;
        return (
          m.framework.toLowerCase().includes(filterLower) ||
          originalRow.frameworkId.toLowerCase().includes(filterLower)
        );
      });
    }

    return {
      scf_control_id: control.controlCode,
      scf_control_title: control.title,
      mappings,
    };
  },

  // â”€â”€â”€ Dataset Bulk Operation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  replaceDataset: async (dataset) => {
    // Helper for batch execution to avoid exceeding PostgreSQL parameter limits
    const batchOperation = async <T>(
      items: T[],
      batchSize: number,
      op: (batch: T[]) => Promise<void>,
    ) => {
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await op(batch);
      }
    };

    // Bulk upsert versions
    if (dataset.versions && dataset.versions.length > 0) {
      await batchOperation(dataset.versions, 100, async (batch) => {
        await db
          .insert(scfVersions)
          .values(
            batch.map((v) => ({
              id: v.id,
              version: v.version_label,
              sourceUri: v.source_url,
              contentHash: v.source_hash,
              publishedAt: v.release_date ? new Date(v.release_date) : null,
            })),
          )
          .onConflictDoUpdate({
            target: scfVersions.id,
            set: {
              version: sql`EXCLUDED.version`,
              contentHash: sql`EXCLUDED.content_hash`,
              updatedAt: new Date(),
            },
          });
      });
    }

    // Bulk upsert domains
    if (dataset.domains && dataset.domains.length > 0) {
      await batchOperation(dataset.domains, 100, async (batch) => {
        await db
          .insert(scfDomains)
          .values(
            batch.map((d) => ({
              id: d.id,
              scfVersionId: d.scf_version_id,
              domainCode: d.domain_code,
              name: d.domain_name,
              description: d.description ?? null,
              sortOrder: d.sort_order,
              isSynthetic: d.is_synthetic,
            })),
          )
          .onConflictDoUpdate({
            target: scfDomains.id,
            set: {
              name: sql`EXCLUDED.name`,
              description: sql`EXCLUDED.description`,
              sortOrder: sql`EXCLUDED.sort_order`,
              updatedAt: new Date(),
            },
          });
      });
    }

    // Bulk upsert controls
    if (dataset.controls && dataset.controls.length > 0) {
      await batchOperation(dataset.controls, 250, async (batch) => {
        await db
          .insert(scfControls)
          .values(
            batch.map((c) => ({
              id: c.id,
              scfVersionId: c.scf_version_id,
              scfDomainId: c.scf_domain_id,
              controlCode: c.control_code,
              title: c.control_title,
              description: c.control_description ?? null,
              controlQuestion: c.control_question ?? null,
              controlIntent: c.control_intent ?? null,
              implementationGuidance: c.implementation_guidance ?? null,
              expectedEvidence: c.expected_evidence ?? null,
              controlWeight: c.control_weight?.toString() ?? null,
              maturityCriteriaRef: c.maturity_criteria_ref ?? null,
              status: c.status,
              isSynthetic: c.is_synthetic,
            })),
          )
          .onConflictDoUpdate({
            target: scfControls.id,
            set: {
              title: sql`EXCLUDED.title`,
              description: sql`EXCLUDED.description`,
              controlQuestion: sql`EXCLUDED.control_question`,
              controlIntent: sql`EXCLUDED.control_intent`,
              implementationGuidance: sql`EXCLUDED.implementation_guidance`,
              expectedEvidence: sql`EXCLUDED.expected_evidence`,
              controlWeight: sql`EXCLUDED.control_weight`,
              maturityCriteriaRef: sql`EXCLUDED.maturity_criteria_ref`,
              status: sql`EXCLUDED.status`,
              updatedAt: new Date(),
            },
          });
      });
    }

    // Bulk upsert frameworks
    if (dataset.frameworks && dataset.frameworks.length > 0) {
      await batchOperation(dataset.frameworks, 100, async (batch) => {
        await db
          .insert(scfFrameworks)
          .values(
            batch.map((f) => ({
              id: f.id,
              scfVersionId: dataset.versions[0]?.id ?? "",
              frameworkId: f.framework_code,
              name: f.framework_name,
              versionLabel: f.framework_version ?? null,
              publisher: f.publisher ?? null,
              jurisdiction: f.jurisdiction ?? null,
              category: f.category ?? null,
              sourceReference: f.source_reference ?? null,
              status: f.status,
              isSynthetic: f.is_synthetic,
            })),
          )
          .onConflictDoUpdate({
            target: scfFrameworks.id,
            set: {
              name: sql`EXCLUDED.name`,
              versionLabel: sql`EXCLUDED.version_label`,
              publisher: sql`EXCLUDED.publisher`,
              status: sql`EXCLUDED.status`,
              updatedAt: new Date(),
            },
          });
      });
    }

    // Bulk upsert requirements
    if (dataset.requirements && dataset.requirements.length > 0) {
      await batchOperation(dataset.requirements, 250, async (batch) => {
        await db
          .insert(scfFrameworkRequirements)
          .values(
            batch.map((r) => ({
              id: r.id,
              scfVersionId: dataset.versions[0]?.id ?? "",
              scfFrameworkId: r.scf_framework_id,
              requirementCode: r.requirement_code,
              title: r.requirement_title,
              description: r.requirement_text ?? null,
              requirementText: r.requirement_text ?? null,
              parentRequirementId: r.parent_requirement_id ?? null,
              sortOrder: r.sort_order,
              status: r.status,
              isSynthetic: r.is_synthetic,
            })),
          )
          .onConflictDoUpdate({
            target: scfFrameworkRequirements.id,
            set: {
              title: sql`EXCLUDED.title`,
              description: sql`EXCLUDED.description`,
              status: sql`EXCLUDED.status`,
              updatedAt: new Date(),
            },
          });
      });
    }

    // Bulk upsert mappings
    if (dataset.mappings && dataset.mappings.length > 0) {
      await batchOperation(dataset.mappings, 250, async (batch) => {
        await db
          .insert(scfMappings)
          .values(
            batch.map((m) => ({
              id: m.id,
              scfVersionId: m.scf_version_id,
              scfFrameworkRequirementId: m.scf_framework_requirement_id,
              scfControlId: m.scf_control_id,
              // ADR-001: relationshipType must be a StrmOperator enum value
              relationshipType: m.relationship_type as
                | "equal"
                | "subset"
                | "intersects"
                | "superset"
                | "no_relation",
              // strengthScore replaces legacy relationshipStrength
              strengthScore: m.relationship_strength
                ? m.relationship_strength.toString()
                : null,
              mappingRationale: m.mapping_rationale ?? null,
              mappingSource: m.mapping_source as
                | "official_scf"
                | "derived"
                | "consultative",
              isOfficial: m.is_official,
              status: m.status,
              isSynthetic: m.is_synthetic,
            })),
          )
          .onConflictDoUpdate({
            target: scfMappings.id,
            set: {
              relationshipType: sql`EXCLUDED.relationship_type`,
              strengthScore: sql`EXCLUDED.strength_score`,
              isOfficial: sql`EXCLUDED.is_official`,
              status: sql`EXCLUDED.status`,
              updatedAt: new Date(),
            },
          });
      });
    }

    // Import runs
    if (dataset.importRuns && dataset.importRuns.length > 0) {
      await batchOperation(dataset.importRuns, 100, async (batch) => {
        await db
          .insert(scfImportRuns)
          .values(
            batch.map((ir) => ({
              id: ir.id,
              scfVersionId: ir.scf_version_id ?? null,
              sourceType: ir.source_type,
              sourceFilename: ir.source_filename ?? null,
              sourceHash: ir.source_hash,
              status: ir.status,
              startedAt: new Date(ir.started_at),
              completedAt: ir.completed_at ? new Date(ir.completed_at) : null,
              errorSummarySafe: ir.error_summary_safe ?? null,
              importStatistics: ir.import_statistics as Record<string, unknown>,
              traceId: ir.trace_id,
            })),
          )
          .onConflictDoUpdate({
            target: scfImportRuns.id,
            set: { status: sql`EXCLUDED.status`, updatedAt: new Date() },
          });
      });
    }

    // Bulk insert scf_assessment_objectives
    if (
      dataset.assessmentObjectives &&
      dataset.assessmentObjectives.length > 0
    ) {
      const BATCH_SIZE = 500;
      for (
        let i = 0;
        i < dataset.assessmentObjectives.length;
        i += BATCH_SIZE
      ) {
        const batch = dataset.assessmentObjectives.slice(i, i + BATCH_SIZE);
        await db
          .insert(scfAssessmentObjectives)
          .values(
            batch.map((ao) => ({
              id: ao.id,
              scfVersionId: ao.scf_version_id,
              scfControlId: ao.scf_control_id,
              objectiveCode: ao.objective_code,
              text: ao.text,
            })),
          )
          .onConflictDoUpdate({
            target: [
              scfAssessmentObjectives.scfVersionId,
              scfAssessmentObjectives.objectiveCode,
            ],
            set: {
              text: sql`EXCLUDED.text`,
              updatedAt: new Date(),
            },
          });
      }
    }

    // Bulk insert scf_evidence_requests
    if (dataset.evidenceRequests && dataset.evidenceRequests.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < dataset.evidenceRequests.length; i += BATCH_SIZE) {
        const batch = dataset.evidenceRequests.slice(i, i + BATCH_SIZE);
        await db
          .insert(scfEvidenceRequests)
          .values(
            batch.map((er) => ({
              id: er.id,
              scfVersionId: er.scf_version_id,
              scfControlId: er.scf_control_id,
              requestItem: er.request_item,
              evidenceType: er.evidence_type ?? null,
            })),
          )
          .onConflictDoNothing();
      }
    }

    // Bulk insert scf_maturity_criteria
    if (dataset.maturityCriteria && dataset.maturityCriteria.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < dataset.maturityCriteria.length; i += BATCH_SIZE) {
        const batch = dataset.maturityCriteria.slice(i, i + BATCH_SIZE);
        await db
          .insert(scfMaturityCriteria)
          .values(
            batch.map((mc) => ({
              id: mc.id,
              scfVersionId: mc.scf_version_id,
              scfControlId: mc.scf_control_id,
              level: mc.level,
              criteriaText: mc.criteria_text,
              remediationGuidance: mc.remediation_guidance ?? null,
            })),
          )
          .onConflictDoUpdate({
            target: [
              scfMaturityCriteria.scfControlId,
              scfMaturityCriteria.level,
            ],
            set: {
              criteriaText: sql`EXCLUDED.criteria_text`,
              remediationGuidance: sql`EXCLUDED.remediation_guidance`,
              updatedAt: new Date(),
            },
          });
      }
    }

    // Bulk insert scf_risks
    if (dataset.risks && dataset.risks.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < dataset.risks.length; i += BATCH_SIZE) {
        const batch = dataset.risks.slice(i, i + BATCH_SIZE);
        await db
          .insert(scfRisks)
          .values(
            batch.map((r) => ({
              id: r.id,
              scfVersionId: r.scf_version_id,
              riskCode: r.risk_code,
              title: r.title,
              description: r.description ?? null,
              category: r.category ?? null,
            })),
          )
          .onConflictDoUpdate({
            target: [scfRisks.scfVersionId, scfRisks.riskCode],
            set: {
              title: sql`EXCLUDED.title`,
              description: sql`EXCLUDED.description`,
              category: sql`EXCLUDED.category`,
              updatedAt: new Date(),
            },
          });
      }
    }

    // Bulk insert scf_risk_control_mappings
    if (dataset.riskControlMappings && dataset.riskControlMappings.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < dataset.riskControlMappings.length; i += BATCH_SIZE) {
        const batch = dataset.riskControlMappings.slice(i, i + BATCH_SIZE);
        await db
          .insert(scfRiskControlMappings)
          .values(
            batch.map((m) => ({
              id: m.id,
              scfVersionId: m.scf_version_id,
              scfRiskId: m.scf_risk_id,
              scfControlId: m.scf_control_id,
            })),
          )
          .onConflictDoNothing();
      }
    }

    // Bulk insert scf_threats
    if (dataset.threats && dataset.threats.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < dataset.threats.length; i += BATCH_SIZE) {
        const batch = dataset.threats.slice(i, i + BATCH_SIZE);
        await db
          .insert(scfThreats)
          .values(
            batch.map((t) => ({
              id: t.id,
              scfVersionId: t.scf_version_id,
              threatCode: t.threat_code,
              title: t.title,
              description: t.description ?? null,
              category: t.category ?? null,
            })),
          )
          .onConflictDoUpdate({
            target: [scfThreats.scfVersionId, scfThreats.threatCode],
            set: {
              title: sql`EXCLUDED.title`,
              description: sql`EXCLUDED.description`,
              category: sql`EXCLUDED.category`,
              updatedAt: new Date(),
            },
          });
      }
    }

    // Bulk insert scf_threat_control_mappings
    if (
      dataset.threatControlMappings &&
      dataset.threatControlMappings.length > 0
    ) {
      const BATCH_SIZE = 500;
      for (
        let i = 0;
        i < dataset.threatControlMappings.length;
        i += BATCH_SIZE
      ) {
        const batch = dataset.threatControlMappings.slice(i, i + BATCH_SIZE);
        await db
          .insert(scfThreatControlMappings)
          .values(
            batch.map((m) => ({
              id: m.id,
              scfVersionId: m.scf_version_id,
              scfThreatId: m.scf_threat_id,
              scfControlId: m.scf_control_id,
            })),
          )
          .onConflictDoNothing();
      }
    }
  },

  // â”€â”€ New SCF Meta-Model Entity Methods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async listAssessmentObjectivesForControl(
    controlId: string,
  ): Promise<ScfAssessmentObjective[]> {
    const rows = await db
      .select()
      .from(scfAssessmentObjectives)
      .where(eq(scfAssessmentObjectives.scfControlId, controlId))
      .orderBy(asc(scfAssessmentObjectives.objectiveCode));
    return rows.map((r) => ({
      id: r.id,
      scf_version_id: r.scfVersionId,
      scf_control_id: r.scfControlId,
      objective_code: r.objectiveCode,
      text: r.text,
      pptdf_people: r.pptdfPeople ?? undefined,
      pptdf_process: r.pptdfProcess ?? undefined,
      pptdf_technology: r.pptdfTechnology ?? undefined,
      pptdf_data: r.pptdfData ?? undefined,
      pptdf_facility: r.pptdfFacility ?? undefined,
      // Computed: collapsed array of active dimensions (no DB column)
      pptdf_dimensions: [
        ...(r.pptdfPeople ? (["people"] as const) : []),
        ...(r.pptdfProcess ? (["process"] as const) : []),
        ...(r.pptdfTechnology ? (["technology"] as const) : []),
        ...(r.pptdfData ? (["data"] as const) : []),
        ...(r.pptdfFacility ? (["facility"] as const) : []),
      ],
    }));
  },

  async listEvidenceRequestsForControl(
    controlId: string,
  ): Promise<ScfEvidenceRequest[]> {
    const rows = await db
      .select()
      .from(scfEvidenceRequests)
      .where(eq(scfEvidenceRequests.scfControlId, controlId));
    return rows.map((r) => ({
      id: r.id,
      scf_version_id: r.scfVersionId,
      scf_control_id: r.scfControlId,
      request_item: r.requestItem,
      evidence_type: r.evidenceType ?? undefined,
    }));
  },

  async listMaturityCriteriaForControl(
    controlId: string,
  ): Promise<ScfMaturityCriteria[]> {
    const rows = await db
      .select()
      .from(scfMaturityCriteria)
      .where(eq(scfMaturityCriteria.scfControlId, controlId))
      .orderBy(asc(scfMaturityCriteria.level));
    return rows.map((r) => ({
      id: r.id,
      scf_version_id: r.scfVersionId,
      scf_control_id: r.scfControlId,
      level: r.level,
      criteria_text: r.criteriaText,
      remediation_guidance: r.remediationGuidance ?? undefined,
    }));
  },

  async listRisksForControl(controlId: string): Promise<ScfRisk[]> {
    const mappings = await db
      .select({ riskId: scfRiskControlMappings.scfRiskId })
      .from(scfRiskControlMappings)
      .where(eq(scfRiskControlMappings.scfControlId, controlId));
    const riskIds = mappings.map((m) => m.riskId);
    if (riskIds.length === 0) return [];
    const rows = await db
      .select()
      .from(scfRisks)
      .where(inArray(scfRisks.id, riskIds))
      .orderBy(asc(scfRisks.riskCode));
    return rows.map((r) => ({
      id: r.id,
      scf_version_id: r.scfVersionId,
      risk_code: r.riskCode,
      title: r.title,
      description: r.description ?? undefined,
      category: r.category ?? undefined,
    }));
  },

  async listThreatsForControl(controlId: string): Promise<ScfThreat[]> {
    const mappings = await db
      .select({ threatId: scfThreatControlMappings.scfThreatId })
      .from(scfThreatControlMappings)
      .where(eq(scfThreatControlMappings.scfControlId, controlId));
    const threatIds = mappings.map((m) => m.threatId);
    if (threatIds.length === 0) return [];
    const rows = await db
      .select()
      .from(scfThreats)
      .where(inArray(scfThreats.id, threatIds))
      .orderBy(asc(scfThreats.threatCode));
    return rows.map((r) => ({
      id: r.id,
      scf_version_id: r.scfVersionId,
      threat_code: r.threatCode,
      title: r.title,
      description: r.description ?? undefined,
      category: r.category ?? undefined,
    }));
  },
});
