import { eq, and, ilike, or, asc, desc, sql, isNotNull, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  scfVersions,
  scfDomains,
  scfControls,
  scfFrameworks,
  scfFrameworkRequirements,
  scfMappings,
  scfStrmRelationships,
  scfImportRuns,
  scfControlMetadata
} from "@standard/schemas";
import type { ScfRepository } from "./scf.repository";
import type { ScfDataset, ScfVersion, ScfDomain, ScfControl, ScfFramework, ScfFrameworkRequirement, ScfMapping, ScfStrmRelationship, ScfImportRun } from "../types";

/** Shape of a Drizzle PG database — keeps this module DB-agnostic */
type Db = PostgresJsDatabase<Record<string, never>>;

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
  is_synthetic: false
});

const mapDomain = (row: typeof scfDomains.$inferSelect): ScfDomain => ({
  id: row.id,
  scf_version_id: row.scfVersionId,
  domain_code: row.domainCode,
  domain_name: row.name,
  description: row.description ?? undefined,
  sort_order: row.sortOrder,
  is_synthetic: row.isSynthetic
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
  is_synthetic: row.isSynthetic
});

const mapFramework = (row: typeof scfFrameworks.$inferSelect): ScfFramework => ({
  id: row.id,
  framework_code: row.frameworkId,
  framework_name: row.name,
  framework_version: row.versionLabel ?? undefined,
  publisher: row.publisher ?? undefined,
  jurisdiction: row.jurisdiction ?? undefined,
  category: row.category ?? undefined,
  source_reference: row.sourceReference ?? undefined,
  status: (row.status ?? "active") as ScfFramework["status"],
  is_synthetic: row.isSynthetic
});

const mapRequirement = (row: typeof scfFrameworkRequirements.$inferSelect): ScfFrameworkRequirement => ({
  id: row.id,
  scf_framework_id: row.scfFrameworkId,
  requirement_code: row.requirementCode,
  requirement_title: row.title,
  requirement_text: row.description ?? row.requirementText ?? undefined,
  parent_requirement_id: row.parentRequirementId ?? undefined,
  sort_order: row.sortOrder,
  status: (row.status ?? "active") as ScfFrameworkRequirement["status"],
  is_synthetic: row.isSynthetic
});

const mapMapping = (row: typeof scfMappings.$inferSelect): ScfMapping => ({
  id: row.id,
  scf_version_id: row.scfVersionId,
  scf_framework_id: "", // resolved at service layer via requirement
  scf_framework_requirement_id: row.scfFrameworkRequirementId,
  scf_control_id: row.scfControlId,
  relationship_type: row.relationshipType as ScfMapping["relationship_type"],
  relationship_strength: row.relationshipStrength ?? undefined,
  mapping_rationale: row.mappingRationale ?? undefined,
  mapping_source: row.mappingSource,
  is_official: row.isOfficial,
  status: (row.status ?? "active") as ScfMapping["status"],
  is_synthetic: row.isSynthetic
});

const mapImportRun = (row: typeof scfImportRuns.$inferSelect): ScfImportRun => ({
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
  trace_id: row.traceId
});

