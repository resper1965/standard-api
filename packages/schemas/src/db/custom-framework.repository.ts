import { eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import {
  customFrameworks,
  customFrameworkRequirements,
  customStrmMappings,
} from "./custom-frameworks.js";

export function createCustomFrameworkRepository(db: PgDatabase<any>) {
  return {
    createFramework: async (data: {
      organizationId: string;
      name: string;
      version?: string;
      description?: string;
    }) => {
      const [framework] = await db
        .insert(customFrameworks)
        .values({
          organizationId: data.organizationId,
          name: data.name,
          version: data.version,
          description: data.description,
        })
        .returning();
      return framework;
    },

    getFrameworksByOrganization: async (organizationId: string) => {
      return db
        .select()
        .from(customFrameworks)
        .where(eq(customFrameworks.organizationId, organizationId));
    },

    addRequirements: async (
      frameworkId: string,
      requirements: Array<{ code: string; title: string; description: string }>
    ) => {
      if (!requirements.length) return [];

      return db
        .insert(customFrameworkRequirements)
        .values(
          requirements.map((req) => ({
            customFrameworkId: frameworkId,
            requirementCode: req.code,
            title: req.title,
            description: req.description,
          }))
        )
        .returning();
    },

    addStrmMappings: async (
      mappings: Array<{
        customRequirementId: string;
        scfRequirementId: string;
        relationshipType: "intersects" | "equal" | "subset" | "superset" | "no_relation";
        confidenceScore?: number;
        isApproved?: boolean;
      }>
    ) => {
      if (!mappings.length) return [];

      return db
        .insert(customStrmMappings)
        .values(
          mappings.map((m) => ({
            customFrameworkRequirementId: m.customRequirementId,
            scfFrameworkRequirementId: m.scfRequirementId,
            relationshipType: m.relationshipType,
            confidenceScore: m.confidenceScore,
            isApproved: m.isApproved ?? false,
          }))
        )
        .returning();
    },

    /**
     * Retrieves the current active mapping between a custom framework and the SCF.
     */
    getMappingsForFramework: async (frameworkId: string) => {
      return db
        .select({
          customRequirementId: customFrameworkRequirements.id,
          customCode: customFrameworkRequirements.requirementCode,
          scfRequirementId: customStrmMappings.scfFrameworkRequirementId,
          relationshipType: customStrmMappings.relationshipType,
        })
        .from(customFrameworkRequirements)
        .leftJoin(
          customStrmMappings,
          eq(customStrmMappings.customFrameworkRequirementId, customFrameworkRequirements.id)
        )
        .where(eq(customFrameworkRequirements.customFrameworkId, frameworkId));
    },
  };
}
