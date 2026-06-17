import { pgTable, text, timestamp, uuid, index, uniqueIndex, boolean, integer } from "drizzle-orm/pg-core";
import { organizations, scfFrameworkRequirements } from "./schema";

export const customFrameworks = pgTable(
  "custom_frameworks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    version: text("version"),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index("custom_frameworks_org_idx").on(table.organizationId),
    uniqueNameVersionIdx: uniqueIndex("custom_frameworks_name_version_uidx").on(
      table.organizationId,
      table.name,
      table.version
    ),
  })
);

export const customFrameworkRequirements = pgTable(
  "custom_framework_requirements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customFrameworkId: uuid("custom_framework_id")
      .notNull()
      .references(() => customFrameworks.id, { onDelete: "cascade" }),
    requirementCode: text("requirement_code").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    frameworkIdx: index("custom_requirements_fw_idx").on(table.customFrameworkId),
    uniqueCodeIdx: uniqueIndex("custom_requirements_code_uidx").on(
      table.customFrameworkId,
      table.requirementCode
    ),
  })
);

export const customStrmMappings = pgTable(
  "custom_strm_mappings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customFrameworkRequirementId: uuid("custom_framework_requirement_id")
      .notNull()
      .references(() => customFrameworkRequirements.id, { onDelete: "cascade" }),
    scfFrameworkRequirementId: uuid("scf_framework_requirement_id")
      .notNull()
      .references(() => scfFrameworkRequirements.id, { onDelete: "cascade" }),
    relationshipType: text("relationship_type").notNull(), // 'intersects', 'equal', 'subset', 'superset', 'no_relation'
    confidenceScore: integer("confidence_score"), // 0-100 for AI suggestions
    isApproved: boolean("is_approved").default(false).notNull(), // Approval Gate
    createdBy: uuid("created_by"), // ID of user or AI agent
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    customReqIdx: index("custom_strm_custom_req_idx").on(table.customFrameworkRequirementId),
    scfReqIdx: index("custom_strm_scf_req_idx").on(table.scfFrameworkRequirementId),
    uniqueMappingIdx: uniqueIndex("custom_strm_mapping_uidx").on(
      table.customFrameworkRequirementId,
      table.scfFrameworkRequirementId
    ),
  })
);
