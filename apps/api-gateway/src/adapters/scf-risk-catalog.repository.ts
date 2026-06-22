/**
 * @module adapters/scf-risk-catalog.repository
 * @description Drizzle repository for the SCF Risk & Threat normative catalogs.
 *
 * These tables (scf_risks, scf_threats) are read-only normative references.
 * No organization_id scope — shared across all tenants.
 *
 * Extracted from risk-catalog.routes.ts to enforce the rule:
 * "no Drizzle queries inside route handlers" (AGENTS.md §5).
 */
import { and, eq, inArray } from "drizzle-orm";
import {
  scfRisks,
  scfRiskControlMappings,
  scfThreats,
  scfThreatControlMappings,
} from "@standard/schemas";

type DrizzleDbClient = {
  select(): any;
  insert(table: any): any;
  update(table: any): any;
  delete(table: any): any;
};

// --- Row types ---

type ScfRiskRow = typeof scfRisks.$inferSelect;
type ScfThreatRow = typeof scfThreats.$inferSelect;
type ScfRiskMappingRow = typeof scfRiskControlMappings.$inferSelect;
type ScfThreatMappingRow = typeof scfThreatControlMappings.$inferSelect;

// --- Response shapes (local — not worth a schema type for catalog reads) ---

export type ScfRiskCatalogEntry = {
  id: string;
  scf_version_id: string;
  risk_code: string;
  title: string;
  description: string | null;
  category: string | null;
  mitigating_control_ids: string[];
  created_at: string;
  updated_at: string;
};

export type ScfThreatCatalogEntry = {
  id: string;
  scf_version_id: string;
  threat_code: string;
  title: string;
  description: string | null;
  category: string | null;
  mitigating_control_ids: string[];
  created_at: string;
  updated_at: string;
};

// --- Mappers ---

const mapRiskRow = (
  row: ScfRiskRow,
  controlIds: string[],
): ScfRiskCatalogEntry => ({
  id: row.id,
  scf_version_id: row.scfVersionId,
  risk_code: row.riskCode,
  title: row.title,
  description: row.description ?? null,
  category: row.category ?? null,
  mitigating_control_ids: controlIds,
  created_at: row.createdAt?.toISOString?.() ?? String(row.createdAt),
  updated_at: row.updatedAt?.toISOString?.() ?? String(row.updatedAt),
});

const mapThreatRow = (
  row: ScfThreatRow,
  controlIds: string[],
): ScfThreatCatalogEntry => ({
  id: row.id,
  scf_version_id: row.scfVersionId,
  threat_code: row.threatCode,
  title: row.title,
  description: row.description ?? null,
  category: row.category ?? null,
  mitigating_control_ids: controlIds,
  created_at: row.createdAt?.toISOString?.() ?? String(row.createdAt),
  updated_at: row.updatedAt?.toISOString?.() ?? String(row.updatedAt),
});

// --- Repository ---

export type ScfRiskCatalogRepository = {
  listRisks(filters: {
    scfVersionId?: string;
    category?: string;
  }): Promise<ScfRiskCatalogEntry[]>;
  getRisk(riskId: string): Promise<ScfRiskCatalogEntry | null>;
  listThreats(filters: {
    scfVersionId?: string;
    category?: string;
  }): Promise<ScfThreatCatalogEntry[]>;
  getThreat(threatId: string): Promise<ScfThreatCatalogEntry | null>;
};

export const createDrizzleScfRiskCatalogRepository = (
  db: DrizzleDbClient,
): ScfRiskCatalogRepository => ({
  async listRisks({ scfVersionId, category }) {
    const filters = [];
    if (scfVersionId) filters.push(eq(scfRisks.scfVersionId, scfVersionId));
    if (category) filters.push(eq(scfRisks.category, category));

    const rows: ScfRiskRow[] =
      filters.length > 0
        ? await db
            .select()
            .from(scfRisks)
            .where(and(...filters))
        : await db.select().from(scfRisks);

    if (rows.length === 0) return [];

    const riskIds = rows.map((r) => r.id);
    const mappings: ScfRiskMappingRow[] = await db
      .select()
      .from(scfRiskControlMappings)
      .where(inArray(scfRiskControlMappings.scfRiskId, riskIds));

    const controlMap = new Map<string, string[]>();
    for (const m of mappings) {
      const list = controlMap.get(m.scfRiskId) ?? [];
      list.push(m.scfControlId);
      controlMap.set(m.scfRiskId, list);
    }

    return rows.map((r) => mapRiskRow(r, controlMap.get(r.id) ?? []));
  },

  async getRisk(riskId) {
    const [risk] = await db
      .select()
      .from(scfRisks)
      .where(eq(scfRisks.id, riskId))
      .limit(1);
    if (!risk) return null;

    const mappings: ScfRiskMappingRow[] = await db
      .select()
      .from(scfRiskControlMappings)
      .where(eq(scfRiskControlMappings.scfRiskId, riskId));

    return mapRiskRow(
      risk,
      mappings.map((m) => m.scfControlId),
    );
  },

  async listThreats({ scfVersionId, category }) {
    const filters = [];
    if (scfVersionId) filters.push(eq(scfThreats.scfVersionId, scfVersionId));
    if (category) filters.push(eq(scfThreats.category, category));

    const rows: ScfThreatRow[] =
      filters.length > 0
        ? await db
            .select()
            .from(scfThreats)
            .where(and(...filters))
        : await db.select().from(scfThreats);

    if (rows.length === 0) return [];

    const threatIds = rows.map((r) => r.id);
    const mappings: ScfThreatMappingRow[] = await db
      .select()
      .from(scfThreatControlMappings)
      .where(inArray(scfThreatControlMappings.scfThreatId, threatIds));

    const controlMap = new Map<string, string[]>();
    for (const m of mappings) {
      const list = controlMap.get(m.scfThreatId) ?? [];
      list.push(m.scfControlId);
      controlMap.set(m.scfThreatId, list);
    }

    return rows.map((r) => mapThreatRow(r, controlMap.get(r.id) ?? []));
  },

  async getThreat(threatId) {
    const [threat] = await db
      .select()
      .from(scfThreats)
      .where(eq(scfThreats.id, threatId))
      .limit(1);
    if (!threat) return null;

    const mappings: ScfThreatMappingRow[] = await db
      .select()
      .from(scfThreatControlMappings)
      .where(eq(scfThreatControlMappings.scfThreatId, threatId));

    return mapThreatRow(
      threat,
      mappings.map((m) => m.scfControlId),
    );
  },
});