export const createDrizzleScfRepository = (db: Db): ScfRepository => ({
  // ─── Versions ────────────────────────────────────────────
  listVersions: async () => {
    const rows = await db.select().from(scfVersions).orderBy(desc(scfVersions.createdAt));
    return rows.map(mapVersion);
  },

  getVersion: async (id) => {
    const [row] = await db.select().from(scfVersions).where(eq(scfVersions.id, id)).limit(1);
    return row ? mapVersion(row) : null;
  },

  getLatestVersion: async () => {
    // Prefer published versions — an unpublished draft should never be "latest" in the explorer.
    // Fall back to newest by created_at only if no versions have been published yet.
    const [published] = await db.select().from(scfVersions)
      .where(isNotNull(scfVersions.publishedAt))
      .orderBy(desc(scfVersions.publishedAt))
      .limit(1);
    if (published) return mapVersion(published);

    const [fallback] = await db.select().from(scfVersions).orderBy(desc(scfVersions.createdAt)).limit(1);
    return fallback ? mapVersion(fallback) : null;
  },

  findVersionByLabel: async (label) => {
    const [row] = await db.select().from(scfVersions).where(ilike(scfVersions.version, label)).limit(1);
    return row ? mapVersion(row) : null;
  },

  saveVersion: async (version) => {
    await db.insert(scfVersions).values({
      id: version.id,
      version: version.version_label,
      sourceUri: version.source_url,
      contentHash: version.source_hash,
      publishedAt: version.release_date ? new Date(version.release_date) : null
    }).onConflictDoUpdate({
      target: scfVersions.id,
      set: {
        version: version.version_label,
        sourceUri: version.source_url,
        contentHash: version.source_hash,
        updatedAt: new Date()
      }
    });
  },

  // ─── Domains ─────────────────────────────────────────────
  listDomains: async (versionId) => {
    const rows = await db.select().from(scfDomains)
      .where(eq(scfDomains.scfVersionId, versionId))
      .orderBy(asc(scfDomains.sortOrder));
    return rows.map(mapDomain);
  },

  getDomain: async (id) => {
    const [row] = await db.select().from(scfDomains).where(eq(scfDomains.id, id)).limit(1);
    return row ? mapDomain(row) : null;
  },

  // ─── Controls ────────────────────────────────────────────
  listControls: async (versionId) => {
    const rows = await db.select().from(scfControls)
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
      conditions.push(ilike(scfControls.controlCode, `%${query.control_code}%`));
    }

    let dbQuery = db.select({ control: scfControls }).from(scfControls) as any;

    if (query.domain_code) {
      dbQuery = dbQuery.innerJoin(scfDomains, eq(scfControls.scfDomainId, scfDomains.id));
      conditions.push(ilike(scfDomains.domainCode, query.domain_code));
    }

    if (query.q) {
      conditions.push(or(
        ilike(scfControls.controlCode, `%${query.q}%`),
        ilike(scfControls.title, `%${query.q}%`),
        ilike(scfControls.description, `%${query.q}%`)
      ));
    }

    if (query.tags && query.tags.length > 0) {
      dbQuery = dbQuery.innerJoin(scfControlMetadata, eq(scfControls.id, scfControlMetadata.scfControlId));
      conditions.push(sql`${scfControlMetadata.threatTags} @> ${JSON.stringify(query.tags)}::jsonb`);
    }

    const rows = await dbQuery.where(and(...conditions)).orderBy(asc(scfControls.controlCode));
    return rows.map((r: any) => mapControl(r.control));
  },

  getControl: async (id) => {
    const [row] = await db.select().from(scfControls).where(eq(scfControls.id, id)).limit(1);
    return row ? mapControl(row) : null;
  },

  getControlByCode: async (versionId, controlCode) => {
    const [row] = await db.select().from(scfControls)
      .where(and(
        eq(scfControls.scfVersionId, versionId),
        ilike(scfControls.controlCode, controlCode)
      ))
      .limit(1);
    return row ? mapControl(row) : null;
  },

  // ─── Frameworks ──────────────────────────────────────────
  listFrameworks: async () => {
    const rows = await db.select().from(scfFrameworks).orderBy(asc(scfFrameworks.frameworkId));
    return rows.map(mapFramework);
  },

  getFramework: async (id) => {
    const [row] = await db.select().from(scfFrameworks).where(eq(scfFrameworks.id, id)).limit(1);
    return row ? mapFramework(row) : null;
  },

  // ─── Requirements ────────────────────────────────────────
  listRequirements: async (frameworkId) => {
    const rows = await db.select().from(scfFrameworkRequirements)
      .where(eq(scfFrameworkRequirements.scfFrameworkId, frameworkId))
      .orderBy(asc(scfFrameworkRequirements.sortOrder));
    return rows.map(mapRequirement);
  },

  getRequirement: async (id) => {
    const [row] = await db.select().from(scfFrameworkRequirements)
      .where(eq(scfFrameworkRequirements.id, id)).limit(1);
    return row ? mapRequirement(row) : null;
  },

  // ─── Mappings ────────────────────────────────────────────
  listMappingsByRequirement: async (requirementId, versionId) => {
    const rows = await db.select().from(scfMappings)
      .where(and(
        eq(scfMappings.scfFrameworkRequirementId, requirementId),
        eq(scfMappings.scfVersionId, versionId)
      ));
    return rows.map(mapMapping);
  },

  listMappingsByControl: async (controlId, versionId) => {
    const rows = await db.select().from(scfMappings)
      .where(and(
        eq(scfMappings.scfControlId, controlId),
        eq(scfMappings.scfVersionId, versionId)
      ));
    return rows.map(mapMapping);
  },

  listMappingsByFramework: async (frameworkId, versionId) => {
    // Join through requirements to filter by framework
    const reqRows = await db.select({ id: scfFrameworkRequirements.id })
      .from(scfFrameworkRequirements)
      .where(eq(scfFrameworkRequirements.scfFrameworkId, frameworkId));
    
    if (reqRows.length === 0) return [];
    
    const reqIds = reqRows.map(r => r.id);
    const allMappings: ScfMapping[] = [];
    
    // Process in batches to avoid SQL parameter limits
    const BATCH_SIZE = 100;
    for (let i = 0; i < reqIds.length; i += BATCH_SIZE) {
      const batch = reqIds.slice(i, i + BATCH_SIZE);
      const rows = await db.select().from(scfMappings)
        .where(and(
          eq(scfMappings.scfVersionId, versionId),
          inArray(scfMappings.scfFrameworkRequirementId, batch)
        ));
      allMappings.push(...rows.map(mapMapping));
    }
    
    return allMappings;
  },

  // ─── STRM ────────────────────────────────────────────────
  listStrmRelationships: async () => {
    const rows = await db.select().from(scfStrmRelationships);
    return rows.map(row => ({
      id: row.id,
      relationship_type: row.relationshipType as ScfStrmRelationship["relationship_type"],
      label: row.relationshipType,
      description: row.rationale ?? undefined,
      directionality: undefined,
      default_strength_range: row.relationshipStrength
    }));
  },

  // ─── Import Runs ─────────────────────────────────────────
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
      traceId: run.trace_id
    });
    return run;
  },

  saveImportRun: async (run) => {
    await db.update(scfImportRuns)
      .set({
        status: run.status,
        completedAt: run.completed_at ? new Date(run.completed_at) : null,
        errorSummarySafe: run.error_summary_safe,
        importStatistics: run.import_statistics as Record<string, unknown>,
        scfVersionId: run.scf_version_id,
        updatedAt: new Date()
      })
      .where(eq(scfImportRuns.id, run.id));
  },

  listImportRuns: async () => {
    const rows = await db.select().from(scfImportRuns).orderBy(desc(scfImportRuns.startedAt));
    return rows.map(mapImportRun);
  },

  getImportRun: async (id) => {
    const [row] = await db.select().from(scfImportRuns).where(eq(scfImportRuns.id, id)).limit(1);
    return row ? mapImportRun(row) : null;
  },

  getControlCrossMappings: async (versionId, controlCode, frameworkFilter) => {
    const [control] = await db.select()
      .from(scfControls)
      .where(and(
        eq(scfControls.scfVersionId, versionId),
        eq(sql`LOWER(${scfControls.controlCode})`, controlCode.toLowerCase())
      ))
      .limit(1);

    if (!control) return null;

    const rows = await db.select({
      frameworkName: scfFrameworks.name,
      frameworkId: scfFrameworks.frameworkId,
      requirementCode: scfFrameworkRequirements.requirementCode,
      requirementTitle: scfFrameworkRequirements.title,
      requirementDescription: scfFrameworkRequirements.description,
      relationshipType: scfMappings.relationshipType
    })
    .from(scfMappings)
    .innerJoin(scfFrameworkRequirements, eq(scfMappings.scfFrameworkRequirementId, scfFrameworkRequirements.id))
    .innerJoin(scfFrameworks, eq(scfFrameworkRequirements.scfFrameworkId, scfFrameworks.id))
    .where(and(
      eq(scfMappings.scfControlId, control.id),
      eq(scfMappings.scfVersionId, versionId)
    ));

    let mappings = rows.map(r => ({
      framework: r.frameworkName,
      control_id: r.requirementCode,
      control_title: r.requirementTitle,
      control_description: r.requirementDescription ?? "",
      mapping_type: r.relationshipType
    }));

    if (frameworkFilter) {
      const filterLower = frameworkFilter.toLowerCase();
      mappings = mappings.filter((m, index) => {
        const originalRow = rows[index]!;
        return m.framework.toLowerCase().includes(filterLower) ||
          originalRow.frameworkId.toLowerCase().includes(filterLower);
      });
    }

    return {
      scf_control_id: control.controlCode,
      scf_control_title: control.title,
      mappings
    };
  },

  // ─── Dataset Bulk Operation ──────────────────────────────
  replaceDataset: async (dataset) => {
    // Upsert in dependency order: versions → domains → controls → frameworks → requirements → mappings
    for (const v of dataset.versions) {
      await db.insert(scfVersions).values({
        id: v.id,
        version: v.version_label,
        sourceUri: v.source_url,
        contentHash: v.source_hash,
        publishedAt: v.release_date ? new Date(v.release_date) : null
      }).onConflictDoUpdate({
        target: scfVersions.id,
        set: { version: v.version_label, contentHash: v.source_hash, updatedAt: new Date() }
      });
    }

    // Bulk upsert domains
    for (const d of dataset.domains) {
      await db.insert(scfDomains).values({
        id: d.id,
        scfVersionId: d.scf_version_id,
        domainCode: d.domain_code,
        name: d.domain_name,
        description: d.description,
        sortOrder: d.sort_order,
        isSynthetic: d.is_synthetic
      }).onConflictDoUpdate({
        target: scfDomains.id,
        set: { name: d.domain_name, description: d.description, sortOrder: d.sort_order, updatedAt: new Date() }
      });
    }

    // Bulk upsert controls
    for (const c of dataset.controls) {
      await db.insert(scfControls).values({
        id: c.id,
        scfVersionId: c.scf_version_id,
        scfDomainId: c.scf_domain_id,
        controlCode: c.control_code,
        title: c.control_title,
        description: c.control_description,
        controlQuestion: c.control_question,
        controlIntent: c.control_intent,
        implementationGuidance: c.implementation_guidance,
        expectedEvidence: c.expected_evidence,
        controlWeight: c.control_weight?.toString(),
        maturityCriteriaRef: c.maturity_criteria_ref,
        status: c.status,
        isSynthetic: c.is_synthetic
      }).onConflictDoUpdate({
        target: scfControls.id,
        set: {
          title: c.control_title,
          description: c.control_description,
          controlQuestion: c.control_question,
          controlIntent: c.control_intent,
          implementationGuidance: c.implementation_guidance,
          expectedEvidence: c.expected_evidence,
          controlWeight: c.control_weight?.toString(),
          maturityCriteriaRef: c.maturity_criteria_ref,
          status: c.status,
          updatedAt: new Date()
        }
      });
    }

    // Bulk upsert frameworks
    for (const f of dataset.frameworks) {
      await db.insert(scfFrameworks).values({
        id: f.id,
        scfVersionId: dataset.versions[0]?.id ?? "",
        frameworkId: f.framework_code,
        name: f.framework_name,
        versionLabel: f.framework_version,
        publisher: f.publisher,
        jurisdiction: f.jurisdiction,
        category: f.category,
        sourceReference: f.source_reference,
        status: f.status,
        isSynthetic: f.is_synthetic
      }).onConflictDoUpdate({
        target: scfFrameworks.id,
        set: {
          name: f.framework_name,
          versionLabel: f.framework_version,
          publisher: f.publisher,
          status: f.status,
          updatedAt: new Date()
        }
      });
    }

    // Bulk upsert requirements
    for (const r of dataset.requirements) {
      await db.insert(scfFrameworkRequirements).values({
        id: r.id,
        scfVersionId: dataset.versions[0]?.id ?? "",
        scfFrameworkId: r.scf_framework_id,
        requirementCode: r.requirement_code,
        title: r.requirement_title,
        description: r.requirement_text,
        requirementText: r.requirement_text,
        parentRequirementId: r.parent_requirement_id,
        sortOrder: r.sort_order,
        status: r.status,
        isSynthetic: r.is_synthetic
      }).onConflictDoUpdate({
        target: scfFrameworkRequirements.id,
        set: {
          title: r.requirement_title,
          description: r.requirement_text,
          status: r.status,
          updatedAt: new Date()
        }
      });
    }

    // Bulk upsert mappings
    for (const m of dataset.mappings) {
      await db.insert(scfMappings).values({
        id: m.id,
        scfVersionId: m.scf_version_id,
        scfFrameworkRequirementId: m.scf_framework_requirement_id,
        scfControlId: m.scf_control_id,
        relationshipType: m.relationship_type,
        relationshipStrength: m.relationship_strength,
        mappingRationale: m.mapping_rationale,
        mappingSource: m.mapping_source as "official_scf" | "derived" | "consultative",
        isOfficial: m.is_official,
        status: m.status,
        isSynthetic: m.is_synthetic
      }).onConflictDoUpdate({
        target: scfMappings.id,
        set: {
          relationshipType: m.relationship_type,
          relationshipStrength: m.relationship_strength,
          isOfficial: m.is_official,
          status: m.status,
          updatedAt: new Date()
        }
      });
    }

    // Import runs
    for (const ir of dataset.importRuns) {
      await db.insert(scfImportRuns).values({
        id: ir.id,
        scfVersionId: ir.scf_version_id,
        sourceType: ir.source_type,
        sourceFilename: ir.source_filename,
        sourceHash: ir.source_hash,
        status: ir.status,
        startedAt: new Date(ir.started_at),
        completedAt: ir.completed_at ? new Date(ir.completed_at) : null,
        errorSummarySafe: ir.error_summary_safe,
        importStatistics: ir.import_statistics as Record<string, unknown>,
        traceId: ir.trace_id
      }).onConflictDoUpdate({
        target: scfImportRuns.id,
        set: { status: ir.status, updatedAt: new Date() }
      });
    }
  }
});

