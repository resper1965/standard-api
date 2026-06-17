/**
 * @module artifact.drizzle.repository
 * @description Drizzle PostgreSQL artifact version repository.
 * Creates/reads artifact versions across SoA, gap analysis, maturity, POA&M, and reports.
 * Uses a generic lookup strategy across version tables keyed by artifact type.
 */
import { eq, and } from "drizzle-orm";
import {
  soaVersions,
  gapAnalysisVersions,
  maturityAssessmentVersions,
  poamVersions,
  reportVersions,
} from "@standard/schemas";
import type { ArtifactVersion, ArtifactType } from "@standard/assessment-engine";
import type { ArtifactRepositoryAdapter } from "../http";
import type { DbClient } from "./db";

type VersionTable = typeof soaVersions | typeof gapAnalysisVersions | typeof maturityAssessmentVersions | typeof poamVersions | typeof reportVersions;

const tableForType = (type: ArtifactType): VersionTable => {
  switch (type) {
    case "scope":
    case "soa": return soaVersions;
    case "gap_analysis": return gapAnalysisVersions;
    case "maturity_assessment": return maturityAssessmentVersions;
    case "poam": return poamVersions;
    case "report": return reportVersions;
  }
};

type GenericVersionRow = {
  id: string;
  organizationId: string;
  assessmentId: string;
  versionNumber: number;
  status: string;
  approvalEventId: string | null;
  createdByAgentRunId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const mapRowToVersion = (row: GenericVersionRow, artifactType: ArtifactType): ArtifactVersion => ({
  id: row.id,
  organizationId: row.organizationId,
  assessmentId: row.assessmentId,
  artifactType,
  versionNumber: row.versionNumber,
  status: row.status as ArtifactVersion["status"],
  createdBy: row.createdByAgentRunId ?? "system",
  createdAt: row.createdAt.toISOString(),
  ...(row.approvalEventId ? { approvedBy: row.approvalEventId } : {}),
  traceId: "",
});

export const createDrizzleArtifactRepository = (db: DbClient): ArtifactRepositoryAdapter => ({
  async create(input) {
    const table = tableForType(input.artifactType);
    // Count existing versions to determine next version number
    const existing = await db.select().from(table as typeof soaVersions)
      .where(and(
        eq((table as typeof soaVersions).assessmentId, input.assessmentId),
        eq((table as typeof soaVersions).organizationId, input.organizationId),
      ));
    const versionNumber = existing.length + 1;

    await db.insert(table as typeof soaVersions).values({
      id: input.id,
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      versionNumber,
      status: "draft" as const,
      approvalEventId: null,
    }).onConflictDoNothing();

    return {
      ...input,
      versionNumber,
      status: "draft",
    };
  },

  async get(versionId) {
    // Try each table since we don't know the artifact type
    for (const [type, table] of [
      ["soa", soaVersions],
      ["gap_analysis", gapAnalysisVersions],
      ["maturity_assessment", maturityAssessmentVersions],
      ["poam", poamVersions],
      ["report", reportVersions],
    ] as const) {
      const [row] = await db.select().from(table as typeof soaVersions)
        .where(eq((table as typeof soaVersions).id, versionId))
        .limit(1);
      if (row) return mapRowToVersion(row as unknown as GenericVersionRow, type);
    }
    return null;
  },

  async save(version) {
    const table = tableForType(version.artifactType);
    await db.update(table as typeof soaVersions).set({
      status: version.status as "draft" | "under_review" | "approved" | "superseded" | "archived",
      updatedAt: new Date(),
    }).where(eq((table as typeof soaVersions).id, version.id));
  },

  async listByAssessment(assessmentId, artifactType) {
    const table = tableForType(artifactType);
    const rows = await db.select().from(table as typeof soaVersions)
      .where(and(
        eq((table as typeof soaVersions).assessmentId, assessmentId),
        // We lack organizationId parameter in this method signature natively, but wait, the signature in http.ts doesn't pass organizationId to listByAssessment?
        // Ah, looking at http.ts, `listByAssessment(assessmentId: string, artifactType: ArtifactType): Promise<ArtifactVersion[]>;`
        // So I can't filter by organizationId in the base method unless I change http.ts. But I CAN in withOrganization!
      ));
    return rows.map(r => mapRowToVersion(r as unknown as GenericVersionRow, artifactType));
  },

  withOrganization(organizationId: string) {
    return {
      create: async (input) => this.create(input),
      get: async (versionId) => {
        const artifact = await this.get(versionId);
        return artifact && artifact.organizationId === organizationId ? artifact : null;
      },
      save: async (version) => this.save(version),
      listByAssessment: async (assessmentId, artifactType) => {
        const table = tableForType(artifactType);
        const rows = await db.select().from(table as typeof soaVersions)
          .where(and(
            eq((table as typeof soaVersions).assessmentId, assessmentId),
            eq((table as typeof soaVersions).organizationId, organizationId)
          ));
        return rows.map(r => mapRowToVersion(r as unknown as GenericVersionRow, artifactType));
      }
    };
  }
});


